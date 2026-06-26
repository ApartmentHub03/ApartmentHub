ALTER TABLE public.koop_leads
  ADD COLUMN IF NOT EXISTS property_condition TEXT;
