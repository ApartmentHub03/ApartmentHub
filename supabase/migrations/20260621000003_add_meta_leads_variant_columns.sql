-- Add variant + second tenant columns to meta_leads for A/B test tracking
-- Run manually in Supabase SQL editor

ALTER TABLE meta_leads
  ADD COLUMN IF NOT EXISTS variant text DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS second_tenant_name text,
  ADD COLUMN IF NOT EXISTS second_tenant_phone text;

CREATE INDEX IF NOT EXISTS idx_meta_leads_variant ON meta_leads (variant);