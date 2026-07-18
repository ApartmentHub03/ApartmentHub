-- Migration: Consolidate pre-viewing reminders into viewing_reminders + skip-if-offer-made
--
-- Phase 5 triggers #1 (2h pre-viewing), #8 (24h pre-viewing documents), and #3
-- (post-viewing reminders skip-if-offer-made) — all in one migration.
--
-- Why consolidate instead of a new table: the existing `viewing_reminders`
-- table (migration 20260226020000) already has every column we need except
-- `viewing_start_time`. The existing pg_cron job `process-viewing-reminders`
-- already runs every 5 min. Adding a second table + second cron job for
-- pre-viewing would duplicate schema and code. Instead we:
--   1. Add `viewing_start_time` column (nullable, only set for pre-viewing rows)
--   2. Dedup existing rows + add a unique index for atomic dedup
--   3. Rewrite `schedule_viewing_reminders()` to insert 6 rows per booking
--      (4 post-viewing + 2 pre-viewing when start_time is in the future)
--   4. Rewrite `process_viewing_reminders()` to route by `reminder_interval`:
--      - post-viewing intervals (15min/4hr/17hr/40hr) → existing
--        `post-viewing-reminder` webhook + NEW skip-if-offer-made check
--      - pre-viewing intervals (2hr-before/24hr-before) → new webhooks
--        (`viewing-start-reminder` / `pre-viewing-document-reminder`)
--   5. Reschedule the existing pg_cron job (same name, picks up new function)
--   6. Backfill pre-viewing rows for existing future viewings
--
-- No new table, no new cron job. One migration instead of two.
--
-- n8n side (David creates these workflows — see DAVID_BLOCKERS.md section 6):
--   /webhook/viewing-start-reminder        (2hr-before) — uses
--     sales_force_booking_reminder_2_hours_in_person_viewing OR
--     sales_force_booking_reminder_2_hours_in_facetime_viewing, branched on
--     whether the booking used event_link or eventlink_video.
--   /webhook/pre-viewing-document-reminder (24hr-before) — uses
--     new_flow_upload_documents Zoko template with
--     [tenant_name, 'https://apartmenthub.nl/upload-documents/'].
--
-- Reuses helpers from earlier migrations:
--   public._safe_parse_timestamptz(text)            — 20260226020000
--   public.normalize_phone_for_match(text)          — 20260221100000
--   public.extract_tenant_event_url(tenants)        — 20260221130000 / 20260222000000
--   public.event_url_matches(text, text)             — 20260221130000

-- ==========================================
-- 1. Add viewing_start_time column to viewing_reminders
-- ==========================================
-- Nullable. Only set for pre-viewing rows. Post-viewing rows keep
-- viewing_start_time = NULL and continue to use viewing_end_time as before.
ALTER TABLE public.viewing_reminders
    ADD COLUMN IF NOT EXISTS viewing_start_time TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.viewing_reminders.viewing_start_time IS
'Viewing start time. Set for pre-viewing reminder rows (intervals 2hr-before, 24hr-before). NULL for post-viewing rows, which use viewing_end_time.';

-- ==========================================
-- 2. Dedup strategy (no destructive operations)
-- ==========================================
-- The original schedule_viewing_reminders() (20260226020000) used a manual
-- IF EXISTS check for dedup. We keep that pattern — extended to per-interval
-- checks — rather than introducing a unique index. This avoids:
--   - DELETE on a live table (destructive, triggers SQL Editor warning)
--   - CREATE UNIQUE INDEX failing on existing duplicates
-- No DB-level uniqueness constraint; dedup is enforced in the trigger
-- function via per-interval IF NOT EXISTS checks. Same pattern as the
-- existing trigger, just extended for the 2 new pre-viewing intervals.

-- ==========================================
-- 3. Rewrite schedule_viewing_reminders() to insert 6 rows per booking
-- ==========================================
-- 4 post-viewing rows (15min/4hr/17hr/40hr after end_time) — unchanged behavior
-- 2 pre-viewing rows (2hr-before/24hr-before start_time) — only if start_time
--   is known and in the future
-- Dedup via per-interval IF NOT EXISTS checks (same pattern as the original
-- 20260226020000 function, extended to 6 intervals). No unique index, no
-- ON CONFLICT — no destructive operations.

