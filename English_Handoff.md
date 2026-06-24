# ApartmentHub · Developer Handoff (Buy / Sell / Rent)

This document is the complete, implementation-ready guide for completing and expanding the ApartmentHub website. It consists of two parts:

1. **What needs to go live now** (lead capture + confirmation email) — the front-end is complete; this section covers backend, infrastructure, and API keys.
2. **What David wants to build on top of it** — an internal lead dashboard with a Kanban board, automations, and a customer portal where sellers can upload documents to start the sales process.

The document is written to be followed by a developer from top to bottom. The **SETUP CHECKLIST** at the end defines the implementation phases; above it are the rationale, data model, SQL, automation specifications, and edge function skeletons.

* Repository: `github.com/Davidvanwachem/apartmenthub-rentals-oasis` (branch `main`)
* Stack: Vite + React + TypeScript + Tailwind + shadcn/ui + react-router + react-i18next
* Hosting: Vercel (auto-deploy on push to `main`), connected to Lovable
* Supabase project ID: `vordjtqtqrzvqvuzogop` (see `supabase/config.toml`)
* Default language: Dutch, English via `/en` routes and i18next namespaces

---

# Table of Contents

1. Architecture Overview
2. Existing Lead Flow and Data Model (Current State)
3. Target Architecture: Dashboard, Automations, Portal
4. Data Model with SQL (Leads, Events, Documents, Clients)
5. Pipeline Stages (Kanban Columns)
6. Automations (Trigger → Action)
7. Customer Portal Specification (For Sellers)
8. Edge Functions (Skeletons)
9. Recommended Libraries
10. Security (RLS, Storage, Environment Variables)
11. Setup Checklist (Phases 1–4)
12. Assumptions

---

# 1. Architecture Overview

The public website remains exactly as it is: a static React application hosted on Vercel. Each lead form submission writes a row to Supabase and invokes the `send-lead-confirmation` edge function.

On top of this, two additional layers will be added:

* An internal layer (dashboard + automation)
* An external layer (customer portal)

Everything runs within the same Supabase project. Separation is handled through Row Level Security (RLS) policies and route protection.

```text
                         PUBLIC WEBSITE (Vercel, anon key)
Property valuation · buying power · buyer intake · rentals · contact · newsletter
                                   |
                    insert into lead table + invoke send-lead-confirmation
                                   v
+------------------------------------------------------------------------------+
|                         SUPABASE (vordjtqtqrzvqvuzogop)                      |
|                                                                              |
|   Postgres                          Edge Functions            Storage         |
|   - leads (unified table)           - send-lead-confirmation  - client-docs  |
|   - lead_events (activity log)      - portal-invite             (private)     |
|   - documents                       - notify-document-upload                |
|   - clients (portal mapping)        - existing upload-document              |
|   - pipeline_stages (config)        - existing auth-*                       |
|                                                                              |
|   DB triggers --> pg_net / supabase_functions.http_request --> edge fn       |
|   Realtime (postgres_changes) --> dashboard live updates                    |
|   Auth (magic links) --> customer portal sessions                           |
+------------------------------------------------------------------------------+
        ^                                   ^                         ^
        |                                   |                         |
   INTERNAL DASHBOARD                   AUTOMATION              CUSTOMER PORTAL
   /dashboard (team auth)              (DB trigger/n8n)       /portal (magic link)
   - Kanban board                      email, portal invite   - sales progress
   - One card per lead                 Auth user creation     - document uploads
   - Drag = stage change                                      - timeline
```

### Three Core Principles

#### 1. One Source of Truth for Leads

The existing per-type tables (`waardebepaling_leads`, `koopkracht_leads`, etc.) may remain for public form submissions, but every lead must also end up in a unified `leads` table.

The dashboard reads only from `leads`.

#### 2. Automations Are Triggered by Stage Changes

Automations are attached to stage transitions, not buttons.

When a lead moves to another Kanban column, it triggers a database update. All automation logic is attached to that update.

#### 3. Customers and Team Members Share One Database

Both customer portal users and internal staff use the same database.

Access is separated through RLS:

* Team members (authenticated users with role `team`) can view everything.
* Customers can only view:

  * Their own lead
  * Their own documents
  * Their own timeline

