-- Kanban CRM: Complete setup in one file.
-- Run AFTER kanban_cleanup.sql.
-- Fully idempotent — safe to re-run if it fails partway (run cleanup first, then this again).

-- ===========================================
-- 1. ENUMS
-- ===========================================
CREATE TYPE public.lead_type AS ENUM (
  'valuation', 'sale', 'buyer_intake', 'buying_power',
  'rental', 'contact', 'newsletter', 'meta_ads'
);

CREATE TYPE public.lead_stage AS ENUM (
  'new', 'qualified', 'intake_scheduled', 'portal_invited',
  'documents_complete', 'active', 'offer_negotiation',
  'closed_won', 'closed_lost'
);

CREATE TYPE public.lead_event_type AS ENUM (
  'created', 'stage_changed', 'assigned', 'note_added',
  'email_sent', 'portal_invited', 'document_uploaded', 'document_reviewed'
);

-- ===========================================
-- 2. LEADS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.leads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type             public.lead_type  NOT NULL,
  stage            public.lead_stage NOT NULL DEFAULT 'new',
  source_type      text NOT NULL,
  source_id        uuid NOT NULL,
  first_name       text,
  last_name        text,
  email            text,
  phone            text,
  address          text,
  postcode         text,
  city             text,
  neighborhood     text,
  assignee_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            text,
  source           text DEFAULT 'website',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_leads_type        ON public.leads (type);
CREATE INDEX IF NOT EXISTS idx_leads_stage       ON public.leads (stage);
CREATE INDEX IF NOT EXISTS idx_leads_assignee    ON public.leads (assignee_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at  ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email       ON public.leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_source      ON public.leads (source_type, source_id);

-- Helper: auto-update updated_at (needed before triggers)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers on leads
DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_stage_changed_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_stage_changed ON public.leads;
CREATE TRIGGER trg_leads_stage_changed
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_stage_changed_at();

-- ===========================================
-- 3. LEAD_EVENTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.lead_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type           public.lead_event_type NOT NULL,
  actor_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  description    text,
  meta           jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_visible  boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead
  ON public.lead_events (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_events_visible
  ON public.lead_events (lead_id) WHERE client_visible;

-- Auto-log stage changes
CREATE OR REPLACE FUNCTION public.log_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.lead_events (lead_id, type, description, meta, client_visible)
    VALUES (
      NEW.id, 'stage_changed',
      format('%s -> %s', OLD.stage, NEW.stage),
      jsonb_build_object('from', OLD.stage, 'to', NEW.stage),
      true
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_log_stage ON public.leads;
CREATE TRIGGER trg_leads_log_stage
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.log_stage_change();

-- ===========================================
-- 4. PIPELINE_STAGES TABLE + SEED
-- ===========================================
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline text NOT NULL,
  stage    public.lead_stage NOT NULL,
  label    text NOT NULL,
  position integer NOT NULL,
  color    text,
  UNIQUE (pipeline, stage)
);

INSERT INTO public.pipeline_stages (pipeline, stage, label, position, color) VALUES
  ('default', 'new',                  'New',                  1, '#5A6B82'),
  ('default', 'qualified',            'Qualified',            2, '#009B8A'),
  ('default', 'intake_scheduled',    'Intake Scheduled',     3, '#2BB3A3'),
  ('default', 'portal_invited',       'Portal Invited',      4, '#6366F1'),
  ('default', 'documents_complete',  'Documents Complete',   5, '#8B5CF6'),
  ('default', 'active',              'Active',               6, '#FF7D28'),
  ('default', 'offer_negotiation',   'Offer / Negotiation', 7, '#F59E0B'),
  ('default', 'closed_won',          'Closed Won',           8, '#15803D'),
  ('default', 'closed_lost',         'Closed Lost',          9, '#B42318')
ON CONFLICT (pipeline, stage) DO NOTHING;

-- ===========================================
-- 5. TEAM_MEMBERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.team_members (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role         text NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'viewer')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Helper: check if current user is a team member (used by RLS)
CREATE OR REPLACE FUNCTION public.is_team()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = auth.uid());
$$;

-- ===========================================
-- 6. ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_anon_insert ON public.leads;
CREATE POLICY leads_anon_insert ON public.leads FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS leads_team_all ON public.leads;
CREATE POLICY leads_team_all ON public.leads FOR ALL USING (public.is_team()) WITH CHECK (public.is_team());

ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lead_events_team_all ON public.lead_events;
CREATE POLICY lead_events_team_all ON public.lead_events FOR ALL USING (public.is_team()) WITH CHECK (public.is_team());

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pipeline_stages_authenticated_read ON public.pipeline_stages;
CREATE POLICY pipeline_stages_authenticated_read ON public.pipeline_stages FOR SELECT USING (true);
DROP POLICY IF EXISTS pipeline_stages_team_write ON public.pipeline_stages;
CREATE POLICY pipeline_stages_team_write ON public.pipeline_stages FOR ALL USING (public.is_team()) WITH CHECK (public.is_team());

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_members_team_read ON public.team_members;
CREATE POLICY team_members_team_read ON public.team_members FOR SELECT USING (public.is_team());