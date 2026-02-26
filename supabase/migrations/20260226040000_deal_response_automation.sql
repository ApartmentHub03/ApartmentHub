-- Migration: Deal Response Automation
--
-- When an offer in apartments.offers_sent has its status changed to
-- DEAL_ACCEPTED or OFFER_DECLINED, automatically:
--   1. Sync deal info to accounts.accepted_deals / rejected_deals
--   2. Sync deal info to apartments.accepted_deals / rejected_deals
--   3. Update accounts.status accordingly
--   4. Fire an n8n webhook with full deal details

-- ==========================================
-- 1. Add accepted_deals & rejected_deals columns
-- ==========================================

-- Accounts table
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS accepted_deals JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS rejected_deals JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.accounts.accepted_deals IS
'Array of accepted deal objects: [{apartment_id, apartment_name, address, rental_price, responded_at}]';

COMMENT ON COLUMN public.accounts.rejected_deals IS
'Array of rejected deal objects: [{apartment_id, apartment_name, address, rental_price, responded_at}]';

-- Apartments table
ALTER TABLE public.apartments
ADD COLUMN IF NOT EXISTS accepted_deals JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.apartments
ADD COLUMN IF NOT EXISTS rejected_deals JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.apartments.accepted_deals IS
'Array of accepted deal objects: [{account_id, tenant_name, whatsapp_number, responded_at}]';

COMMENT ON COLUMN public.apartments.rejected_deals IS
'Array of rejected deal objects: [{account_id, tenant_name, whatsapp_number, responded_at}]';


-- ==========================================
-- 2. Trigger function: handle deal responses
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_deal_response()
RETURNS TRIGGER AS $$
DECLARE
  v_webhook_url TEXT := 'https://davidvanwachem.app.n8n.cloud/webhook/deal-response';
  v_old_offers JSONB;
  v_new_offers JSONB;
  v_old_offer JSONB;
  v_new_offer JSONB;
  v_old_status TEXT;
  v_new_status TEXT;
  v_account_id UUID;
  v_tenant_name TEXT;
  v_tenant_phone TEXT;
  v_responded_at TIMESTAMPTZ;
  v_apt_address TEXT;
  v_agent_name TEXT;
  v_agent_id UUID;
  v_deal_for_account JSONB;
  v_deal_for_apartment JSONB;
  v_payload JSONB;
  i INT;
