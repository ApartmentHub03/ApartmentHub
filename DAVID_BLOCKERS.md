# ApartmentHub CRM — Blockers needing David's input

**Last updated:** Jul 19, 2026
**Context:** CRM v2 at `/crm-admin` (promoted Jul 18, 2026).

Two pipeline buttons you should know about up front, because they sound similar but do different things:

| Button | What it does | Status |
|---|---|---|
| **Send offer** | Moves an application's offer from *Offers In* → *Offers Out* on the apartment so you can mark Deal / No Deal. Pure DB state change — sends no message. | ✅ **Done, works end-to-end.** Testable in the CRM today. No action needed. |
| **Generate offer** | Drafts (and optionally sends) the actual offer message — email and/or WhatsApp — to the tenant. Currently fires an n8n webhook. | ❌ **Blocked — needs your decision.** See §1. |

This file lists **only items blocked on David**. For everything already finished, see `CRM_BUILD_NOTES.md` → "What's done" sections.

---

## 1. Generate Offer — what should it actually send?

### The problem
The **Generate offer** button in the CRM (`views.tsx`) calls `/api/admin/crm/apartment/[id]/generate-offer`, which fires the n8n webhook at `https://davidvanwachem.app.n8n.cloud/webhook/send-offer-to-the-tenant`. n8n then sends a WhatsApp to the tenant — but:

1. The WhatsApp appears to come from the **agent's personal number** instead of ApartmentHub's centralized business WhatsApp number. The sender number is determined by which **Zoko API key** n8n uses, and n8n has its own Zoko credentials in n8n Cloud — we can't see or change them from this repo.
2. There is **no Zoko template** for "ApartmentHub sends an offer to a tenant". WhatsApp Business API requires a pre-approved template for every business-initiated message; we can't send free-text. The closest existing templates are wrong direction or wrong timing:
   - `thank_you_for_making_the_offer` (stage 7) — thanks the tenant for *their* offer
   - `pdf_apartment_utility` (stage 1) — listing brochure, not an offer
   - `deal` (stage 9) — sent to the winner *after* close

### Why we can't fix this in code alone
- n8n's Zoko credential lives in n8n Cloud, not in this repo.
- A new Zoko template must be created in Zoko (chat.zoko.io) by an account admin — we can't create templates via API.
- The decision of *what* Generate Offer should do (email / WhatsApp / both) is a product call.

### What we need from you

**Pick one option:**

- [ ] **Option A — Email only.** n8n drafts an email for the agent to review. Agent sends it manually. No WhatsApp to tenant.
  - You confirm n8n's `send-offer-to-the-tenant` workflow is set up for email drafting (not WhatsApp sending).
  - We update the API to tell n8n "email only, no WhatsApp".
- [ ] **Option B — WhatsApp only.** A WhatsApp message with offer details goes directly to the tenant, sent from Next.js using the centralized `ZOKO_API_KEY` (guarantees correct sender number — bypasses n8n entirely for the send step).
  - You design + create a new Zoko template (e.g. `send_offer_to_tenant`) in Dutch (offers are always Dutch per the prototype).
  - Suggested variables (adjust as you see fit):
    `{{1}}` Candidate name · `{{2}}` Apartment address · `{{3}}` Rent price (€/month) · `{{4}}` Start date · `{{5}}` "I have questions" link
  - Tell us the template ID + final variable order.
  - We add it to `src/services/zokoTemplates.js` and wire it into the Generate Offer API.
- [ ] **Option C — Both.** n8n drafts the email for the agent AND a WhatsApp notification goes to the tenant.
  - Same as Option B, plus confirm n8n still drafts the email.

**Once you pick, send us:** the option letter + (if B/C) the Zoko template ID and variable order. We'll do the code-side wiring.

---

## 2. n8n Cloud actions

### 2a. Verify existing workflows are **Active** (not just published)
In n8n Cloud, open each of these and confirm the top-right toggle is set to **Active**. An inactive workflow accepts webhook requests but does nothing with them — hard to spot from code.

- [ ] `send-offer-to-the-tenant`
- [ ] `deal-response`
- [ ] `trigger-status-change-active` (segment broadcasts)
- [ ] `trigger-status-change-create-link`

### 2b. Tell us what `send-offer-to-the-tenant` actually does
Open the workflow and tell us: does it draft an email? Send a WhatsApp? Both? This determines what we tell the API to do in §1.

### 2c. Verify Zoko credential in every WhatsApp-sending workflow
Every workflow that sends a WhatsApp via Zoko must use the centralized `ZOKO_API_KEY` **`e500fef1-e7da-4f8e-9453-82ea3ac2b145`** (ApartmentHub's business WhatsApp number). If n8n uses a different key, the WhatsApp comes from the agent's personal number — which is the bug you reported.

In n8n Cloud, open each workflow, find the Zoko send node (or HTTP Request node calling `chat.zoko.io/v2/message`), and check the `apikey` header / credential. Update to the centralized key if different.

Workflows to check:
- [ ] `send-offer-to-the-tenant`
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

- **After §1 (decision + Zoko template if B/C):** we wire `generate-offer/route.js` to match your choice. The **Generate offer** button works end-to-end.
- **After §2:** all WhatsApp sends come from ApartmentHub's business number; Phase 5 automations fire on the right events; the "Generate offer" sender bug you reported is fixed.
- **After §3:** mark-deal works without throwing; invoice PDFs persist to Storage; closer assignment works; Phase 5 triggers fire.
- **The Send Offer pipeline** (offers_in → offers_sent → deal → invoice) already works end-to-end and is testable in the CRM today, independent of all the above.