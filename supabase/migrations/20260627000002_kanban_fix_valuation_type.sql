-- Fix: valuation_leads should map to 'sale' type, not 'valuation'

CREATE OR REPLACE FUNCTION public.sync_valuation_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  INSERT INTO public.leads (type, source_type, source_id, first_name, last_name, email, phone, address, postcode, city, neighborhood, source)
  VALUES (
    'sale',
    'valuation_leads',
    NEW.id,
    NEW.first_name,
    NEW.last_name,
    NEW.email,
    NEW.phone,
    NEW.address,
    NEW.postcode,
    NEW.city,
    NEW.neighborhood,
    'website'
  )
  ON CONFLICT (source_type, source_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    postcode = EXCLUDED.postcode,
    city = EXCLUDED.city,
    neighborhood = EXCLUDED.neighborhood,
    updated_at = now()
  RETURNING id INTO v_lead_id;

  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_events (lead_id, type, description, meta, client_visible)
    VALUES (v_lead_id, 'created', 'Lead created from valuation_leads', '{"source": "valuation_leads"}'::jsonb, false)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Remove 'valuation' from lead_type enum since it's no longer used
ALTER TYPE public.lead_type RENAME TO lead_type_old;
CREATE TYPE public.lead_type AS ENUM (
  'sale', 'buyer_intake', 'buying_power', 'rental', 'contact', 'newsletter', 'meta_ads'
);

-- Migrate any existing rows from 'valuation' to 'sale' (should be none, but safe)
UPDATE public.leads SET type = 'sale' WHERE type::text = 'valuation';

-- Re-add the check constraint and column type
ALTER TABLE public.leads ALTER COLUMN type TYPE public.lead_type USING type::text::public.lead_type;

-- Update pipeline_stages if any reference 'valuation' (shouldn't, but safe)
-- No changes needed since stages reference lead_stage, not lead_type

-- Update lead_events enum
ALTER TYPE public.lead_event_type RENAME TO lead_event_type_old;
CREATE TYPE public.lead_event_type AS ENUM (
  'created', 'stage_changed', 'assigned', 'note_added',
  'email_sent', 'portal_invited', 'document_uploaded', 'document_reviewed'
);
ALTER TABLE public.lead_events ALTER COLUMN type TYPE public.lead_event_type USING type::text::public.lead_event_type;

-- Drop old enums
DROP TYPE public.lead_type_old;
DROP TYPE public.lead_event_type_old;