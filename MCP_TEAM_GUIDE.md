# ApartmentHub MCP Server — Team Guide

## What is this?

A shared AI server running on the Mac Mini (Netherlands). When connected, Claude Code gets access to the **full codebase**, **Supabase database**, **GitHub PRs/issues**, and **team ground rules** — from any device, anywhere.

## Prerequisites

1. Install **Tailscale** — [tailscale.com/download](https://tailscale.com/download)
2. Join the team's Tailnet (ask Akshat for invite)
3. Install **Claude Code** — `npm install -g @anthropic-ai/claude-code`

## Connect (one-time command)

Run your command below in the terminal:

**Akshat:**
```bash
claude mcp add --transport http apartmenthub http://100.119.211.126:3100/mcp --header "Authorization: Bearer tok_akshat"
```

**David:**
```bash
claude mcp add --transport http apartmenthub http://100.119.211.126:3100/mcp --header "Authorization: Bearer tok_david"
```

**Abhi:**
```bash
claude mcp add --transport http apartmenthub http://100.119.211.126:3100/mcp --header "Authorization: Bearer tok_abhi"
```

**Manish:**
```bash
claude mcp add --transport http apartmenthub http://100.119.211.126:3100/mcp --header "Authorization: Bearer tok_manish"
```

## Verify

Open Claude Code (`claude`) and ask:
- *"What tools are available?"*
- *"Show me the ground rules"*

## Ground Rules

- SQL queries are **read-only** — no DROP, DELETE, ALTER
- Always create **new** migration files, never modify existing ones
- Never push directly to `main`
- See full rules: `mcp-server/RULES.md`
