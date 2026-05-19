-- Adds the digital-signature columns David requested (BW art. 3:15a +
-- e-IDAS). Typed `signature_name` is the legally-binding part; the
-- optional `signature_image` is a base64 PNG data URL drawn on the
-- portal canvas. `signed_at` and `signed_ip` give an audit trail.
--
-- IMPORTANT: this migration belongs to the VERKOOP Supabase project
-- (mbitwimooimhmsnfinsi), NOT the rental project. Apply it via the
-- Supabase SQL editor for that project, or via the verkoop CLI setup.
-- The main app's supabase/migrations/ folder runs against the rental
-- project and should never see this file — it lives under
-- supabase/verkoop-migrations/ specifically to avoid that mix-up.

ALTER TABLE public.verkoop_dossiers
  ADD COLUMN IF NOT EXISTS signature_name  TEXT,
  ADD COLUMN IF NOT EXISTS signature_image TEXT,   -- base64 data:image/png URL
  ADD COLUMN IF NOT EXISTS signed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_ip       TEXT;

COMMENT ON COLUMN public.verkoop_dossiers.signature_name  IS 'Typed full name — legally-binding electronic signature (BW 3:15a).';
COMMENT ON COLUMN public.verkoop_dossiers.signature_image IS 'Optional base64 PNG data URL of a hand-drawn signature.';
COMMENT ON COLUMN public.verkoop_dossiers.signed_at       IS 'When the seller submitted the signed dossier (ISO).';
COMMENT ON COLUMN public.verkoop_dossiers.signed_ip       IS 'IP captured from the submit request (audit trail).';
