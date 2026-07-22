-- Add AI candidate profile columns to dossiers.
--
-- The "Enhance AI offer letter" feature analyzes uploaded documents with
-- Claude to extract a structured candidate profile (name, job, income,
-- nationality) and generates candidate_bio / guarantor_bio paragraphs
-- automatically. Results are cached on the dossier so the profile panel
-- in the CRM can render without re-analyzing on every view.
--
-- linkedin_url is an optional agent-provided URL passed to Claude for
-- profession inference when document data is missing.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS). Non-destructive.

ALTER TABLE public.dossiers
    ADD COLUMN IF NOT EXISTS ai_profile JSONB,
    ADD COLUMN IF NOT EXISTS ai_profile_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS linkedin_url TEXT;