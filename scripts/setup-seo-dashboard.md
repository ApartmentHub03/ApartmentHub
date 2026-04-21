# SEO Dashboard Setup Guide

Complete setup for the SEO Analytics Dashboard at `/admin/seo`.

## 1. Run SQL Migration

Apply the migration in `supabase/migrations/20260410000000_seo_dashboard_tables.sql`
either via the Supabase CLI:

```bash
supabase db push
```

Or paste the SQL into the Supabase SQL Editor.

This creates 5 tables:
- `seo_cache` — TTL-based API response cache
- `seo_page_scores` — Historical SEO scores per page
- `seo_ai_runs` — AI council run audit log
- `seo_optimizations` — Before/after tracking for self-improvement loop
- `seo_success_patterns` — Pattern library of what works

## 2. Environment Variables

Add these to `.env.local`:

```env
# Supabase service role (for cache writes bypassing RLS)
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard -> Settings -> API>

# Google Cloud (shared by GA4 + GSC service account)
GOOGLE_SERVICE_ACCOUNT_EMAIL=<svc-account@project.iam.gserviceaccount.com>
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Analytics 4 (Data API)
GA4_PROPERTY_ID=<numeric property ID for G-GYERTDXNFC>

# Google Search Console
GSC_SITE_URL=https://apartmenthub.nl

# Semrush
SEMRUSH_API_KEY=dba93bc0f59d3c4e5a2256d150f7c63c

# Anthropic Claude (AI council analysis)
ANTHROPIC_API_KEY=<sk-ant-...>
```

**Important** about `GOOGLE_PRIVATE_KEY`: the private key contains newlines.
When setting it in `.env.local`, wrap it in double quotes and use literal `\n`.
The `googleAuth.js` helper will convert `\n` back to real newlines at runtime.

## 3. Google Cloud Service Account Setup

Both GA4 and GSC share one service account.

1. Open https://console.cloud.google.com → Select or create a project
2. **Enable APIs** (APIs & Services → Library):
   - "Google Analytics Data API"
   - "Google Search Console API"
3. **Create service account** (IAM & Admin → Service Accounts → Create):
   - Name: `apartmenthub-seo`
   - Role: none required (we grant access per-property)
4. **Download JSON key** (Service Accounts → the account → Keys → Add Key → JSON)
5. From the JSON, extract:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY` (keep the `\n` sequences literal)

### 3a. Grant GA4 access
- Open https://analytics.google.com
- Admin → Property → Property Access Management
- Add the service account email with **Viewer** role
- Find `GA4_PROPERTY_ID` under Admin → Property → Property Settings (numeric only)

### 3b. Grant GSC access
- Open https://search.google.com/search-console
- Select `apartmenthub.nl`
- Settings → Users and permissions → Add User
- Paste the service account email, permission: **Full** (or Restricted for read-only)

## 4. Get Semrush API Key

Already provided in the `.env.local` template. If rotating:
- https://www.semrush.com/api-documentation/ → Business plan required

## 5. Get Anthropic API Key

- https://console.anthropic.com → API Keys → Create
- Paste into `ANTHROPIC_API_KEY`

Expected cost per full AI analysis run (5 pages):
- Stage 1 (4 analysts × 5 pages × Haiku): ~$0.05
- Stage 3 (5 pages × Sonnet synthesis): ~$0.25
- **Total ~$0.30 per run**

## 6. Verify Setup

```bash
npm run build
npm run dev
```

Navigate to:
1. `/admin` → log in with admin credentials
2. Click the **SEO** button in the header
3. The Overview tab should load real data from GA4, GSC, and Semrush
4. If any data source fails, the banner will show which env var is missing

## 7. Test AI Council

1. Go to the **AI Insights** tab
2. Click **Run Full Analysis**
3. Wait ~30-60 seconds
4. Results appear showing priority pages, radar charts, and before/after suggestions

## 8. The Self-Improvement Loop (Monthly Process)

The Notion playbook loop:
1. **Monthly** — Admin clicks "Run Full Analysis" on AI Insights tab
2. **Review** — Check prioritized pages with lowest scores
3. **Apply** — Update titles/metas/H2s/schema based on AI suggestions
4. **Track** — Mark each optimization as "applied" in the tracker
5. **Wait 30 days** — Let Google re-crawl and re-rank
6. **Measure** — Re-run analysis; compare before/after CTR in `seo_optimizations`
7. **Learn** — Successful patterns are stored in `seo_success_patterns`

## Troubleshooting

**"Missing GOOGLE_SERVICE_ACCOUNT_EMAIL"** → env var not loaded, restart dev server after editing `.env.local`

**GA4 returns empty data** → verify the service account is added to the GA4 property as Viewer

**GSC returns 403** → verify the service account is added as a user on the GSC property

**Semrush "NOT ENOUGH UNITS"** → your Semrush plan doesn't include API access; upgrade to Business tier

**AI analysis times out** → reduce `maxPages` in the analyze request (default 5)
