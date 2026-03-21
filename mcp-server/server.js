import "dotenv/config";
import express from "express";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadPlugins } from "./plugin-loader.js";

const PORT = process.env.PORT || 3100;
const LOG_DIR = process.env.LOG_DIR || join(process.cwd(), "logs");
mkdirSync(LOG_DIR, { recursive: true });

// Parse VALID_TOKENS env: "tok_akshat:akshat,tok_david:david"
const tokenMap = new Map();
for (const pair of (process.env.VALID_TOKENS || "").split(",")) {
  const [token, username] = pair.split(":");
  if (token && username) tokenMap.set(token.trim(), username.trim());
}

if (tokenMap.size === 0) {
  console.error("VALID_TOKENS env var is empty or missing. No users will be able to authenticate.");
}

// Shared config passed to plugins
const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseProjectRef: process.env.SUPABASE_PROJECT_REF,
  supabaseAccessToken: process.env.SUPABASE_ACCESS_TOKEN,
  githubToken: process.env.GITHUB_TOKEN,
  githubRepo: process.env.GITHUB_REPO,
  repoPath: process.env.REPO_PATH || process.cwd(),
};

// --- Logging ---
function log(event, data = {}) {
  const entry = { ts: new Date().toISOString(), event, ...data };
  const line = JSON.stringify(entry);
  console.log(line);
  try {
    const dateStr = new Date().toISOString().slice(0, 10);
    appendFileSync(join(LOG_DIR, `${dateStr}.log`), line + "\n");
  } catch {
    // Don't crash if log write fails
  }
}

// --- Repo auto-sync ---
const SYNC_INTERVAL = parseInt(process.env.REPO_SYNC_INTERVAL_MS || "300000", 10); // 5min default

function syncRepo() {
  try {
    const result = execSync("git pull origin main --ff-only", {
      cwd: config.repoPath,
      timeout: 30000,
      encoding: "utf-8",
    });
    const trimmed = result.trim();
    if (!trimmed.includes("Already up to date")) {
      log("repo_sync", { status: "updated", output: trimmed });
    }
  } catch (err) {
    log("repo_sync_error", { error: err.message });
  }
}

if (process.env.REPO_AUTO_SYNC !== "false") {
  syncRepo(); // sync once at startup
  setInterval(syncRepo, SYNC_INTERVAL);
  log("repo_sync_enabled", { intervalMs: SYNC_INTERVAL });
}

// Pre-load plugins once
const plugins = await loadPlugins();
log("server_start", { plugins: plugins.map((p) => p.name), users: tokenMap.size });

const app = express();
app.use(express.json());

// Auth middleware for /mcp
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    log("auth_rejected", { reason: "missing_token", ip: req.ip, method: req.method });
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = auth.slice(7);
  const username = tokenMap.get(token);
  if (!username) {
    log("auth_rejected", { reason: "invalid_token", ip: req.ip, method: req.method });
    return res.status(403).json({ error: "Invalid token" });
  }
  req.username = username;
  log("request", { user: username, method: req.method, path: req.path });
  next();
}

// Store active transports by session ID
const transports = new Map();

app.post("/mcp", authenticate, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];

  // Existing session — forward the message
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId);
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // New session — create server + transport
  const server = new McpServer({
    name: "apartmenthub",
    version: "1.0.0",
  });

  // Register all plugins
  for (const plugin of plugins) {
    plugin.register(server, { ...config, username: req.username });
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (id) => {
      transports.set(id, transport);
    },
  });

  transport.onclose = () => {
    const id = transport.sessionId;
    if (id) transports.delete(id);
  };

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Handle GET for SSE stream (required by some clients)
app.get("/mcp", authenticate, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports.has(sessionId)) {
    return res.status(400).json({ error: "Invalid or missing session" });
  }
  const transport = transports.get(sessionId);
  await transport.handleRequest(req, res);
});

// Handle DELETE for session cleanup
app.delete("/mcp", authenticate, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId);
    await transport.handleRequest(req, res);
    transports.delete(sessionId);
  } else {
    res.status(204).end();
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", plugins: plugins.map((p) => p.name), users: tokenMap.size });
});

app.listen(PORT, () => {
  console.log(`ApartmentHub MCP server running on port ${PORT}`);
});
