-- Direct Zoko Segments API integration.
-- Adds zoko_segment_id as the authoritative key on candidate_segments.
-- Budget/bedroom columns become nullable cached values parsed from the
-- Zoko segment name (used only for apartment auto-match in the modal).

ALTER TABLE public.candidate_segments
    ADD COLUMN IF NOT EXISTS zoko_segment_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS zoko_created_at BIGINT;

ALTER TABLE public.candidate_segments
    ALTER COLUMN min_budget DROP NOT NULL,
    ALTER COLUMN min_bedrooms DROP NOT NULL;