---

# 2. Existing Lead Flow and Data Model (Current State)

This is what is currently running.

Read this section first.

Phase 1 makes the current setup production-ready.

Phases 2–4 build on top of it.

---

## 2.1 Lead Flow per Form

| Page                        | File                                      | Existing DB Insert                         | Invokes `send-lead-confirmation` With Type |
| --------------------------- | ----------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Property Valuation (seller) | `src/components/WaardebepalingWidget.tsx` | `waardebepaling_leads`                     | `waardebepaling`                           |
| What Can I Buy?             | `src/pages/Koopkracht.tsx`                | `koopkracht_leads`                         | `koopkracht`                               |
| Buyer Intake                | `src/pages/KoopLead.tsx`                  | `koop_leads` (best effort, fails silently) | `koopaanvraag`                             |
| Buying Power Calculator     | `src/pages/KoopkrachtBerekenen.tsx`       | None (calculator only)                     | No                                         |
| Contact Form                | `src/pages/Contact.tsx`                   | None                                       | `contact`                                  |
| Newsletter Signup           | `src/components/Footer.tsx`               | None                                       | `nieuwsbrief`                              |
| Rent Out Property           | `src/pages/RentOut.tsx`                   | None                                       | `verhuur`                                  |

### Existing Email Function

The edge function:

```text
supabase/functions/send-lead-confirmation/index.ts
```

currently sends two emails through Resend:

1. Confirmation email to the lead
2. Notification email to `david@apartmenthub.nl`

Sender:

```text
ApartmentHub <noreply@apartmenthub.nl>
```

---

## 2.2 Data Collected by Each Lead Type

This is important because it determines the structure of the unified `leads.payload` JSON column.

The field names below are the actual field names used in the front-end.

---

### Property Valuation (Seller)

Table:

```text
waardebepaling_leads
```

Stores:

```text
adres
postcode
stad
wijk
oppervlakte
type
bouwperiode
staat
energielabel
buitenruimte
parkeren
voornaam
achternaam
email
telefoon
geschatte_waarde_laag
geschatte_waarde_hoog
```

Important:

The front-end also sends:

```text
souterrain
```

but no database column currently exists for it.

It does appear in the lead email.

---

### Buying Power (Buyer)

Table:

```text
koopkracht_leads
```

Stores:

```text
stad
wijken (text[])
budget_band
koopkracht
min_m2
min_slaapkamers
voornaam
achternaam
email
telefoon
```

Important:

The front-end also collects:

```text
woningtypes
```

(multiple property types)

but this field is NOT inserted into the database.

It only appears in the lead email.

---

### Buyer Intake

Table:

```text
koop_leads
```

The insert sends the full intake object from:

```text
KoopLead.tsx
```

(TypeScript type `LeadData`)

Fields include:

```text
journey
firstName
lastName
email
phone
nationality
buyerType
livesInNL
household
saleDependency
mortgageStatus
budget
ownCapital
maxMortgage
neighborhoods[]
otherNeighborhood
minBedrooms
propertyType
minSqm
propertyCondition
mustHaves[]
timeline
agreed
marketingOptIn
city
timestamp
```

Important:

The table:

```text
koop_leads
```

DOES NOT EXIST.

No migration has ever created it.

The insert is wrapped in a try/catch block and silently fails.

The full intake is still emailed to ApartmentHub.

---

### Rental Leads (Landlords)

No table exists.

Two forms in:

```text
RentOut.tsx
```

send only email notifications.

Fields:

```text
address
postalCode
email
phone
```

Optional:

```text
squareMeters
rooms
```

---

### Contact & Newsletter

These are email-only.

No database tables exist.

---

## 2.3 Existing Database Tables

Based on:

```text
supabase/migrations/
src/integrations/supabase/types.ts
```

### Existing

#### `waardebepaling_leads`

Exists.

Migration:

```text
20260618073521
```

RLS enabled.

Anonymous users can INSERT.

---

#### `koopkracht_leads`

Exists.

Migration:

```text
20260618130725
```

RLS enabled.

Anonymous users can INSERT.

---

#### `koop_leads`

DOES NOT EXIST.

