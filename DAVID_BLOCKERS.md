# ApartmentHub CRM — Blockers needing David's input

**Last updated:** Jul 20, 2026
**Context:** CRM v2 at `/crm-admin` (promoted Jul 18, 2026).

Two pipeline buttons you should know about up front, because they sound similar but do different things:

| Button | What it does | Status |
|---|---|---|
| **Send offer** | Moves an application's offer from *Offers In* → *Offers Out* on the apartment so you can mark Deal / No Deal. Pure DB state change — sends no message. | ✅ **Done, works end-to-end.** Testable in the CRM today. No action needed. |
| **Generate offer** | Creates a Gmail draft in the logged-in agent's mailbox addressed to the listing agent. Agent reviews + sends manually. | ✅ **Done (Option A).** See §1. |

This file lists **only items blocked on David**. For everything already finished, see `CRM_BUILD_NOTES.md` → "What's done" sections.

**Generate Offer pipeline live (Jul 20, 2026).** Agent clicks Generate offer in `/crm-admin` → a draft appears in their Gmail Drafts folder addressed to the apartment's listing agent, using the standard template (rent, deposit, start date, candidate bio, guarantor bio, per-agent signature with `horizontal-logo.png`). Bios are entered in the CRM ApplicationDetailView and persisted to `dossiers.candidate_bio` / `dossiers.guarantor_bio` for reuse. Code: `src/lib/gmail/client.js` (Workspace delegation), `src/lib/email/offerDraftTemplate.js` (template renderer), `generate-offer/route.js` (orchestrates fetch + draft creation). The old n8n `send-offer-to-the-tenant` webhook is no longer called — you can archive that workflow in n8n Cloud.

---

## 1. Generate Offer — ✅ DONE (Option A: Gmail draft)

### What was built
- **Gmail draft creation** via Google Workspace domain-wide delegation. A **dedicated Gmail service account** (`GMAIL_SERVICE_ACCOUNT_EMAIL` + `GMAIL_PRIVATE_KEY`, separate from the SEO SA) impersonates the logged-in agent's `crm_users.email` and creates a draft in their Gmail. Scope: `https://www.googleapis.com/auth/gmail.compose` (drafts only — no read/send of other mail). Falls back to the SEO SA (`GOOGLE_*`) if the dedicated vars are unset.
- **Per-agent signature** with `horizontal-logo.png`, agent name, "Real Estate Agent" title, email, mobile, and street address. Address is a new `crm_users.address` column — set it in the Team page (click the Address cell in the roster, or fill it when adding a new employee).
- **Candidate + guarantor bios** entered in the CRM ApplicationDetailView as textareas, persisted to `dossiers.candidate_bio` + `dossiers.guarantor_bio` so they're reusable when the candidate applies to another apartment. Falls back to `[EDIT BIO HERE]` placeholders in the draft if unset.
- **Candidate type auto-derived** from `personen` count + `werk_status` (e.g., "2 students", "single working person").
- **n8n webhook dropped.** The old `send-offer-to-the-tenant` webhook is no longer called from code. The n8n workflow can be archived in n8n Cloud — it's orphaned.

### Setup you need to complete (one-time, ~10 min)

- [ ] **Apply 2 migrations in Supabase SQL Editor:**
  ```sql
  ALTER TABLE public.dossiers
      ADD COLUMN IF NOT EXISTS candidate_bio TEXT,
      ADD COLUMN IF NOT EXISTS guarantor_bio TEXT;

  ALTER TABLE public.crm_users
      ADD COLUMN IF NOT EXISTS address TEXT;
  ```
- [x] **Grant Gmail delegation in Google Workspace Admin Console:**
  1. Google Cloud Console → the dedicated Gmail service account (`apartmenthub-gmail@argon-zoo-500515-r0.iam.gserviceaccount.com`) → copy its **Client ID** (numeric: `109009316148519629467`)
  2. admin.google.com → Security → API Controls → Manage Domain-Wide Delegation → Add new
  3. Client ID: paste the service account's Client ID
  4. OAuth scopes: `https://www.googleapis.com/auth/gmail.compose`
  5. Click Authorize
  - **Done — David configured the DWD entry Jul 21, 2026.**
- [ ] **Set each agent's street address** in `/crm-admin` → Team tab → click the Address cell in the roster → type → Save. New employees can be added with an address directly in the "Add employee" form.
- [ ] **Confirm each agent's `crm_users.email` is an `@apartmenthub.nl` Workspace account.** The route rejects non-`@apartmenthub.nl` emails with a clear 400 error. Personal Gmail accounts won't work with domain-wide delegation.

---

## 2. n8n Cloud actions

### 2a. Verify existing workflows are **Active** (not just published)
In n8n Cloud, open each of these and confirm the top-right toggle is set to **Active**. An inactive workflow accepts webhook requests but does nothing with them — hard to spot from code.

