-- Add missing souterrain column to valuation_leads
ALTER TABLE public.valuation_leads ADD COLUMN IF NOT EXISTS souterrain TEXT;

-- Staff can read valuation_leads (for CRM/kanban)
DROP POLICY IF EXISTS "Staff can read valuation_leads" ON public.valuation_leads;
CREATE POLICY "Staff can read valuation_leads"
  ON public.valuation_leads FOR SELECT
  TO authenticated
  USING (true);

-- Prevent deletes (public table: insert-only, no delete)
DROP POLICY IF EXISTS "No one can delete valuation_leads" ON public.valuation_leads;
CREATE POLICY "No one can delete valuation_leads"
  ON public.valuation_leads FOR DELETE
  USING (false);

-- Prevent updates (once inserted, leads should not be modified by public)
DROP POLICY IF EXISTS "No anon updates on valuation_leads" ON public.valuation_leads;
CREATE POLICY "No anon updates on valuation_leads"
  ON public.valuation_leads FOR UPDATE
  USING (false) WITH CHECK (false);