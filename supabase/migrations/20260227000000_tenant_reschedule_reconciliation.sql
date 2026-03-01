-- Migration: Tenant Reschedule Reconciliation
-- Detects when a "duplicate" tenant (same phone and apartment) is being inserted
-- and instead updates the existing record with "anyReschedule ?" = true

-- 1. Create the reconciliation function
CREATE OR REPLACE FUNCTION public.reconcile_tenant_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_id UUID;
  v_phone_norm text;
BEGIN
  -- Normalize phone for matching
  v_phone_norm := public.normalize_phone_for_match(NEW.whatsapp_number);
  
  -- Skip if no phone or no apartment
  IF v_phone_norm IS NULL OR NEW.apartment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look for existing tenant for the same apartment with matching phone
  SELECT id INTO v_existing_id
  FROM public.tenants
  WHERE apartment_id = NEW.apartment_id
    AND public.normalize_phone_for_match(whatsapp_number) = v_phone_norm
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- FOUND: Update existing record instead of inserting new one
    UPDATE public.tenants
    SET 
      "anyReschedule ?" = true,
      "EventType" = COALESCE(NEW."EventType", 'BOOKING_RESCHEDULED'),
      -- Update times if provided (MeetCo/Calendly fields)
      updated_at = NOW()
    WHERE id = v_existing_id;
    
    -- IMPORTANT: Return NULL to cancel the original INSERT
    RETURN NULL;
  END IF;

  -- NOT FOUND: Proceed with normal INSERT
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create BEFORE INSERT trigger
DROP TRIGGER IF EXISTS trigger_reconcile_tenant_insert ON public.tenants;
CREATE TRIGGER trigger_reconcile_tenant_insert
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.reconcile_tenant_insert();

COMMENT ON FUNCTION public.reconcile_tenant_insert() IS
'Detects duplicate tenant inserts for the same apartment/phone and converts them into updates with "anyReschedule ?" = true.';
