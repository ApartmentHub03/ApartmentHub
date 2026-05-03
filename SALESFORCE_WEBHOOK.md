# Salesforce Webhook — Payload Contract

This document specifies the JSON payloads sent from ApartmentHub to the Salesforce **unified webhook**. It is the source of truth for the Salesforce Apex handler (`UnifiedHandler.handleAptHub`).

- **Source code:** `supabase/functions/forward-docs-to-salesforce/index.ts`
- **Frontend triggers:** `src/_pages/Aanvraag.jsx`, `src/_pages/LetterOfIntent.jsx`
- **Live logs:** [Supabase dashboard → forward-docs-to-salesforce → Logs](https://supabase.com/dashboard/project/diovljzaabbfftcqmwub/functions/forward-docs-to-salesforce/logs)

---

## 1. Endpoint

```
POST https://apartmenthub--hubdev.sandbox.my.salesforce-sites.com/services/apexrest/unified/webhook?source=AptHub
```

### Headers

```
Content-Type: application/json
User-Agent: Supabase-Salesforce-Documents-Forwarder
```

No auth header — endpoint is unauthenticated (Salesforce-side).

---

## 2. How a single submission maps to HTTP calls

When a tenant submits the application (aanvraag) or signs the Letter of Intent (LOI), ApartmentHub fires **N + 1 POSTs** in sequence:

| # | event_type | Payload size | Purpose |
|---|---|---|---|
| 1 … N | `document_file` | Includes `file_base64` PDF bytes | One POST per uploaded document |
| N+1 | `documents_complete` | Metadata only, no base64 | Final summary so SF knows the batch is complete |

All N+1 POSTs in a single submission share the same `batch_id`. Use it to correlate them.

> **Note:** A single tenant can fire two batches per dossier — one on aanvraag submit (`trigger_source: "aanvraag"`) and one on signed-LOI submit (`trigger_source: "letterofintent"`). These have **different batch_ids** and should be treated as independent batches.

---

## 3. Payload — `event_type: "document_file"`

One POST per uploaded document, with the PDF carried as base64 in `document.file_base64`.

```json
{
  "source": "AptHub",
  "trigger_source": "aanvraag",
  "event_type": "document_file",
  "batch_id": "cfaffcab-3d99-426c-9b5f-79fe178b85fc-1777800579123",
  "batch_index": 1,
  "batch_total": 9,
  "account_id": "cfaffcab-3d99-426c-9b5f-79fe178b85fc",
  "apartment_id": "a0XAo000002Tc4fMAC",
  "tenant_name": "John Doe",
  "phone_number": "+31612345678",
  "salesforce_account_id": null,
  "timestamp": "2026-05-03T08:30:46.504Z",
  "document": {
    "id": "d7ecf82c-c393-4a10-8c8c-db943d556298",
    "type": "id_bewijs",
    "status": "ontvangen",
    "file_name": "id_bewijs.pdf",
    "file_path": "dossier-documents/31612345678/id_bewijs.pdf",
    "file_mime_type": "application/pdf",
    "file_size": 51234,
    "file_base64": "JVBERi0xLjQKJ..."
  },
  "person": {
    "name": "John Doe",
    "phone_number": "+31612345678",
    "role": "main_tenant",
    "server_id": "a8093a54-4ea9-4681-82d8-e32a59f871d2"
  }
}
```

### Important

- `document` and `person` are **siblings at the top level** — `person` is **NOT** nested inside `document`.
- `batch_index` is **1-based**.
- `file_base64` is the **raw base64 of the PDF bytes** (no `data:` prefix, no line breaks).

---

## 4. Payload — `event_type: "documents_complete"`

Fired once per batch, **after** all `document_file` POSTs. Contains all documents (including any without files), with `person` nested inside each. No base64 — this is metadata only.

```json
{
  "source": "AptHub",
  "trigger_source": "aanvraag",
  "event_type": "documents_complete",
  "batch_id": "cfaffcab-3d99-426c-9b5f-79fe178b85fc-1777800579123",
  "account_id": "cfaffcab-3d99-426c-9b5f-79fe178b85fc",
  "apartment_id": "a0XAo000002Tc4fMAC",
  "tenant_name": "John Doe",
  "phone_number": "+31612345678",
  "salesforce_account_id": null,
  "timestamp": "2026-05-03T08:30:46.504Z",
  "documents": [
    {
      "id": "d7ecf82c-c393-4a10-8c8c-db943d556298",
      "type": "id_bewijs",
      "status": "ontvangen",
      "file_name": "id_bewijs.pdf",
      "file_path": "dossier-documents/31612345678/id_bewijs.pdf",
      "person": {
        "name": "John Doe",
        "phone_number": "+31612345678",
        "role": "main_tenant",
        "server_id": "a8093a54-4ea9-4681-82d8-e32a59f871d2"
      }
    },
    {
      "id": "5ba3b0ad-b529-4161-8b70-3819f2fc8819",
      "type": "goed_huurderschap",
      "status": "ontvangen",
      "file_name": "goed_huurderschap.pdf",
      "file_path": "dossier-documents/31612345678/guarantor/goed_huurderschap.pdf",
      "person": {
        "name": "Suresh",
        "phone_number": "+919090909090",
        "role": "guarantor",
        "server_id": "a8093a54-4ea9-4681-82d8-e32a59f871d2"
      }
    },
    {
      "id": "e836b5ef-616a-4ae1-82ad-4bac1e3d480a",
      "type": "id_bewijs",
      "status": "ontvangen",
      "file_name": "id_bewijs.pdf",
      "file_path": "dossier-documents/31612345678/co-tenant/id_bewijs.pdf",
      "person": {
        "name": "Test User",
        "phone_number": "9999999999",
        "role": "co_tenant",
        "server_id": "a8093a54-4ea9-4681-82d8-e32a59f871d2"
      }
    }
  ]
}
```

### Important

- In this event `person` is **nested inside each document object** (not top-level).
- `documents[]` includes **every document row** for the dossier, even ones whose file is missing — those will have `file_path: null` and won't have a corresponding `document_file` POST.

---

## 5. Field reference

### Top-level fields (both events)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source` | string | yes | Always `"AptHub"` |
| `trigger_source` | string | yes | `"aanvraag"` or `"letterofintent"` — see §7 |
| `event_type` | string | yes | `"document_file"` or `"documents_complete"` |
| `batch_id` | string | yes | `<account_id>-<unix_ms>` — groups all POSTs for one submission |
| `account_id` | string (UUID) | yes | ApartmentHub account id |
| `apartment_id` | string \| null | yes | Salesforce apartment id the tenant selected. May be null. |
| `tenant_name` | string \| null | yes | Main tenant's display name |
| `phone_number` | string | yes | Main tenant's WhatsApp number, with `+` country code |
| `salesforce_account_id` | string \| null | yes | If known to AptHub; otherwise null and SF should resolve by phone |
| `timestamp` | string (ISO 8601) | yes | When the batch was assembled |

### `document_file` only

| Field | Type | Notes |
|---|---|---|
| `batch_index` | number | 1-based index within the batch |
| `batch_total` | number | Total number of `document_file` events in this batch |
| `document` | object | See §6 |
| `person` | object | See §6 — **sibling of `document`** |

### `documents_complete` only

| Field | Type | Notes |
|---|---|---|
| `documents` | array | Array of document objects, each with a nested `person` |

---

## 6. Nested object schemas

### `document` object

| Field | Type | In `document_file` | In `documents_complete[].documents` | Notes |
|---|---|---|---|---|
| `id` | string (UUID) | yes | yes | Document row id (stable across both events) |
| `type` | string | yes | yes | **Dutch enum** — see §7 |
| `status` | string | yes | yes | **Dutch enum** — see §7 |
| `file_name` | string | yes | yes | e.g. `"id_bewijs.pdf"` |
| `file_path` | string \| null | yes | yes (may be null) | Storage path (Supabase) |
| `file_mime_type` | string | yes | — | Usually `"application/pdf"` |
| `file_size` | number | yes | — | Byte size |
| `file_base64` | string | yes | — | Base64-encoded file bytes |

### `person` object

| Field | Type | Notes |
|---|---|---|
| `name` | string | Full name (`voornaam` + `achternaam` joined with a space) |
| `phone_number` | string | Person's phone number |
| `role` | string | **English enum** — see §7 |
| `server_id` | string (UUID) | Dossier id |

---

## 7. Enum values

### `document.type` (Dutch — DB-stored)

| Value | Meaning |
|---|---|
| `id_bewijs` | ID document |
| `inschrijfbewijs` | Registration certificate |
| `arbeidscontract` | Employment contract |
| `loonstroken` | Payslips |
| `goed_huurderschap` | Good tenant declaration |
| `jaarrekening` | Annual statement (self-employed / guarantor) |

### `document.status` (Dutch — DB-stored)

| Value | Meaning |
|---|---|
| `ontvangen` | Received (currently the only value sent) |

### `person.role` (English — translated by edge function)

| Value | DB value | Meaning |
|---|---|---|
| `main_tenant` | `Hoofdhuurder` | Main tenant |
| `co_tenant` | `Medehuurder` | Co-tenant |
| `guarantor` | `Garantsteller` | Guarantor |

### `trigger_source`

| Value | Meaning |
|---|---|
| `aanvraag` | Initial application submit (Aanvraag page) |
| `letterofintent` | Signed LOI submit (LetterOfIntent page) |

---

## 8. Behavior contract

### Language independence

The payload is **identical regardless of UI language** (NL `/nl/` or EN `/en/`). Locale only affects what the user sees on screen — values are taken from DB columns and the role mapping is a fixed lookup.

So:
- Top-level keys are always English.
- `document.type` / `document.status` are always Dutch enum values (DB-stored).
- `person.role` is always one of the three English values above.

### Idempotency

Use `batch_id` + `document.id` to deduplicate.

A tenant may complete:
1. Aanvraag → batch with `trigger_source: "aanvraag"`, fresh `batch_id`
2. LOI signing → batch with `trigger_source: "letterofintent"`, **different** `batch_id`

Treat these as independent batches; they will replay the same documents.

### Account resolution

- If `salesforce_account_id` is provided, use it directly.
- If null, resolve by `phone_number`. If no Salesforce Account exists, create one (the AptHub edge function only resolves on its own side; SF is expected to do the same on its side).

### Apartment

- `apartment_id` (when non-null) is the **Salesforce apartment record id** that the tenant selected on AppartementenSelectie.
- May be null if the tenant submitted without selecting an apartment, or for older accounts whose `apartment_selected` was never persisted.

### Failure handling on AptHub side

- AptHub fires each POST sequentially. A 5xx on one document does **not** stop the batch — subsequent documents and the summary still fire.
- AptHub does **not** retry on its own. The full batch can be replayed by re-triggering submission from the frontend.

---

## 9. Production debugging

Every outgoing payload and Salesforce response is logged to the Supabase Edge Functions log. To investigate a specific failure:

1. Open [the dashboard log page](https://supabase.com/dashboard/project/diovljzaabbfftcqmwub/functions/forward-docs-to-salesforce/logs).
2. Find the relevant timeframe.
3. Look for paired log lines:
   - `[forward-docs] REQUEST doc <i>/<n> <doc_id>: { ...full JSON, file_base64 redacted... }`
   - `[forward-docs] RESPONSE doc <i>/<n> <doc_id> -> <status> <body-or-OK>`
   - `[forward-docs] REQUEST summary batch=<batch_id>: { ...full JSON... }`
   - `[forward-docs] RESPONSE summary batch=<batch_id> -> <status> <body-or-OK>`

`file_base64` is replaced with `<NNN bytes redacted>` in logs — only the size is recorded, never the bytes.