Must be created during Phase 1.

---

### Existing Tenant-Dossier System

Migration:

```text
20251130133828
```

Contains:

```text
dossiers
personen
documenten
biedingen
verification_codes
```

Authentication:

* WhatsApp verification codes
* `auth-send-code`
* `auth-verify-code`

Document upload:

```text
upload-document
```

This system is NOT used for buying/selling.

However, it serves as a useful reference implementation for:

* document checklists
* upload workflows
* document statuses
* portal logic

The new seller portal should reuse the pattern, but not the tables themselves.

The seller portal will use:

* Supabase Auth
* Magic Links

instead of WhatsApp authentication.

-------------------------------------------------------------------
# ApartmentHub · Developer Handoff (Part 2)

## 3. Target Architecture: Dashboard, Automations, Portal

What David wants to build on top of the existing lead-capture system:

### 1. Internal Lead Dashboard with Kanban Board

Every incoming lead (buyer intake, buying power, property valuation, rental, contact) becomes a card.

The team can drag cards between pipeline stages (columns).

Every column transition can trigger one or more automations.

### 2. Automations

As soon as a lead enters the system (or moves to a specific stage), automated emails are sent.

For sellers (property valuation / sales leads), these emails also invite them into the customer portal.

### 3. Customer Portal for Sellers

Customers log in using a magic link and can:

* View the progress of their property sale
* Upload required documents
* Follow milestones and activity updates

Only when all required documents have been uploaded can the sales process move forward.

---

# 4. Data Model with SQL

The following SQL is intended as new migrations inside:

```text
supabase/migrations/
```

Execute the migrations in order.

Statements are idempotent where possible using `IF NOT EXISTS`.

---

## 4.1 Enums

### Lead Type

Defines which form generated the lead.

```sql
create type public.lead_type as enum (
  'waardebepaling',   -- property valuation (seller)
  'verkoop',          -- seller lead
  'koopaanvraag',     -- buyer intake
  'koopkracht',       -- buying power
  'verhuur',          -- rental property owner
  'contact',          -- general contact
  'nieuwsbrief'       -- newsletter signup
);
```

### Lead Stage

Buyers and sellers share one stage enum.

The stages that apply to each lead type are controlled through the
`pipeline_stages` configuration table.

```sql
create type public.lead_stage as enum (
  'nieuw',
  'gekwalificeerd',
  'intake_gepland',
  'portaal_uitgenodigd',
  'documenten_compleet',
  'actief',
  'bod_onderhandeling',
  'gesloten_gewonnen',
  'gesloten_verloren'
);
```

English meanings:

| Dutch               | English             |
| ------------------- | ------------------- |
| nieuw               | New                 |
| gekwalificeerd      | Qualified           |
| intake_gepland      | Intake Scheduled    |
| portaal_uitgenodigd | Portal Invited      |
| documenten_compleet | Documents Complete  |
| actief              | Active              |
| bod_onderhandeling  | Offer / Negotiation |
| gesloten_gewonnen   | Closed Won          |
| gesloten_verloren   | Closed Lost         |

---

### Lead Event Type

Activity log event categories.

```sql
create type public.lead_event_type as enum (
  'created',
  'stage_changed',
  'assigned',
  'email_sent',
  'note_added',
  'portal_invited',
  'document_uploaded',
  'document_reviewed'
);
```

---

### Document Status

```sql
create type public.document_status as enum (
  'ontbreekt',
  'ontvangen',
  'goedgekeurd',
  'afgekeurd'
);
```

English:

| Dutch       | English  |
| ----------- | -------- |
| ontbreekt   | Missing  |
| ontvangen   | Received |
| goedgekeurd | Approved |
| afgekeurd   | Rejected |

---

# 4.2 leads — Unified Lead Table

This becomes the single source of truth for the dashboard.

Public forms may:

### Option A (Recommended)

Insert directly into:

```text
public.leads
```

or

### Option B

Continue writing into legacy per-type tables while database triggers copy records into `leads`.

---

### SQL