CREATE OR REPLACE FUNCTION public.schedule_viewing_reminders()
RETURNS TRIGGER AS $$
DECLARE
    v_phone TEXT;
    v_tenant_name TEXT;
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_end_time TIMESTAMP WITH TIME ZONE;
    v_row jsonb;
    v_account_id UUID;
    v_phone_norm TEXT;
    v_apartment_id UUID;
    v_apartment_address TEXT;
    v_event_url TEXT;
BEGIN
    v_row := to_jsonb(NEW);
    v_phone := NEW.whatsapp_number;
    v_tenant_name := NEW.name;

    -- Don't schedule if no phone number
    IF v_phone IS NULL OR v_phone = '' THEN
        RETURN NEW;
    END IF;

    -- Extract viewing end time safely (handles time-only values like '07:30:00')
    v_end_time := public._safe_parse_timestamptz(
        COALESCE(v_row->>'Viewing_EndTime', v_row->>'viewing_end_time')
    );

    -- Can't schedule without an end time
    IF v_end_time IS NULL THEN
        RETURN NEW;
    END IF;

    -- Don't schedule for past viewings that are more than 41 hours ago
    IF v_end_time < (NOW() - INTERVAL '41 hours') THEN
        RETURN NEW;
    END IF;

    -- Extract viewing start time (optional — only needed for pre-viewing rows)
    v_start_time := public._safe_parse_timestamptz(
        COALESCE(v_row->>'Viewing_StartTime', v_row->>'viewing_start_time')
    );

    -- Look up the account for this tenant
    v_phone_norm := public.normalize_phone_for_match(v_phone);
    SELECT id INTO v_account_id
    FROM public.accounts
    WHERE public.normalize_phone_for_match(whatsapp_number) = v_phone_norm
    LIMIT 1;

    -- Resolve apartment: prefer tenants.apartment_id, else match by EventURL
    v_apartment_id := NEW.apartment_id;
    v_apartment_address := NULL;
    IF v_apartment_id IS NULL THEN
        v_event_url := public.extract_tenant_event_url(NEW);
        IF v_event_url IS NOT NULL THEN
            SELECT a.id, a."Full Address" INTO v_apartment_id, v_apartment_address
            FROM public.apartments a
            WHERE public.event_url_matches(v_event_url, a.event_link)
               OR public.event_url_matches(v_event_url, a.eventlink_video)
            LIMIT 1;
        END IF;
    ELSE
        SELECT a."Full Address" INTO v_apartment_address
        FROM public.apartments a
        WHERE a.id = v_apartment_id;
    END IF;

    -- Insert 4 post-viewing rows, each guarded by a per-interval IF NOT EXISTS
    -- check (same pattern as the original 20260226020000 function).
    IF NOT EXISTS (
        SELECT 1 FROM public.viewing_reminders
        WHERE tenant_id = NEW.id AND viewing_end_time = v_end_time
          AND reminder_interval = '15min'
          AND sent_at IS NULL AND skipped_at IS NULL
        LIMIT 1
    ) THEN
        INSERT INTO public.viewing_reminders
            (tenant_id, account_id, phone_number, tenant_name, apartment_id,
             apartment_address, viewing_end_time, viewing_start_time,
             reminder_interval, scheduled_at)
        VALUES
            (NEW.id, v_account_id, v_phone, v_tenant_name, v_apartment_id,
             v_apartment_address, v_end_time, NULL, '15min',
             v_end_time + INTERVAL '15 minutes');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.viewing_reminders
        WHERE tenant_id = NEW.id AND viewing_end_time = v_end_time
          AND reminder_interval = '4hr'
          AND sent_at IS NULL AND skipped_at IS NULL
        LIMIT 1
    ) THEN
        INSERT INTO public.viewing_reminders
            (tenant_id, account_id, phone_number, tenant_name, apartment_id,
             apartment_address, viewing_end_time, viewing_start_time,
             reminder_interval, scheduled_at)
        VALUES
            (NEW.id, v_account_id, v_phone, v_tenant_name, v_apartment_id,
             v_apartment_address, v_end_time, NULL, '4hr',
             v_end_time + INTERVAL '4 hours');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.viewing_reminders
        WHERE tenant_id = NEW.id AND viewing_end_time = v_end_time
          AND reminder_interval = '17hr'
          AND sent_at IS NULL AND skipped_at IS NULL
        LIMIT 1
    ) THEN
        INSERT INTO public.viewing_reminders
            (tenant_id, account_id, phone_number, tenant_name, apartment_id,
             apartment_address, viewing_end_time, viewing_start_time,
             reminder_interval, scheduled_at)
        VALUES
            (NEW.id, v_account_id, v_phone, v_tenant_name, v_apartment_id,
             v_apartment_address, v_end_time, NULL, '17hr',
             v_end_time + INTERVAL '17 hours');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.viewing_reminders
        WHERE tenant_id = NEW.id AND viewing_end_time = v_end_time
          AND reminder_interval = '40hr'
          AND sent_at IS NULL AND skipped_at IS NULL
        LIMIT 1
    ) THEN
        INSERT INTO public.viewing_reminders
            (tenant_id, account_id, phone_number, tenant_name, apartment_id,
             apartment_address, viewing_end_time, viewing_start_time,
             reminder_interval, scheduled_at)
        VALUES
            (NEW.id, v_account_id, v_phone, v_tenant_name, v_apartment_id,
             v_apartment_address, v_end_time, NULL, '40hr',
             v_end_time + INTERVAL '40 hours');
    END IF;

    -- Insert 2 pre-viewing rows only if start_time is known and in the future.
    -- Same per-interval IF NOT EXISTS guard pattern.
    IF v_start_time IS NOT NULL AND v_start_time > NOW() THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.viewing_reminders
            WHERE tenant_id = NEW.id AND viewing_end_time = v_end_time
              AND reminder_interval = '2hr-before'
              AND sent_at IS NULL AND skipped_at IS NULL
            LIMIT 1
        ) THEN
            INSERT INTO public.viewing_reminders
                (tenant_id, account_id, phone_number, tenant_name, apartment_id,
                 apartment_address, viewing_end_time, viewing_start_time,
                 reminder_interval, scheduled_at)
            VALUES
                (NEW.id, v_account_id, v_phone, v_tenant_name, v_apartment_id,
                 v_apartment_address, v_end_time, v_start_time, '2hr-before',
                 v_start_time - INTERVAL '2 hours');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.viewing_reminders
            WHERE tenant_id = NEW.id AND viewing_end_time = v_end_time
              AND reminder_interval = '24hr-before'
              AND sent_at IS NULL AND skipped_at IS NULL
            LIMIT 1
        ) THEN
            INSERT INTO public.viewing_reminders
                (tenant_id, account_id, phone_number, tenant_name, apartment_id,
                 apartment_address, viewing_end_time, viewing_start_time,
                 reminder_interval, scheduled_at)
            VALUES
                (NEW.id, v_account_id, v_phone, v_tenant_name, v_apartment_id,
                 v_apartment_address, v_end_time, v_start_time, '24hr-before',
                 v_start_time - INTERVAL '24 hours');
        END IF;
    END IF;

    RAISE LOG '[ViewingReminders] Scheduled reminders for tenant=% phone=% start=% end=%',
        NEW.id, v_phone, v_start_time, v_end_time;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.schedule_viewing_reminders() IS
