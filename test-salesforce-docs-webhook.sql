-- ============================================================================
-- Test: Salesforce Documents Complete Webhook
-- ============================================================================
-- Simulates documentation_status → 'Complete' to verify the full chain fires.
-- Run in Supabase SQL Editor AFTER running setup-salesforce-webhook.sql.
-- ============================================================================

-- Step 1: Show current webhook_config
SELECT key, LEFT(value, 60) || '...' AS value_preview FROM public.webhook_config;

-- Step 2: Find an account to test with (pick one with a phone number)
SELECT id, tenant_name, whatsapp_number, documentation_status, salesforce_account_id
FROM public.accounts
WHERE whatsapp_number IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- Step 3: Simulate the trigger by flipping documentation_status
-- Replace '<ACCOUNT_ID>' with one from the query above.
-- First set to 'Pending' to ensure the transition fires:
--
-- UPDATE public.accounts
-- SET documentation_status = 'Pending', updated_at = NOW()
-- WHERE id = '<ACCOUNT_ID>';
--
-- Then set to 'Complete':
--
-- UPDATE public.accounts
-- SET documentation_status = 'Complete', updated_at = NOW()
-- WHERE id = '<ACCOUNT_ID>';

-- Step 4: Check pg_net request queue for outbound calls
SELECT id, url, method, status_code, created
FROM net._http_response
ORDER BY created DESC
LIMIT 10;