```sql
create table public.leads (
  id              uuid primary key default gen_random_uuid(),
  type            public.lead_type  not null,
  stage           public.lead_stage not null default 'nieuw',
  assignee_id     uuid references auth.users(id) on delete set null,

  -- Normalized contact fields
  voornaam        text,
  achternaam      text,
  email           text,
  telefoon        text,

  -- Location information
  adres           text,
  postcode        text,
  stad            text,
  wijk            text,

  -- All type-specific fields
  payload         jsonb not null default '{}'::jsonb,

  -- Internal notes + source
  notes           text,
  source          text default 'website',

  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Last stage transition timestamp
  stage_changed_at timestamptz not null default now()
);
```

---

### Indexes

```sql
create index idx_leads_type        on public.leads (type);
create index idx_leads_stage       on public.leads (stage);
create index idx_leads_assignee    on public.leads (assignee_id);
create index idx_leads_created_at  on public.leads (created_at desc);
create index idx_leads_email       on public.leads (email);
create index idx_leads_payload_gin on public.leads using gin (payload);
```

---

### Automatically Update updated_at

```sql
create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.update_updated_at_column();
```

---

### Automatically Update stage_changed_at

```sql
create or replace function public.set_stage_changed_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at = now();
  end if;
  return new;
end; $$;

create trigger trg_leads_stage_changed
  before update on public.leads
  for each row execute function public.set_stage_changed_at();
```

---

# 4.3 lead_events — Activity Log

Every meaningful action on a lead is stored here.

Examples:

* Stage changes
* Emails sent
* Notes added
* Documents uploaded
* Portal invitations

This table powers:

* Dashboard timeline
* Customer portal timeline

---

### SQL

```sql
create table public.lead_events (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,

  type        public.lead_event_type not null,

  -- Team member responsible
  actor_id    uuid references auth.users(id) on delete set null,

  -- Human-readable description
  description text,

  -- Structured metadata
  meta        jsonb not null default '{}'::jsonb,

  -- Visible in customer portal?
  client_visible boolean not null default false,

  created_at timestamptz not null default now()
);
```

---

### Indexes

```sql
create index idx_lead_events_lead
  on public.lead_events (lead_id, created_at desc);

create index idx_lead_events_visible
  on public.lead_events (lead_id)
  where client_visible;
```

---

### Automatically Log Stage Changes

```sql
create or replace function public.log_stage_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.lead_events (
      lead_id,
      type,
      description,
      meta,
      client_visible
    )
    values (
      new.id,
      'stage_changed',
      format('%s -> %s', old.stage, new.stage),
      jsonb_build_object(
        'from', old.stage,
        'to', new.stage
      ),
      true
    );
  end if;
  return new;
end; $$;

create trigger trg_leads_log_stage
  after update on public.leads
  for each row execute function public.log_stage_change();
```

---

# 4.4 clients — Customer Portal Mapping

Links a Supabase Auth user to a lead.

This is intentionally separate from `leads`.

Reason:

A customer may eventually have multiple properties or multiple sales journeys.

---

### SQL

```sql
create table public.clients (
  id          uuid primary key default gen_random_uuid(),

  -- Customer auth user
  user_id     uuid unique references auth.users(id)
               on delete cascade,

  lead_id     uuid not null references public.leads(id)
               on delete cascade,

  email       text not null,
  voornaam    text,
  achternaam  text,

  created_at timestamptz not null default now()
);
```

---

### Indexes

```sql
create index idx_clients_user on public.clients (user_id);
create index idx_clients_lead on public.clients (lead_id);
```

---

# 4.5 documents — Document Checklist

Each seller lead gets a checklist of expected documents.

Workflow:

### Portal Invitation

When invited:

All checklist rows are created with status:

```text
ontbreekt (Missing)
```

### Customer Upload

Status becomes:

```text
ontvangen (Received)
```

### Team Review

Status becomes:

```text
goedgekeurd (Approved)
```

or

```text
afgekeurd (Rejected)
```

---

### SQL

```sql
create table public.documents (
  id          uuid primary key default gen_random_uuid(),

  lead_id     uuid not null references public.leads(id)
               on delete cascade,

  doc_type    text not null,
  label       text not null,

  is_required boolean not null default true,

  status      public.document_status
               not null default 'ontbreekt',

  storage_path text,

  uploaded_at timestamptz,

  reviewed_by uuid references auth.users(id)
               on delete set null,

  review_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (lead_id, doc_type)
);
```

