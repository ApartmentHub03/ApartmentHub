# ApartmentHub

## Overview
Rental platform for apartment listings in the Netherlands. Supports tenant applications, document uploads, viewing bookings, offer/deal workflows, and CRM automation via n8n webhooks.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4, Redux Toolkit
- **Backend**: Supabase (PostgreSQL, Edge Functions with Deno, Storage)
- **Auth**: Phone-based OTP via WhatsApp (n8n + Zoko)
- **Email**: Resend API (transactional emails)
- **Webhooks**: n8n Cloud for CRM automation

## Project Structure
```
src/
  app/            # Next.js App Router - routes under /(main)/nl/ and /(main)/en/
  components/     # UI components (ui/, layout/, common/, aanvraag/, auth/, seo/)
  services/       # Business logic (authApi, userDataService, documentStorageService, webhookService)
  lib/supabase.js # Supabase client (browser + server)
  integrations/supabase/client.js  # Alternate Supabase client export
  contexts/       # AuthContext
  features/       # Redux slices (auth, properties, ui, home)
  data/           # Static data (translations, neighborhoods, market)
  config/         # Document requirements config
  hooks/          # Custom React hooks
  utils/          # Utilities
supabase/
  functions/      # 10 Edge Functions (Deno/TypeScript)
  migrations/     # Database migrations
  config.toml     # Supabase CLI config
```

## Supabase Project
- **Project ID**: diovljzaabbfftcqmwub
- **Region**: ap-southeast-2
- **Storage Bucket**: dossier-documents

## Key Database Tables
- `dossiers` - Application dossiers (status: draft/submitted/approved/rejected)
- `personen` - People linked to dossiers (tenant/co_tenant/guarantor)
- `documenten` - Uploaded documents with status tracking
- `apartments` - Listings with status workflow (Null -> CreateLink -> Active -> Closed)
- `accounts` - CRM accounts synced from dossiers
- `verification_codes` - OTP codes for WhatsApp auth
- `real_estate_agents`, `tenants`, `crm_agents`, `rental_leads`

## Edge Functions (supabase/functions/)
- `auth-send-code` / `auth-verify-code` - WhatsApp OTP auth
- `upload-document` - Document upload handler
- `submit-bid` - Bid submission
- `get-dossier` - Fetch complete dossier data
- `handle-deal-response` - Accept/decline apartment offers
- `send-loi-email` - Letter of Intent emails via Resend
- `add-person` - Add co-tenants/guarantors
- `extract-passport-data` - ID document parsing
- `analyze-rental-price` - Rental price estimation

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- Edge function secrets: `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `RESEND_API_KEY`

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run lint` - ESLint

## Conventions
- Bilingual routes: Dutch (/nl/) and English (/en/)
- Supabase client imported from `src/lib/supabase.js`
- Services in `src/services/` handle all Supabase/API calls
- Edge functions use Deno runtime with `@supabase/supabase-js`
- Webhooks go to n8n Cloud (davidvanwachem.app.n8n.cloud)
- Git workflow: never push to `main` directly — use Beta branch + PRs

## MCP Server (`mcp-server/`)
Centralized remote MCP server so any team member can connect from any device via Claude Code.

### Architecture
- **Transport**: Streamable HTTP at `/mcp` (Express + `@modelcontextprotocol/sdk`)
- **Auth**: Bearer tokens — `VALID_TOKENS` env var maps `token:username` pairs
- **Plugins**: Auto-loaded from `mcp-server/plugins/` — drop in a `.js` file, restart, new tools available

### Plugins & Tools (16 total)
| Plugin | Tools |
|--------|-------|
| `codebase` | `read_file`, `list_directory`, `search_code`, `get_project_structure`, `sync_repo` |
| `supabase` | `supabase_query` (read-only SQL), `list_tables`, `query_table`, `list_edge_functions`, `get_migration_history` |
| `github` | `list_prs`, `get_pr_diff`, `list_issues`, `create_issue` |
| `rules` | `get_ground_rules`, `get_user_info` |

### Key Files
- `server.js` — Express app, auth middleware, session management, logging, repo auto-sync
- `plugin-loader.js` — Scans `plugins/` dir, auto-registers exports
- `RULES.md` — Ground rules returned by the `get_ground_rules` tool
- `.env.example` — All config vars documented
- `Dockerfile` / `docker-compose.yml` — Deployment (includes optional Cloudflare Tunnel)

### Config (env vars)
- `VALID_TOKENS` — `tok_akshat:akshat,tok_david:david,...`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — REST API access
- `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN` — Management API (raw SQL)
- `GITHUB_TOKEN`, `GITHUB_REPO` — GitHub integration
- `REPO_PATH` — Path to cloned repo on server
- `REPO_AUTO_SYNC=true`, `REPO_SYNC_INTERVAL_MS=300000` — Auto git-pull every 5min
- `LOG_DIR` — Daily JSONL log files (`2026-03-21.log`)

### Security
- HTTPS via Cloudflare Tunnel (no port exposure, automatic SSL)
- Token rotation: every 30 days or on suspected leak
- Path traversal blocked in codebase plugin
- SQL write operations blocked (DROP, DELETE, ALTER, INSERT, UPDATE)
- Logs auth failures with IP for audit

### Connecting from Claude Code
```bash
claude mcp add apartmenthub \
  --transport http \
  --url https://<server-address>/mcp \
  --header "Authorization: Bearer tok_yourtoken"
```

### Setup Guide
See `MCP_SETUP.md` for full deployment and connection instructions.
