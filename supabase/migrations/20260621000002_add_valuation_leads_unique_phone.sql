-- Add unique index on valuation_leads.phone to prevent duplicate lead submissions
-- Run manually in Supabase SQL editor after the column rename migration

CREATE UNIQUE INDEX IF NOT EXISTS idx_valuation_leads_phone_unique
  ON public.valuation_leads (phone)
  WHERE phone IS NOT NULL;