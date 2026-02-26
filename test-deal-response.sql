-- ==========================================
-- Test: Deal Response Automation
-- Run in Supabase SQL Editor to verify the trigger
-- ==========================================

DO $$
DECLARE
  v_apt_id UUID;
  v_acc_id UUID;
  v_offers JSONB;
  v_result RECORD;
BEGIN
  -- 1. Create test account
  INSERT INTO public.accounts (tenant_name, whatsapp_number, status)
  VALUES ('Test Tenant Deal', '+31699999888', 'Offer Made')
  RETURNING id INTO v_acc_id;
  RAISE NOTICE 'Created test account: %', v_acc_id;

  -- 2. Create test apartment with offers_sent
  INSERT INTO public.apartments (name, street, area, rental_price, bedrooms, square_meters, status)
  VALUES ('Test Apt Deal Response', 'Teststraat 123', 'Amsterdam', 1500, '2', 55, 'Active')
  RETURNING id INTO v_apt_id;
  RAISE NOTICE 'Created test apartment: %', v_apt_id;

  -- 3. Set offers_sent with a test offer (status = 'Pending')
  v_offers := jsonb_build_array(
    jsonb_build_object(
      'account_id', v_acc_id,
      'tenant_name', 'Test Tenant Deal',
      'whatsapp_number', '+31699999888',
      'status', 'Pending',
      'submitted_at', NOW()
    )
  );

  UPDATE public.apartments SET offers_sent = v_offers WHERE id = v_apt_id;
  RAISE NOTICE 'Set offers_sent with Pending offer';

  -- 4. Update offer to DEAL_ACCEPTED — should trigger automation
  v_offers := jsonb_build_array(
    jsonb_build_object(
      'account_id', v_acc_id,
      'tenant_name', 'Test Tenant Deal',
      'whatsapp_number', '+31699999888',
      'status', 'DEAL_ACCEPTED',
      'responded_at', NOW()
    )
  );

  UPDATE public.apartments SET offers_sent = v_offers WHERE id = v_apt_id;
  RAISE NOTICE '✅ Updated offer to DEAL_ACCEPTED';

  -- 5. Verify: check accounts.accepted_deals
  SELECT accepted_deals, rejected_deals, status INTO v_result
  FROM public.accounts WHERE id = v_acc_id;

  RAISE NOTICE 'Account accepted_deals: %', v_result.accepted_deals;
  RAISE NOTICE 'Account rejected_deals: %', v_result.rejected_deals;
  RAISE NOTICE 'Account status: %', v_result.status;

  IF jsonb_array_length(v_result.accepted_deals) > 0 THEN
    RAISE NOTICE '✅ PASS: accepted_deals populated on accounts';
  ELSE
    RAISE WARNING '❌ FAIL: accepted_deals is empty on accounts';
  END IF;

  IF v_result.status = 'Deal In Progress' THEN
    RAISE NOTICE '✅ PASS: account status updated to Deal In Progress';
  ELSE
    RAISE WARNING '❌ FAIL: account status is %, expected Deal In Progress', v_result.status;
  END IF;

  -- 6. Verify: check apartments.accepted_deals
  SELECT accepted_deals, rejected_deals INTO v_result
  FROM public.apartments WHERE id = v_apt_id;

  RAISE NOTICE 'Apartment accepted_deals: %', v_result.accepted_deals;

  IF jsonb_array_length(v_result.accepted_deals) > 0 THEN
    RAISE NOTICE '✅ PASS: accepted_deals populated on apartments';
  ELSE
    RAISE WARNING '❌ FAIL: accepted_deals is empty on apartments';
  END IF;

  -- 7. Cleanup
  DELETE FROM public.apartments WHERE id = v_apt_id;
  DELETE FROM public.accounts WHERE id = v_acc_id;
  RAISE NOTICE 'Cleaned up test data';
END;
$$;
