-- Migration: Fix Deal Status Transition
--
-- When "deal ?" flips between true/false, the deal entry must MOVE
-- from one list to the other (not just be appended to the new list).
-- This replaces handle_deal_status() so that:
--   - deal ? → true:  append to accepted_deals AND remove from rejected_deals
--   - deal ? → false: append to rejected_deals AND remove from accepted_deals

CREATE OR REPLACE FUNCTION public.handle_deal_status()
RETURNS TRIGGER AS $$
DECLARE
  v_webhook_url TEXT := 'https://davidvanwachem.app.n8n.cloud/webhook/get-deal-info-of-tenant';
  v_tenant_json JSONB;
  v_tenant_phone_norm TEXT;
  v_tenant_event_url TEXT;
  v_apt_rec RECORD;
  v_account_rec RECORD;
  v_deal_entry JSONB;
  v_is_accepted BOOLEAN;
  v_cleaned JSONB;
  v_payload JSONB;
BEGIN
  v_is_accepted := NEW."deal ?";
  v_tenant_json := to_jsonb(NEW);
  v_tenant_phone_norm := public.normalize_phone_for_match(NEW.whatsapp_number);
  v_tenant_event_url := public.extract_tenant_event_url(NEW);

  -- Look up the apartment by matching event URL
  v_apt_rec := NULL;
  IF v_tenant_event_url IS NOT NULL THEN
    SELECT * INTO v_apt_rec
    FROM public.apartments
    WHERE event_link IS NOT NULL
      AND public.event_url_matches(v_tenant_event_url, event_link)
    LIMIT 1;
  END IF;

  -- Fallback: match by apartment_id
  IF v_apt_rec IS NULL AND NEW.apartment_id IS NOT NULL THEN
    SELECT * INTO v_apt_rec
    FROM public.apartments
    WHERE id = NEW.apartment_id
    LIMIT 1;
  END IF;

  -- Build the deal entry with tenant + apartment details
  v_deal_entry := jsonb_build_object(
    -- Tenant details
    'tenant_id',            NEW.id,
    'tenant_name',          NEW.name,
    'whatsapp_number',      NEW.whatsapp_number,
    'email',                COALESCE(v_tenant_json->>'Email', v_tenant_json->>'email'),
    'EventURL',             NEW."EventURL",
    'EventTitle',           COALESCE(v_tenant_json->>'eventTitle', v_tenant_json->>'EventTitle'),
    'eventDescription',     v_tenant_json->>'eventDescription',
    'destinationCalendar',  NEW."destinationCalendar",
    'BookingAt',            NEW."BookingAt",
    'Viewing_StartTime',    NEW."Viewing_StartTime",
    'Viewing_EndTime',      NEW."Viewing_EndTime",
    'MeetingURL',           NEW."MeetingURL",
    'bookingDate',          v_tenant_json->>'bookingDate',
    'tenant_status',        NEW.status,
    'AdditionalNotes',      NEW."AdditionalNotes",
    -- Apartment details
    'apartment_id',         v_apt_rec.id,
    'apartment_address',    v_apt_rec."Full Address",
    'apartment_street',     v_apt_rec.street,
    'apartment_area',       v_apt_rec.area,
    'apartment_zip_code',   v_apt_rec.zip_code,
    'apartment_rental_price', v_apt_rec.rental_price,
    'apartment_bedrooms',   v_apt_rec.bedrooms,
    'apartment_sqm',        v_apt_rec.square_meters,
    'apartment_status',     v_apt_rec.status,
    'apartment_event_link', v_apt_rec.event_link,
    'apartment_salesforce_id', v_apt_rec.salesforce_id,
    'apartment_tags',       COALESCE(to_jsonb(v_apt_rec.tags), '[]'::jsonb),
    'apartment_additional_notes', v_apt_rec.additional_notes,
    'deal_accepted',        v_is_accepted,
    'recorded_at',          now()
  );

  -- Find matching account and update the right column
  FOR v_account_rec IN
    SELECT id, accepted_deals, rejected_deals
    FROM public.accounts
    WHERE whatsapp_number IS NOT NULL
      AND trim(whatsapp_number) != ''
      AND public.normalize_phone_for_match(whatsapp_number) = v_tenant_phone_norm
  LOOP
    IF v_is_accepted THEN
      -- deal ? = true → add to accepted_deals, REMOVE from rejected_deals
      -- Remove matching entries from rejected_deals by tenant_id
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      INTO v_cleaned
      FROM jsonb_array_elements(COALESCE(v_account_rec.rejected_deals, '[]'::jsonb)) AS elem
      WHERE elem->>'tenant_id' IS DISTINCT FROM NEW.id::text;

      UPDATE public.accounts
      SET accepted_deals = COALESCE(accepted_deals, '[]'::jsonb) || v_deal_entry,
          rejected_deals = v_cleaned,
          status = 'Deal In Progress',
          updated_at = timezone('utc'::text, now())
      WHERE id = v_account_rec.id;

      RAISE NOTICE '[Deal Status] Account % → accepted deal from tenant % (removed from rejected_deals)', v_account_rec.id, NEW.id;
    ELSE
      -- deal ? = false → add to rejected_deals, REMOVE from accepted_deals
      -- Remove matching entries from accepted_deals by tenant_id
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      INTO v_cleaned
      FROM jsonb_array_elements(COALESCE(v_account_rec.accepted_deals, '[]'::jsonb)) AS elem
      WHERE elem->>'tenant_id' IS DISTINCT FROM NEW.id::text;

      UPDATE public.accounts
      SET rejected_deals = COALESCE(rejected_deals, '[]'::jsonb) || v_deal_entry,
          accepted_deals = v_cleaned,
          updated_at = timezone('utc'::text, now())
      WHERE id = v_account_rec.id;

      RAISE NOTICE '[Deal Status] Account % → rejected deal from tenant % (removed from accepted_deals)', v_account_rec.id, NEW.id;
    END IF;

    -- ======== Fire n8n webhook for both accepted and rejected ========
    v_payload := v_deal_entry || jsonb_build_object(
      'event_type', CASE WHEN v_is_accepted THEN 'DEAL_ACCEPTED' ELSE 'DEAL_REJECTED' END,
      'account_id', v_account_rec.id,
      'timestamp', now()
    );

    BEGIN
      PERFORM net.http_post(
        url := v_webhook_url,
        body := v_payload,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'User-Agent', 'Supabase-Deal-Status-Trigger'
        )
      );
      RAISE NOTICE '[Deal Status] Webhook sent: % for tenant % account %',
        CASE WHEN v_is_accepted THEN 'DEAL_ACCEPTED' ELSE 'DEAL_REJECTED' END, NEW.id, v_account_rec.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[Deal Status] Webhook failed for tenant %: %', NEW.id, SQLERRM;
    END;

  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_deal_status() IS
'When "deal ?" changes: true → appends to accounts.accepted_deals, removes from rejected_deals, sets status to Deal In Progress; false → appends to accounts.rejected_deals, removes from accepted_deals. Fires n8n webhook with full tenant + apartment details for both transitions.';
