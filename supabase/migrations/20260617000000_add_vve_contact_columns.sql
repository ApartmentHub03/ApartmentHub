-- Add VvE contact columns referenced by /api/verkoop/dossier POST handler.
-- The route whitelists vve_beheerder and vve_email but the columns did not
-- exist on the table, causing 500 errors on every intake save that included
-- either field.

ALTER TABLE public.verkoop_dossiers
  ADD COLUMN IF NOT EXISTS vve_beheerder text,
  ADD COLUMN IF NOT EXISTS vve_email text;