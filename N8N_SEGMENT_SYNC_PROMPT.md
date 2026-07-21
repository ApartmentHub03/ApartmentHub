# n8n AI Prompt: Daily Zoko -> CRM Segment Sync

Use this prompt in n8n's AI workflow builder to create the daily sync that imports active Zoko WhatsApp contacts into the ApartmentHub CRM segment system.

---

## Goal

Create an n8n workflow that runs once per day, fetches all active Zoko contacts, and pushes them to the CRM so the CRM segment counts and broadcasts reflect real Zoko data.

---

## CRM Sync Endpoint

```text
POST https://<your-domain>/api/admin/crm/sync/zoko-contacts
```

### Required headers

```text
Content-Type: application/json
X-n8n-Secret: n8n-segment-crm
```

### Request body

```json
{
  "contacts": [
    {
      "phone": "+31 6 12345678",
      "name": "John Doe",
      "email": "john@example.com",
      "zoko_customer_id": "abc123",
      "tags": ["€1500 - €2000", "2 Bedrooms", "Amsterdam"]
    }
  ],
  "batchId": "2026-07-23-001",
  "isFinalBatch": false
}
```

Rules:

- `contacts` is an array. Max 500 contacts per request.
- `batchId` must be the same string for every batch in one sync run.
- `isFinalBatch` must be `false` for every batch except the last one.
- On the last batch set `isFinalBatch` to `true` so the CRM archives stale contacts not seen in this run.
- Only send active Zoko contacts. Do NOT send archived contacts.
- Phone numbers can include `+`, spaces, etc. The CRM normalizes them to digits only.
- `tags` must include Zoko price and bedroom tags so the CRM can assign the contact to the right segments.

---

## Workflow steps

1. **Schedule trigger**
   - Daily at 02:00 AM.

2. **Generate batch ID**
   - `batchId` = current date in `YYYY-MM-DD-001` format.
   - Increment the suffix if the workflow runs more than once per day.

3. **Fetch active contacts from Zoko**
   - Use the Zoko node or HTTP Request node.
   - Get fields: `phone`, `name`, `email`, `zoko_customer_id`, and `tags`.
   - Filter out archived contacts.
   - Skip contacts with empty phone.

4. **Transform each contact**
   - Ensure `tags` is an array of strings.
   - Trim `name` and `email`.
   - Remove `+` and non-digits from `phone` if you prefer, but the CRM also does this.

5. **Split into batches of 500**

6. **Loop over batches**
   - POST each batch to `/api/admin/crm/sync/zoko-contacts`.
   - Retry up to 3 times on HTTP error with exponential backoff.
   - Stop and alert if a batch still fails.

7. **Final batch**
   - On the last batch set `"isFinalBatch": true`.
   - This triggers archiving of contacts that were previously synced but are no longer in Zoko.

8. **Log / alert**
   - The CRM response contains:
     - `created` — new member rows inserted.
     - `updated` — existing rows changed.
     - `unchanged` — no changes.
     - `failed` — insert/update errors.
     - `skippedExcluded` — contacts filtered out for having excluded tags.
     - `archivedStale` — contacts archived because they were not in this sync run.
   - Log the totals or send a summary to Slack/email.

---

## Expected Zoko tags

The CRM recognizes these tag patterns:

**Price ranges (€1250 - €1500 up to €5000+):**

- `€1250 - €1500`
- `€1500 - €2000`
- `€2000 - €2500`
- `€2500 - €3000`
- `€3000 - €3500`
- `€3500 - €4000`
- `€4000 - €4500`
- `€4500 - €5000`
- `€5000+`

**Bedroom counts:**

- `1 Bedroom`
- `2 Bedrooms`
- `3 Bedrooms`
- `4 Bedrooms`
- `4+ Bedrooms` (mapped to 4 Bedrooms segments)

**Excluded tags (contacts with these tags are ignored):**

- `ARCHIVED`
- `OPT_OUT` / `OPT-IN`
- `Rotterdam`
- `Almere`
- `student` (optionally excluded by the CRM user in the broadcast modal)

---

## How the CRM uses the synced data

### Segment counts

`GET /api/admin/crm/segments` returns the 36 canonical price x bedroom segments with live member counts from `candidate_segment_members`.

Example segment:

```json
{
  "id": "1500-2000-2",
  "name": "€1500 - €2000 · 2 Bedrooms",
  "min_budget": 1500,
  "max_budget": 2000,
  "min_bedrooms": 2,
  "count": 51
}
```

### Broadcast

When a CRM user clicks **Send via WhatsApp** on an apartment, the CRM posts to:

```text
POST /api/admin/crm/apartment/<apartment-id>/broadcast
```

The CRM then fires the existing n8n webhook:

```text
https://davidvanwachem.app.n8n.cloud/webhook/trigger-status-change-active
```

Payload shape:

```json
{
  "event_type": "status_changed_to_active",
  "trigger_operation": "UPDATE",
  "apartment": { ...all apartment fields... },
  "matched_tenants": [
    {
      "phone": "31612345678",
      "name": "John Doe",
      "email": "john@example.com",
      "tags": ["€1500 - €2000", "2 Bedrooms"],
      "zoko_customer_id": "abc123"
    }
  ],
  "matched_tenants_count": 1,
  "timestamp": "2026-07-23T02:00:00.000Z"
}
```

The n8n workflow receiving this webhook must:

1. Loop through `matched_tenants`.
2. Send the `pdf_apartment_utility` Zoko template to each `phone`.
3. Map apartment fields to the template variables:
   - `Brochure PDF URL`
   - `Candidate name`
   - `Address`
   - `Price (€/month)`
   - `Bedrooms`
   - `Square meters`
   - `Additional note`
   - `In-person viewing link`
   - `Facetime viewing link`
   - `"I have questions" link`
   - `Unsubscribe link`

### Test broadcasts

The CRM broadcast modal has a **Test mode** toggle. When enabled, the payload contains exactly one tenant:

```json
{
  "event_type": "status_changed_to_active",
  "trigger_operation": "UPDATE",
  "apartment": { ... },
  "matched_tenants": [
    {
      "phone": "31612345678",
      "name": "Test recipient",
      "email": null,
      "tags": ["test_broadcast"],
      "zoko_customer_id": null
    }
  ],
  "matched_tenants_count": 1,
  "timestamp": "2026-07-23T12:00:00.000Z"
}
```

Use this to verify the Zoko template and routing before sending to a real segment.

---

## Notes

- The CRM normalizes phones to digits only and matches/merges by normalized phone.
- A contact can belong to multiple segments (e.g. overlapping price ranges or multiple bedroom tags). The CRM creates one row per matching segment.
- Do not change the hardcoded secret `n8n-segment-crm`; it is shared between the CRM route and this workflow.
- If Zoko does not expose a bulk contacts API, use a scheduled export from the Zoko dashboard and feed it into n8n via a local file or webhook.
