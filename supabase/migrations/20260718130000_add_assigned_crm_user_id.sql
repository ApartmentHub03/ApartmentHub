-- Add assigned_crm_user_id to apartments for single-agent assignment
-- and default_offer_type to real_estate_agents for the collaboration dropdown.
--
-- The prototype shows one Agent per apartment (assigned from the team) and
-- one Collaboration (realtor) per apartment. The apartments table already has
-- real_estate_agent_id (FK to real_estate_agents), but there is no single-agent
-- FK for the internal team member. apartmenthub_agents is a JSONB array which
-- is harder to query — we add a clean FK column instead.
--
-- real_estate_agents currently has only name/phone/picture. The prototype's
-- "Add collaboration" form and the "+ New" button need a default_offer_type
-- (Normal / Hausing / Grand relocation) so we add that column too.

-- 1. Add assigned_crm_user_id to apartments ----------------------------
ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS assigned_crm_user_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.apartments.assigned_crm_user_id IS
'Internal team member (crm_user) assigned to this apartment. One agent per apartment per the prototype.';

-- 2. Add default_offer_type + contact columns to real_estate_agents ----
ALTER TABLE public.real_estate_agents
  ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS default_offer_type TEXT DEFAULT 'Normal';

COMMENT ON COLUMN public.real_estate_agents.default_offer_type IS
'Default offer type for this realtor (Normal / Hausing / Grand relocation). Used when generating offers.';

-- 3. Add assigned_crm_user_name to the lists query (no column — resolved in JS)
--    No DDL needed; the API route joins crm_users in JS via the crmUserMap.