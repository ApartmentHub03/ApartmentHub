# ApartmentHub - Project Structure

A rental platform for apartment listings in the Netherlands, supporting tenant applications, document uploads, viewing bookings, offer/deal workflows, and CRM automation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| State Management | Redux Toolkit + React Redux |
| Backend | Supabase (PostgreSQL, Edge Functions, Storage) |
| Auth | Phone-based OTP via WhatsApp (n8n + Zoko) |
| Email | Resend API (transactional emails) |
| Webhooks | n8n Cloud for CRM automation |
| MCP Server | Express + MCP SDK (team tooling) |
| Deployment | Vercel (frontend), Supabase (backend) |

---

## Directory Overview

```
ApartmentHub/
├── src/                    # Frontend source code
│   ├── app/                # Next.js App Router (routes & pages)
│   ├── components/         # React components
│   ├── services/           # Business logic & API calls
│   ├── features/           # Redux slices & feature components
│   ├── data/               # Static data (translations, neighborhoods)
│   ├── config/             # Configuration files
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── contexts/           # React context providers
│   ├── lib/                # Supabase client
│   └── integrations/       # Alternate Supabase client export
├── supabase/               # Supabase backend
│   ├── functions/          # 10 Deno Edge Functions
│   ├── migrations/         # 38 database migrations
│   ├── queries/            # Saved SQL queries
│   └── config.toml         # Supabase CLI config
├── mcp-server/             # Centralized MCP server for team tooling
│   ├── plugins/            # 4 auto-loaded plugins
│   ├── server.js           # Express app with MCP transport
│   └── plugin-loader.js    # Plugin auto-discovery
├── tests/                  # Load & performance tests
├── public/                 # Static assets (images, videos, PDFs)
└── [config files]          # next.config, eslint, postcss, vercel.json
```

---

## Routes & Pages (`src/app/`)

The app uses a bilingual routing structure with Dutch (`/nl/`) and English (`/en/`) routes, plus root-level routes that redirect or serve default content.

### Dutch Routes (`/nl/`)

| Route | Description |
|-------|-------------|
| `/nl/aanvraag` | Application form |
| `/nl/aanvraag-general` | General application |
| `/nl/about-us` | About page |
| `/nl/algemene-voorwaarden` | General terms |
| `/nl/appartementen` | Apartments listing |
| `/nl/contact` | Contact page |
| `/nl/discover-more` | Discovery section |
| `/nl/faq` | FAQ |
| `/nl/intentieverklaring` | Letter of intent |
| `/nl/login` | Login |
| `/nl/neighborhood/[id]` | Neighborhood details |
| `/nl/neighborhoods` | Neighborhoods listing |
| `/nl/privacy-policy` | Privacy policy |
| `/nl/privacyverklaring` | Privacy statement |
| `/nl/rent-in` | Renting as tenant |
| `/nl/rent-out` | Renting as landlord |
| `/nl/signup` | Sign up |
| `/nl/terms-and-conditions` | Terms and conditions |

### English Routes (`/en/`)

| Route | Description |
|-------|-------------|
| `/en/about-us` | About page |
| `/en/apartments` | Apartments listing |
| `/en/application` | Application form |
| `/en/application-general` | General application |
| `/en/contact` | Contact page |
| `/en/deal-response` | Deal response |
| `/en/discover-more` | Discovery section |
| `/en/faq` | FAQ |
| `/en/letter-of-intent` | Letter of intent |
| `/en/login` | Login |
| `/en/neighborhood/[id]` | Neighborhood details |
| `/en/neighborhoods` | Neighborhoods listing |
| `/en/privacy-policy` | Privacy policy |
| `/en/rent-in` | Renting as tenant |
| `/en/rent-out` | Renting as landlord |
| `/en/signup` | Sign up |
| `/en/terms-and-conditions` | Terms and conditions |

### Root Routes

Root-level routes like `/about`, `/landlords`, `/tenants` redirect to their `/en/` equivalents. Other root routes (`/apartments`, `/application`, `/contact`, etc.) serve as default entry points.

---

## Components (`src/components/`)

### `ui/` — Base UI Components
- `Alert.jsx` — Alert/notification component
- `Badge.jsx` — Badge component
- `Button.jsx` — Reusable button
- `Card.jsx` — Card layout
- `Input.jsx` — Input field
- `Modal.jsx` — Modal dialog
- `Progress.jsx` — Progress bar

### `layout/` — Layout Components
- `Navbar.jsx` — Navigation bar
- `Footer.jsx` — Footer section

