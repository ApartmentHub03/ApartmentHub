# ApartmentHub MCP Server — Setup Guide

## What is this?

A centralized MCP (Model Context Protocol) server for the ApartmentHub project. It gives Claude Code (and other MCP clients) access to:

- **📂 Codebase** — Read files, search code, view project structure
- **🗄️ Supabase** — Query tables, run SQL, view migrations & edge functions
- **🐙 GitHub** — List PRs, view diffs, manage issues
- **📜 Ground Rules** — Enforced team rules for safe development

## Quick Start (For Team Members)

### 1. Get your token

Ask the admin for your personal bearer token (e.g. `tok_akshat`).

### 2. Connect from Claude Code

```bash
claude mcp add apartmenthub \
  --transport http \
  --url https://<server-address>:3100/mcp \
  --header "Authorization: Bearer tok_yourtoken"
```

### 3. Verify

Ask Claude: *"What tools are available?"* — should list ~15 tools.

---

## Server Deployment (For Admins)

### Docker (Recommended)

```bash
cd mcp-server
cp .env.example .env
# Edit .env with real credentials
docker compose up -d
```

### Direct Node.js

```bash
cd mcp-server && npm install
cp .env.example .env
# Edit .env with real credentials
node server.js
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3100) |
| `VALID_TOKENS` | **Yes** | Comma-separated `token:username` pairs |
| `SUPABASE_URL` | **Yes** | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | For REST API table queries |
| `SUPABASE_PROJECT_REF` | No* | Project ref for raw SQL |
| `SUPABASE_ACCESS_TOKEN` | No* | PAT from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) |
| `GITHUB_TOKEN` | **Yes** | GitHub PAT with repo access |
| `GITHUB_REPO` | **Yes** | `owner/repo` format |
| `REPO_PATH` | No | Path to cloned repo (default: cwd) |
| `REPO_AUTO_SYNC` | No | Auto git-pull every interval (default: true) |
| `REPO_SYNC_INTERVAL_MS` | No | Sync interval in ms (default: 300000 = 5min) |
| `LOG_DIR` | No | Directory for log files (default: `./logs`) |
| `CLOUDFLARE_TUNNEL_TOKEN` | No | For HTTPS via Cloudflare Tunnel |

\* Required for `supabase_query` and `list_tables` to return live data.

### HTTPS with Cloudflare Tunnel (Recommended)

Never expose the server over plain HTTP — tokens travel in headers.

```bash
# 1. Create a tunnel at https://one.dash.cloudflare.com → Networks → Tunnels
# 2. Point the tunnel to http://mcp-server:3100
# 3. Add the tunnel token to .env
CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token

# 4. Uncomment the cloudflared service in docker-compose.yml
docker compose up -d
```

Your server is now at `https://mcp.yourdomain.com/mcp` — no ports exposed, automatic HTTPS, works behind NAT.

### Token Rotation

Tokens are static bearer strings in `VALID_TOKENS`. Rotate them to limit exposure:

1. **Generate new tokens** — use `openssl rand -hex 16` or similar
2. **Update `.env`** — replace old token with new, keep the same username
3. **Restart server** — `docker compose restart mcp-server`
4. **Notify the user** — they re-run `claude mcp add` with the new token

Rotation policy: every 30 days, or immediately if a token is suspected leaked. To revoke a user, simply remove their `token:username` pair and restart.

### Health Check

```bash
curl https://mcp.yourdomain.com/health
```

---

## Available Tools

| Tool | Plugin | Description |
|------|--------|-------------|
| `read_file` | codebase | Read a file from the project |
| `list_directory` | codebase | List directory contents |
| `search_code` | codebase | Grep-like code search |
| `get_project_structure` | codebase | Tree view of the project |
| `sync_repo` | codebase | Pull latest code from remote |
| `supabase_query` | supabase | Execute read-only SQL |
| `list_tables` | supabase | List all public tables |
| `query_table` | supabase | Query a table with filters |
| `list_edge_functions` | supabase | List edge functions |
| `get_migration_history` | supabase | List migration files |
| `list_prs` | github | List pull requests |
| `get_pr_diff` | github | View PR diff |
| `list_issues` | github | List issues |
| `create_issue` | github | Create a new issue |
| `get_ground_rules` | rules | View team ground rules |
| `get_user_info` | rules | Who am I? |

---

## Adding New Plugins

Create a new file in `mcp-server/plugins/`, e.g. `plugins/vercel.js`:

```javascript
import { z } from "zod";
export const name = "vercel";

export function register(server, config) {
  server.tool("vercel_deployments", "List deployments",
    { limit: z.number().default(5) },
    async ({ limit }) => {
      // Your implementation
      return { content: [{ type: "text", text: "..." }] };
    }
  );
}
```

Restart the server — new tools are automatically discovered.

---

## Logging

All requests, auth events, and repo syncs are logged to `LOG_DIR` as daily JSONL files (`2026-03-21.log`).

```bash
# View today's logs
cat mcp-server/logs/$(date +%Y-%m-%d).log | jq .

# Watch live
tail -f mcp-server/logs/$(date +%Y-%m-%d).log | jq .

# Find auth failures
grep auth_rejected mcp-server/logs/*.log
```

Each log entry has: `ts` (ISO timestamp), `event` (type), plus event-specific fields like `user`, `ip`, `method`.
