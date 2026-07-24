-- Migration: Hourly delta sync + weekly full-replace for Zoko segments.
--
-- Schedules two pg_cron jobs that call the Next.js API route
-- /api/cron/sync-zoko-segments on apartmenthub.nl via pg_net (fire-and-
-- forget). The route reads from the Zoko Segments API and writes only
-- changed rows to candidate_segment_members (delta mode) or replaces all
-- rows (full mode).
--
-- The CRON_SECRET is stored as a Postgres custom setting (app.cron_secret)
-- so the cron job SQL can read it via current_setting() without hardcoding
-- the secret in the migration file.
--
-- After applying this migration:
--   ALTER DATABASE postgres SET app.cron_secret = '<your-secret>';
--   (and set the same value as CRON_SECRET in Vercel env vars)

-- 1. Add last_synced_at to candidate_segments for per-segment sync tracking.
--    Per-member last_sync_at stays for the manual button + existing display;
--    this column lets the cron update a timestamp without touching 12k rows.
ALTER TABLE public.candidate_segments
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 2. Schedule hourly delta sync (every hour, on the hour).
DO $$
BEGIN
    PERFORM cron.unschedule('sync-zoko-segments-delta');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
    'sync-zoko-segments-delta',
    '0 * * * *',
    $$SELECT net.http_post(
        url := 'https://www.apartmenthub.nl/api/cron/sync-zoko-segments',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(current_setting('app.cron_secret', true), '')
        ),
        body := jsonb_build_object('mode', 'delta')
    )$$
);

-- 3. Schedule weekly full-replace (Sunday 3:00 AM UTC) as a consistency
--    safety net. If the delta logic ever drifts, this resets every segment
--    to exactly match Zoko once a week.
DO $$
BEGIN
    PERFORM cron.unschedule('sync-zoko-segments-full');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
    'sync-zoko-segments-full',
    '0 3 * * 0',
    $$SELECT net.http_post(
        url := 'https://www.apartmenthub.nl/api/cron/sync-zoko-segments',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(current_setting('app.cron_secret', true), '')
        ),
        body := jsonb_build_object('mode', 'full')
    )$$
);

-- 4. Comments
COMMENT ON COLUMN public.candidate_segments.last_synced_at IS
'When this segment was last synced from Zoko (hourly delta or weekly full). Updated by the cron sync route, not per-member.';