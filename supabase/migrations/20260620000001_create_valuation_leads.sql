CREATE TABLE IF NOT EXISTS public.valuation_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    address TEXT NOT NULL,
    postcode TEXT,
    city TEXT,
    neighborhood TEXT,
    surface_area NUMERIC,
    property_type TEXT,
    construction_period TEXT,
    condition TEXT,
    energy_label TEXT,
    outdoor_space TEXT,
    parking TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    estimated_value_low NUMERIC,
    estimated_value_high NUMERIC,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'viewing_scheduled', 'sold', 'stopped')),
    agent_assigned TEXT,
    notes TEXT
);

ALTER TABLE public.valuation_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can INSERT valuation_leads"
    ON public.valuation_leads FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE INDEX idx_valuation_leads_email ON public.valuation_leads(email);
CREATE INDEX idx_valuation_leads_status ON public.valuation_leads(status);
CREATE INDEX idx_valuation_leads_created_at ON public.valuation_leads(created_at DESC);