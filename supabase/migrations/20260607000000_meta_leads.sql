-- Meta Ads Lead Form: store incoming leads from the meta-leadform
CREATE TABLE IF NOT EXISTS public.meta_leads (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone         text NOT NULL,
    full_name     text NOT NULL,
    email         text,
    bedrooms      text,
    budget        text,
    language      text NOT NULL DEFAULT 'nl',
    source        text DEFAULT 'meta_ads',
    source_url    text,
    consent       boolean NOT NULL DEFAULT true,
    event_id      text,
    tracking_fbp  text,
    tracking_fbc  text,
    tracking_fbclid text,
    utm_source    text,
    utm_medium    text,
    utm_campaign  text,
    utm_content   text,
    utm_term      text,
    referrer      text,
    tags          jsonb DEFAULT '[]',
    submitted_at  timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- Unique on phone so upsert works (one lead per phone number)
CREATE UNIQUE INDEX IF NOT EXISTS meta_leads_phone_key ON public.meta_leads (phone);

-- Enable RLS
ALTER TABLE public.meta_leads ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by API route)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'meta_leads' AND policyname = 'Service role can manage meta_leads'
  ) THEN
    CREATE POLICY "Service role can manage meta_leads" ON public.meta_leads
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;