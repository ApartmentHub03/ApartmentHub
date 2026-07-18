# AGENTS.md

Compact guide for OpenCode sessions. Read this before editing. See `CLAUDE.md` for fuller architecture notes.

## Commands

- `npm run dev` — Next.js dev server (port 3000). Wrapped in `cross-env NODE_OPTIONS=--dns-result-order=ipv4first` to work around a Node DNS-ordering quirk; do not strip that flag.
- `npm run build` — Production build. Uses `--max-old-space-size=4096` (large repo). ESLint is **disabled during build** via `next.config.mjs` (`eslint.ignoreDuringBuilds: true`); run `npm run lint` separately.
- `npm run lint` — `eslint .` (flat config in `eslint.config.mjs`). This is the only static check; there is **no `typecheck` script** and `tsconfig.json` has `strict: false`. Do not assume TS strictness.
- No unit test runner is configured. `tests/` contains only Artillery load tests + Lighthouse audits, run via `bash tests/run-all-tests.sh` (starts its own dev server; bash, not PowerShell — on Windows use Git Bash or WSL).
- `node scripts/backfill-leads.js` — one-shot Supabase backfill; needs `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in env.

There is no CI workflow in this repo. Verification = `npm run lint` + `npm run build` locally.

## Verification order

`npm run lint` → `npm run build`. Lint first because build skips it.

## Architecture gotchas

- **Two Supabase client files, both valid.** `src/lib/supabase.js` and `src/integrations/supabase/client.js` are near-identical (browser localStorage vs server, auto-created from `NEXT_PUBLIC_SUPABASE_*`). Most services import from `src/integrations/supabase/client`; some components import from `src/lib/supabase`. When editing a service, keep its existing import path — don't "consolidate" mid-task.
- **Path alias `@/*` → `./src/*`** (and legacy `@/pages/*` → `./src/_pages/*`). `src/_pages/` holds older page components still imported by App Router routes.
- **Bilingual routing is mandatory.** Every public page exists under both `src/app/(main)/nl/` and `src/app/(main)/en/`. When adding a page or route, create both locale variants. Root-level routes under `(main)/` (e.g. `/verkoop`, `/rent-out`) redirect to the canonical locale version — see `next.config.mjs` `redirects()`.
- **Route groups:** `(main)/` is the marketing/app shell; `(leadform)/` is the Meta-ads lead form shell. `src/app/api/` has its own structure (admin, crm, webhooks, verkoop, salesforce, zoko, magic, dossier, auth).
- **Salesforce is deprecated.** `APARTMENTS_SOURCE=supabase` is the system of record; the `salesforce` API path is a rollback hatch only. Don't write new Salesforce integration code.
- **Edge Functions** live in `supabase/functions/<name>/index.ts` (Deno, `https://esm.sh` imports). Deployed via Supabase CLI, not Vercel. `config.toml` sets `verify_jwt = false` only for `analyze-rental-price` and `send-loi-email` — all others require JWT.
- **Migrations** are timestamped `supabase/migrations/YYYYMMDDHHMMSS_*.sql`. Applied via `supabase db push` or pasted into Supabase SQL Editor. Many include trigger functions that fire n8n webhooks — editing them can break CRM automation.
- **MCP server** (`mcp-server/`) is a separate Express app deployed on a Mac mini behind a Cloudflare Tunnel. It is NOT part of the Next.js build and is excluded from `tsconfig.json`. Don't import from it in `src/`. See `MCP_SETUP.md`.

## Conventions that differ from defaults

- **JSX, not TSX** for most app code (`page.jsx`, `layout.jsx`, services are `.js`). TypeScript is present but `strict: false` and most code is untyped JS — match the file's existing extension.
- **No React import needed** (`react/react-in-jsx-scope: off`) — but many older files still import React; don't remove it unless the file is already React-17-style.
- **Webhooks → n8n Cloud** at `davidvanwachem.app.n8n.cloud`. Outbound CRM automation is triggered by Postgres webhook triggers (see migrations with `_webhook` in the name) calling n8n, not by Next.js API routes.
- **Storage bucket:** `dossier-documents` (Supabase Storage) for all dossier uploads.
- **Git workflow:** never push to `main` directly — use a feature branch off `Beta` and open a PR. Commit messages often use conventional-commits prefixes (`fix(crm):`, `chore:`) but it's not enforced.

## Env vars an agent will actually need

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — required for the app to function (client warns but continues without them).
- `SUPABASE_SERVICE_ROLE_KEY` — server-side / scripts / edge functions.
- `ZOKO_API_KEY`, `RESEND_API_KEY`, `GOOGLE_PLACES_API_KEY`, `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN` — feature-specific; app boots without them.
- `.env.local` is the active local env file (gitignored). `.env.example` documents all vars.

## Things NOT to do

- Don't add `strict: true` to `tsconfig.json` — it will flood the build with errors in legacy JS files.
- Don't re-enable `eslint.ignoreDuringBuilds = false` without first fixing the legacy config issues it's masking.
- Don't edit migrations in place — add a new timestamped migration. The Supabase MCP `supabase_query` tool is read-only (writes blocked).
- Don't import Supabase client in Edge Functions from `src/` — use `https://esm.sh/@supabase/supabase-js@2.7.1`.
- Don't push to `main`.