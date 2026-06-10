-- Staff notes on dossiers — freeform text notes for internal use
create table public.verkoop_notes (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.verkoop_dossiers(id) on delete cascade,
  author text not null,          -- 'staff:+316...' or 'agent:david'
  content text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.verkoop_notes enable row level security;

-- All access is server-side via service_role key. No anon/public access.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'verkoop_notes' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY "service_role_all" ON public.verkoop_notes
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

create index on public.verkoop_notes (dossier_id, created_at desc);