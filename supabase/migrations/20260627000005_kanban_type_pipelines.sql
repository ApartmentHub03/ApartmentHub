-- Type-specific pipelines: replace single 'default' pipeline with 3 pipelines.
-- Also changes leads.stage from enum to text for flexibility.

-- ===========================================
-- 1. Convert dependent columns from enum to text, then drop the enum
-- ===========================================
ALTER TABLE public.pipeline_stages ALTER COLUMN stage TYPE text USING stage::text;
ALTER TABLE public.leads ALTER COLUMN stage TYPE text USING stage::text;
ALTER TABLE public.leads ALTER COLUMN stage SET DEFAULT 'new';
DROP TYPE IF EXISTS public.lead_stage CASCADE;

-- ===========================================
-- 2. Clear old default pipeline stages
-- ===========================================
DELETE FROM public.pipeline_stages WHERE pipeline = 'default';

-- ===========================================
-- 3. Seed sale pipeline (8 stages)
-- ===========================================
INSERT INTO public.pipeline_stages (pipeline, stage, label, position, color) VALUES
  ('sale', 'new',                'New',                1, '#5A6B82'),
  ('sale', 'phone_call',         'Phone Call',         2, '#3B82F6'),
  ('sale', 'intake_scheduled',   'Intake Scheduled',   3, '#2BB3A3'),
  ('sale', 'document_completed','Document Completed',  4, '#8B5CF6'),
  ('sale', 'viewing',            'Viewing',            5, '#6366F1'),
  ('sale', 'negotiation',        'Negotiation',        6, '#F59E0B'),
  ('sale', 'deal_done',          'Deal Done',          7, '#15803D'),
  ('sale', 'deal_failed',        'Deal Failed',         8, '#B42318')
ON CONFLICT (pipeline, stage) DO UPDATE SET
  label = EXCLUDED.label,
  position = EXCLUDED.position,
  color = EXCLUDED.color;

-- ===========================================
-- 4. Seed buyer pipeline (7 stages)
-- ===========================================
INSERT INTO public.pipeline_stages (pipeline, stage, label, position, color) VALUES
  ('buyer', 'new_lead',        'New Lead',        1, '#5A6B82'),
  ('buyer', 'first_call',      'First Call',      2, '#3B82F6'),
  ('buyer', 'need_qualified',  'Need Qualified',  3, '#009B8A'),
  ('buyer', 'making_offer',    'Making Offer',    4, '#6366F1'),
  ('buyer', 'negotiation',     'Negotiation',     5, '#F59E0B'),
  ('buyer', 'deal_won',        'Deal Won',        6, '#15803D'),
  ('buyer', 'deal_failed',     'Deal Failed',     7, '#B42318')
ON CONFLICT (pipeline, stage) DO UPDATE SET
  label = EXCLUDED.label,
  position = EXCLUDED.position,
  color = EXCLUDED.color;

-- ===========================================
-- 5. Seed meta pipeline (4 stages)
-- ===========================================
INSERT INTO public.pipeline_stages (pipeline, stage, label, position, color) VALUES
  ('meta', 'new',               'New',               1, '#5A6B82'),
  ('meta', 'scheduled_viewing', 'Scheduled Viewing',  2, '#2BB3A3'),
  ('meta', 'deal_closed',       'Deal Closed',        3, '#15803D'),
  ('meta', 'deal_failed',       'Deal Failed',         4, '#B42318')
ON CONFLICT (pipeline, stage) DO UPDATE SET
  label = EXCLUDED.label,
  position = EXCLUDED.position,
  color = EXCLUDED.color;

-- ===========================================
-- 6. Migrate existing leads to new stage names
-- ===========================================
-- sale pipeline leads: most should already be 'new', keep as-is
-- buyer pipeline leads: map 'new' → 'new_lead'
UPDATE public.leads SET stage = 'new_lead' WHERE type = 'buyer_intake' AND stage = 'new';

-- meta pipeline leads: keep 'new' as-is

-- ===========================================
-- 7. Update lead triggers for correct initial stages
-- ===========================================
CREATE OR REPLACE FUNCTION public.sync_koop_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  INSERT INTO public.leads (type, source_type, source_id, first_name, last_name, email, phone, city, neighborhood, source, stage)
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
    'website',
    'new_lead'
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

-- sale (valuation_leads) and meta_leads triggers keep default 'new' stage, no change needed.
-- But update them to explicitly set stage for clarity:

CREATE OR REPLACE FUNCTION public.sync_meta_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead_id uuid;
  v_first_name text;
  v_last_name text;
BEGIN
  v_first_name := public.first_word(COALESCE(NEW.full_name, ''));
  v_last_name := public.rest_after_first_word(COALESCE(NEW.full_name, ''));

  INSERT INTO public.leads (type, source_type, source_id, first_name, last_name, email, phone, source, stage)
  VALUES (
    'meta_ads',
    'meta_leads',
    NEW.id,
    NULLIF(v_first_name, ''),
    v_last_name,
    NEW.email,
    NEW.phone,
    'meta_ads',
    'new'
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

CREATE OR REPLACE FUNCTION public.sync_valuation_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  INSERT INTO public.leads (type, source_type, source_id, first_name, last_name, email, phone, address, postcode, city, neighborhood, source, stage)
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
    'website',
    'new'
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