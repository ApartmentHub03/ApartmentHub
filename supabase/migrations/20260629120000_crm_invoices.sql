-- Migration: CRM invoices (post-deal invoicing phase)
-- Adds an invoices table linked to the account whose deal was won. Payment
-- processing (Stripe etc.) stays out of scope — this stores the invoice records
-- and documents only. See docs/ApartmentHub-CRM.md §Contract & invoicing phase.

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,

    invoice_number TEXT,
    amount NUMERIC,
    currency TEXT NOT NULL DEFAULT 'EUR',
    description TEXT,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),

    due_date DATE,
    issued_at TIMESTAMP WITH TIME ZONE,
    pdf_path TEXT,                 -- Supabase Storage path of the rendered invoice

    created_by UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS invoices_account_id_idx ON public.invoices (account_id);

DROP TRIGGER IF EXISTS set_invoices_updated_at ON public.invoices;
CREATE TRIGGER set_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Invoices are CRM-internal: only team members may touch them.
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_crm_select ON public.invoices;
CREATE POLICY invoices_crm_select ON public.invoices
    FOR SELECT USING (public.current_crm_role() IS NOT NULL);

DROP POLICY IF EXISTS invoices_admin_write ON public.invoices;
CREATE POLICY invoices_admin_write ON public.invoices
    FOR ALL USING (public.is_crm_admin()) WITH CHECK (public.is_crm_admin());

COMMENT ON TABLE public.invoices IS
'CRM post-deal invoices linked to a won account/apartment. Records + PDF only; no payment processing.';