'Trigger function that schedules viewing reminders. Inserts 4 post-viewing rows (15min/4hr/17hr/40hr after viewing_end_time) and, when viewing_start_time is known and in the future, 2 pre-viewing rows (2hr-before/24hr-before viewing_start_time). Dedup via per-interval IF NOT EXISTS checks (same pattern as the original 20260226020000 function, extended to 6 intervals). No unique index, no destructive operations.';

-- ==========================================
-- 4. Rewrite process_viewing_reminders() to route by interval
-- ==========================================
-- Post-viewing branch (15min/4hr/17hr/40hr): keep existing behavior + add
--   skip-if-offer-made check (checks apartments.offers_in and
--   apartments.people_making_offer for account_id or whatsapp_number match).
-- Pre-viewing branch (2hr-before/24hr-before): new webhooks
--   (viewing-start-reminder / pre-viewing-document-reminder).

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
                'upload_url', 'https://apartmenthub.nl/upload-documents/',
                'timestamp', NOW()
            );

        ELSE
            -- Unknown interval — skip with a note
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
'Processes due viewing reminders. Called by pg_cron every 5 minutes. Routes by reminder_interval: post-viewing (15min/4hr/17hr/40hr) skips cancelled viewings AND viewings where the candidate already made an offer, then fires post-viewing-reminder webhook. Pre-viewing (2hr-before/24hr-before) skips cancelled viewings, then fires viewing-start-reminder or pre-viewing-document-reminder webhook.';

-- ==========================================
-- 5. Reschedule the existing pg_cron job (picks up new function body)
-- ==========================================
DO $$
BEGIN
    PERFORM cron.unschedule('process-viewing-reminders');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
    'process-viewing-reminders',
    '*/5 * * * *',
    'SELECT public.process_viewing_reminders()'
);

