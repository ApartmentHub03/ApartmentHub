-- Magic-link infrastructure for external document uploads
-- Feature 2.1: secure, expiring upload links for VvE, notary, lawyer, partner, buyer, seller

create table public.verkoop_magic_links (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.verkoop_dossiers(id) on delete cascade,
  token text unique not null,
  role text not null check (role in ('seller', 'buyer', 'vve', 'notary', 'lawyer', 'partner')),
  allowed_actions text[] not null default '{upload}',
  required_documents text[] default '{}',
  recipient_email text,
  recipient_name text,
  created_by text,
  expires_at timestamptz not null default now() + interval '30 days',
  used_count int not null default 0,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.verkoop_magic_links enable row level security;

-- All access is server-side via service_role key. No anon/public access.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'verkoop_magic_links' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY "service_role_all" ON public.verkoop_magic_links
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

create index on public.verkoop_magic_links (token);
create index on public.verkoop_magic_links (dossier_id, role);

-- Track who uploaded a file (seller, staff, or magic link)
alter table public.verkoop_files add column if not exists uploaded_by text;