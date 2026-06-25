-- Kanban CRM: Auto-sync triggers
-- AFTER INSERT on each source table → upserts a row into `leads`.
-- Uses ON CONFLICT (source_type, source_id) DO UPDATE so re-inserts don't duplicate.
-- Also creates a `lead_events` row (type: 'created') for newly inserted leads only.

-- ===========================================
-- 1. Helper: safe name split
-- ===========================================
CREATE OR REPLACE FUNCTION public.first_word(text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT split_part($1, ' ', 1);
$$;

CREATE OR REPLACE FUNCTION public.rest_after_first_word(text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN position(' ' IN $1) > 0
    THEN substring($1 FROM position(' ' IN $1) + 1)
    ELSE NULL
  END;
$$;

-- ===========================================
-- 2. Trigger: meta_leads → leads
-- ===========================================
CREATE OR REPLACE FUNCTION public.sync_meta_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead_id uuid;
  v_first_name text;
  v_last_name text;
BEGIN
  v_first_name := public.first_word(COALESCE(NEW.full_name, ''));
  v_last_name := public.rest_after_first_word(COALESCE(NEW.full_name, ''));

  INSERT INTO public.leads (type, source_type, source_id, first_name, last_name, email, phone, source)
  VALUES (
    'meta_ads',
    'meta_leads',
    NEW.id,
    NULLIF(v_first_name, ''),
    v_last_name,
    NEW.email,
    NEW.phone,
    'meta_ads'
  )
  ON CONFLICT (source_type, source_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    updated_at = now()
  RETURNING id INTO v_lead_id;

  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_events (lead_id, type, description, meta, client_visible)
    VALUES (v_lead_id, 'created', 'Lead created from meta_leads', '{"source": "meta_leads"}'::jsonb, false)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meta_leads_to_leads ON public.meta_leads;
CREATE TRIGGER trg_meta_leads_to_leads
  AFTER INSERT ON public.meta_leads
  FOR EACH ROW EXECUTE FUNCTION public.sync_meta_lead();

-- ===========================================
-- 3. Trigger: koop_leads → leads
-- ===========================================
CREATE OR REPLACE FUNCTION public.sync_koop_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  INSERT INTO public.leads (type, source_type, source_id, first_name, last_name, email, phone, city, neighborhood, source)
  VALUES (
    'buyer_intake',
    'koop_leads',
    NEW.id,
    NEW.first_name,
    NEW.last_name,
    NEW.email,
    NEW.phone,
    NEW.city,
    CASE
      WHEN NEW.neighborhoods IS NOT NULL
      THEN array_to_string(NEW.neighborhoods, ', ')
      ELSE NULL
    END,
    'website'
  )
  ON CONFLICT (source_type, source_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    neighborhood = EXCLUDED.neighborhood,
    updated_at = now()
  RETURNING id INTO v_lead_id;

  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_events (lead_id, type, description, meta, client_visible)
    VALUES (v_lead_id, 'created', 'Lead created from koop_leads', '{"source": "koop_leads"}'::jsonb, false)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_koop_leads_to_leads ON public.koop_leads;
CREATE TRIGGER trg_koop_leads_to_leads
  AFTER INSERT ON public.koop_leads
  FOR EACH ROW EXECUTE FUNCTION public.sync_koop_lead();

-- ===========================================
-- 4. Trigger: valuation_leads → leads
-- ===========================================
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

DROP TRIGGER IF EXISTS trg_valuation_leads_to_leads ON public.valuation_leads;
CREATE TRIGGER trg_valuation_leads_to_leads
  AFTER INSERT ON public.valuation_leads
  FOR EACH ROW EXECUTE FUNCTION public.sync_valuation_lead();