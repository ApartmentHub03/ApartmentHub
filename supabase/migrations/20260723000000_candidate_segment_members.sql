-- Migration: create candidate_segment_members table and reset candidate_segments to match Zoko tags.
--
-- Zoko segment tags use price ranges like "€1500 - €2000" and bedroom tags like "1 Bedroom",
-- "2 Bedrooms", "3 Bedrooms", "4 Bedrooms", "4+ Bedrooms".
-- This migration defines 36 canonical price x bedroom segments and a members table that n8n
-- populates daily with active Zoko contacts.

-- 1. Reset candidate_segments to the canonical 36 Zoko-style segments
TRUNCATE TABLE public.candidate_segments;

INSERT INTO public.candidate_segments (name, min_budget, max_budget, min_bedrooms) VALUES
-- €1250 - €1500
('€1250 - €1500 · 1 Bedroom', 1250, 1500, 1),
('€1250 - €1500 · 2 Bedrooms', 1250, 1500, 2),
('€1250 - €1500 · 3 Bedrooms', 1250, 1500, 3),
('€1250 - €1500 · 4 Bedrooms', 1250, 1500, 4),

-- €1500 - €2000
('€1500 - €2000 · 1 Bedroom', 1500, 2000, 1),
('€1500 - €2000 · 2 Bedrooms', 1500, 2000, 2),
('€1500 - €2000 · 3 Bedrooms', 1500, 2000, 3),
('€1500 - €2000 · 4 Bedrooms', 1500, 2000, 4),

-- €2000 - €2500
('€2000 - €2500 · 1 Bedroom', 2000, 2500, 1),
('€2000 - €2500 · 2 Bedrooms', 2000, 2500, 2),
('€2000 - €2500 · 3 Bedrooms', 2000, 2500, 3),
('€2000 - €2500 · 4 Bedrooms', 2000, 2500, 4),

-- €2500 - €3000
('€2500 - €3000 · 1 Bedroom', 2500, 3000, 1),
('€2500 - €3000 · 2 Bedrooms', 2500, 3000, 2),
('€2500 - €3000 · 3 Bedrooms', 2500, 3000, 3),
('€2500 - €3000 · 4 Bedrooms', 2500, 3000, 4),

-- €3000 - €3500
('€3000 - €3500 · 1 Bedroom', 3000, 3500, 1),
('€3000 - €3500 · 2 Bedrooms', 3000, 3500, 2),
('€3000 - €3500 · 3 Bedrooms', 3000, 3500, 3),
('€3000 - €3500 · 4 Bedrooms', 3000, 3500, 4),

-- €3500 - €4000
('€3500 - €4000 · 1 Bedroom', 3500, 4000, 1),
('€3500 - €4000 · 2 Bedrooms', 3500, 4000, 2),
('€3500 - €4000 · 3 Bedrooms', 3500, 4000, 3),
('€3500 - €4000 · 4 Bedrooms', 3500, 4000, 4),

-- €4000 - €4500
('€4000 - €4500 · 1 Bedroom', 4000, 4500, 1),
('€4000 - €4500 · 2 Bedrooms', 4000, 4500, 2),
('€4000 - €4500 · 3 Bedrooms', 4000, 4500, 3),
('€4000 - €4500 · 4 Bedrooms', 4000, 4500, 4),

-- €4500 - €5000
('€4500 - €5000 · 1 Bedroom', 4500, 5000, 1),
('€4500 - €5000 · 2 Bedrooms', 4500, 5000, 2),
('€4500 - €5000 · 3 Bedrooms', 4500, 5000, 3),
('€4500 - €5000 · 4 Bedrooms', 4500, 5000, 4),

-- €5000+
('€5000+ · 1 Bedroom', 5000, NULL, 1),
('€5000+ · 2 Bedrooms', 5000, NULL, 2),
('€5000+ · 3 Bedrooms', 5000, NULL, 3),
('€5000+ · 4 Bedrooms', 5000, NULL, 4);

-- 2. Create the members table: one row per contact per matching segment.
CREATE TABLE IF NOT EXISTS public.candidate_segment_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id UUID NOT NULL REFERENCES public.candidate_segments(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT,
    email TEXT,
    zoko_customer_id TEXT,
    tags TEXT[],
    is_archived BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    zoko_sync_batch_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (segment_id, phone)
);

COMMENT ON TABLE public.candidate_segment_members IS 'Active Zoko contacts assigned to candidate segments. Synced daily by n8n.';
COMMENT ON COLUMN public.candidate_segment_members.is_archived IS 'True when the contact was not present in the latest Zoko sync run and should be excluded from broadcasts.';
COMMENT ON COLUMN public.candidate_segment_members.zoko_sync_batch_id IS 'Identifier of the last sync batch that touched this member row. Used to archive stale members on the final batch.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_candidate_segment_members_segment_id ON public.candidate_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_candidate_segment_members_phone ON public.candidate_segment_members(phone);
CREATE INDEX IF NOT EXISTS idx_candidate_segment_members_is_archived ON public.candidate_segment_members(is_archived);
CREATE INDEX IF NOT EXISTS idx_candidate_segment_members_last_sync_at ON public.candidate_segment_members(last_sync_at);

-- Trigger to keep updated_at current
DROP TRIGGER IF EXISTS set_candidate_segment_members_updated_at ON public.candidate_segment_members;
CREATE TRIGGER set_candidate_segment_members_updated_at
    BEFORE UPDATE ON public.candidate_segment_members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security: only the service role / n8n should write; CRM users read via API.
-- Default deny for anon and authenticated users.
ALTER TABLE public.candidate_segment_members ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on this table so the migration is idempotent.
DROP POLICY IF EXISTS candidate_segment_members_service_all ON public.candidate_segment_members;
DROP POLICY IF EXISTS candidate_segment_members_api_read ON public.candidate_segment_members;

-- Allow service_role to do everything (used by n8n sync + CRM API serviceClient).
CREATE POLICY candidate_segment_members_service_all
    ON public.candidate_segment_members
    AS PERMISSIVE
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to read only non-archived rows.
-- The CRM API filters further by segment/exclusions server-side.
CREATE POLICY candidate_segment_members_api_read
    ON public.candidate_segment_members
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (is_archived = false);
