-- Funnel stage tracking for meta_leads (CAPI conversion funnel)
-- These columns support the full funnel:
--   lead → scheduled (Cal.com booking) → qualified (sheet) → won (sheet)

ALTER TABLE meta_leads
  ADD COLUMN IF NOT EXISTS external_id     text,          -- sha256(phone) — stable cross-event identity
  ADD COLUMN IF NOT EXISTS stage           text NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS amount          numeric,       -- deal value (stage="won")
  ADD COLUMN IF NOT EXISTS currency        text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS cal_booking_uid text,          -- Cal.com booking UID for dedup/cancel/reschedule
  ADD COLUMN IF NOT EXISTS cal_booking_url text,          -- manage/cancel link from Cal.com
  ADD COLUMN IF NOT EXISTS scheduled_at    timestamptz,
  ADD COLUMN IF NOT EXISTS qualified_at    timestamptz,
  ADD COLUMN IF NOT EXISTS won_at          timestamptz;

CREATE INDEX IF NOT EXISTS idx_meta_leads_stage ON meta_leads (stage);
CREATE INDEX IF NOT EXISTS idx_meta_leads_phone ON meta_leads (phone);
CREATE INDEX IF NOT EXISTS idx_meta_leads_email ON meta_leads (email);
CREATE INDEX IF NOT EXISTS idx_meta_leads_external_id ON meta_leads (external_id);
