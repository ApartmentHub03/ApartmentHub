# ApartmentHub CRM — Blockers needing David's input

**Last updated:** Jul 18, 2026
**Context:** CRM v2 build at `/crm-admin` (promoted from `/crm-admin2` on Jul 18, 2026)

This file lists items that are blocked on David's action or decision. Each item
says what's blocked, what we need from you, and why it can't be solved in code
alone.

---

## 1. Generate Offer flow — needs your decision

### The problem
The "Generate Offer" button in the CRM currently fires an n8n webhook
(`send-offer-to-the-tenant`). n8n then sends a WhatsApp to the tenant — but
the WhatsApp appears to come from the **agent's personal number** instead of
ApartmentHub's centralized business number.

### Why we can't fix this in code
- The sender number is determined by which **Zoko API key** n8n uses.
- Our Next.js code uses the centralized `ZOKO_API_KEY` (`e500fef1-…`) which
  maps to ApartmentHub's business WhatsApp number.
- n8n has its own Zoko credentials configured in n8n Cloud — we can't see or
  change those from this repo.

### What we need from you
**Decision 1 — What should Generate Offer actually do?**
The original spec (`CRM_INTEGRATION_PLAN.md:71`) said "AI reads → email draft".
The prototype (`ApartmentHub-CRM-Prototype.html:356`) says Normal offer =
"AI fills them in and drafts the offer in the email · always in Dutch."
But you mentioned WhatsApp at some point, and n8n is currently sending a
WhatsApp message. Which do you want?

- [ ] **Option A — Email only.** n8n drafts an email for the agent to review.
      No WhatsApp to tenant. Agent sends the email manually.
      → We update the API to tell n8n "email only, no WhatsApp".
      → You confirm n8n's `send-offer-to-the-tenant` workflow is set up for
        email drafting (not WhatsApp sending).
- [ ] **Option B — WhatsApp only.** A WhatsApp message goes to the tenant with
      the offer details.
      → You design + create a new Zoko template (e.g. `send_offer_to_tenant`)
        with the wording you want. Tell us the template ID + variable order.
      → We wire it in code to send directly from Next.js using the centralized
        `ZOKO_API_KEY` (guarantees correct sender number).
- [ ] **Option C — Both.** n8n drafts the email for the agent AND a WhatsApp
        notification goes to the tenant.
      → Same as Option B, plus confirm n8n still drafts the email.

**Decision 2 — Fix n8n's Zoko credential (if you keep n8n for WhatsApp)**
- [ ] In n8n Cloud, open the `send-offer-to-the-tenant` workflow
- [ ] Find the Zoko send node (or HTTP Request node calling
      `chat.zoko.io/v2/message`)
- [ ] Check the `apikey` header / credential
- [ ] If it's not `e500fef1-e7da-4f8e-9453-82ea3ac2b145` (ApartmentHub
      centralized), update it to that key
- [ ] Do the same for these workflows (they all share the same credential):
      - `trigger-status-change-active` (segment broadcasts)
      - `trigger-status-change-create-link`
      - `deal-response`
      - Any viewing reminder / booking confirmation / document reminder
        workflow

---

## 2. Missing Zoko template — `send_offer_to_tenant`

