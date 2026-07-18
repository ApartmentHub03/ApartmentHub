-- Migration: Thank-you-for-offer trigger (first doc upload post-viewing)
--
-- Phase 5 trigger #4: when a candidate uploads their first document AFTER
-- attending a viewing, fire an n8n webhook so Zoko can send the
-- `thank_you_for_making_the_offer` template.
--
-- "First upload post-viewing" = the first documenten row for this persoon
-- whose created_at is later than the viewing_start_time of a viewing the
-- candidate attended. A guard table (thank_you_offer_sent) prevents
-- duplicate fires if the candidate uploads multiple documents in quick
-- succession (the dossier/save route deletes + re-inserts all documenten
-- on every save, so without a guard we'd fire N times per save).
--
-- n8n side (David creates this workflow):
--   /webhook/thank-you-for-offer — uses Zoko template
--   `thank_you_for_making_the_offer` (zokoId:
--   sales_force_thank_you_for_making_the_offer_) with templateArgs
--   [tenant_name, apartment_address, questions_link].
--
-- Note on the questions_link: the template's {{3}} is a "I have questions"
-- button URL. We pass a generic contact URL here; David can change in n8n.

-- ==========================================
-- 1. Guard table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.thank_you_offer_sent (
    account_id UUID NOT NULL,
    apartment_id UUID NOT NULL,
    viewing_start_time TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (account_id, apartment_id)
);

ALTER TABLE public.thank_you_offer_sent ENABLE ROW LEVEL SECURITY;
-- Create policy idempotently without DROP (avoids SQL Editor destructive
-- warning). DO block checks pg_policies and only CREATEs if missing.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'thank_you_offer_sent'
          AND policyname = 'Service role full access for thank_you_offer_sent'
    ) THEN
        CREATE POLICY "Service role full access for thank_you_offer_sent"
            ON public.thank_you_offer_sent
            FOR ALL
            USING (true);
    END IF;
END $$;

COMMENT ON TABLE public.thank_you_offer_sent IS
'Guard table for the thank-you-for-offer trigger. One row per (account_id, apartment_id) pair prevents duplicate fires when the dossier/save route re-inserts documenten rows.';

-- ==========================================
-- 2. Ensure documenten has the columns we rely on
-- ==========================================
-- `bestandspad` and `bestandsnaam` are referenced by the recompute trigger
-- (20260224000000) but never explicitly added via migration — they may have
-- been added via Supabase dashboard. ADD COLUMN IF NOT EXISTS is safe.
ALTER TABLE public.documenten ADD COLUMN IF NOT EXISTS bestandspad TEXT;
ALTER TABLE public.documenten ADD COLUMN IF NOT EXISTS bestandsnaam TEXT;
ALTER TABLE public.documenten ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==========================================
-- 3. Trigger function
-- ==========================================
CREATE OR REPLACE FUNCTION public.thank_you_for_offer()
RETURNS TRIGGER AS $$
DECLARE
    v_dossier_id UUID;
    v_phone TEXT;
    v_account_id UUID;
    v_tenant_name TEXT;
    v_apartment_id UUID;
    v_apartment_address TEXT;
    v_viewing_start_time TIMESTAMP WITH TIME ZONE;
    v_participant jsonb;
    v_phone_norm TEXT;
    v_participant_phone_norm TEXT;
    v_already_sent BOOLEAN;
    v_first_upload_count INTEGER;
    v_payload JSONB;
