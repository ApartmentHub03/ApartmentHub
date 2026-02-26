-- Migration: Pre-Registration Document Reminder (aanvraag-general)
--
-- When a user enters via aanvraag-general and doesn't upload documents,
-- send a reminder webhook after 24 hours to:
-- https://davidvanwachem.app.n8n.cloud/webhook/send-pre-reminder
--
-- This uses the existing document_reminders infrastructure but adds
-- a separate "pre_reminder" entry specifically for general route users.

-- ==========================================
-- 1. Add pre_reminder scheduling function
-- ==========================================
CREATE OR REPLACE FUNCTION public.schedule_pre_registration_reminder()
RETURNS TRIGGER AS $$
DECLARE
    v_phone TEXT;
    v_account_id UUID;
    v_dossier_id UUID;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Get info depending on which table fired
    IF TG_TABLE_NAME = 'accounts' THEN
        v_phone := NEW.whatsapp_number;
        v_account_id := NEW.id;
        SELECT id INTO v_dossier_id
        FROM public.dossiers
        WHERE phone_number = v_phone 
           OR REPLACE(phone_number, ' ', '') = REPLACE(v_phone, ' ', '')
        LIMIT 1;
    ELSIF TG_TABLE_NAME = 'dossiers' THEN
        v_phone := NEW.phone_number;
        v_dossier_id := NEW.id;
        SELECT id INTO v_account_id
        FROM public.accounts
        WHERE whatsapp_number = v_phone
           OR REPLACE(whatsapp_number, ' ', '') = REPLACE(v_phone, ' ', '')
        LIMIT 1;
    ELSE
        RETURN NEW;
    END IF;

    IF v_phone IS NULL OR v_phone = '' THEN
        RETURN NEW;
    END IF;

    -- Don't schedule duplicate pre-reminders for the same phone
    IF EXISTS (
        SELECT 1 FROM public.document_reminders 
        WHERE phone_number = v_phone 
          AND reminder_interval = '24hr-pre'
          AND sent_at IS NULL 
          AND skipped_at IS NULL
        LIMIT 1
    ) THEN
        RETURN NEW;
    END IF;

    -- Schedule a 24-hour reminder
    INSERT INTO public.document_reminders 
        (account_id, dossier_id, phone_number, reminder_interval, scheduled_at)
    VALUES
        (v_account_id, v_dossier_id, v_phone, '24hr-pre', v_now + INTERVAL '24 hours');

    RAISE LOG '[PreReminder] Scheduled 24hr pre-reminder for phone=%', v_phone;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.schedule_pre_registration_reminder() IS
'Schedules a 24-hour pre-registration document reminder that fires send-pre-reminder webhook if docs are still incomplete.';

-- ==========================================
-- 2. Triggers (same as regular reminders but uses separate function)
-- ==========================================
DROP TRIGGER IF EXISTS trigger_schedule_pre_reminder_on_account ON public.accounts;
CREATE TRIGGER trigger_schedule_pre_reminder_on_account
    AFTER INSERT ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.schedule_pre_registration_reminder();

DROP TRIGGER IF EXISTS trigger_schedule_pre_reminder_on_dossier ON public.dossiers;
CREATE TRIGGER trigger_schedule_pre_reminder_on_dossier
    AFTER INSERT ON public.dossiers
    FOR EACH ROW
    EXECUTE FUNCTION public.schedule_pre_registration_reminder();

-- ==========================================
-- 3. Update process_document_reminders to handle '24hr-pre' interval
--    by routing to different webhook URL
-- ==========================================
CREATE OR REPLACE FUNCTION public.process_document_reminders()
RETURNS void AS $$
DECLARE
    v_reminder RECORD;
    v_doc_status TEXT;
    v_webhook_url TEXT;
    v_payload JSONB;
    v_tenant_name TEXT;
    v_tenant_email TEXT;
    v_tenant_phone TEXT;
BEGIN
    FOR v_reminder IN
        SELECT r.*
        FROM public.document_reminders r
        WHERE r.sent_at IS NULL
          AND r.skipped_at IS NULL
          AND r.scheduled_at <= NOW()
        ORDER BY r.scheduled_at ASC
        LIMIT 50
    LOOP
        v_doc_status := NULL;
        v_tenant_name := NULL;
        v_tenant_email := NULL;
        v_tenant_phone := v_reminder.phone_number;

        IF v_reminder.account_id IS NOT NULL THEN
            SELECT documentation_status, tenant_name, email
            INTO v_doc_status, v_tenant_name, v_tenant_email
            FROM public.accounts
            WHERE id = v_reminder.account_id;
        ELSE
            SELECT documentation_status, tenant_name, email
            INTO v_doc_status, v_tenant_name, v_tenant_email
            FROM public.accounts
            WHERE whatsapp_number = v_reminder.phone_number
               OR REPLACE(whatsapp_number, ' ', '') = REPLACE(v_reminder.phone_number, ' ', '')
            LIMIT 1;
        END IF;

        -- If documents are already complete, skip
        IF v_doc_status = 'Complete' THEN
            UPDATE public.document_reminders
            SET skipped_at = NOW(),
                webhook_response = 'Skipped: documentation already complete'
            WHERE id = v_reminder.id;
            CONTINUE;
        END IF;

        -- Route to different webhook based on reminder type
        IF v_reminder.reminder_interval = '24hr-pre' THEN
            v_webhook_url := 'https://davidvanwachem.app.n8n.cloud/webhook/send-pre-reminder';
        ELSE
            v_webhook_url := 'https://davidvanwachem.app.n8n.cloud/webhook/document-upload-reminder';
        END IF;

        -- Build payload
        v_payload := jsonb_build_object(
            'event_type', CASE 
                WHEN v_reminder.reminder_interval = '24hr-pre' THEN 'pre_registration_reminder'
                ELSE 'document_reminder'
            END,
            'reminder_id', v_reminder.id,
            'account_id', v_reminder.account_id,
            'dossier_id', v_reminder.dossier_id,
            'phone_number', v_tenant_phone,
            'tenant_name', COALESCE(v_tenant_name, ''),
            'email', COALESCE(v_tenant_email, ''),
            'reminder_interval', v_reminder.reminder_interval,
            'documentation_status', COALESCE(v_doc_status, 'Pending'),
            'login_url', 'https://www.apartmenthub.nl/aanvraag-general',
            'scheduled_at', v_reminder.scheduled_at,
            'created_at', v_reminder.created_at,
            'timestamp', NOW()
        );

        BEGIN
            PERFORM net.http_post(
                url := v_webhook_url,
                body := v_payload,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'User-Agent', 'Supabase-Document-Reminder'
                )
            );

            UPDATE public.document_reminders
            SET sent_at = NOW(),
                webhook_response = 'Sent successfully to ' || v_webhook_url
            WHERE id = v_reminder.id;

            RAISE LOG '[DocumentReminders] Sent reminder % (%) to %', 
                v_reminder.id, v_reminder.reminder_interval, v_webhook_url;

        EXCEPTION WHEN OTHERS THEN
            UPDATE public.document_reminders
            SET webhook_response = 'Error: ' || SQLERRM
            WHERE id = v_reminder.id;

            RAISE WARNING '[DocumentReminders] Failed to send reminder %: %', 
                v_reminder.id, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.process_document_reminders() IS
'Processes due document reminders. Routes 24hr-pre reminders to send-pre-reminder webhook, regular reminders to document-upload-reminder webhook. Includes login_url and user details in payload.';
