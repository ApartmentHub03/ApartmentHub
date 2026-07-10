-- verkoop_inventory_links — tokenized links for the "Lijst van zaken" form
-- sent to sellers. Stores submitted responses as JSONB.

create table if not exists verkoop_inventory_links (
  id              uuid primary key default gen_random_uuid(),
  dossier_id      uuid not null references verkoop_dossiers(id) on delete cascade,
  token           text not null unique,
  recipient_email text not null,
  status          text not null default 'sent',   -- sent | submitted | revoked
  submitted_at    timestamptz,
  submitted_data  jsonb,                          -- { items:[{key,choice}], extras:[{label,category,choice}], notes:"" }
  created_by      text,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '30 days')
);

create index if not exists idx_inventory_links_dossier on verkoop_inventory_links (dossier_id);
create index if not exists idx_inventory_links_token  on verkoop_inventory_links (token);

-- Enable RLS (defense-in-depth). All access is server-side via the
-- service-role key which bypasses RLS, so no policies are needed.
alter table verkoop_inventory_links enable row level security;