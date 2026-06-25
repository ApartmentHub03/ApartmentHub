-- Kanban CRM: Drop any partial objects from failed attempts.
-- Run this FIRST in the Supabase SQL Editor, then run kanban_setup.sql.
-- Safe to run even if nothing exists yet (IF EXISTS everywhere).

-- Drop triggers on existing source tables
DROP TRIGGER IF EXISTS trg_meta_leads_to_leads ON public.meta_leads;
DROP TRIGGER IF EXISTS trg_koop_leads_to_leads ON public.koop_leads;
DROP TRIGGER IF EXISTS trg_valuation_leads_to_leads ON public.valuation_leads;
DROP TRIGGER IF EXISTS trg_rental_leads_to_leads ON public.rental_leads;
DROP TRIGGER IF EXISTS trg_verkoop_leads_to_leads ON public.verkoop_leads;

-- Drop triggers on leads table
DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
DROP TRIGGER IF EXISTS trg_leads_stage_changed ON public.leads;
DROP TRIGGER IF EXISTS trg_leads_log_stage ON public.leads;

-- Drop tables (dependency order)
DROP TABLE IF EXISTS public.lead_events CASCADE;
DROP TABLE IF EXISTS public.pipeline_stages CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.set_stage_changed_at() CASCADE;
DROP FUNCTION IF EXISTS public.log_stage_change() CASCADE;
DROP FUNCTION IF EXISTS public.is_team() CASCADE;
DROP FUNCTION IF EXISTS public.my_lead_ids() CASCADE;

-- Drop enums (must be last since tables depend on them)
DROP TYPE IF EXISTS public.lead_stage CASCADE;
DROP TYPE IF EXISTS public.lead_type CASCADE;
DROP TYPE IF EXISTS public.lead_event_type CASCADE;
DROP TYPE IF EXISTS public.document_status CASCADE;