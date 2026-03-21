-- Migration: Auto-fill salesforce_account_id and salesforce_apartment_id on tenants
-- On INSERT or UPDATE, looks up:
--   1. accounts.salesforce_account_id  via matching whatsapp_number
--   2. apartments.salesforce_id        via apartment_id FK or qualified_users phone match

CREATE OR REPLACE FUNCTION public.auto_fill_tenant_salesforce_ids()
RETURNS TRIGGER AS $$
DECLARE
    v_sf_account_id TEXT;
    v_sf_apartment_id TEXT;
    v_phone_norm TEXT;
BEGIN
    v_phone_norm := public.normalize_phone_for_match(NEW.whatsapp_number);

    -- 1. Fill salesforce_account_id from accounts (match by normalized phone)
    IF v_phone_norm IS NOT NULL THEN
        SELECT a.salesforce_account_id INTO v_sf_account_id
        FROM public.accounts a
        WHERE public.normalize_phone_for_match(a.whatsapp_number) = v_phone_norm
        LIMIT 1;

        IF v_sf_account_id IS NOT NULL THEN
            NEW.salesforce_account_id := v_sf_account_id;
        END IF;
    END IF;

    -- 2. Fill salesforce_apartment_id from apartments
    --    First try via apartment_id FK, then fall back to qualified_users phone match
    IF NEW.apartment_id IS NOT NULL THEN
        SELECT apt.salesforce_id INTO v_sf_apartment_id
        FROM public.apartments apt
        WHERE apt.id = NEW.apartment_id;
    END IF;

    IF v_sf_apartment_id IS NULL AND v_phone_norm IS NOT NULL THEN
        -- Match via qualified_users whatsapp_number
        SELECT apt.salesforce_id INTO v_sf_apartment_id
        FROM public.apartments apt,
             jsonb_array_elements(COALESCE(apt.qualified_users, '[]'::jsonb)) qu
        WHERE apt.salesforce_id IS NOT NULL
          AND public.normalize_phone_for_match(
                COALESCE(
                    qu->>'whatsapp_number',
                    qu->>'WhatsApp Number',
                    qu->>'whatsAppNumber',
                    qu->>'WhatsAppNumber'
                )
              ) = v_phone_norm
        LIMIT 1;
    END IF;

    IF v_sf_apartment_id IS NOT NULL THEN
        NEW.salesforce_apartment_id := v_sf_apartment_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: runs BEFORE INSERT or UPDATE so we can modify the NEW row
DROP TRIGGER IF EXISTS trigger_auto_fill_tenant_salesforce_ids ON public.tenants;
CREATE TRIGGER trigger_auto_fill_tenant_salesforce_ids
    BEFORE INSERT OR UPDATE OF whatsapp_number, apartment_id ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_fill_tenant_salesforce_ids();

COMMENT ON FUNCTION public.auto_fill_tenant_salesforce_ids() IS
'Auto-fills salesforce_account_id (from accounts via whatsapp_number match) and salesforce_apartment_id (from apartments via apartment_id FK or qualified_users phone match) on the tenants table.';


-- ==========================================================================
-- One-time backfill for existing tenants
-- ==========================================================================

-- Fill salesforce_account_id from accounts (match by normalized phone)
UPDATE public.tenants t
SET salesforce_account_id = a.salesforce_account_id
FROM public.accounts a
WHERE public.normalize_phone_for_match(t.whatsapp_number) = public.normalize_phone_for_match(a.whatsapp_number)
  AND a.salesforce_account_id IS NOT NULL
  AND (t.salesforce_account_id IS NULL OR t.salesforce_account_id IS DISTINCT FROM a.salesforce_account_id);

-- Fill salesforce_apartment_id from apartments via apartment_id FK
UPDATE public.tenants t
SET salesforce_apartment_id = apt.salesforce_id
FROM public.apartments apt
WHERE t.apartment_id = apt.id
  AND apt.salesforce_id IS NOT NULL
  AND (t.salesforce_apartment_id IS NULL OR t.salesforce_apartment_id IS DISTINCT FROM apt.salesforce_id);

-- Fill salesforce_apartment_id via qualified_users phone match (for tenants still missing it)
UPDATE public.tenants t
SET salesforce_apartment_id = sub.salesforce_id
FROM (
    SELECT DISTINCT ON (t2.id)
           t2.id AS tenant_id,
           apt.salesforce_id
    FROM public.tenants t2
    JOIN public.apartments apt ON apt.salesforce_id IS NOT NULL
    JOIN jsonb_array_elements(COALESCE(apt.qualified_users, '[]'::jsonb)) qu ON true
    WHERE t2.salesforce_apartment_id IS NULL
      AND t2.whatsapp_number IS NOT NULL
      AND public.normalize_phone_for_match(
            COALESCE(
                qu->>'whatsapp_number',
                qu->>'WhatsApp Number',
                qu->>'whatsAppNumber',
                qu->>'WhatsAppNumber'
            )
          ) = public.normalize_phone_for_match(t2.whatsapp_number)
    ORDER BY t2.id
) sub
WHERE t.id = sub.tenant_id;
