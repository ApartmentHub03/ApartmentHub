-- Consolidated verkoop schema for the /sell flow.
-- All 7 verkoop_* tables + the verkoop-uploads storage bucket. Originally
-- lived in a separate Supabase project (mbitwimooimhmsnfinsi); on
-- 2026-05-20 we moved everything into the main apartmenthub project so
-- the rental and verkoop apps share one database.
--
-- Includes the BW 3:15a digital-signature columns David added in the v3
-- OTD preview (signature_name, signature_image, signed_at, signed_ip).
-- Originally split across 0001-0006 in apartmenthub-verkoop/supabase/migrations/
-- plus the 0007 we drafted before the consolidation — kept here as one file
-- because the schema applied as one shot via the Supabase MCP.

set check_function_bodies = off;

create table if not exists public.verkoop_leads (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  adres           text not null,
  naam            text not null,
  email           text not null,
  telefoon        text,
  beste_moment    text,
  taal            text default 'nl' check (taal in ('nl', 'en')),
  status          text default 'nieuw' check (status in ('nieuw', 'gecontacteerd', 'bezichtiging_gepland', 'verkocht', 'gestopt')),
  bag_id          text,
  agent_assigned  text,
  notes           text
);
create index if not exists idx_leads_email   on public.verkoop_leads (email);
create index if not exists idx_leads_status  on public.verkoop_leads (status);
create index if not exists idx_leads_created on public.verkoop_leads (created_at desc);

create table if not exists public.verkoop_dossiers (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  lead_id         uuid references public.verkoop_leads (id) on delete set null,
  straat          text not null,
  postcode        text not null,
  woonplaats      text,
  naam            text not null,
  email           text not null,
  telefoon        text,
  taal            text default 'nl',
  vraagprijs      numeric,
  oplev_datum     text,
  motivatie       text,
  gebreken_toel   text,
  vve_sfeer       text,
  verbouw_toel    text,
  antwoorden      jsonb,
  ai_summary      jsonb,
  ai_prefilled    jsonb,
  ai_skipped      jsonb,
  enrichment      jsonb,
  consent         boolean default false,
  consent_at      timestamptz,
  phone_e164             text,
  status                 text default 'in_progress'
    check (status in ('in_progress','awaiting_followups','complete','archived')),
  last_activity_at       timestamptz default now(),
  ai_context_url         text,
  ai_followup_questions  jsonb,
  ai_followup_answers    jsonb,
  signature_name   text,
  signature_image  text,
  signed_at        timestamptz,
  signed_ip        text
);
create index if not exists idx_dossiers_email    on public.verkoop_dossiers (email);
create index if not exists idx_dossiers_created  on public.verkoop_dossiers (created_at desc);
create unique index if not exists idx_dossiers_phone_unique
  on public.verkoop_dossiers (phone_e164) where phone_e164 is not null;
create index if not exists idx_dossiers_status   on public.verkoop_dossiers (status);
create index if not exists idx_dossiers_activity on public.verkoop_dossiers (last_activity_at desc);

comment on column public.verkoop_dossiers.signature_name  is 'Typed full name — legally-binding electronic signature (BW 3:15a).';
comment on column public.verkoop_dossiers.signature_image is 'Optional base64 PNG data URL of a hand-drawn signature.';
comment on column public.verkoop_dossiers.signed_at       is 'When the seller submitted the signed dossier.';
comment on column public.verkoop_dossiers.signed_ip       is 'IP captured from the submit request (audit trail).';

create table if not exists public.verkoop_files (
  id          uuid primary key default gen_random_uuid(),
  dossier_id  uuid not null references public.verkoop_dossiers (id) on delete cascade,
  doc_key     text not null,
  filename    text not null,
  mime_type   text,
  size_bytes  integer,
  blob_url    text not null,
  uploaded_at timestamptz default now(),
  version     smallint default 1,
  is_current  boolean  default true,
  replaced_at timestamptz,
  ai_extract        jsonb,
  ai_extract_status text
    check (ai_extract_status is null or ai_extract_status in ('pending','done','failed','skipped')),
  ai_extract_at     timestamptz,
  ai_extract_error  text
);
create index if not exists idx_files_dossier on public.verkoop_files (dossier_id);
create index if not exists idx_files_doc_key on public.verkoop_files (doc_key);
create index if not exists idx_files_current  on public.verkoop_files (dossier_id, doc_key) where is_current = true;
create index if not exists idx_files_extract_status
  on public.verkoop_files (dossier_id, ai_extract_status) where is_current = true;

create table if not exists public.verkoop_audit (
  id          bigserial primary key,
  created_at  timestamptz default now(),
  dossier_id  uuid references public.verkoop_dossiers (id) on delete cascade,
  actor       text,
  action      text not null,
  meta        jsonb
);
create index if not exists idx_audit_dossier on public.verkoop_audit (dossier_id);

create table if not exists public.verkoop_otp_codes (
  id          bigserial primary key,
  phone_e164  text not null,
  code_hash   text not null,
  created_at  timestamptz default now(),
  expires_at  timestamptz not null,
  attempts    smallint default 0,
  consumed_at timestamptz,
  ip          text,
  user_agent  text
);
create index if not exists idx_otp_phone   on public.verkoop_otp_codes (phone_e164);
create index if not exists idx_otp_expires on public.verkoop_otp_codes (expires_at);

create table if not exists public.verkoop_sessions (
  id            text primary key,
  phone_e164    text not null,
  created_at    timestamptz default now(),
  expires_at    timestamptz not null,
  last_seen_at  timestamptz default now(),
  ip            text,
  user_agent    text
);
create index if not exists idx_sessions_phone   on public.verkoop_sessions (phone_e164);
create index if not exists idx_sessions_expires on public.verkoop_sessions (expires_at);

create table if not exists public.verkoop_staff_users (
  phone_e164    text primary key,
  display_name  text,
  role          text default 'agent' check (role in ('agent', 'admin', 'viewer')),
  created_at    timestamptz default now(),
  last_login_at timestamptz
);

alter table public.verkoop_leads        enable row level security;
alter table public.verkoop_dossiers     enable row level security;
alter table public.verkoop_files        enable row level security;
alter table public.verkoop_audit        enable row level security;
alter table public.verkoop_otp_codes    enable row level security;
alter table public.verkoop_sessions     enable row level security;
alter table public.verkoop_staff_users  enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verkoop-uploads',
  'verkoop-uploads',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
