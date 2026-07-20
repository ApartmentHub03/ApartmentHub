-- Migration: Fix handle_deal_response + handle_generate_offer after
-- apartments.name / apartments.full_address columns were dropped in prod.
--
-- Both trigger functions referenced the dropped columns via NEW.name and
-- NEW.full_address. Postgres evaluates COALESCE args eagerly, so
--   COALESCE(NEW."Full Address", NEW.full_address, NEW.street, '')
-- throws "record new has no field full_address" before COALESCE can fall
-- through to NEW.street. handle_deal_response had been dormant because
-- nothing wrote DEAL_ACCEPTED to offers_sent until the new Send Offer
-- pipeline (20260719); handle_generate_offer is still dormant because the
-- generate-offer route fires the n8n webhook directly from the API.
--
-- Fix: read columns through to_jsonb(NEW)->>'col' instead of NEW.col.
-- Same pattern already used in 20260218170000 (status column drift) and
-- 20260220100000 (real_estate_agent_id). Returns NULL for missing columns
-- instead of throwing.

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
  v_apt_name TEXT;
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

    -- Safe address/name reads via to_jsonb(NEW) -- survives dropped columns
    -- (apartments.name and apartments.full_address were dropped in prod,
    -- only "Full Address" remains; see 20260717000000 backfill migration)
    v_apt_address := COALESCE(to_jsonb(NEW)->>'Full Address',
                             to_jsonb(NEW)->>'full_address',
                             to_jsonb(NEW)->>'street', '');
    v_apt_name := COALESCE(to_jsonb(NEW)->>'name',
                           to_jsonb(NEW)->>'Full Address', '');

    -- Resolve real estate agent (also via to_jsonb for drift safety)
    v_agent_id := NULL;
    BEGIN
      v_agent_id := (to_jsonb(NEW)->>'real_estate_agent_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_agent_id := NULL;
    END;

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
      'apartment_name', v_apt_name,
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
      'apartment_name', v_apt_name,
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
'When offers_sent entries change status to DEAL_ACCEPTED or OFFER_DECLINED, syncs deal info to both accounts and apartments tables and fires n8n webhook. Reads address/name via to_jsonb(NEW) to survive dropped columns.';


-- ==========================================
-- Also fix the dormant handle_generate_offer function (same dropped-column
-- bug pattern). Not in the critical path today (the generate-offer route
-- fires n8n directly), but fixing it now prevents a future landmine if
-- someone ever reactivates the trigger.
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_generate_offer()
RETURNS TRIGGER AS $$
DECLARE
  v_webhook_url TEXT := 'https://davidvanwachem.app.n8n.cloud/webhook/send-offer-to-the-tenant';
  v_payload JSONB;
  v_phone TEXT;
  v_apt_address TEXT;
  v_apt_name TEXT;
BEGIN
  v_phone := trim(NEW."generate_offer");

  -- Only fire when a non-empty phone number is set
  IF v_phone IS NULL OR v_phone = '' THEN
    RETURN NEW;
  END IF;

  -- Safe address/name reads via to_jsonb(NEW) -- survives dropped columns
  v_apt_address := COALESCE(to_jsonb(NEW)->>'Full Address',
                           to_jsonb(NEW)->>'full_address',
                           to_jsonb(NEW)->>'street');
  v_apt_name := COALESCE(to_jsonb(NEW)->>'name',
                        to_jsonb(NEW)->>'Full Address', '');

  -- Build payload with tenant phone + full apartment details
  v_payload := jsonb_build_object(
    'event_type', 'generate_offer',
    'tenant_phone', v_phone,
    'apartment_id', NEW.id,
    'apartment_name', v_apt_name,
    'full_address', v_apt_address,
    'area', NEW.area,
    'rental_price', NEW.rental_price,
    'bedrooms', NEW.bedrooms,
    'square_meters', NEW.square_meters,
    'event_link', NEW.event_link,
    'status', NEW.status,
    'salesforce_id', NEW.salesforce_id,
    'additional_notes', NEW.additional_notes,
    'tags', to_jsonb(COALESCE(NEW.tags, ARRAY[]::TEXT[])),
    'timestamp', NOW()
  );

  BEGIN
    PERFORM net.http_post(
      url := v_webhook_url,
      body := v_payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'User-Agent', 'Supabase-Webhook-Trigger'
      )
    );
    RAISE NOTICE '[Generate Offer] Webhook sent for apartment % to phone %', NEW.id, v_phone;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[Generate Offer] Webhook failed for apartment %: %', NEW.id, SQLERRM;
  END;

  -- Clear the field after sending so it can be re-used
  NEW."generate_offer" := NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_generate_offer() IS
'When a phone number is entered in apartments.generate_offer, sends a webhook to n8n with tenant phone and apartment details, then clears the field. Reads address/name via to_jsonb(NEW) to survive dropped columns.';
