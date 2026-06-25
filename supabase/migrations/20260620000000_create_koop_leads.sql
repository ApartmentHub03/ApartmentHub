CREATE TABLE IF NOT EXISTS public.koop_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    journey TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    nationality TEXT DEFAULT 'Nederland',
    buyer_type TEXT,
    lives_in_nl TEXT,
    household TEXT,
    mortgage_status TEXT,
    budget TEXT,
    own_capital TEXT,
    neighborhoods TEXT[] DEFAULT '{}',
    other_neighborhood TEXT,
    min_bedrooms TEXT,
    property_type TEXT,
    min_sqm TEXT,
    must_haves TEXT[] DEFAULT '{}',
    timeline TEXT,
    city TEXT NOT NULL DEFAULT 'amsterdam',
    marketing_opt_in BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'viewing_scheduled', 'bought', 'stopped')),
    agent_assigned TEXT,
    matched_apartment_ids UUID[] DEFAULT '{}',
    notes TEXT
);

ALTER TABLE public.koop_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can INSERT koop_leads" ON public.koop_leads;
CREATE POLICY "Anon can INSERT koop_leads"
    ON public.koop_leads FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_koop_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_koop_leads_updated_at
    BEFORE UPDATE ON public.koop_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_koop_leads_updated_at();

CREATE INDEX idx_koop_leads_email ON public.koop_leads(email);
CREATE INDEX idx_koop_leads_status ON public.koop_leads(status);
CREATE INDEX idx_koop_leads_created_at ON public.koop_leads(created_at DESC);