### `common/` — Shared Components
- `AnimatedCounter.jsx` — Counter with animation effects
- `BrochureModal.jsx` — Brochure download modal
- `CustomSelect.jsx` — Custom dropdown select
- `MarketIndicators.jsx` — Market data display
- `PropertyCard.jsx` — Property listing card
- `ProtectedRoute.jsx` — Auth-protected route wrapper
- `RentalCalculator.jsx` — Rental price calculator
- `ScrollToTop.jsx` — Scroll-to-top button
- `YouTubeEmbed.jsx` — YouTube video embed

### `aanvraag/` — Application Form Components
- `AddPersonModal.jsx` — Add co-tenant/guarantor modal
- `BidSection.jsx` — Bidding section
- `GuarantorFormSection.jsx` — Guarantor details form
- `GuarantorWorkStatusSelector.jsx` — Guarantor work status
- `InlineDocumentUpload.jsx` — Inline document upload
- `MultiFileDocumentUpload.jsx` — Bulk file upload
- `RentalConditionsSidebar.jsx` — Rental conditions display
- `RentalFAQ.jsx` — Application FAQ
- `TenantFormSection.jsx` — Tenant details form
- `UploadChoiceModal.jsx` — Upload method selector
- `WorkStatusSelector.jsx` — Work status selector

### `rent-in/` — Tenant Page Components
- `HeroSection.jsx` — Hero banner
- `HowItWorksSection.jsx` — Process explanation
- `RentalGuideDownload.jsx` — Guide download CTA
- `StatsSection.jsx` — Statistics display
- `WhatsAppMockupSection.jsx` — WhatsApp integration demo

### `seo/` — SEO Components
- `LocalBusinessSchema.jsx` — Structured data for local business

### Root
- `Providers.jsx` — App providers wrapper (Redux, Auth context)

---

## Services (`src/services/`)

| Service | Purpose |
|---------|---------|
| `authApi.js` | WhatsApp OTP authentication (send/verify codes) |
| `userDataService.js` | User profile and data management |
| `documentStorageService.js` | Document upload/storage to Supabase Storage |
| `documentenApi.js` | Document CRUD operations |
| `aanvraagDataService.js` | Application form data management |
| `webhookService.js` | Webhook trigger and routing to n8n |
| `apartmentWebhookService.js` | Apartment-specific webhook handling |
| `apartmentWebhookExample.js` | Webhook usage examples |
| `reminderService.js` | Reminder/notification service |

---

## State Management (`src/features/`)

### Redux Slices
| Slice | File | State |
|-------|------|-------|
| Auth | `auth/authSlice.js` | Authentication state (user, token, status) |
| Properties | `properties/propertiesSlice.js` | Property listings data |
| UI | `ui/uiSlice.js` | UI state (modals, panels, loading) |
| Forms | `ui/formSlice.js` | Form state management |

### Home Page Feature (`features/home/components/`)
- `HeroSection.jsx` — Homepage hero banner
- `ServiceSection.jsx` — Services showcase
- `TestimonialSection.jsx` — Client testimonials
- `WhyChooseUsSection.jsx` — USP section
- `NeighborhoodSection.jsx` — Amsterdam neighborhoods
- `StatsBar.jsx` — Statistics bar
- `ChatWidget.jsx` + `ChatModal.jsx` — Chat interface

---

## Static Data (`src/data/`)

| File | Contents |
|------|----------|
| `translations.js` | i18n strings (Dutch & English) |
| `neighborhoodsData.js` | Amsterdam neighborhood info and details |
| `marketData.js` | Market statistics and rental trends |

---

## Hooks, Utils & Config

### Custom Hooks (`src/hooks/`)
- `useCounter.js` — Animated counter logic
- `useForm.js` — Form handling
- `useInView.js` — Intersection observer (scroll visibility)
- `usePageTitle.js` — Dynamic page title

### Utilities (`src/utils/`)
- `analytics.js` — Analytics tracking
- `documentRequirements.js` — Document validation utilities

### Config (`src/config/`)
- `documentRequirements.js` — Document type requirements and validation rules

### Contexts (`src/contexts/`)
- `AuthContext.jsx` — Authentication context provider

### Supabase Clients
- `src/lib/supabase.js` — Main Supabase client (browser + server)
- `src/integrations/supabase/client.js` — Alternate client export with session persistence

---

## Supabase Backend (`supabase/`)

### Edge Functions (`supabase/functions/`)

10 Deno/TypeScript edge functions:

| Function | Purpose |
|----------|---------|
| `auth-send-code` | Send WhatsApp OTP verification code |
| `auth-verify-code` | Verify OTP and return auth token |
| `upload-document` | Handle document upload to storage |
| `submit-bid` | Process apartment bid submission |
| `get-dossier` | Fetch complete application dossier |
| `handle-deal-response` | Accept/decline apartment offers |
| `send-loi-email` | Send Letter of Intent via Resend |
| `add-person` | Add co-tenants/guarantors to application |
| `extract-passport-data` | Parse ID document images |
| `analyze-rental-price` | Estimate rental market price |