BEGIN
  v_old_offers := COALESCE(OLD.offers_sent, '[]'::jsonb);
  v_new_offers := COALESCE(NEW.offers_sent, '[]'::jsonb);

  -- Iterate through new offers and compare with old
  FOR i IN 0 .. (jsonb_array_length(v_new_offers) - 1) LOOP
    v_new_offer := v_new_offers->i;
    v_new_status := upper(trim(COALESCE(v_new_offer->>'status', '')));

    -- Only process DEAL_ACCEPTED or OFFER_DECLINED
    IF v_new_status NOT IN ('DEAL_ACCEPTED', 'OFFER_DECLINED') THEN
      CONTINUE;
    END IF;

    -- Find matching old offer by account_id or phone
    v_old_status := NULL;
    IF i < jsonb_array_length(v_old_offers) THEN
      v_old_offer := v_old_offers->i;
      v_old_status := upper(trim(COALESCE(v_old_offer->>'status', '')));
    END IF;

    -- Skip if status hasn't changed
    IF v_old_status IS NOT NULL AND v_old_status = v_new_status THEN
      CONTINUE;
    END IF;

    -- Extract tenant details from the offer
    v_tenant_name := COALESCE(v_new_offer->>'tenant_name', v_new_offer->>'name', '');
    v_tenant_phone := COALESCE(v_new_offer->>'whatsapp_number', v_new_offer->>'phone_number', '');
    v_responded_at := COALESCE(
      (v_new_offer->>'responded_at')::timestamptz,
      NOW()
    );

    -- Try to get account_id from the offer
    v_account_id := NULL;
    IF v_new_offer->>'account_id' IS NOT NULL AND v_new_offer->>'account_id' != '' THEN
      BEGIN
        v_account_id := (v_new_offer->>'account_id')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_account_id := NULL;
      END;
    END IF;

    -- Fallback: match account by phone number
    IF v_account_id IS NULL AND v_tenant_phone != '' THEN
      SELECT id INTO v_account_id
      FROM public.accounts
      WHERE whatsapp_number IS NOT NULL
        AND trim(whatsapp_number) != ''
        AND public.normalize_phone_for_match(whatsapp_number)
            = public.normalize_phone_for_match(v_tenant_phone)
      LIMIT 1;
    END IF;

    -- Resolve apartment address
    v_apt_address := COALESCE(NEW."Full Address", NEW.full_address, NEW.street, '');

    -- Resolve real estate agent
    v_agent_id := NEW.real_estate_agent_id;
    v_agent_name := NULL;
    IF v_agent_id IS NOT NULL THEN
      SELECT name INTO v_agent_name
      FROM public.real_estate_agents
      WHERE id = v_agent_id
      LIMIT 1;
    END IF;

    -- Build deal objects
    v_deal_for_account := jsonb_build_object(
      'apartment_id', NEW.id,
      'apartment_name', COALESCE(NEW.name, ''),
      'address', v_apt_address,
      'rental_price', COALESCE(NEW.rental_price, 0),
      'real_estate_agent_id', v_agent_id,
      'real_estate_agent_name', COALESCE(v_agent_name, ''),
      'responded_at', v_responded_at
    );

    v_deal_for_apartment := jsonb_build_object(
      'account_id', v_account_id,
      'tenant_name', v_tenant_name,
      'whatsapp_number', v_tenant_phone,
      'responded_at', v_responded_at
    );

    -- ======== Update accounts table ========
    IF v_account_id IS NOT NULL THEN
      IF v_new_status = 'DEAL_ACCEPTED' THEN
        UPDATE public.accounts
        SET accepted_deals = COALESCE(accepted_deals, '[]'::jsonb) || v_deal_for_account,
            status = 'Deal In Progress',
            updated_at = timezone('utc'::text, now())
        WHERE id = v_account_id;
      ELSE -- OFFER_DECLINED
        UPDATE public.accounts
        SET rejected_deals = COALESCE(rejected_deals, '[]'::jsonb) || v_deal_for_account,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_account_id;
      END IF;
    END IF;

    -- ======== Update apartments table (self) ========
    IF v_new_status = 'DEAL_ACCEPTED' THEN
      NEW.accepted_deals := COALESCE(NEW.accepted_deals, '[]'::jsonb) || v_deal_for_apartment;
    ELSE -- OFFER_DECLINED
      NEW.rejected_deals := COALESCE(NEW.rejected_deals, '[]'::jsonb) || v_deal_for_apartment;
    END IF;

    -- ======== Fire n8n webhook ========
    v_payload := jsonb_build_object(
      'event_type', v_new_status,
      'account_id', v_account_id,
      'tenant_name', v_tenant_name,
      'whatsapp_number', v_tenant_phone,
      'apartment_id', NEW.id,
      'apartment_name', COALESCE(NEW.name, ''),
      'address', v_apt_address,
      'rental_price', COALESCE(NEW.rental_price, 0),
      'bedrooms', NEW.bedrooms,
      'square_meters', NEW.square_meters,
      'real_estate_agent_id', v_agent_id,
      'real_estate_agent_name', COALESCE(v_agent_name, ''),
      'responded_at', v_responded_at,
      'timestamp', NOW()
    );

    BEGIN
      PERFORM net.http_post(
        url := v_webhook_url,
        body := v_payload,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'User-Agent', 'Supabase-Deal-Response-Trigger'
        )
      );
      RAISE NOTICE '[Deal Response] Webhook sent: % for apartment % account %',
        v_new_status, NEW.id, v_account_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[Deal Response] Webhook failed for apartment %: %', NEW.id, SQLERRM;
    END;

  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_deal_response() IS
'When offers_sent entries change status to DEAL_ACCEPTED or OFFER_DECLINED, syncs deal info to both accounts and apartments tables and fires n8n webhook.';


-- ==========================================
-- 3. Create trigger
-- ==========================================
DROP TRIGGER IF EXISTS trigger_deal_response ON public.apartments;
CREATE TRIGGER trigger_deal_response
  BEFORE UPDATE OF offers_sent ON public.apartments
  FOR EACH ROW
  WHEN (NEW.offers_sent IS DISTINCT FROM OLD.offers_sent)
  EXECUTE FUNCTION public.handle_deal_response();