BEGIN
    -- Only fire on received documents with a file path
    IF NEW.status IS DISTINCT FROM 'ontvangen' THEN
        RETURN NEW;
    END IF;
    IF NEW.bestandspad IS NULL AND NEW.file_path IS NULL THEN
        RETURN NEW;
    END IF;

    -- Resolve dossier_id via personen
    SELECT p.dossier_id INTO v_dossier_id
    FROM public.personen p
    WHERE p.id = NEW.persoon_id;
    IF v_dossier_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get the phone number from dossiers
    SELECT dos.phone_number INTO v_phone
    FROM public.dossiers dos
    WHERE dos.id = v_dossier_id;
    IF v_phone IS NULL OR v_phone = '' THEN
        RETURN NEW;
    END IF;

    -- Look up the account by phone
    v_phone_norm := public.normalize_phone_for_match(v_phone);
    SELECT a.id, a.tenant_name INTO v_account_id, v_tenant_name
    FROM public.accounts a
    WHERE public.normalize_phone_for_match(a.whatsapp_number) = v_phone_norm
    LIMIT 1;
    IF v_account_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Find an apartment where this candidate is in viewing_participants.
    -- This means they actually attended (or at least booked) a viewing.
    SELECT a.id, a."Full Address", p.participant
    INTO v_apartment_id, v_apartment_address, v_participant
    FROM public.apartments a
    CROSS JOIN LATERAL (
        SELECT jsonb_array_elements(a.viewing_participants) AS participant
    ) p
    WHERE a.viewing_participants IS NOT NULL
      AND jsonb_array_length(a.viewing_participants) > 0
      AND public.normalize_phone_for_match(p.participant->>'whatsapp_number') = v_phone_norm
    LIMIT 1;

    IF v_apartment_id IS NULL OR v_participant IS NULL THEN
        -- No viewing attended for any apartment — nothing to thank them for.
        RETURN NEW;
    END IF;

    -- Determine the viewing_start_time from the tenants table for this
    -- candidate + apartment (matches by apartment_id OR event_link).
    SELECT public._safe_parse_timestamptz(
        COALESCE(to_jsonb(t)->>'Viewing_StartTime', to_jsonb(t)->>'viewing_start_time')
    )
    INTO v_viewing_start_time
    FROM public.tenants t
    WHERE t.whatsapp_number IS NOT NULL
      AND public.normalize_phone_for_match(t.whatsapp_number) = v_phone_norm
      AND (t.apartment_id = v_apartment_id
           OR public.event_url_matches(public.extract_tenant_event_url(t),
                (SELECT event_link FROM public.apartments WHERE id = v_apartment_id))
           OR public.event_url_matches(public.extract_tenant_event_url(t),
                (SELECT eventlink_video FROM public.apartments WHERE id = v_apartment_id)))
    ORDER BY t.created_at DESC
    LIMIT 1;

    IF v_viewing_start_time IS NULL THEN
        -- Viewing start time not known — can't determine "post-viewing".
        -- Be lenient: treat the participant row's created_at as the viewing
        -- moment if present, else skip.
        v_viewing_start_time := public._safe_parse_timestamptz(
            v_participant->>'created_at'
        );
        IF v_viewing_start_time IS NULL THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Guard: already sent for this (account, apartment) pair?
    SELECT EXISTS (
        SELECT 1 FROM public.thank_you_offer_sent
        WHERE account_id = v_account_id AND apartment_id = v_apartment_id
    ) INTO v_already_sent;
    IF v_already_sent THEN
        RETURN NEW;
    END IF;

    -- "First upload post-viewing" check: count documenten rows for this
    -- persoon_id with created_at > viewing_start_time. If more than 1, this
    -- isn't the first — skip. (The recompute trigger fires AFTER INSERT so
    -- the row we're processing is already in the table, hence > 1.)
    SELECT COUNT(*) INTO v_first_upload_count
    FROM public.documenten d
    WHERE d.persoon_id = NEW.persoon_id
      AND d.status = 'ontvangen'
      AND (d.bestandspad IS NOT NULL OR d.file_path IS NOT NULL)
      AND d.created_at > v_viewing_start_time;
    IF v_first_upload_count > 1 THEN
        RETURN NEW;
    END IF;

    -- Insert guard row BEFORE firing the webhook so concurrent inserts
    -- can't double-fire.
    INSERT INTO public.thank_you_offer_sent (account_id, apartment_id, viewing_start_time)
    VALUES (v_account_id, v_apartment_id, v_viewing_start_time)
    ON CONFLICT (account_id, apartment_id) DO NOTHING;

    -- Build payload
    v_payload := jsonb_build_object(
        'event_type', 'thank_you_for_offer',
        'account_id', v_account_id,
        'tenant_name', COALESCE(v_tenant_name, ''),
        'whatsapp_number', v_phone,
        'apartment_id', v_apartment_id,
        'apartment_address', COALESCE(v_apartment_address, ''),
        'viewing_start_time', v_viewing_start_time,
        'upload_url', 'https://apartmenthub.nl/upload-documents/',
        'questions_link', 'https://apartmenthub.nl/contact/',
        'timestamp', NOW()
    );

    -- Fire the n8n webhook
    BEGIN
        PERFORM net.http_post(
            url := 'https://davidvanwachem.app.n8n.cloud/webhook/thank-you-for-offer',
            body := v_payload,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'User-Agent', 'Supabase-Thank-You-For-Offer'
            )
        );
        RAISE LOG '[ThankYouForOffer] Fired for account=% apartment=% phone=%',
            v_account_id, v_apartment_id, v_phone;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[ThankYouForOffer] Failed to fire webhook for account=% apartment=%: %',
            v_account_id, v_apartment_id, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.thank_you_for_offer() IS
'Trigger function: fires when a candidate uploads their first document after attending a viewing. Sends n8n webhook so Zoko can send the thank_you_for_making_the_offer template. Guarded by thank_you_offer_sent table to prevent duplicate fires.';

-- ==========================================
-- 4. Trigger on documenten table
-- ==========================================
-- Create trigger idempotently without DROP (avoids SQL Editor destructive
-- warning). DO block checks pg_trigger and only CREATEs if missing.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_thank_you_for_offer'
          AND tgrelid = 'public.documenten'::regclass
    ) THEN
        CREATE TRIGGER trigger_thank_you_for_offer
            AFTER INSERT ON public.documenten
            FOR EACH ROW
            WHEN (NEW.status = 'ontvangen')
            EXECUTE FUNCTION public.thank_you_for_offer();
    END IF;
END $$;