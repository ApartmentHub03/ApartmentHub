-- ============================================================================
-- Setup: Activate Salesforce Documents Complete Webhook
-- ============================================================================
-- This script configures the webhook_config table so the existing DB trigger
-- can call the forward-docs-to-salesforce edge function when all required
-- documents have been uploaded (documentation_status → 'Complete').
--
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- ============================================================================

-- 1. Verify the webhook_config table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'webhook_config'
) AS webhook_config_exists;

-- 2. Insert the edge function URL and service role key
--    (UPSERT so this script is safe to re-run)
INSERT INTO public.webhook_config (key, value, updated_at)
VALUES (
    'forward_docs_fn_url',
    'https://diovljzaabbfftcqmwub.supabase.co/functions/v1/forward-docs-to-salesforce',
    NOW()
)
ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW();

INSERT INTO public.webhook_config (key, value, updated_at)
VALUES (
    'service_role_key',
    -- Replace with your actual service role key (from .env.local SUPABASE_SERVICE_ROLE_KEY)
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpb3ZsanphYWJiZmZ0Y3Ftd3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5MjEzMywiZXhwIjoyMDg0NTY4MTMzfQ.0aG_1lD-kg2y-4UTHF3uzNc14o8NhDGWX7uHDyPe3gs',
    NOW()
)
ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW();

-- 3. Verify the config was written
SELECT key, LEFT(value, 60) || '...' AS value_preview, updated_at
FROM public.webhook_config
ORDER BY key;

-- 4. Verify the trigger exists on accounts table
SELECT
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_salesforce_documents_complete_webhook';

-- 5. Verify the trigger function exists
SELECT
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'trigger_salesforce_documents_complete_webhook';

-- 6. Verify the document-sync trigger exists (this is what sets documentation_status)
SELECT
    trigger_name,
    event_object_table,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN (
    'trigger_sync_accounts_from_documenten',
    'trigger_sync_accounts_from_personen'
);

-- 7. Check pg_net extension is enabled
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_net';
