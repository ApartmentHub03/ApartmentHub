-- Migration: CRM team users, roles, and role-based RLS helpers
-- Foundation for "Team logins & admin access" (docs/ApartmentHub-CRM.md §Confirmed next additions).
--
-- Introduces per-user team accounts backed by Supabase Auth, fully separate from the
-- client-side WhatsApp/OTP login. Each team member is one row in public.crm_users linked
-- to an auth.users row, with a role (super_admin / admin / agent) and a permissions set.
-- Helper functions read the caller's role so other CRM tables can scope access per role.

-- ==========================================
-- 1. crm_users table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.crm_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Link to the Supabase Auth identity. Nullable so an admin can pre-create a
    -- team member row before the auth user is provisioned; set once they exist.
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,

    role TEXT NOT NULL DEFAULT 'agent'
        CHECK (role IN ('super_admin', 'admin', 'agent')),

    -- Per-section access toggles surfaced in the admin Team page.
    permissions JSONB NOT NULL DEFAULT
        '{"apartments": true, "candidates": true, "offers": false, "team": false}'::jsonb,

    -- City the team member operates in (separate Amsterdam / Utrecht dashboards).
    city TEXT,
    start_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Case-insensitive uniqueness on email (one team account per address).
CREATE UNIQUE INDEX IF NOT EXISTS crm_users_email_lower_idx
    ON public.crm_users (LOWER(email));

CREATE INDEX IF NOT EXISTS crm_users_auth_user_id_idx
    ON public.crm_users (auth_user_id);

-- Reuse the shared updated_at trigger function (defined in the apartment-tables migration).
DROP TRIGGER IF EXISTS set_crm_users_updated_at ON public.crm_users;
CREATE TRIGGER set_crm_users_updated_at
    BEFORE UPDATE ON public.crm_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================
-- 2. Role-resolution helpers (for RLS across CRM tables)
-- ==========================================

-- Returns the role of the currently authenticated team member, or NULL if the
-- caller is not a CRM user. SECURITY DEFINER so policies can read crm_users
-- without recursing into crm_users' own RLS.
CREATE OR REPLACE FUNCTION public.current_crm_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.crm_users
    WHERE auth_user_id = auth.uid()
      AND is_active = true
    LIMIT 1;
$$;

-- True when the caller is an active admin or super_admin.
CREATE OR REPLACE FUNCTION public.is_crm_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.current_crm_role() IN ('super_admin', 'admin');
$$;

-- ==========================================
-- 3. RLS on crm_users
-- ==========================================
ALTER TABLE public.crm_users ENABLE ROW LEVEL SECURITY;

-- A team member can read their own row.
DROP POLICY IF EXISTS crm_users_select_own ON public.crm_users;
CREATE POLICY crm_users_select_own ON public.crm_users
    FOR SELECT
    USING (auth_user_id = auth.uid());

-- Admins can read every team member.
DROP POLICY IF EXISTS crm_users_select_admin ON public.crm_users;
CREATE POLICY crm_users_select_admin ON public.crm_users
    FOR SELECT
    USING (public.is_crm_admin());

-- Admins manage the team (add / edit / deactivate employees).
DROP POLICY IF EXISTS crm_users_insert_admin ON public.crm_users;
CREATE POLICY crm_users_insert_admin ON public.crm_users
    FOR INSERT
    WITH CHECK (public.is_crm_admin());

DROP POLICY IF EXISTS crm_users_update_admin ON public.crm_users;
CREATE POLICY crm_users_update_admin ON public.crm_users
    FOR UPDATE
    USING (public.is_crm_admin())
    WITH CHECK (public.is_crm_admin());

DROP POLICY IF EXISTS crm_users_delete_admin ON public.crm_users;
CREATE POLICY crm_users_delete_admin ON public.crm_users
    FOR DELETE
    USING (public.is_crm_admin());

-- NOTE: the service role bypasses RLS, so the first super_admin (David) is seeded
-- server-side via the service-role key (see API route), bootstrapping the chain.

COMMENT ON TABLE public.crm_users IS
'Team members for the CRM. One row per employee, linked to a Supabase Auth user (auth_user_id). role drives access; permissions holds per-section toggles. Separate from client WhatsApp/OTP accounts.';