---

### Example Storage Path

```text
<lead_id>/id_bewijs/passport.pdf
```

Stored in the private bucket:

```text
client-docs
```

---

### Index

```sql
create index idx_documents_lead
  on public.documents (lead_id);
```

---

### Automatically Update updated_at

```sql
create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.update_updated_at_column();
```

---

# 4.6 pipeline_stages — Configurable Kanban Columns

Pipeline columns must NOT be hardcoded in React.

The UI should load them from the database.

This allows:

* Adding stages
* Renaming stages
* Reordering stages

without a deployment.

---

### SQL

```sql
create table public.pipeline_stages (
  id          uuid primary key default gen_random_uuid(),

  pipeline    text not null,
  stage       public.lead_stage not null,

  label       text not null,
  position    integer not null,

  color       text,

  unique (pipeline, stage)
);
```

Meaning:

| Column   | Description           |
| -------- | --------------------- |
| pipeline | buy / sell / rental   |
| stage    | enum value            |
| label    | display name          |
| position | left-to-right order   |
| color    | optional column color |

```
```
--------------------------------------------
# ApartmentHub · Developer Handoff (Buy / Sell / Rent)

## Part 3 — Client Portal, Edge Functions, Security & Deployment

---

# 7. Client Portal Specification (for Sellers)

## 7.1 Purpose

The seller logs into a portal and can track the progress of their property sale.

To initiate the sales process, the seller uploads all required documents.

Once all required documents are uploaded, the lead automatically moves to:

```text
documenten_compleet (Documents Complete)
```

The team is then notified that the property is ready to be listed.

---

## 7.2 Routes (React Router)

| Route                   | Auth                    | Content                                       |
| ----------------------- | ----------------------- | --------------------------------------------- |
| `/portal/login`         | Public                  | Email field → `supabase.auth.signInWithOtp()` |
| `/portal/auth/callback` | Magic-link token        | Exchanges token for session                   |
| `/portal`               | Client session required | Sales progress overview                       |
| `/portal/documents`     | Client session required | Document checklist and uploads                |
| `/portal/timeline`      | Client session required | Client-visible activity timeline              |

Create a wrapper:

```tsx
<RequirePortalAuth />
```

Responsibilities:

* Check `supabase.auth.getSession()`
* Redirect unauthenticated users to `/portal/login`

Keep portal routes completely separate from internal dashboard routes.

---

## 7.3 Authentication (Supabase Magic Links)

### Invitation Flow

When a seller receives portal access:

1. Create a Supabase Auth user
2. Send a magic-link invitation email
3. Create a `clients` record

Example:

```ts
await supabase.auth.admin.inviteUserByEmail(
  lead.email,
  {
    redirectTo:
      "https://apartmenthub.nl/portal/auth/callback",
  }
);
```

---

### Login Flow

```ts
await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo:
      "https://apartmenthub.nl/portal/auth/callback",
  },
});
```

---

### Benefits

No passwords required.

User flow:

1. Enter email
2. Receive magic link
3. Click link
4. Logged in

---

### Supabase Configuration

Configure:

* Site URL
* Redirect URLs

Example:

```text
https://apartmenthub.nl
https://apartmenthub.nl/portal/auth/callback
```

Customize the magic-link email using ApartmentHub branding:

```text
Primary color: #009B8A
```

---

## 7.4 Document Checklist

Automatically created when a seller is invited.

Default checklist:

| doc_type        | Label                      | Required |
| --------------- | -------------------------- | -------- |
| id_bewijs       | Valid ID document          | Yes      |
| eigendomsbewijs | Property ownership deed    | Yes      |
| energielabel    | Energy label certificate   | Yes      |
| woz_beschikking | Latest WOZ assessment      | Yes      |
| vve_documenten  | HOA/VvE documents          | No       |
| lijst_van_zaken | Fixtures and fittings list | Yes      |
| vragenlijst_nvm | Property questionnaire     | Yes      |
| hypotheek_saldo | Mortgage balance statement | No       |

### Recommendation

Store checklist templates separately:

