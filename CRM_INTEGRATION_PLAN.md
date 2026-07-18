# ApartmentHub CRM Integration Plan

**Source**: Impromptu Google Meet — July 16, 2026 (David van Wachem & Jestoni Brion)
**Recording**: https://fathom.video/share/8exLYiWW713mohPecgCQ9vTgM4H3EP5R
**Estimated effort**: 20 hours (Phases 1-5)
**Status**: Ready to execute, pending HTML prototype from David

---

## Setup

- Create new route `/crm-admin` (replaces the old single-file `/crm-admin/page.jsx` with a TypeScript scaffold ported from the HTML prototype)
- **Zip code lookup**: Use existing PDOK integration (`src/app/lib/public-registers.ts`) — no new Google dependency
- **HTML prototype**: David sending; convert functional parts to TSX
- **Automation engine**: Zoko Flow (Zoko's built-in flow builder handles timing, branching, template sending)
- **Our code scope for automations**: Fire event webhooks to Zoko at trigger points only — no scheduling logic in our codebase

---

## Phase 1 — Bug Fixes & Co-Tenant Squad System (3h)

**Status: Partially built, needs fixing**

The "squad" system (David's "Fortnite" analogy) lets a main tenant invite co-tenants/guarantors to join their rental application via a link.

| # | Task | What exists | What's needed |
|---|------|-------------|---------------|
| 1 | Debug co-tenant join link | `generate-invite` edge fn + `/invite` page + `InviteForm.jsx` exist | David says link is broken — debug why invite link doesn't work (possibly phone number issue at `Aanvraag.jsx:920`) |
| 2 | Fix role assignment bug | `add-person` edge fn enforces roles (`tenant`/`co_tenant`/`guarantor`) | David appears as guarantor instead of main tenant — investigate role logic in `add-person/index.ts` |
| 3 | Remove/reassign main tenant | `personen` table with `rol` column | Add CRM ability to remove/reassign main tenant from backend |
| 4 | Test full squad flow | Both paths exist: (a) main tenant self-uploads co-tenant docs, (b) co-tenant joins via link | End-to-end test: invite → join → upload docs → fill role → apply |

### Key files
- `supabase/functions/generate-invite/index.ts` — JWT invite token (14-day expiry)
- `supabase/functions/add-person/index.ts` — creates `personen` row with role + documents
- `src/_pages/Aanvraag.jsx:920` — `generateInviteLink()` builds invite URL
- `src/_pages/Invite.jsx` + `src/_pages/InviteForm.jsx` — invitee landing + form
- `supabase/migrations/20260225020000_cotenant_guarantor_account_relations.sql` — account relations schema

---

## Phase 2 — Apartment Creation Enhancements (4h)

**Status: Basic form exists, missing features**

| # | Task | What exists | What's needed |
|---|------|-------------|---------------|
| 5 | Auto-fill zip code from address | `ApartmentForm` in `crm-admin/page.jsx` has `zip_code` plain input; PDOK lookup in `public-registers.ts` | Add PDOK address autocomplete on "Full Address" field → auto-populate `zip_code` |
| 6 | Enable file uploads | `booking_details.brochure_pdf` referenced but no upload UI | Add file upload component to `ApartmentForm` → store in Supabase Storage (`dossier-documents` bucket or new bucket) |
| 7 | Collaboration/viewing setup | `real_estate_agents` table + `SlotManager` component exist | Verify agent selection, viewing duration (`lengthInMins`), date slots work in current UI; improve if needed |
| 8 | Zoko segment selection | No segment integration found | Select Zoco segments → generate meeting links → save → send apartment via Zoko |

### Key files
- `src/app/crm-admin/page.jsx:1078-1166` — `ApartmentForm` component
- `src/app/api/admin/crm/apartment/route.js` — create apartment API
- `src/app/lib/public-registers.ts` — PDOK address lookup (free, no API key)
- `supabase/migrations/20260215130000_create_apartment_tables.sql` — apartments schema

---

## Phase 3 — Pipeline Views & Offer Workflow (5h)

**Status: Legacy CRM has flat list, missing pipeline views and offer generation UI**

| # | Task | What exists | What's needed |
|---|------|-------------|---------------|
| 9 | Pipeline columns | `crm-admin/page.jsx` has flat apartment list with status dropdown | Group apartments by status: Active listings → Waiting for offers → Offers out → Deals won |
| 10 | Auto-deactivate listings | No scheduled deactivation | Auto-set listings to inactive every 2 weeks (cron or scheduled job) |
| 11 | Apartment detail view | `ApartmentDrawer` shows details; `ApplicationDrawer` shows co-tenants (read-only) | Add: viewing participants, cancellations, people making offer, offers in/out, document ZIP download (all persons incl. guarantor), listing info + PDF |
| 12 | Generate Offer button | `generate_offer` column + DB trigger exist but **no UI** | Add button in CRM → writes phone to `generate_offer` → trigger fires n8n webhook (`/webhook/send-offer-to-the-tenant`) → AI reads → email draft |
| 13 | Adjust Offer UI | No offer adjustment UI | Add: change bid amount, change deposit months (1→2), double-check with tenant → re-generate |
| 14 | Deal confirmation | `DealResponse.jsx` (tenant-side) + `DealDrawer` (CRM-side) exist | Verify: closer selection (Lander/David/Kai/Lukas), contractual start date, final rental price → adds to "deals this month" |
| 15 | LOI commission rule | LOI page exists (`LetterOfIntent.jsx`) | Add rule: apartments under €2,000 → 2× commission in LOI (adjustable per apartment) |

### Key files
- `src/app/crm-admin/page.jsx` — entire legacy CRM UI (1329 lines)
- `supabase/migrations/20260226030000_generate_offer_webhook.sql` — generate offer trigger
- `supabase/migrations/20260226040000_deal_response_automation.sql` — deal response trigger
- `src/_pages/LetterOfIntent.jsx` — LOI signing page (616 lines)
- `src/_pages/DealResponse.jsx` — tenant deal accept/decline (320 lines)
- `supabase/functions/submit-bid/index.ts` — tenant bid submission
- `supabase/functions/handle-deal-response/index.ts` — deal accept/decline handler

### Pipeline status flow
```
Null → CreateLink → Active → Closed
         ↓            ↓
    [n8n webhook]  [n8n webhook + matched tenants]
```

### Offer flow
```
Offer in (first doc upload post-viewing)
  → Sign LOI
  → Generate Offer (AI reads → email draft)
  → Adjust Offer (optional: bid, deposit)
  → Offer out
  → Deal accepted / No deal
```

---

## Phase 4 — Invoice Generation (2h)

**Status: Table + basic UI exist, missing PDF + email + VAT**

| # | Task | What exists | What's needed |
|---|------|-------------|---------------|
| 16 | Add 21% VAT calculation | `invoices` table + `DealDrawer` invoice form exist | Calculate 21% VAT over invoice price; display in form |
| 17 | PDF generation | `pdf_path` column exists but unused; UI says "PDF rendering activates once David's invoice template is in" | Generate PDF invoice (pending David's template) |
| 18 | Auto-send invoice via email | No email sending for invoices | Auto-send from `finance@Apartmenthub` via Resend API |

### Key files
- `supabase/migrations/20260629120000_crm_invoices.sql` — invoices table schema
- `src/app/crm-admin/page.jsx:556-671` — `DealDrawer` with invoice form
- `src/app/api/admin/crm/invoices/route.js` — invoice CRUD API
- `supabase/functions/send-loi-email/index.ts` — existing Resend email pattern (reference)

---

## Phase 5 — Zoko Flow Automations (2h)

**Status: Zoko integration exists (18 templates), need to fire trigger webhooks for Zoko Flow**

**Approach**: Zoko Flow (Zoko's built-in flow builder) handles all timing, branching, and template sending. Our code only fires event webhooks at trigger points.

| # | Task | What exists | What's needed from us |
|---|------|-------------|----------------------|
| 19 | 2-hour viewing reminder | `booking_reminder_in_person_viewing` template exists | Fire webhook 2h before viewing → Zoko Flow sends reminder → handles "no" response → cancel booking |
| 20 | Cancel/reschedule flow | `booking_cancelled` + `reschedule_viewing` templates exist | Fire webhook on cancel request → Zoko Flow: "Really cancel or FaceTime?" → branch |
| 21 | Post-viewing offer reminders | `request_for_offer` template exists | Fire webhook when viewing done → Zoko Flow sends at 15m, 4h, 17h, 40h (skip if offer made) |
| 22 | Thank-you for offer | `offer_received` template exists | Fire webhook on first doc upload post-viewing → Zoko Flow sends thank-you |
| 23 | Deal / No-deal | `deal_won` + `offer_declined` templates exist | Fire webhook on `offers_sent` status change → Zoko Flow sends appropriate template |
| 24 | Auto-status updates | DB triggers exist for CreateLink/Active/deal-response | Fire webhooks for: offer sent, viewing done, offer session open |
| 25 | Agent-initiated reschedule | `booking-action` route exists (cancel/reschedule) | Fire webhook on reschedule → Zoko Flow notifies all scheduled viewers with new booking link |
| 26 | Template connections | 18 templates catalogued in `zokoTemplates.js` | Wire each template to its trigger point; verify existing connections |

### Zoko template catalog (18 templates)
All defined in `src/services/zokoTemplates.js`:
- **Onboarding**: welcome_message_from_add, signup_confirmation, co_tenant_invite, guarantor_invite, ready_to_apply
- **Listings**: listing_sent, broadcast_sent
- **Booking**: booking_confirmed, booking_reminder_in_person_viewing, booking_reminder_facetime_viewing
- **Cancel/Reschedule**: booking_cancelled, reschedule_viewing
- **Post-viewing**: request_for_offer, offer_received
- **Offer result**: offer_declined, deal_won
- **Documents**: documents_missing_before_viewing (unverified — `zokoId: null`)
- **Auth**: OTP template

### Key files
- `src/services/zokoTemplates.js` — template catalog (single source of truth)
- `src/app/api/zoko/send-template/route.js` — public template sender
- `src/app/api/admin/crm/send-template/route.js` — CRM template sender
- `src/app/api/webhooks/calcom/route.js` — Cal.com booking webhook (existing trigger example)
- `src/app/api/webhooks/dealsheet/route.js` — deal webhook (existing trigger example)
- `src/lib/meta-capi.js` — Zoko CRM helpers (customer lookup, tagging)

---

## Phase 6 — Special Offer Types (+4h, blocked)

**Status: Blocked on David's details**

| # | Task | Notes |
|---|------|-------|
| 27 | Housing offer format | Different LOI/offer format — David to send details |
| 28 | Grand relocation offer format | Different LOI/offer format — David to send details |

---

## Phase 7 — Future (out of current scope)

- Marketing dashboards integration into CRM
- Buying & selling CRM modules
- Admin dashboard
- Utrecht expansion (copy Amsterdam config, different WhatsApp number)

---

## Open Items (blocked on David)

- [ ] HTML prototype (David sending via WhatsApp)
- [ ] "Generate Offer" details (David sending via WhatsApp)
- [ ] Invoice PDF template
- [ ] Housing offer & Grand relocation offer specs
- [ ] Zoko Flow configuration (who configures flows — us or David?)

---

## Hours Summary

| Phase | Hours | Status |
|-------|-------|--------|
| 1 — Bug fixes & squad | 3 | Ready |
| 2 — Apartment creation + PDOK + uploads | 4 | Ready |
| 3 — Pipeline views + offer workflow + LOI commission | 5 | Ready |
| 4 — Invoices (VAT + PDF + email) | 2 | Partially blocked (PDF template) |
| 5 — Zoko flow triggers (webhooks only) | 2 | Ready |
| 6 — Special offers | +4 | Blocked |
| **Total (Phases 1-5)** | **16-20h** | |

---

## Follow-up Meeting

- **Jul 17 AM** — Jestoni & David sync on questions/blockers