-- ==========================================
-- 6. Backfill pre-viewing rows for existing future viewings
-- ==========================================
-- Only inserts the 2 pre-viewing rows (post-viewing rows already exist from
-- the original migration's backfill, or the table is empty). Per-interval
-- IF NOT EXISTS guard prevents duplicates without needing a unique index.

DO $$
DECLARE
    v_tenant RECORD;
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_end_time TIMESTAMP WITH TIME ZONE;
    v_row jsonb;
    v_phone_norm TEXT;
    v_account_id UUID;
    v_apartment_id UUID;
    v_apartment_address TEXT;
    v_event_url TEXT;
BEGIN
    FOR v_tenant IN
        SELECT * FROM public.tenants
        WHERE whatsapp_number IS NOT NULL
          AND trim(whatsapp_number) != ''
    LOOP
        v_row := to_jsonb(v_tenant);

        v_start_time := public._safe_parse_timestamptz(
            COALESCE(v_row->>'Viewing_StartTime', v_row->>'viewing_start_time')
        );
        v_end_time := public._safe_parse_timestamptz(
            COALESCE(v_row->>'Viewing_EndTime', v_row->>'viewing_end_time')
        );

        -- Skip if no start time, no end time, or viewing already started
        IF v_start_time IS NULL OR v_start_time <= NOW() THEN
            CONTINUE;
        END IF;
        IF v_end_time IS NULL THEN
            CONTINUE;
        END IF;

        -- Look up account
        v_phone_norm := public.normalize_phone_for_match(v_tenant.whatsapp_number);
        SELECT id INTO v_account_id
        FROM public.accounts
        WHERE public.normalize_phone_for_match(whatsapp_number) = v_phone_norm
        LIMIT 1;

        -- Resolve apartment
        v_apartment_id := v_tenant.apartment_id;
        v_apartment_address := NULL;
        IF v_apartment_id IS NULL THEN
            v_event_url := public.extract_tenant_event_url(v_tenant);
            IF v_event_url IS NOT NULL THEN
                SELECT a.id, a."Full Address" INTO v_apartment_id, v_apartment_address
                FROM public.apartments a
                WHERE public.event_url_matches(v_event_url, a.event_link)
                   OR public.event_url_matches(v_event_url, a.eventlink_video)
                LIMIT 1;
            END IF;
        ELSE
            SELECT a."Full Address" INTO v_apartment_address
            FROM public.apartments a
            WHERE a.id = v_apartment_id;
        END IF;

        -- Insert 2hr-before row (per-interval IF NOT EXISTS guard)
        IF NOT EXISTS (
            SELECT 1 FROM public.viewing_reminders
            WHERE tenant_id = v_tenant.id AND viewing_end_time = v_end_time
              AND reminder_interval = '2hr-before'
              AND sent_at IS NULL AND skipped_at IS NULL
            LIMIT 1
        ) THEN
            INSERT INTO public.viewing_reminders
                (tenant_id, account_id, phone_number, tenant_name, apartment_id,
                 apartment_address, viewing_end_time, viewing_start_time,
                 reminder_interval, scheduled_at)
            VALUES
                (v_tenant.id, v_account_id, v_tenant.whatsapp_number, v_tenant.name,
                 v_apartment_id, v_apartment_address, v_end_time, v_start_time,
                 '2hr-before', v_start_time - INTERVAL '2 hours');
        END IF;

        -- Insert 24hr-before row (per-interval IF NOT EXISTS guard)
        IF NOT EXISTS (
            SELECT 1 FROM public.viewing_reminders
            WHERE tenant_id = v_tenant.id AND viewing_end_time = v_end_time
              AND reminder_interval = '24hr-before'
              AND sent_at IS NULL AND skipped_at IS NULL
            LIMIT 1
        ) THEN
            INSERT INTO public.viewing_reminders
                (tenant_id, account_id, phone_number, tenant_name, apartment_id,
                 apartment_address, viewing_end_time, viewing_start_time,
                 reminder_interval, scheduled_at)
            VALUES
                (v_tenant.id, v_account_id, v_tenant.whatsapp_number, v_tenant.name,
                 v_apartment_id, v_apartment_address, v_end_time, v_start_time,
                 '24hr-before', v_start_time - INTERVAL '24 hours');
        END IF;
    END LOOP;

    RAISE NOTICE '[ViewingReminders] Backfilled pre-viewing reminders for existing future viewings';
END;
$$;