-- Repoint kanban identity from auth.users to verkoop_staff_users.phone_e164.
-- Staff use a custom OTP/session system (verkoop_otp_codes + verkoop_sessions),
-- NOT GoTrue. The auth.users FKs were dangling (never populated).
-- This migration makes phone_e164 the single staff identifier across all kanban tables.
-- Idempotent — safe to re-run if it fails partway.

-- ===========================================
-- 1. Disable RLS on kanban tables
--    The API uses supabaseAdmin() (service role bypasses RLS anyway),
--    so RLS was never actually enforced. is_team() depends on auth.uid()
--    which is never set in the custom session flow.
-- ===========================================
ALTER TABLE public.leads           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members    DISABLE ROW LEVEL SECURITY;

-- Drop policies (best-effort, IF EXISTS)
DROP POLICY IF EXISTS leads_anon_insert          ON public.leads;
DROP POLICY IF EXISTS leads_team_all             ON public.leads;
DROP POLICY IF EXISTS lead_events_team_all       ON public.lead_events;
DROP POLICY IF EXISTS pipeline_stages_authenticated_read ON public.pipeline_stages;
DROP POLICY IF EXISTS pipeline_stages_team_write ON public.pipeline_stages;
DROP POLICY IF EXISTS team_members_team_read     ON public.team_members;

-- Drop the is_team() helper (no longer needed)
DROP FUNCTION IF EXISTS public.is_team() CASCADE;

-- ===========================================
-- 2. leads.assignee_id: uuid REFERENCES auth.users(id) -> text REFERENCES verkoop_staff_users(phone_e164)
-- ===========================================
-- Drop existing FK + index that references auth.users
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_assignee_id_fkey;
DROP INDEX IF EXISTS idx_leads_assignee;

-- Clear any dangling uuid values (they never pointed to real auth.users rows)
UPDATE public.leads SET assignee_id = NULL WHERE assignee_id IS NOT NULL;

-- Convert column from uuid to text
ALTER TABLE public.leads ALTER COLUMN assignee_id TYPE text USING assignee_id::text;

-- Add FK to verkoop_staff_users by phone_e164
DO $$
BEGIN
  ALTER TABLE public.leads
    ADD CONSTRAINT leads_assignee_id_fkey
    FOREIGN KEY (assignee_id) REFERENCES public.verkoop_staff_users(phone_e164)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recreate index on text column
CREATE INDEX IF NOT EXISTS idx_leads_assignee ON public.leads (assignee_id);

-- ===========================================
-- 3. lead_events.actor_id: same treatment
-- ===========================================
ALTER TABLE public.lead_events DROP CONSTRAINT IF EXISTS lead_events_actor_id_fkey;

-- Clear dangling uuid values
UPDATE public.lead_events SET actor_id = NULL WHERE actor_id IS NOT NULL;

-- Convert column from uuid to text
ALTER TABLE public.lead_events ALTER COLUMN actor_id TYPE text USING actor_id::text;

DO $$
BEGIN
  ALTER TABLE public.lead_events
    ADD CONSTRAINT lead_events_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.verkoop_staff_users(phone_e164)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- 4. Drop team_members table
--    Kanban now reads staff directly from verkoop_staff_users
-- ===========================================
DROP TABLE IF EXISTS public.team_members CASCADE;

-- ===========================================
-- 5. Convert lead_events.type from enum to text
--    (matches the lead_stage migration pattern from 20260627000005)
-- ===========================================
ALTER TABLE public.lead_events ALTER COLUMN type TYPE text USING type::text;
DROP TYPE IF EXISTS public.lead_event_type CASCADE;