### The problem
There is no Zoko template for "ApartmentHub sends an offer to a tenant".
Scanning `ApartmentHub-WhatsApp-Templates.xlsx` (all 20 templates) and
`src/services/zokoTemplates.js`:
- Stage 7 `thank_you_for_making_the_offer` — sent to tenant AFTER they submit
  their own offer (wrong direction — thanks them, doesn't send an offer)
- Stage 1 `pdf_apartment_utility` — sends the listing brochure PDF (not an
  offer)
- Stage 9 `deal` — sent to the winner AFTER deal is closed (wrong timing)

WhatsApp Business API requires a pre-approved template for every
business-initiated message. We can't send a free-text WhatsApp.

### What we need from you
- [ ] Design the template wording (in Dutch, since offers are always in Dutch
      per the prototype)
- [ ] Decide what variables it needs. Suggested:
      `{{1}}` Candidate name
      `{{2}}` Apartment address
      `{{3}}` Rent price (€/month)
      `{{4}}` Start date
      `{{5}}` "I have questions" link
      (adjust as you see fit)
- [ ] Create the template in Zoko (chat.zoko.io → Templates → New)
- [ ] Send us the template ID (e.g. `send_offer_to_tenant`) + the final
      variable order
- [ ] We'll add it to `src/services/zokoTemplates.js` and wire it into the
      Generate Offer API

---

## 3. n8n workflow activation — unverified

### The problem
We reference these n8n webhook URLs in code:
- `https://davidvanwachem.app.n8n.cloud/webhook/send-offer-to-the-tenant`
- `https://davidvanwachem.app.n8n.cloud/webhook/deal-response`
- `https://davidvanwachem.app.n8n.cloud/webhook/trigger-status-change-active`
- `https://davidvanwachem.app.n8n.cloud/webhook/trigger-status-change-create-link`

The URLs are live (they return 200), but we can't confirm from code whether
the workflows are **active** (running) or just **published but inactive**.
If inactive, the webhook accepts the request but does nothing with it.

### What we need from you
- [ ] In n8n Cloud, open each of the 4 workflows above
- [ ] Confirm the toggle in the top-right is set to **Active** (not inactive)
- [ ] For `send-offer-to-the-tenant` specifically: tell us what the workflow
      actually does when it receives a request (drafts an email? sends
      WhatsApp? both?) — this determines what we tell the API to do

---

## 4. Hausing + Grand relocation offer specs — Phase 6, out of scope

Per `CRM_BUILD_NOTES.md:44-45` and confirmed with you, these are Phase 6.
The buttons still appear in the UI (at `views.tsx:1416-1417`) but do the same
thing as Normal for now. They're labeled as placeholders.

- [ ] Hausing offer spec — "uses existing `/hausing-offer` skill" but no such
      skill exists. Need details on what this should do.
- [ ] Grand relocation offer spec — "submits to external relocation website".
      Need the API spec for the external website.

No action needed now — just keeping the buttons visible as placeholders.

---

## 5. Other items already in CRM_BUILD_NOTES.md (not repeated here)

See `CRM_BUILD_NOTES.md` → "Blocked on David" section for:
- ~~`documents_missing_before_viewing` Zoko template~~ — **RESOLVED Jul 18, 2026**. Replaced by `new_flow_upload_documents` (fetched live from Zoko, 2 vars: candidate name + upload URL). Wired in `src/services/zokoTemplates.js`.
- Edge function deploys (`add-person`, `auth-verify-code`)
- `Invoices` storage bucket creation in Supabase dashboard
- Migration `20260717010000_invoice_recipient_snapshot.sql` to apply
- Migration `20260718130000_add_assigned_crm_user_id.sql` to apply
- Confirm closer list (Lander/David/Kaj/Lucas)

---

## 6. Phase 5 — new n8n workflows needed

Phase 5 trigger wiring is done in code (3 new migrations + 2 code edits). Each
migration adds a webhook that fires on a specific event. David needs to create
matching n8n workflows at each URL below.

**Important — same Zoko credential issue as Generate Offer:** every workflow
below that sends a WhatsApp must use the centralized `ZOKO_API_KEY`
(`e500fef1-e7da-4f8e-9453-82ea3ac2b145`) in its Zoko send node. If n8n uses
a different API key, the WhatsApp will come from the agent's personal number
instead of ApartmentHub's business number. See section 1 (Decision 2) above.

### 6a. `viewing-start-reminder` (2 hours before viewing)

- **URL:** `https://davidvanwachem.app.n8n.cloud/webhook/viewing-start-reminder`
- **When it fires:** 2 hours before a viewing starts (pg_cron job
  `process-pre-viewing-reminders` every 5 min).
- **Payload fields:** `event_type`, `reminder_id`, `tenant_id`, `account_id`,
  `phone_number`, `tenant_name`, `apartment_id`, `apartment_address`,
  `viewing_start_time`, `reminder_interval` (`'2hr-before'`), `event_link`,
  `eventlink_video`, `timestamp`.
- **What n8n should do:** branch on whether the tenant booked the in-person
  link (`event_link`) or the video link (`eventlink_video`), then send the
  matching Zoko template:
  - In-person → `sales_force_booking_reminder_2_hours_in_person_viewing`
    (6 vars: name, address, agent name, agent contact, facetime link, cancel link)
  - Video → `sales_force_booking_reminder_2_hours_in_facetime_viewing`
    (5 vars: name, address, agent name, agent contact, cancel link)

### 6b. `pre-viewing-document-reminder` (24 hours before viewing)

- **URL:** `https://davidvanwachem.app.n8n.cloud/webhook/pre-viewing-document-reminder`
- **When it fires:** 24 hours before a viewing starts (same pg_cron job as 6a).
- **Payload fields:** same as 6a plus `upload_url`
  (`'https://apartmenthub.nl/upload-documents/'`).
- **What n8n should do:** send the `new_flow_upload_documents` Zoko template
  with `templateArgs = [tenant_name, upload_url]` (2 vars).

### 6c. `thank-you-for-offer` (first doc upload post-viewing)

- **URL:** `https://davidvanwachem.app.n8n.cloud/webhook/thank-you-for-offer`
- **When it fires:** after a candidate uploads their first document following
  a viewing they attended. Guarded by a `thank_you_offer_sent` table so it
  fires at most once per (account, apartment) pair.
- **Payload fields:** `event_type`, `account_id`, `tenant_name`,
  `whatsapp_number`, `apartment_id`, `apartment_address`,
  `viewing_start_time`, `upload_url`, `questions_link`, `timestamp`.
- **What n8n should do:** send the `thank_you_for_making_the_offer` Zoko
  template (zokoId `sales_force_thank_you_for_making_the_offer_`) with
  `templateArgs = [tenant_name, apartment_address, questions_link]` (3 vars).

### 6d. `agent-cancel-notification` (CRM-initiated cancel)

- **URL:** `https://davidvanwachem.app.n8n.cloud/webhook/agent-cancel-notification`
- **When it fires:** when an agent clicks "Cancel" on a participant in the
  CRM (`POST /api/admin/crm/booking-action` with `action: 'cancel'`).
- **Payload fields:** `event_type` (`'agent_cancel'`), `apartment_id`,
  `apartment_address`, `cancelled_participant` (`{name, whatsapp_number}`),
  `remaining_participants` (array of `{name, whatsapp_number}`), `timestamp`.
- **What n8n should do:** (1) Zoko Flow branch for the cancelled participant
  — "Really cancel or FaceTime?" offering to re-book as video instead. (2)
  Optionally notify `remaining_participants` that the viewing is still on.

### 6e. `agent-reschedule-notification` (CRM-initiated reschedule)

- **URL:** `https://davidvanwachem.app.n8n.cloud/webhook/agent-reschedule-notification`
- **When it fires:** when an agent clicks "Reschedule" on a participant in
  the CRM (`POST /api/admin/crm/booking-action` with `action: 'reschedule'`).
- **Payload fields:** `event_type` (`'agent_reschedule'`), `apartment_id`,
  `apartment_address`, `rescheduled_participant` (`{name, whatsapp_number}`),
  `remaining_participants` (array of `{name, whatsapp_number}`),
  `new_booking_link`, `new_video_booking_link`, `timestamp`.
- **What n8n should do:** loop through `remaining_participants` and send the
  `reschedule_viewing` Zoko template (zokoId
  `sales_force_reschedule_viewing`, 6 vars: name, address, new date, new
  time, cancel link, questions link) to each with the new booking link.

### Migrations to apply (Supabase SQL Editor)

- [ ] `supabase/migrations/20260718140000_pre_viewing_reminders.sql` —
      consolidates pre-viewing reminders AND skip-if-offer-made into one
      migration. Adds `viewing_start_time` column to the existing
      `viewing_reminders` table, rewrites `schedule_viewing_reminders()` to
      insert 6 rows per booking (4 post-viewing + 2 pre-viewing when
      start_time is in the future), rewrites `process_viewing_reminders()`
      to route by `reminder_interval` (post-viewing → existing
      `post-viewing-reminder` webhook + NEW skip-if-offer-made check;
      pre-viewing → new `viewing-start-reminder` /
      `pre-viewing-document-reminder` webhooks), reschedules the existing
      pg_cron job (same name, picks up new function body), and backfills
      pre-viewing rows for existing future viewings.
      **Non-destructive:** no DELETE, no unique index, no DROP. Dedup via
      per-interval `IF NOT EXISTS` checks in the trigger function (same
      pattern as the original `20260226020000` function, extended to 6
      intervals). Safe to run in Supabase SQL Editor — no destructive-
      operations warning.
- [ ] `supabase/migrations/20260718160000_thank_you_for_offer.sql` — new
      `thank_you_offer_sent` guard table + trigger on `documenten` (AFTER
      INSERT when status='ontvangen') that fires the n8n webhook on first
      post-viewing upload. Also adds `bestandspad`/`bestandsnaam`/`uploaded_at`
      columns to `documenten` if missing.

### Trigger #6 (auto-status updates) — no action needed

Trigger #6 (offer sent, viewing done, offer session open) relies on the
existing generic table-change feeds:
- `get-apartment-table-update` (any `apartments` row change)
- `get-tenant-table-update` (any `tenants` row change)
- `get-account-table-update` (any `accounts` row change)

David filters these in n8n for the specific status changes he cares about.
No new code or webhook URLs needed.

---

## Summary — what's blocking Generate Offer specifically

| Blocker | Who | Status |
|---|---|---|
| What should Generate Offer do (email vs WhatsApp vs both) | David decides | Open |
| n8n Zoko credential uses wrong API key | David fixes in n8n Cloud | Open |
| No Zoko template for "send offer to tenant" | David designs + creates in Zoko | Open |
| n8n workflows active (not just published) | David confirms in n8n Cloud | Open |
| Code-side wiring (once template exists) | Us | Blocked on above |

Until at least items 1 + 2 are resolved, the Generate Offer button will
continue to send WhatsApp from the agent's number via n8n — which is the bug
you reported. We can't fix that from the code side alone.