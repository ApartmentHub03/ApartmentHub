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
