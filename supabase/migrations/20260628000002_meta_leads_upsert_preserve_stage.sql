-- Migration: Prevent meta_leads re-submission from resetting funnel stage.
--
-- Problem: When a lead re-submits the form, the API route used upsert which
-- overwrote stage/booking fields back to defaults (e.g. 'scheduled' -> 'lead').
-- The trigger also only fired on INSERT, so the leads table wouldn't sync on UPDATE.
--
-- Solution:
--   1. The API route now does select-then-update (preserving stage etc.)
--   2. This migration updates sync_meta_lead() to also fire on UPDATE,
--      but skips syncing to leads/lead_events entirely for UPDATEs (duplicate phone).
--      Only brand-new INSERTs create/sync a leads row + lead_events row.

CREATE OR REPLACE FUNCTION public.sync_meta_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead_id uuid;
  v_first_name text;
  v_last_name text;
BEGIN
  -- On UPDATE (duplicate phone re-submission): skip entirely, don't touch leads/lead_events
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- On INSERT (new phone): create/sync leads row + lead_events
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

-- Recreate the trigger to fire on both INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_meta_leads_to_leads ON public.meta_leads;
CREATE TRIGGER trg_meta_leads_to_leads
  AFTER INSERT OR UPDATE ON public.meta_leads
  FOR EACH ROW EXECUTE FUNCTION public.sync_meta_lead();