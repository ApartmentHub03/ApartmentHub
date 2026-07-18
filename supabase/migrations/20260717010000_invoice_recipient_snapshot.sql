-- Migration: Invoice recipient snapshot fields
--
-- Invoices need a full postal address (name, street, zipcode, city, country) to
-- render the PDF, matching David's real invoice template. Accounts only store
-- current_address + current_zipcode (no city/country anywhere in the schema),
-- so these are captured as an editable snapshot on the invoice itself at
-- creation time and can be corrected by an admin before sending. Snapshotting
-- (rather than joining live to accounts) also means the invoice keeps the
-- address it was issued with even if the tenant's address changes later.

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS recipient_name TEXT;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS recipient_address TEXT;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS recipient_zipcode TEXT;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS recipient_city TEXT;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS recipient_country TEXT;

COMMENT ON COLUMN public.invoices.recipient_name IS
'Snapshot of the tenant name at invoice creation time (from accounts.tenant_name). Editable before sending.';

COMMENT ON COLUMN public.invoices.recipient_address IS
'Snapshot of the tenant street address at invoice creation time (from accounts.current_address). Editable before sending.';

COMMENT ON COLUMN public.invoices.recipient_zipcode IS
'Snapshot of the tenant postcode at invoice creation time (from accounts.current_zipcode). Editable before sending.';

COMMENT ON COLUMN public.invoices.recipient_city IS
'Tenant city — no source column exists on accounts/personen, so this is admin-entered before sending.';

COMMENT ON COLUMN public.invoices.recipient_country IS
'Tenant country — no source column exists on accounts/personen, so this is admin-entered before sending.';
