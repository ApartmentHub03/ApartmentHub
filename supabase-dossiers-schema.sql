-- ApartmentHub Dossiers Database Schema
-- Run this in your Supabase SQL Editor

-- Dossiers table (main user application/session)
CREATE TABLE IF NOT EXISTS public.dossiers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT UNIQUE,
    email TEXT,
    phone_number TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dossiers_clerk_user_id ON public.dossiers(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_email ON public.dossiers(email);
CREATE INDEX IF NOT EXISTS idx_dossiers_phone ON public.dossiers(phone_number);

-- Personen table (tenants, co-tenants, guarantors)
CREATE TABLE IF NOT EXISTS public.personen (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('tenant', 'co_tenant', 'guarantor')),
    voornaam TEXT,
    achternaam TEXT,
    email TEXT,
    telefoon TEXT,
    geboortedatum DATE,
    nationaliteit TEXT,
    werk_status TEXT,
    bruto_maandinkomen NUMERIC,
    bedrijfsnaam TEXT,
    rol TEXT,
    startdatum DATE,
    huidige_adres TEXT,
    postcode TEXT,
    woonplaats TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personen_dossier ON public.personen(dossier_id);

-- Documenten table (uploaded documents)
CREATE TABLE IF NOT EXISTS public.documenten (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    persoon_id UUID REFERENCES public.personen(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    bestandsnaam TEXT,
    bestandspad TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documenten_persoon ON public.documenten(persoon_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documenten ENABLE ROW LEVEL SECURITY;

-- Policies for dossiers
DROP POLICY IF EXISTS "Allow all dossier select" ON public.dossiers;
DROP POLICY IF EXISTS "Allow all dossier insert" ON public.dossiers;
DROP POLICY IF EXISTS "Allow all dossier update" ON public.dossiers;

CREATE POLICY "Allow all dossier select" ON public.dossiers
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow all dossier insert" ON public.dossiers
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow all dossier update" ON public.dossiers
    FOR UPDATE TO anon, authenticated USING (true);

-- Policies for personen
DROP POLICY IF EXISTS "Allow all personen select" ON public.personen;
DROP POLICY IF EXISTS "Allow all personen insert" ON public.personen;
DROP POLICY IF EXISTS "Allow all personen update" ON public.personen;

CREATE POLICY "Allow all personen select" ON public.personen
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow all personen insert" ON public.personen
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow all personen update" ON public.personen
    FOR UPDATE TO anon, authenticated USING (true);

-- Policies for documenten
DROP POLICY IF EXISTS "Allow all documenten select" ON public.documenten;
DROP POLICY IF EXISTS "Allow all documenten insert" ON public.documenten;
DROP POLICY IF EXISTS "Allow all documenten update" ON public.documenten;

CREATE POLICY "Allow all documenten select" ON public.documenten
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow all documenten insert" ON public.documenten
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow all documenten update" ON public.documenten
    FOR UPDATE TO anon, authenticated USING (true);

-- Updated_at trigger for dossiers
DROP TRIGGER IF EXISTS set_dossiers_updated_at ON public.dossiers;
CREATE TRIGGER set_dossiers_updated_at
    BEFORE UPDATE ON public.dossiers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Updated_at trigger for personen
DROP TRIGGER IF EXISTS set_personen_updated_at ON public.personen;
CREATE TRIGGER set_personen_updated_at
    BEFORE UPDATE ON public.personen
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Comments
COMMENT ON TABLE public.dossiers IS 'Main rental application dossiers linked to Clerk users';
COMMENT ON TABLE public.personen IS 'People associated with a dossier (tenants, co-tenants, guarantors)';
COMMENT ON TABLE public.documenten IS 'Documents uploaded by people in a dossier';
