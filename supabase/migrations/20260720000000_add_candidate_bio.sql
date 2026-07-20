-- Add candidate_bio + guarantor_bio to dossiers.
--
-- The "Generate offer" feature drafts a Gmail email to the listing agent
-- presenting a candidate. The template has two free-text narrative paragraphs
-- (one for the candidate, one for their guarantor) that aren't derivable from
-- existing structured fields. Storing them on the dossier makes them reusable
-- when the same candidate applies to multiple apartments.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS). Non-destructive.

ALTER TABLE public.dossiers
    ADD COLUMN IF NOT EXISTS candidate_bio TEXT,
    ADD COLUMN IF NOT EXISTS guarantor_bio TEXT;