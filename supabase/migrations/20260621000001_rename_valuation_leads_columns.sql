-- Rename valuation_leads columns from Dutch to English
-- Run manually in Supabase SQL editor

ALTER TABLE public.valuation_leads RENAME COLUMN adres TO address;
ALTER TABLE public.valuation_leads RENAME COLUMN stad TO city;
ALTER TABLE public.valuation_leads RENAME COLUMN wijk TO neighborhood;
ALTER TABLE public.valuation_leads RENAME COLUMN oppervlakte TO surface_area;
ALTER TABLE public.valuation_leads RENAME COLUMN type TO property_type;
ALTER TABLE public.valuation_leads RENAME COLUMN bouwperiode TO construction_period;
ALTER TABLE public.valuation_leads RENAME COLUMN staat TO condition;
ALTER TABLE public.valuation_leads RENAME COLUMN energielabel TO energy_label;
ALTER TABLE public.valuation_leads RENAME COLUMN buitenruimte TO outdoor_space;
ALTER TABLE public.valuation_leads RENAME COLUMN parkeren TO parking;
ALTER TABLE public.valuation_leads RENAME COLUMN voornaam TO first_name;
ALTER TABLE public.valuation_leads RENAME COLUMN achternaam TO last_name;
ALTER TABLE public.valuation_leads RENAME COLUMN telefoon TO phone;
ALTER TABLE public.valuation_leads RENAME COLUMN geschatte_waarde_laag TO estimated_value_low;
ALTER TABLE public.valuation_leads RENAME COLUMN geschatte_waarde_hoog TO estimated_value_high;

-- Update status CHECK constraint to English values (valuation_leads)
ALTER TABLE public.valuation_leads DROP CONSTRAINT IF EXISTS valuation_leads_status_check;
ALTER TABLE public.valuation_leads ADD CONSTRAINT valuation_leads_status_check
  CHECK (status IN ('new', 'contacted', 'viewing_scheduled', 'sold', 'stopped'));
ALTER TABLE public.valuation_leads ALTER COLUMN status SET DEFAULT 'new';

-- Update status CHECK constraint to English values (koop_leads)
ALTER TABLE public.koop_leads DROP CONSTRAINT IF EXISTS koop_leads_status_check;
ALTER TABLE public.koop_leads ADD CONSTRAINT koop_leads_status_check
  CHECK (status IN ('new', 'contacted', 'viewing_scheduled', 'bought', 'stopped'));
ALTER TABLE public.koop_leads ALTER COLUMN status SET DEFAULT 'new';