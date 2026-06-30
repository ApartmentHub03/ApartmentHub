-- Track Zoko welcome template send outcome per meta lead
ALTER TABLE meta_leads
  ADD COLUMN IF NOT EXISTS welcome_template_status text,   -- 'sent' | 'failed'
  ADD COLUMN IF NOT EXISTS welcome_template_error  text;   -- error message / Zoko status on failure

CREATE INDEX IF NOT EXISTS idx_meta_leads_welcome_status ON meta_leads (welcome_template_status);