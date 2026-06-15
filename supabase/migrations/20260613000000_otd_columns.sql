-- OTD and Bijlage A signing columns on verkoop_dossiers
-- These are written by the sign-otd and sign-annex-a API routes.

ALTER TABLE public.verkoop_dossiers
  ADD COLUMN IF NOT EXISTS otd_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS otd_data jsonb,
  ADD COLUMN IF NOT EXISTS otd_signed_name text,
  ADD COLUMN IF NOT EXISTS otd_signed_ip text,
  ADD COLUMN IF NOT EXISTS otd_acceptance_code text,
  ADD COLUMN IF NOT EXISTS otd_signature_png text,
  ADD COLUMN IF NOT EXISTS bijlage_a_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS bijlage_a_data jsonb,
  ADD COLUMN IF NOT EXISTS bijlage_a_signed_name text,
  ADD COLUMN IF NOT EXISTS bijlage_a_signed_ip text,
  ADD COLUMN IF NOT EXISTS bijlage_a_acceptance_code text,
  ADD COLUMN IF NOT EXISTS bijlage_a_signature_png text;
