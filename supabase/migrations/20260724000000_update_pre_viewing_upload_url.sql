-- Migration: update pre-viewing document reminder payload to link directly to /aanvraag with the apartment pre-selected.
--
-- The previous migration (20260718140000) sent a static upload URL. This patch
-- recreates process_viewing_reminders() so the 24hr-before reminder includes
-- 'https://apartmenthub.nl/aanvraag?apartment=<apartment_id>'.
--
-- No table changes; only the function body is replaced.

CREATE OR REPLACE FUNCTION public.process_viewing_reminders()
RETURNS void AS $$
DECLARE
    v_reminder RECORD;
    v_webhook_url TEXT;
    v_payload JSONB;
    v_apt_address TEXT;
    v_apt_event_link TEXT;
    v_apt_event_link_video TEXT;
    v_apt_row RECORD;
    v_cancelled BOOLEAN;
    v_offer_made BOOLEAN;
    v_phone_norm TEXT;
BEGIN
    FOR v_reminder IN
        SELECT r.*
        FROM public.viewing_reminders r
        WHERE r.sent_at IS NULL
          AND r.skipped_at IS NULL
          AND r.scheduled_at <= NOW()
        ORDER BY r.scheduled_at ASC
        LIMIT 50
    LOOP
        -- Check if the tenant's viewing was cancelled (applies to both pre/post)
        v_cancelled := false;
        IF v_reminder.tenant_id IS NOT NULL THEN
            SELECT COALESCE("anyCancellation ?", false)
            INTO v_cancelled
            FROM public.tenants
            WHERE id = v_reminder.tenant_id;
        END IF;

        IF v_cancelled THEN
            UPDATE public.viewing_reminders
            SET skipped_at = NOW(),
                webhook_response = 'Skipped: viewing was cancelled'
            WHERE id = v_reminder.id;

            RAISE LOG '[ViewingReminders] Skipped reminder % (%): viewing cancelled',
                v_reminder.id, v_reminder.reminder_interval;
            CONTINUE;
        END IF;

        -- Fetch apartment context (address + event links for template branching)
        v_apt_address := v_reminder.apartment_address;
        v_apt_event_link := NULL;
        v_apt_event_link_video := NULL;
        v_apt_row.offers_in := NULL;
        v_apt_row.people_making_offer := NULL;
        IF v_reminder.apartment_id IS NOT NULL THEN
            SELECT a."Full Address", a.event_link, a.eventlink_video,
                   a.offers_in, a.people_making_offer
            INTO v_apt_address, v_apt_event_link, v_apt_event_link_video,
                 v_apt_row.offers_in, v_apt_row.people_making_offer
            FROM public.apartments a
            WHERE a.id = v_reminder.apartment_id;
        END IF;

        -- Branch on interval: post-viewing vs pre-viewing
        IF v_reminder.reminder_interval IN ('15min', '4hr', '17hr', '40hr') THEN
            -- POST-VIEWING branch
            -- Skip-if-offer-made: check offers_in + people_making_offer for
            -- this candidate (account_id exact match OR whatsapp_number digits match)
            v_offer_made := false;
            v_phone_norm := public.normalize_phone_for_match(v_reminder.phone_number);

            IF v_apt_row.offers_in IS NOT NULL OR v_apt_row.people_making_offer IS NOT NULL THEN
                SELECT EXISTS (
                    SELECT 1
                    FROM (
                        SELECT jsonb_array_elements(v_apt_row.offers_in) AS elem
                        UNION ALL
                        SELECT jsonb_array_elements(v_apt_row.people_making_offer) AS elem
                    ) sub
                    WHERE
                        (v_reminder.account_id IS NOT NULL
                         AND sub.elem->>'account_id' = v_reminder.account_id::text)
                        OR
                        (sub.elem->>'whatsapp_number' IS NOT NULL
                         AND public.normalize_phone_for_match(sub.elem->>'whatsapp_number') = v_phone_norm)
                ) INTO v_offer_made;
            END IF;

            IF v_offer_made THEN
                UPDATE public.viewing_reminders
                SET skipped_at = NOW(),
                    webhook_response = 'Skipped: offer already made'
                WHERE id = v_reminder.id;

                RAISE LOG '[ViewingReminders] Skipped reminder % (%): offer already made',
                    v_reminder.id, v_reminder.reminder_interval;
                CONTINUE;
            END IF;

            -- Build post-viewing webhook payload (unchanged from original)
            v_webhook_url := 'https://davidvanwachem.app.n8n.cloud/webhook/post-viewing-reminder';
            v_payload := jsonb_build_object(
                'event_type', 'viewing_reminder',
                'reminder_id', v_reminder.id,
                'tenant_id', v_reminder.tenant_id,
                'account_id', v_reminder.account_id,
                'phone_number', v_reminder.phone_number,
                'tenant_name', COALESCE(v_reminder.tenant_name, ''),
                'apartment_id', v_reminder.apartment_id,
                'apartment_address', COALESCE(v_apt_address, ''),
                'viewing_end_time', v_reminder.viewing_end_time,
                'reminder_interval', v_reminder.reminder_interval,
                'scheduled_at', v_reminder.scheduled_at,
                'timestamp', NOW()
            );

        ELSIF v_reminder.reminder_interval = '2hr-before' THEN
            -- PRE-VIEWING branch: 2-hour reminder
            -- n8n picks in-person vs facetime template based on event_link / eventlink_video
            v_webhook_url := 'https://davidvanwachem.app.n8n.cloud/webhook/viewing-start-reminder';
            v_payload := jsonb_build_object(
                'event_type', 'viewing_start_reminder',
                'reminder_id', v_reminder.id,
                'tenant_id', v_reminder.tenant_id,
                'account_id', v_reminder.account_id,
                'phone_number', v_reminder.phone_number,
                'tenant_name', COALESCE(v_reminder.tenant_name, ''),
                'apartment_id', v_reminder.apartment_id,
                'apartment_address', COALESCE(v_apt_address, ''),
                'viewing_start_time', v_reminder.viewing_start_time,
                'viewing_end_time', v_reminder.viewing_end_time,
                'reminder_interval', v_reminder.reminder_interval,
                'event_link', COALESCE(v_apt_event_link, ''),
                'eventlink_video', COALESCE(v_apt_event_link_video, ''),
                'timestamp', NOW()
            );

        ELSIF v_reminder.reminder_interval = '24hr-before' THEN
            -- PRE-VIEWING branch: 24-hour documents reminder
            -- n8n sends new_flow_upload_documents template with [tenant_name, upload_url]
            v_webhook_url := 'https://davidvanwachem.app.n8n.cloud/webhook/pre-viewing-document-reminder';
            v_payload := jsonb_build_object(
                'event_type', 'pre_viewing_document_reminder',
                'reminder_id', v_reminder.id,
                'tenant_id', v_reminder.tenant_id,
                'account_id', v_reminder.account_id,
                'phone_number', v_reminder.phone_number,
                'tenant_name', COALESCE(v_reminder.tenant_name, ''),
                'apartment_id', v_reminder.apartment_id,
                'apartment_address', COALESCE(v_apt_address, ''),
                'viewing_start_time', v_reminder.viewing_start_time,
                'viewing_end_time', v_reminder.viewing_end_time,
                'reminder_interval', v_reminder.reminder_interval,
                'upload_url', 'https://apartmenthub.nl/aanvraag?apartment=' || COALESCE(v_reminder.apartment_id::text, ''),
                'timestamp', NOW()
            );

        ELSE
            -- Unknown interval -- skip with a note
            UPDATE public.viewing_reminders
            SET skipped_at = NOW(),
                webhook_response = 'Skipped: unknown reminder_interval ' || v_reminder.reminder_interval
            WHERE id = v_reminder.id;
            CONTINUE;
        END IF;

        -- Send webhook via pg_net (shared by all branches)
        BEGIN
            PERFORM net.http_post(
                url := v_webhook_url,
                body := v_payload,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'User-Agent', 'Supabase-Viewing-Reminder'
                )
            );

            UPDATE public.viewing_reminders
            SET sent_at = NOW(),
                webhook_response = 'Sent successfully'
            WHERE id = v_reminder.id;

            RAISE LOG '[ViewingReminders] Sent reminder % (%) for phone=%',
                v_reminder.id, v_reminder.reminder_interval, v_reminder.phone_number;

        EXCEPTION WHEN OTHERS THEN
            UPDATE public.viewing_reminders
            SET webhook_response = 'Error: ' || SQLERRM
            WHERE id = v_reminder.id;

            RAISE WARNING '[ViewingReminders] Failed to send reminder % for phone=%: %',
                v_reminder.id, v_reminder.phone_number, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.process_viewing_reminders() IS
'Processes due viewing reminders. Called by pg_cron every 5 minutes. Routes by reminder_interval: post-viewing (15min/4hr/17hr/40hr) skips cancelled viewings AND viewings where the candidate already made an offer, then fires post-viewing-reminder webhook. Pre-viewing (2hr-before/24hr-before) skips cancelled viewings, then fires viewing-start-reminder or pre-viewing-document-reminder webhook. The 24hr-before reminder links to /aanvraag?apartment=<apartment_id>.';
