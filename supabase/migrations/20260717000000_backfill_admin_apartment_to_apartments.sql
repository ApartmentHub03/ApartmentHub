-- Migration: Backfill admin_apartment → apartments (one-time snapshot)
--
-- The /admin/dashboard page creates apartments in the admin_apartment table
-- (Cal.com link generation, slot management).  The CRM pipeline reads from the
-- apartments table.  Without this backfill the CRM sees stale data because the
-- two tables are never synced.
--
-- This migration:
--   1. Adds the 6 Cal.com columns from admin_apartment to apartments (additive)
--   2. Copies Draft + LinkCreated rows from admin_apartment into apartments
--      (triggers suppressed so no n8n webhooks fire)
--
-- No trigger is created — this is a one-time snapshot only.
-- No code changes — /admin/dashboard is completely untouched.
-- Going-forward sync is a separate concern (future migration).

-- ==========================================
-- 1. Add Cal.com columns to apartments
-- ==========================================

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS slot_datetime timestamptz;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS slot_end_datetime timestamptz;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS slot_length_minutes int;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS eventlink_video text;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS cal_event_type_id text;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS cal_event_type_id_video text;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS cal_schedule_id text;

-- ==========================================
-- 2. Backfill existing admin_apartment rows into apartments
-- ==========================================
-- Suppress all triggers on apartments during the backfill so no n8n webhooks
-- fire for existing data.  session_replication_role = 'replica' disables
-- triggers for the current session only; restored to 'origin' immediately after.

SET session_replication_role = 'replica';

-- Insert admin_apartment rows that don't already exist in apartments (matched
-- by "Full Address").
--
-- The apartments table originally had `name TEXT NOT NULL` and `full_address TEXT`
-- columns, but both appear to have been dropped in prod.  Only "Full Address"
-- (quoted, capitals) survives.  We dynamically build the column list + VALUES to
-- include only columns that actually exist on the apartments table.
DO $$
DECLARE
  v_cols text[];
  v_vals text[];
  v_sql text;
BEGIN
  -- Always-present columns (created by the original migration and still in prod)
  v_cols := ARRAY['"Full Address"', 'rental_price', 'square_meters', 'status',
                   'slot_datetime', 'slot_end_datetime', 'slot_length_minutes',
                   'event_link', 'eventlink_video', 'cal_event_type_id',
                   'cal_event_type_id_video', 'cal_schedule_id', 'created_at'];
  v_vals := ARRAY['a.full_address', 'a.rental_price', 'a.sq_mt',
                   'CASE a.status WHEN ''Draft'' THEN ''Null'' WHEN ''LinkCreated'' THEN ''CreateLink'' ELSE ''Closed'' END',
                   'a.slot_datetime', 'a.slot_end_datetime', 'a.slot_length_minutes',
                   'a.eventlink', 'a.eventlink_video', 'a.cal_event_type_id',
                   'a.cal_event_type_id_video', 'a.cal_schedule_id', 'a.created_at'];

  -- Conditionally add columns that may have been dropped from prod
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'apartments' AND column_name = 'name'
  ) THEN
    v_cols := array_append(v_cols, 'name');
    v_vals := array_append(v_vals, 'a.full_address');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'apartments' AND column_name = 'full_address'
  ) THEN
    v_cols := array_append(v_cols, 'full_address');
    v_vals := array_append(v_vals, 'a.full_address');
  END IF;

  v_sql := 'INSERT INTO public.apartments (' ||
    array_to_string(v_cols, ', ') ||
    ') SELECT ' ||
    array_to_string(v_vals, ', ') ||
    ' FROM admin_apartment a ' ||
    'WHERE a.status IN (''Draft'', ''LinkCreated'') ' ||
    '  AND a.full_address IS NOT NULL ' ||
    '  AND NOT EXISTS (SELECT 1 FROM public.apartments p WHERE p."Full Address" = a.full_address)';

  EXECUTE v_sql;
END $$;

SET session_replication_role = 'origin';

-- ==========================================
-- Done — no trigger, no going-forward sync
-- ==========================================
-- New apartments created via /admin/dashboard after this migration will still
-- only go to admin_apartment.  They will NOT appear in apartments (and the CRM)
-- until a separate going-forward sync mechanism is added.