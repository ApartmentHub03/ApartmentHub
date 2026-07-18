-- Migration: Block C — Deal confirmation + commission + invoice VAT columns
--
-- Adds VAT/commission/closer fields to the invoices table and a per-apartment
-- commission_months override.  These columns are populated by the new
-- POST /api/admin/crm/apartment/[id]/mark-deal route when a deal is confirmed.

-- ==========================================
-- 1. invoices table — add VAT + commission + closer columns
-- ==========================================

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS amount_ex_vat NUMERIC;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT 0.21;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS amount_inc_vat NUMERIC;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS commission_months INT;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.crm_users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.invoices.amount_ex_vat IS
'Commission amount before VAT (e.g. 1 or 2 months rent).';

COMMENT ON COLUMN public.invoices.vat_rate IS
'VAT rate applied (default 0.21 = 21% BTW).';

COMMENT ON COLUMN public.invoices.vat_amount IS
'VAT amount = amount_ex_vat * vat_rate.';

COMMENT ON COLUMN public.invoices.amount_inc_vat IS
'Total including VAT = amount_ex_vat + vat_amount. Mirrors the legacy amount column for backward compat.';

COMMENT ON COLUMN public.invoices.commission_months IS
'Number of months rent charged as commission (1 default, 2 if rent < EUR 2000 or per-apartment override).';

COMMENT ON COLUMN public.invoices.closed_by IS
'The CRM user (internal closer) who confirmed the deal.';

-- ==========================================
-- 2. apartments table — per-apartment commission override
-- ==========================================

ALTER TABLE public.apartments
ADD COLUMN IF NOT EXISTS commission_months INT;

COMMENT ON COLUMN public.apartments.commission_months IS
'Override for commission months. NULL = auto (2 if rental_price < 2000, else 1).';

-- ==========================================
-- 3. accounts table — closer link on the deal
-- ==========================================
-- (No schema change needed — accounts.contract_start_date already exists.
--  The mark-deal API route sets it when a deal is confirmed.)