### Database Migrations (`supabase/migrations/`)

38 migration files (~6,700 lines of SQL) covering:
- Authentication & verification codes
- Apartment management (listings, bookings, viewings)
- Dossier/application management
- Document handling & status tracking
- Account/CRM syncing
- Webhook triggers for n8n automation
- Segment & qualification system
- Reminder and cancellation automation

### Key Database Tables

| Table | Purpose |
|-------|---------|
| `apartments` | Listings with status workflow (Null → CreateLink → Active → Closed) |
| `dossiers` | Application dossiers (draft/submitted/approved/rejected) |
| `personen` | People linked to dossiers (tenant/co_tenant/guarantor) |
| `documenten` | Uploaded documents with status tracking |
| `accounts` | CRM accounts synced from dossiers |
| `verification_codes` | OTP codes for WhatsApp auth |
| `real_estate_agents` | Agent profiles |
| `tenants` | Tenant profiles |
| `crm_agents` | CRM agent data |
| `rental_leads` | Lead tracking |

---

## MCP Server (`mcp-server/`)

A centralized remote MCP server so any team member can connect from any device via Claude Code.

### Architecture
- **Transport**: Streamable HTTP at `/mcp` (Express + MCP SDK)
- **Auth**: Bearer tokens (`VALID_TOKENS` env var maps `token:username` pairs)
- **Plugins**: Auto-loaded from `plugins/` directory
- **Logging**: Daily JSONL log files
- **Repo Sync**: Auto git-pull every 5 minutes

### Plugins & Tools (16 tools total)

| Plugin | Tools |
|--------|-------|
| `codebase.js` | `read_file`, `list_directory`, `search_code`, `get_project_structure`, `sync_repo` |
| `supabase.js` | `supabase_query` (read-only SQL), `list_tables`, `query_table`, `list_edge_functions`, `get_migration_history` |
| `github.js` | `list_prs`, `get_pr_diff`, `list_issues`, `create_issue` |
| `rules.js` | `get_ground_rules`, `get_user_info` |

### Security
- HTTPS via Cloudflare Tunnel (no port exposure)
- Token rotation every 30 days
- Path traversal protection
- SQL write operations blocked
- Auth failure logging with IP

---

## Tests (`tests/`)

### Load Testing (`tests/load/`)
- `frontend.yml` — Frontend load tests (Artillery)
- `supabase.yml` — Supabase API load tests
- `webhooks.yml` — Webhook endpoint load tests
- `artillery-processor.js` — Custom test processor

### Performance Testing (`tests/performance/`)
- `bundle-analysis.js` — Bundle size analysis
- `lighthouse-audit.js` — Lighthouse performance audit

### Runner
- `run-all-tests.sh` — Master test runner script

---

## Public Assets (`public/`)

- Neighborhood images (Amsterdam districts)
- Marketing videos (`rent-in.mp4`, `rent-out.mp4`)
- Hero and about page images
- Brand assets (logo, favicon)
- `amsterdam-rental-guide-2024.pdf` — Downloadable rental guide
- `llms.txt` — LLM info file
- Google verification HTML

---

## Configuration Files

| File | Purpose |
|------|---------|
| `next.config.mjs` | Next.js config (webpack, redirects, headers) |
| `eslint.config.mjs` | ESLint configuration |
| `postcss.config.mjs` | PostCSS config for Tailwind |
| `jsconfig.json` | Path aliases (`@/`, `@/pages/`) |
| `vercel.json` | Vercel deployment config |
| `supabase/config.toml` | Supabase CLI config |

---

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.1.0 | React framework |
| `react` | 19.2.0 | UI library |
| `@reduxjs/toolkit` | 2.10.1 | State management |
| `@supabase/supabase-js` | 2.87.1 | Supabase client |
| `tailwindcss` | 4.1.17 | CSS framework |
| `react-hook-form` | 7.68.0 | Form handling |
| `zod` | 4.2.1 | Schema validation |
| `lucide-react` | 0.554.0 | Icon library |
| `recharts` | 3.5.0 | Charts |
| `sonner` | 2.0.7 | Toast notifications |

---

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

---

## Git Workflow

- Never push to `main` directly
- Use `Beta` branch for development
- Create PRs to merge into `main`

---

## Project Stats

| Metric | Count |
|--------|-------|
| React Components | 36 |
| Pages/Routes | 64 |
| Edge Functions | 10 |
| Database Migrations | 38 |
| Redux Slices | 4 |
| Custom Hooks | 4 |
| Services | 9 |
| MCP Plugins | 4 |
