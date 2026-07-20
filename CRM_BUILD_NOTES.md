# ApartmentHub CRM v2 — Build Notes

**Route**: `/crm-admin` (promoted from `/crm-admin2` on Jul 18, 2026 — dev scaffold merged into the canonical route)
**Started**: Jul 16, 2026
**Source of truth**: `ApartmentHub-CRM-Prototype.html` (leidend)

---

## Current status (Jul 17, 2026)

| Phase | Status |
|-------|--------|
| 0 — Scaffold | ✅ Done |
| 1 — Squad bug fixes | ✅ Done (code, not deployed) |
| 2 — Apartment creation + PDOK + uploads | ✅ Done |
| 3 — Pipeline + offer workflow + LOI | ✅ Done (Blocks A+B) |
| 4 — Invoices (VAT + PDF + email) | ✅ Done (real PDF attached, matches David's template) |
| 5 — Zoko flow triggers | In progress (code written, migrations pending David's apply) |
| 6 — Special offers | Out of scope |
| Segment broadcast | Separate phase (queue + n8n) |
| Backfill migration | Written + fixed, David applying |

### Blocked on David
- [x] Run backfill migration `20260717000000_backfill_admin_apartment_to_apartments.sql` on Supabase (fixed for missing `full_address` column) — **done (David confirmed)**
- [ ] Deploy edge functions: `add-person` (JWT fix) + `auth-verify-code` (role lookup fix) — David will deploy via Supabase dashboard (CLI not installed on dev machine)
- [x] ~~Generate Offer decision (email / WhatsApp / both)~~ — **RESOLVED Jul 20, 2026 (Option A: Gmail draft)**. The `generate-offer/route.js` now creates a Gmail draft in the logged-in agent's mailbox via Workspace domain-wide delegation, addressed to the listing agent with the standard template + per-agent signature. n8n `send-offer-to-the-tenant` webhook dropped. See `DAVID_BLOCKERS.md` §1 for remaining setup steps (apply 2 migrations + grant Gmail delegation + set agent addresses).
- [ ] Confirm n8n workflows exist at `/webhook/deal-response` — **URL confirmed, awaiting confirmation workflow is ACTIVE** (the `send-offer-to-the-tenant` workflow is no longer called from code — Option A replaced it)
- [ ] Create `documents_missing_before_viewing` template in Zoko, send UUID
- [x] Invoice PDF template — **done**. PDF generator at `src/app/api/admin/crm/invoices/[id]/send/invoice-pdf.js` matches David's real template (recipient block, INVOICE title, service fee + VAT + amounts due, congratulations paragraph, correct company footer with IBAN/SWIFT/KvK/BTW). Auto-attached to Resend email. `mark-deal` now auto-snapshots recipient name/address/zipcode + auto-generates invoice number + sets due_date (today+14d). Admin must fill in recipient city/country via the Edit modal before sending (no source column exists upstream).
- [x] Verify `finance@apartmenthub.nl` sender identity in Resend — **done (David confirmed)**
- [x] Confirm commission rule edge cases (rent < €2000 → 2 months, else 1; exactly €2000 → 1 month) — **confirmed via LOI legal text** (`src/_pages/LetterOfIntent.jsx:281`: "bij een huurprijs onder € 2.000,-: tweemaal de maandhuur"). Strictly `< €2,000`. Current code in `src/utils/commission.js:25` is correct.
- [ ] Confirm closer list (Lander/David/Kaj/Lucas all in `crm_users`?)
- [x] Template #11 timing: 17h (xlsx) or 24h (zokoTemplates.js label)? — **confirmed 17h**. Label + timing updated in `src/services/zokoTemplates.js:50`.
- [x] Auto-close listing on won deal? — **confirmed yes**. `mark-deal` route now auto-closes + tears down Cal.com links. `ApartmentRecordView` has manual "Close listing" button too.

### Deferred (not blocked, separate phases)
- CollaborationsView — needs migration to add columns to `real_estate_agents`
- Segment broadcast — queue table + n8n workflow, uses Zoko tags for matching
- Auto-deactivate listings after 2 weeks (cron)
- robots.js `/crm-admin` already in disallow arrays (line 15 + line 29 of `src/app/robots.js`). `/crm-admin2` route no longer exists post-promotion.

### Out of scope (decided with David)
- `admin_apartment` table drop — won't do, backfill is enough
- Going-forward sync (admin_apartment → apartments) — won't do, one-time snapshot
- Hausing offer — Phase 6, out of scope
- Grand relocation offer — Phase 6, out of scope

---

## Architecture decisions

### Styling: CSS Modules only
Tailwind 4 is installed (PostCSS plugin wired) but unused — 3,694 CSS Module usages vs ~5 Tailwind-like usages in the codebase. No `@import "tailwindcss"` exists anywhere. Adding it risks global cascade side effects. CSS Modules is the established convention.

### Auth: reuse existing, inline (no extraction)
`/crm-admin` reuses the existing `/api/admin/login` + `/api/admin/crm/refresh` endpoints and the same `sessionStorage` keys (`crm_token`, `crm_refresh`, `crm_role`, `crm_name`, `crm_permissions`). Auth helpers stay inline in `page.tsx` — no shared lib extraction (single consumer now that the old `page.jsx` is deleted).

### API: no changes in Phase 0
All `/api/admin/crm/*` endpoints are reused as-is. No new routes, no schema changes, no contract changes.

### Navigation: full-page views with back links (not drawers)
The prototype uses full-page views with breadcrumb back-links ("‹ Apartments"), not drawers. This is a UX pattern change from the existing CRM. State management uses a `view` object: `{ tab, apartmentId?, applicationId? }` to support nested navigation (Apartments list → Apartment record → Application detail).

### File structure: flat, minimal
```
src/app/crm-admin/
├── page.tsx          # Auth gate + shell + view router
├── views.tsx         # All view components
├── modals.tsx        # All modals
├── types.ts          # Minimal types (wired data only)
└── crm.module.css    # Ported from prototype
```
No deep nesting. Files split only when they become unwieldy.

### Data wiring in scaffold
Only 3 views wired to real API data (Dashboard KPIs, Agents, Team). Everything else is stubbed with inline mock data + `// TODO: wire in Phase N` comments. The scaffold's purpose is shell + navigation + visual fidelity, not data wiring.

### Business drawer
4 items (Rentals / Letting / Buying / Selling). Rentals = active, shows tabs. Other 3 = placeholder "Not part of this build" view, tabs hidden. Simple state toggle.

### City switcher
Amsterdam wired. Utrecht = "coming soon" stub. Dropdown exists in UI but selecting Utrecht shows a placeholder. No data isolation per city in this phase.

---

## What's NOT in the scaffold (later phases)

### Phase 1 — Co-tenant squad bug fixes
- Debug `generate-invite` edge fn + `/invite` page + `InviteForm.jsx`
- Fix role assignment in `add-person/index.ts` (David appears as guarantor instead of main tenant)
- CRM ability to remove/reassign main tenant
- End-to-end squad flow test

### Phase 2 — Apartment creation ✅ DONE
- ✅ CreateApartmentView form wired to `POST /api/admin/crm/apartment` (full form state, Save → navigate to record)
- ✅ PDOK address autocomplete on blur — new route `POST /api/admin/crm/pdok-lookup` wraps `lookupBagAddress()` + `lookupBuildingDetails()` from `public-registers.ts`, auto-fills zip code + m² + city
- ✅ Brochure PDF upload in ApartmentRecordView — upload/view/replace via existing `POST /api/admin/crm/apartment/[id]/pdf` + `GET ...pdf` routes, stored in Supabase Storage `Apartment Doc` bucket
- ✅ Cal.com meeting link generation — MeetingLinksModal wired to `POST /api/admin/crm/apartment/[id]/generate-slot`, shows start/end/slot length inputs, displays generated links
- ✅ Deposit auto-calculation (2× rent, editable)
- Send via Zoko (`pdf_apartment_utility`) — **deferred to segment broadcast phase**
- Segment picker — **deferred to segment broadcast phase**
- CollaborationsView (realtor CRUD) — **deferred** (needs migration to add columns to `real_estate_agents`)

#### Phase 2 flow
1. Agent fills form (PDOK auto-fills zip/m² on address blur)
2. Save → apartment created (status `Null`) → navigates to apartment record
3. In record: "Generate Meeting Links" → Cal.com schedule created (status → `CreateLink`)
4. In record: Upload brochure PDF → stored in Supabase Storage
5. (Segment broadcast — deferred)

### Phase 3 — Pipeline views & offer workflow
- ✅ Pipeline grouping logic (Active → Waiting → Offers out → Deals → Not active)
- Auto-deactivate listings after 2 weeks (cron/scheduled job) — **deferred**
- ✅ Apartment record subtabs (Scheduled/Canceled/Making Offer/Offers In/Offers Out)
- ✅ Application detail — per-person boxes (Bid & contract, Main Tenant, Co-Tenant, Guarantor) with docs + AI-read preview
- ✅ Generate Offer button (Normal / Hausing / Grand relocation)
- ✅ Adjust Offer UI (bid amount, deposit months)
- ✅ Deal confirmation (closer: Lander/David/Kaj/Lucas, start date, final rent)
- ✅ LOI commission rule (<€2000 → 2× commission, adjustable per apartment)
- ✅ No Deal button (flips offer to OFFER_DECLINED, DB trigger fires n8n)

### Phase 4 — Invoice generation
- ✅ 21% VAT calculation (`amount_ex_vat`, `vat_rate`, `vat_amount`, `amount_inc_vat` columns)
- ✅ Commission calculation utility (`src/utils/commission.js`)
- ✅ Draft invoice auto-created on deal confirmation (`mark-deal` route)
- ✅ Send invoice email via Resend from `finance@apartmenthub.nl` (HTML, branded)
- PDF generation (pending David's template) — **deferred**, `pdf_path` column stays NULL
- ✅ DealsView wired to real `won_deals` from `accepted_deals` JSONB

### Phase 5 — Zoko Flow triggers (in progress, Jul 18 2026)
Code-side wiring done. 2 new migrations written (David applies via Supabase SQL Editor — see `DAVID_BLOCKERS.md` §3b). 5 new n8n workflows needed (David creates in n8n Cloud — see `DAVID_BLOCKERS.md` §2d).

| # | Trigger | Code | Migration | n8n workflow |
|---|---------|------|-----------|--------------|
| 1 | 2h pre-viewing reminder | ✅ | `20260718140000` (consolidated) | `viewing-start-reminder` (David creates) |
| 2 | Cancel/reschedule flow (Zoko Flow branching) | ✅ `booking-action/route.js` fires n8n | — (no new migration) | `agent-cancel-notification` (David creates) |
| 3 | Post-viewing reminders (15m/4h/17h/40h, skip if offer) | ✅ patched `process_viewing_reminders()` | `20260718140000` (consolidated) | existing `post-viewing-reminder` (no change) |
| 4 | Thank-you for offer (first doc upload post-viewing) | ✅ | `20260718160000` | `thank-you-for-offer` (David creates) |
| 5 | Deal / No-deal | ✅ already done (`trigger_deal_response`) | — | existing `deal-response` |
| 6 | Auto-status updates (offer sent, viewing done, offer session open) | ✅ no new code — relies on existing generic feeds | — | David filters `get-*-table-update` in n8n |
| 7 | Agent-initiated reschedule → notify all viewers | ✅ `booking-action/route.js` fires n8n with `remaining_participants` | — | `agent-reschedule-notification` (David creates) |
| 8 | Documents missing before viewing (24h before) | ✅ | `20260718140000` (consolidated) | `pre-viewing-document-reminder` (David creates) |

- `zokoTemplates.js` now has 21 verified templates (reconciled 2026-06-29 + `new_flow_upload_documents` added 2026-07-18).
- `documents_missing_before_viewing` (zokoId: null) replaced by `new_flow_upload_documents` (zokoId: `new_flow_upload_documents`, 2 vars, fetched live from Zoko API).
- Pre-viewing reminders **consolidated into the existing `viewing_reminders` table** (not a new table). Adds `viewing_start_time` column, inserts 6 rows per booking instead of 4 (4 post-viewing + 2 pre-viewing when start_time is in the future), rewrites `process_viewing_reminders()` to route by `reminder_interval` (post-viewing → existing webhook + skip-if-offer-made; pre-viewing → new webhooks). No new cron job — reuses the existing `process-viewing-reminders` pg_cron job.
- Thank-you-for-offer uses a **guard table** (`thank_you_offer_sent`) because the `dossier/save` route deletes + re-inserts all `documenten` rows on every save; without the guard the trigger would fire N times per save.

### Phase 6 — Special offer types — **OUT OF SCOPE**
- Hausing offer — originally noted as "uses existing `/hausing-offer` skill" but **no such skill
  exists in the codebase**. Needs spec from David. Deferred indefinitely.
- Grand relocation offer — submits to external relocation website. Needs API spec from David.
- Both are explicitly out of scope for this build. UI buttons remain as stubs.

### Segment broadcast (separate phase)
- Send apartment listing + brochure PDF to a matched segment of candidates via WhatsApp
- `candidate_segments` table already exists (32 segments, migration `20260218120000`)
- `accounts.tags` used for matching (tags like `"€1500-2000€"`, `"2 Bedrooms"`)
- `apartment_account_matches_by_tag` view already in prod
- `pdf_apartment_utility` template verified in Zoko (11 vars)
- Zoko API has NO segment/broadcast endpoint — broadcast = loop through
  candidates + send one-by-one via `POST /v2/message`
- **Architecture (decided):** queue table + n8n workflow
  - `broadcast_jobs` + `broadcast_recipients` tables (migration needed)
  - `POST /api/admin/crm/apartment/[id]/broadcast` — create job + recipients, fire n8n webhook
  - `GET /api/admin/crm/broadcast/[jobId]` — progress polling
  - n8n workflow loops through recipients, calls Zoko API, updates progress
  - CRM modal polls progress every 3s → progress bar
  - Fire-and-forget (returns immediately with jobId), n8n processes in background
- Matching uses Zoko tags on accounts, not the `preference_rent_min/max` columns

### CollaborationsView (deferred)
- `real_estate_agents` table has only `name, phone_number, picture_url`
- Needs migration to add `email, contact_person, default_offer_type` columns
- Deferred until David confirms column requirements

---

## What's lacking / blocked

### Blocked on David → see `DAVID_BLOCKERS.md` for the full list
All current blockers needing David's input live in `DAVID_BLOCKERS.md` now. Summary of what's there:
- §1 — Generate Offer: ✅ code done (Option A: Gmail draft). Remaining: apply 2 migrations, grant Gmail delegation, set agent addresses.
- §2 — n8n Cloud actions: verify workflows are Active, verify Zoko credential uses centralized key, create 5 new Phase 5 workflows
- §3 — Supabase dashboard actions: create `Invoices` storage bucket, apply 4 migrations, deploy 2 edge functions
- §4 — Confirm closer list (Lander/David/Kaj/Lucas all in `crm_users`?)

### Resolved blockers (kept here for history)
- [x] ~~`documents_missing_before_viewing` — create in Zoko, send UUID~~ — **RESOLVED Jul 18, 2026**. Replaced by `new_flow_upload_documents` (fetched live from Zoko: 2 vars, candidate name + upload URL). Wired in `src/services/zokoTemplates.js:38`. The pre-viewing document reminder now fires via the new `pre_viewing_reminders` pg_cron job → n8n `pre-viewing-document-reminder` webhook.
- [x] ~~Invoice PDF template~~ — **done**. `invoice-pdf.js` generates a real PDF matching David's template; attached to email via Resend. Requires David to create an `Invoices` storage bucket in Supabase dashboard (private) for `pdf_path` persistence — if missing, send still works but PDF won't be stored.
- [x] ~~Confirm: template #11 timing is 17h (xlsx) or 24h~~ — **confirmed 17h**. Label + timing updated in `zokoTemplates.js:50`.
- [x] ~~Verify `finance@apartmenthub.nl` sender in Resend~~ — **confirmed verified**.
- [x] ~~Confirm commission rule edge cases~~ — **confirmed via LOI legal text** (`LetterOfIntent.jsx:281`): "bij een huurprijs onder € 2.000,-: tweemaal de maandhuur". Strictly `<`. Current `commission.js:25` is correct.

### Confirmed applied to prod
- ✅ `20260716000000_block_c_deals_invoices.sql` — VAT/commission/closer columns (David confirmed)
- ✅ `20260717000000_backfill_admin_apartment_to_apartments.sql` — adds Cal.com columns to apartments, backfills from admin_apartment (David applying)

### Out of scope (decided with David)
- ~~`admin_apartment` table drop~~ — won't do. Backfill is enough.
- ~~Going-forward sync (admin_apartment → apartments)~~ — won't do. Backfill is a one-time snapshot.
- ~~Hausing offer spec~~ — Phase 6, out of scope
- ~~Grand relocation offer spec~~ — Phase 6, out of scope
- ~~Zoko Segment API access~~ — not needed; we build broadcast ourselves via loop + n8n

### Known gaps
- **robots.js**: `/crm-admin` is already in both disallow arrays in `src/app/robots.js`. `/crm-admin2` no longer exists post-promotion (404s).
- **No data isolation per city**: Utrecht is stubbed. When real, needs separate dashboards with own login and WhatsApp number.
- **No TypeScript strict mode**: `tsconfig.json` has `strict: false`. Types are best-effort.
- **CSS duplication**: resolved by the Jul 18, 2026 promotion — `/crm-admin2/crm.module.css` was deleted alongside the rest of the dev scaffold; the v2 CSS now lives at `/crm-admin/crm.module.css`.
- **No tests**: No test framework is set up for the CRM. Manual verification only.
- **No error boundaries**: Scaffold doesn't implement React error boundaries. A crash in one view takes down the whole app.
- **DB trigger `trigger_generate_offer` is dormant but harmless.** Two apartments still have non-null `generate_offer` values (`+917396428078`) in the DB — leftover from before the route was rewritten. The current `generate-offer/route.js` fires the n8n webhook directly from the API and writes nothing to the column (file header: "No DB write, no audit trail — n8n's execution log is the record"), so the trigger is no longer in the critical path. The stale non-null values are inert.
- **Send Offer pipeline live (Jul 19, 2026).** `send-offer/route.js` + UI buttons in `views.tsx` move an application's offer from `offers_in` → `offers_sent` so Deal / No Deal buttons become reachable. This is a pure DB state change — sends no message. The *messaging* step (the actual offer email to the agent) is the **Generate offer** button, now live as of Jul 20, 2026 — creates a Gmail draft in the logged-in agent's mailbox. See `DAVID_BLOCKERS.md` §1 for setup steps.

### Technical debt notes
- The old `crm-admin/page.jsx` (1329 lines, single-file client component) was deleted on Jul 18, 2026 when the v2 build was promoted. The new scaffold follows a similar pattern but with TypeScript and slightly more file separation. Neither the old nor new version uses React Query — data fetching is `useState` + `useEffect` + `fetch`. The kanban CRM (`/crm`) does use React Query. If `/crm-admin` grows complex, consider migrating to React Query (already a dependency).
- `zokoTemplates.js` has `reminder_documents_after_viewing_24h` with label "Doc reminder 24h" but the xlsx names it "17 hours". The Zoko ID is `sales_force_reminder_documents_after_viewing_24_hours` (has "24" in the ID itself). Need David to clarify if the timing changed or just the display name.
- The prototype references `pdf_apartment_utility` for segment broadcast, but `zokoTemplates.js` also has `sales_force_send_apartment_pdf` (individual send, 10 vars). Need to confirm which is used where.

---

## Reusable from existing codebase (no changes needed)

| Resource | Path | What it provides |
|---|---|---|
| CRM auth guards | `src/services/crmAuth.js` | `requireCrmUser`, `requireAdmin`, `requirePermission`, `serviceClient`, `anonClient` |
| CRM HTTP helpers | `src/services/crmHttp.js` | `failed()`, `invalidId()`, `isUuid()` |
| Zoko templates | `src/services/zokoTemplates.js` | 20 verified templates + 1 unverified, single source of truth |
| CRM API routes | `src/app/api/admin/crm/*` | All endpoints (lists, apartments, agents, invoices, team, send-template, booking-action) |
| Login route | `src/app/api/admin/login/route.js` | Email/password → Supabase Auth → crm_users check |
| Refresh route | `src/app/api/admin/crm/refresh/route.js` | Token refresh + active check |
| UI components | `src/components/ui/` | Button, Modal, Badge, Card, Input, Alert, Progress (CSS Modules, clsx-based) |
| Icons | `lucide-react` | Already a dependency |
| Toasts | `sonner` | Already a dependency |

---

## Phase hours (revised)

| Phase | Hours | Status |
|---|---|---|
| 0 — Scaffold | 3-4 | ✅ Done |
| 1 — Squad bug fixes | 3 | ✅ Done (code, not deployed) |
| 2 — Apartment creation + PDOK + uploads | 4 | ✅ Done |
| 3 — Pipeline + offer workflow + LOI | 5 | ✅ Done (Blocks A+B) |
| 4 — Invoices (VAT + PDF + email) | 2 | ✅ Done (Block C, PDF deferred) |
| 5 — Zoko flow triggers | 2 | Pending |
| 6 — Special offers | — | Out of scope |
| Segment broadcast | ~3 | Separate phase (queue + n8n) |
| **Total (0-5)** | **19-20h** | |

---

## Phase 2 files changed

| File | What changed |
|------|-------------|
| `src/app/crm-admin/views.tsx` | `CreateApartmentView` — full form state + PDOK blur lookup + Save → POST + navigate to record. `ApartmentRecordView` — PDF upload/view/replace wired, "Generate Meeting Links" button added to header. `TeamView` — full add-employee form state + permissions checkboxes + POST → shows temp password. |
| `src/app/crm-admin/modals.tsx` | `ModalState` type — `meetingLinks` now includes `aptId`. `MeetingLinksModal` — fully rewritten with start/end/slot inputs → POST `generate-slot` → shows generated Cal.com links. |
| `src/app/crm-admin/page.tsx` | `CreateApartmentView` call — passes `onCreated` callback (loadLists + openRecord). `MeetingLinksModal` render — passes `aptId`. `TeamView` call — passes `onAdded` (loadTeam) callback. |
| `src/app/api/admin/crm/pdok-lookup/route.js` | **NEW** — CRM-authed wrapper around `lookupBagAddress()` + `lookupBuildingDetails()` from `public-registers.ts`. Returns validated postcode + woonplaats + oppervlakte + bouwjaar. |

---

## Cal.com close/delete gap fix (Jul 17)

**Bug**: Won deals and hard deletes did not tear down Cal.com event types + schedules — tenants could still book viewings on closed/taken apartments.

| File | What changed |
|------|-------------|
| `src/app/api/admin/crm/apartment/[id]/close/route.js` | **NEW** — admin-only `POST`. Calls `deleteCalEvents()` with apartment's Cal.com IDs, flips `status` → `Closed`. Cal.com cleanup failures logged but don't block the close. |
| `src/app/api/admin/crm/apartment/[id]/route.js` | `DELETE` handler now fetches Cal.com IDs and calls `deleteCalEvents()` before the DB delete (mirrors `admin/dashboard/page.jsx:237-276`). |
| `src/app/api/admin/crm/apartment/[id]/mark-deal/route.js` | After deal confirmation + invoice creation, auto-closes the listing + tears down Cal.com (per David's confirmation #10). SELECT expanded to include `cal_event_type_id`, `cal_event_type_id_video`, `cal_schedule_id`, `status`. Cal.com failures logged but don't block the deal. |
| `src/app/crm-admin/views.tsx` | `ApartmentRecordView` — added "Close listing" button to header (admin-only, confirms before closing, calls `POST /api/admin/crm/apartment/[id]/close`, disabled if already `Closed`). |
| `src/services/zokoTemplates.js` | Line 50: label + timing changed from `24h` → `17h` (per David's confirmation #9). |

### Close flow
1. **Manual close** — agent clicks "Close listing" in ApartmentRecordView header → confirm → `POST /close` → Cal.com teardown + status `Closed`
2. **Auto-close on deal won** — `mark-deal` route confirms deal + creates invoice → calls `deleteCalEvents()` + sets status `Closed` automatically
3. **Hard delete** — `DELETE /apartment/[id]` calls `deleteCalEvents()` before removing the DB row