```sql
document_templates
```

or

```ts
const CHECKLIST = [...]
```

This allows different checklists for:

* Apartments
* Detached houses
* Rental properties

---

## 7.5 Storage Uploads with RLS

### Bucket

```text
client-docs
```

Private bucket.

---

### File Structure

```text
<lead_id>/<doc_type>/<filename>
```

Example:

```text
9c4d.../id_bewijs/passport.pdf
```

---

### Upload Example

```ts
await supabase.storage
  .from("client-docs")
  .upload(path, file);
```

---

### After Upload

Either:

```ts
notify-document-upload
```

or:

```sql
UPDATE documents
SET
  status = 'ontvangen',
  storage_path = ...
```

This triggers:

1. Team notification
2. Timeline update
3. Automatic stage progression

---

## 7.6 Progress Timeline

Portal timeline displays:

```sql
lead_events
```

where:

```sql
client_visible = true
```

Examples:

* Intake scheduled
* Property listed
* Offer received
* Documents uploaded
* Documents approved

Dashboard users see:

```text
All events
```

Clients see:

```text
Client-visible events only
```

---

# 8. Edge Functions

---

## 8.1 portal-invite

Responsibilities:

### 1. Load Lead

```sql
SELECT *
FROM leads
WHERE id = lead_id
```

### 2. Check Existing Client

```sql
SELECT id
FROM clients
WHERE lead_id = lead_id
```

If found:

```json
{
  "success": true,
  "skipped": "client already exists"
}
```

### 3. Create Auth User

```ts
supabase.auth.admin.inviteUserByEmail(...)
```

### 4. Create Client Record

```sql
INSERT INTO clients (...)
```

### 5. Create Document Checklist

```sql
INSERT INTO documents (...)
```

for every checklist item.

### 6. Update Lead

```sql
UPDATE leads
SET stage = 'portaal_uitgenodigd'
```

### 7. Log Event

```sql
INSERT INTO lead_events (...)
```

Example:

```text
Portal invitation sent
```

Result:

```json
{
  "success": true
}
```

---

## 8.2 notify-document-upload

Triggered after a client uploads a document.

Responsibilities:

### 1. Verify User

```ts
supabase.auth.getUser(token)
```

### 2. Find Client

```sql
SELECT lead_id
FROM clients
WHERE user_id = auth.uid()
```

### 3. Update Document

```sql
UPDATE documents
SET
  status = 'ontvangen',
  storage_path = ...,
  uploaded_at = NOW()
```

### 4. Create Timeline Event

Example:

```text
Document uploaded: id_bewijs
```

### 5. Notify Team

Via Resend:

```ts
resend.emails.send(...)
```

Recipient:

```text
david@apartmenthub.nl
```

---

# 9. Recommended Libraries

| Purpose               | Library               | Reason                         |
| --------------------- | --------------------- | ------------------------------ |
| Kanban drag & drop    | @dnd-kit              | Modern and accessible          |
| Client authentication | Supabase Auth         | Already in use                 |
| Email delivery        | Resend                | Already implemented            |
| Realtime updates      | Supabase Realtime     | No polling required            |
| Data fetching         | React Query           | Caching and optimistic updates |
| Forms                 | react-hook-form + zod | Existing stack                 |
| Dates & SLAs          | date-fns              | Lightweight                    |

---

# 10. Security

## 10.1 Team vs Client Roles

### Team Members Table

```sql
CREATE TABLE public.team_members (
  user_id uuid PRIMARY KEY
    REFERENCES auth.users(id)
);
```

### Helper Function

```sql
CREATE FUNCTION public.is_team()
RETURNS boolean
```

Checks whether:

```sql
auth.uid()
```

exists in:

```sql
team_members
```

### Client Lead IDs

```sql
CREATE FUNCTION public.my_lead_ids()
```

Returns:

```sql
SELECT lead_id
FROM clients
WHERE user_id = auth.uid();
```

---

## 10.2 RLS Policies

### Leads

Team:

```text
Full access
```

Clients:

```text
Read own lead only
```

Anonymous:

```text
Can submit leads
```

### Lead Events

Team:

```text
Full access
```

Clients:

```text
Read visible events only
```