- [ ] `deal-response`
- [ ] `trigger-status-change-active` (segment broadcasts)
- [ ] `trigger-status-change-create-link`

> **Note:** The `send-offer-to-the-tenant` workflow is no longer called from code (Generate Offer now creates a Gmail draft directly — see §1). You can archive it in n8n Cloud.

### 2b. Verify Zoko credential in every WhatsApp-sending workflow
Every workflow that sends a WhatsApp via Zoko must use the centralized `ZOKO_API_KEY` **`e500fef1-e7da-4f8e-9453-82ea3ac2b145`** (ApartmentHub's business WhatsApp number). If n8n uses a different key, the WhatsApp comes from the agent's personal number — which is the bug you reported.

In n8n Cloud, open each workflow, find the Zoko send node (or HTTP Request node calling `chat.zoko.io/v2/message`), and check the `apikey` header / credential. Update to the centralized key if different.

Workflows to check:
- [ ] `trigger-status-change-active`
- [ ] `trigger-status-change-create-link`
- [ ] `deal-response`
- [ ] Any viewing reminder / booking confirmation / document reminder workflow

### 2d. Create 5 new Phase 5 workflows
Phase 5 trigger wiring is done in code (3 new migrations + 2 code edits). Each migration adds a webhook that fires on a specific event. David needs to create matching n8n workflows at each URL below. Every workflow that sends a WhatsApp must use the centralized `ZOKO_API_KEY` (see §2c).

#### `viewing-start-reminder` (2 hours before viewing)
- **URL:** `https://davidvanwachem.app.n8n.cloud/webhook/viewing-start-reminder`
- **When it fires:** 2 hours before a viewing starts (pg_cron job `process-pre-viewing-reminders` every 5 min).
- **Payload fields:** `event_type`, `reminder_id`, `tenant_id`, `account_id`, `phone_number`, `tenant_name`, `apartment_id`, `apartment_address`, `viewing_start_time`, `reminder_interval` (`'2hr-before'`), `event_link`, `eventlink_video`, `timestamp`.
- **What n8n should do:** branch on whether the tenant booked the in-person link (`event_link`) or the video link (`eventlink_video`), then send the matching Zoko template:
  - In-person → `sales_force_booking_reminder_2_hours_in_person_viewing` (6 vars: name, address, agent name, agent contact, facetime link, cancel link)
  - Video → `sales_force_booking_reminder_2_hours_in_facetime_viewing` (5 vars: name, address, agent name, agent contact, cancel link)

#### `pre-viewing-document-reminder` (24 hours before viewing)
- **URL:** `https://davidvanwachem.app.n8n.cloud/webhook/pre-viewing-document-reminder`
- **When it fires:** 24 hours before a viewing starts (same pg_cron job as above).
- **Payload fields:** same as `viewing-start-reminder` plus `upload_url` (`'https://apartmenthub.nl/upload-documents/'`).
- **What n8n should do:** send the `new_flow_upload_documents` Zoko template with `templateArgs = [tenant_name, upload_url]` (2 vars).

#### `thank-you-for-offer` (first doc upload post-viewing)
- **URL:** `https://davidvanwachem.app.n8n.cloud/webhook/thank-you-for-offer`
- **When it fires:** after a candidate uploads their first document following a viewing they attended. Guarded by the `thank_you_offer_sent` table so it fires at most once per (account, apartment) pair.
- **Payload fields:** `event_type`, `account_id`, `tenant_name`, `whatsapp_number`, `apartment_id`, `apartment_address`, `viewing_start_time`, `upload_url`, `questions_link`, `timestamp`.
- **What n8n should do:** send the `thank_you_for_making_the_offer` Zoko template (zokoId `sales_force_thank_you_for_making_the_offer_`) with `templateArgs = [tenant_name, apartment_address, questions_link]` (3 vars).

#### `agent-cancel-notification` (CRM-initiated cancel)
- **URL:** `https://davidvanwachem.app.n8n.cloud/webhook/agent-cancel-notification`
- **When it fires:** when an agent clicks "Cancel" on a participant in the CRM (`POST /api/admin/crm/booking-action` with `action: 'cancel'`).
- **Payload fields:** `event_type` (`'agent_cancel'`), `apartment_id`, `apartment_address`, `cancelled_participant` (`{name, whatsapp_number}`), `remaining_participants` (array of `{name, whatsapp_number}`), `timestamp`.
- **What n8n should do:** (1) Zoko Flow branch for the cancelled participant — "Really cancel or FaceTime?" offering to re-book as video instead. (2) Optionally notify `remaining_participants` that the viewing is still on.

#### `agent-reschedule-notification` (CRM-initiated reschedule)
- **URL:** `https://davidvanwachem.app.n8n.cloud/webhook/agent-reschedule-notification`
- **When it fires:** when an agent clicks "Reschedule" on a participant in the CRM (`POST /api/admin/crm/booking-action` with `action: 'reschedule'`).
- **Payload fields:** `event_type` (`'agent_reschedule'`), `apartment_id`, `apartment_address`, `rescheduled_participant` (`{name, whatsapp_number}`), `remaining_participants` (array of `{name, whatsapp_number}`), `new_booking_link`, `new_video_booking_link`, `timestamp`.
- **What n8n should do:** loop through `remaining_participants` and send the `reschedule_viewing` Zoko template (zokoId `sales_force_reschedule_viewing`, 6 vars: name, address, new date, new time, cancel link, questions link) to each with the new booking link.

---

## 3. Supabase dashboard actions

### 3a. Create `Invoices` storage bucket (private)
- [ ] In Supabase dashboard → Storage → New bucket → name: `Invoices` → **private**.
- Invoice PDFs upload to path `invoices/{invoice_id}/invoice-{number}.pdf`.
- If missing: the invoice email still sends (PDF attached), but `pdf_path` won't persist and the PDF won't be retrievable later from the dashboard.

### 3b. Apply migrations (paste each into Supabase SQL Editor and run)
All four are **non-destructive** — no `DELETE`, no `DROP`, no unique-index additions. Safe to run in the SQL Editor.

- [ ] **`20260717010000_invoice_recipient_snapshot.sql`**
  Why: adds `recipient_name`, `recipient_address`, `recipient_zipcode`, `recipient_city`, `recipient_country` columns to `invoices`. Without this, mark-deal throws on insert (columns won't exist).
- [ ] **`20260718130000_add_assigned_crm_user_id.sql`**
  Why: adds `assigned_crm_user_id` column to `apartments` for closer assignment in DealModal.
- [ ] **`20260718140000_pre_viewing_reminders.sql`** (Phase 5, consolidated)
  Why: adds `viewing_start_time` column to existing `viewing_reminders` table; rewrites `schedule_viewing_reminders()` to insert 6 rows per booking (4 post-viewing + 2 pre-viewing when start_time is in the future); rewrites `process_viewing_reminders()` to route by `reminder_interval` (post-viewing → existing `post-viewing-reminder` webhook + new skip-if-offer-made check; pre-viewing → new `viewing-start-reminder` / `pre-viewing-document-reminder` webhooks); reschedules the existing `process-viewing-reminders` pg_cron job (same name, picks up new function body); backfills pre-viewing rows for existing future viewings. **No new table, no new cron job.**
- [ ] **`20260718160000_thank_you_for_offer.sql`** (Phase 5)
  Why: new `thank_you_offer_sent` guard table + trigger on `documenten` (AFTER INSERT when `status='ontvangen'`) that fires the n8n `thank-you-for-offer` webhook on first post-viewing upload. Also adds `bestandspad` / `bestandsnaam` / `uploaded_at` columns to `documenten` if missing. The guard table is needed because `dossier/save` deletes + re-inserts all `documenten` rows on every save — without it the trigger would fire N times per save.

### 3c. Deploy 2 edge functions via Supabase dashboard
CLI not installed on your dev machine — deploy from the dashboard (Functions → New function → paste code from `supabase/functions/<name>/index.ts`).

- [ ] **`add-person`** — JWT fix (was failing auth verification)
- [ ] **`auth-verify-code`** — role lookup fix (was not finding `crm_users` row)

---

## 4. Misc confirmation

- [ ] **Confirm closer list.** DealModal uses `crm_users` (active team members) for the closer dropdown. The prototype shows Lander / David / Kaj / Lucas — confirm all four are in `crm_users` and any others you want are too.

---

## 5. Out of scope (Phase 6, no action now)

- **Hausing offer** — originally noted as "uses existing `/hausing-offer` skill" but no such skill exists. Need spec.
- **Grand relocation offer** — "submits to external relocation website". Need the external site's API spec.

Buttons stay visible in the CRM UI as placeholders (`views.tsx:1548-1549`); both currently do the same thing as Normal offer. No action needed — kept here so they're not forgotten when Phase 6 starts.

---

## What happens after you complete the above

- **§1 (Generate Offer):** ✅ code done. Once you complete the §1 setup checklist (apply migrations + grant Gmail delegation + set agent addresses), the **Generate offer** button works end-to-end.
- **After §2:** all WhatsApp sends come from ApartmentHub's business number; Phase 5 automations fire on the right events; the "Generate offer" sender bug you reported is fixed.
- **After §3:** mark-deal works without throwing; invoice PDFs persist to Storage; closer assignment works; Phase 5 triggers fire.
- **The Send Offer pipeline** (offers_in → offers_sent → deal → invoice) already works end-to-end and is testable in the CRM today, independent of all the above.