### Documents

Team:

```text
Full access
```

Clients:

```text
Read and update own documents
```

### Clients Table

Team:

```text
Full access
```

Clients:

```text
Read own row
```

### Pipeline Stages

Authenticated users:

```text
Read
```

Team:

```text
Write
```

---

## 10.3 Storage Bucket Policies

Create bucket:

```text
client-docs
```

Private.

### Client Read Policy

Clients may access:

```text
<lead_id>/...
```

where:

```sql
lead_id IN my_lead_ids()
```

### Client Upload Policy

Same restriction.

### Team Access

Read access to all client documents.

---

## 10.4 Environment Variables

| Variable                      | Purpose                   |
| ----------------------------- | ------------------------- |
| VITE_SUPABASE_URL             | Frontend                  |
| VITE_SUPABASE_PUBLISHABLE_KEY | Frontend                  |
| RESEND_API_KEY                | Email delivery            |
| SUPABASE_URL                  | Edge Functions            |
| SUPABASE_SERVICE_ROLE_KEY     | Admin operations          |
| app.service_role_key          | DB-trigger authentication |

### Project ID

```text
vordjtqtqrzvqvuzogop
```

### Function URL Format

```text
https://vordjtqtqrzvqvuzogop.supabase.co/functions/v1/<function-name>
```

### Resend Setup

Verify:

```text
apartmenthub.nl
```

DNS records:

* SPF
* DKIM

Until verified, emails only arrive at the Resend account owner's address.

---

# 11. Setup Checklist

## Phase 1 — Lead Capture + Confirmation Emails (Critical)

### Email Infrastructure

* Add `RESEND_API_KEY` secret
* Verify `apartmenthub.nl`
* Deploy:

```bash
supabase functions deploy send-lead-confirmation
```

### Environment Variables

Add to Vercel:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

For:

* Production
* Preview

### Database

Create:

```sql
koop_leads
```

Choose:

* Option A (recommended)
* Option B (legacy sync)

### Verify Existing Tables

Confirm:

```text
waardebepaling_leads
koopkracht_leads
```

Review missing fields:

```text
souterrain
woningtypes
```

### Testing

Submit one lead through every form and verify:

* Lead confirmation email received
* Team notification email received

---

## Phase 2 — Dashboard + Kanban

* Create enums
* Create `leads`
* Create `lead_events`
* Create `pipeline_stages`
* Create `team_members`
* Implement `is_team()`
* Apply RLS
* Build `/dashboard`
* Implement drag & drop with `@dnd-kit`
* Enable Realtime updates
* Build lead detail panel

---

## Phase 3 — Automations

Enable:

```sql
CREATE EXTENSION pg_net;
```

Implement:

* Lead-created triggers
* Stage-change triggers
* Portal invitations
* Document-upload triggers
* Closing workflows

Extend email templates:

* Intake scheduled
* Deal won
* Deal lost

Optional:

* n8n
* Make
* Zapier

for reminders and win-back campaigns.

---

## Phase 4 — Client Portal + Document Uploads

* Create `clients`
* Create `documents`
* Apply RLS
* Create private bucket `client-docs`
* Deploy:

```bash
supabase functions deploy portal-invite
supabase functions deploy notify-document-upload
```

* Configure Auth redirects
* Customize magic-link email
* Build portal routes
* Implement upload workflow
* Implement automatic move to `documenten_compleet`
* Build timeline page

### End-to-End Test

Seller lead created

↓

Portal invitation sent

↓

Client logs in

↓

Uploads all required documents

↓

Lead automatically moves to:

```text
Documents Complete
```

↓

Team receives notification

---

# 12. Assumptions

1. `koop_leads` currently does not exist.
2. Contact, newsletter and rental leads are email-only today.
3. Option A (direct inserts into `leads`) is recommended.
4. Team access is managed through `team_members`.
5. Existing tenant dossier system remains separate.
6. No storage bucket currently exists.
7. Document checklist is based on a standard Dutch property sale.
8. Production domain is assumed to be:

```text
https://apartmenthub.nl
```

9. Pipeline stages remain configurable through:

```sql
pipeline_stages
```

without requiring future deployments.
----------------------------------------
