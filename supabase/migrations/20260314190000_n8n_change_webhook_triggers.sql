-- Migration: Webhook triggers to notify n8n on any change in accounts, apartments, tenants, or real_estate_agents
-- Each table sends to its own dedicated webhook URL
-- Sends: table_name, event_type, salesforce_id, whatsapp_number, and a detailed "changes" object

-- Ensure pg_net is available
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net extension not available. Webhook calls will not work.';
END $$;


-- ==========================================================================
-- Drop old webhook triggers from previous migrations to avoid duplicates
-- ==========================================================================
DROP TRIGGER IF EXISTS trigger_accounts_tags_webhook ON public.accounts;
DROP TRIGGER IF EXISTS trigger_document_status_complete_webhook ON public.accounts;
DROP TRIGGER IF EXISTS trigger_apartment_status_create_link_webhook ON public.apartments;
DROP TRIGGER IF EXISTS trigger_apartment_status_active_webhook ON public.apartments;
DROP TRIGGER IF EXISTS trigger_apartment_create_link_webhook ON public.apartments;
DROP TRIGGER IF EXISTS trigger_apartment_active_webhook ON public.apartments;
DROP TRIGGER IF EXISTS trigger_qualified_user_active_webhook ON public.apartments;
DROP TRIGGER IF EXISTS trigger_generate_offer ON public.apartments;

-- ==========================================================================
-- Generic trigger function for all four tables
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.notify_n8n_table_change()
RETURNS TRIGGER AS $$
DECLARE
    v_webhook_url TEXT;
    v_payload JSONB;
    v_new_json JSONB;
    v_old_json JSONB;
    v_changes JSONB := '{}'::jsonb;
    v_key TEXT;
    v_salesforce_id TEXT;
    v_whatsapp_number TEXT;
    v_record_id TEXT;
BEGIN
    -- ---------------------------------------------------------------
    -- Determine the webhook URL based on the table name
    -- ---------------------------------------------------------------
    IF TG_TABLE_NAME = 'accounts' THEN
        v_webhook_url := 'https://davidvanwachem.app.n8n.cloud/webhook/get-account-table-update';
    ELSIF TG_TABLE_NAME = 'apartments' THEN
        v_webhook_url := 'https://davidvanwachem.app.n8n.cloud/webhook/get-apartment-table-update';
    ELSIF TG_TABLE_NAME = 'tenants' THEN
        v_webhook_url := 'https://davidvanwachem.app.n8n.cloud/webhook/get-tenant-table-update';
    ELSIF TG_TABLE_NAME = 'real_estate_agents' THEN
        v_webhook_url := 'https://davidvanwachem.app.n8n.cloud/webhook/get-realestate-agents-table-update';
    ELSE
        RAISE WARNING '[n8n Change Webhook] Unknown table: %', TG_TABLE_NAME;
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Build JSON representations of OLD / NEW rows
    IF TG_OP = 'DELETE' THEN
        v_old_json := to_jsonb(OLD);
        v_new_json := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_new_json := to_jsonb(NEW);
        v_old_json := NULL;
    ELSE  -- UPDATE
        v_new_json := to_jsonb(NEW);
        v_old_json := to_jsonb(OLD);
    END IF;

    -- Record ID (from whichever row exists)
    v_record_id := COALESCE(v_new_json, v_old_json)->>'id';

    -- ---------------------------------------------------------------
    -- Extract salesforce_id & whatsapp_number per table
    -- ---------------------------------------------------------------
    IF TG_TABLE_NAME = 'accounts' THEN
        v_salesforce_id   := COALESCE(v_new_json, v_old_json)->>'salesforce_account_id';
        v_whatsapp_number := COALESCE(v_new_json, v_old_json)->>'whatsapp_number';

    ELSIF TG_TABLE_NAME = 'apartments' THEN
        v_salesforce_id   := COALESCE(v_new_json, v_old_json)->>'salesforce_id';
        v_whatsapp_number := NULL;  -- apartments table has no whatsapp_number

    ELSIF TG_TABLE_NAME = 'tenants' THEN
        v_salesforce_id   := COALESCE(v_new_json, v_old_json)->>'salesforce_account_id';
        v_whatsapp_number := COALESCE(v_new_json, v_old_json)->>'whatsapp_number';

    ELSIF TG_TABLE_NAME = 'real_estate_agents' THEN
        v_salesforce_id   := NULL;  -- real_estate_agents has no salesforce_id
        v_whatsapp_number := COALESCE(v_new_json, v_old_json)->>'phone_number';
    END IF;

    -- ---------------------------------------------------------------
    -- Build the "changes" object
    -- ---------------------------------------------------------------
    IF TG_OP = 'UPDATE' THEN
        DECLARE
            v_has_non_qu_change BOOLEAN := FALSE;
            v_qu_changes JSONB := NULL;
        BEGIN
            -- Check every column for changes
            FOR v_key IN SELECT jsonb_object_keys(v_new_json)
            LOOP
                -- Skip auto-managed timestamp columns
                IF v_key IN ('updated_at') THEN
                    CONTINUE;
                END IF;

                IF (v_old_json->v_key) IS DISTINCT FROM (v_new_json->v_key) THEN
                    -- Special handling for qualified_users on apartments table:
                    -- Send only the added/removed/modified users with their salesforce_account_id
                    IF TG_TABLE_NAME = 'apartments' AND v_key = 'qualified_users' THEN
                        DECLARE
                            v_added JSONB := '[]'::jsonb;
                            v_removed JSONB := '[]'::jsonb;
                            v_modified JSONB := '[]'::jsonb;
                            v_elem JSONB;
                            v_old_elem JSONB;
                            v_acct_sf_id TEXT;
                            v_old_arr JSONB := COALESCE(v_old_json->'qualified_users', '[]'::jsonb);
                            v_new_arr JSONB := COALESCE(v_new_json->'qualified_users', '[]'::jsonb);
                        BEGIN
                            -- Find added users (in new but not in old, matched by account_id)
                            FOR v_elem IN SELECT value FROM jsonb_array_elements(v_new_arr)
                            LOOP
                                IF NOT EXISTS (
                                    SELECT 1 FROM jsonb_array_elements(v_old_arr) old_el
                                    WHERE old_el.value->>'account_id' = v_elem->>'account_id'
                                ) THEN
                                    SELECT a.salesforce_account_id INTO v_acct_sf_id
                                    FROM public.accounts a
                                    WHERE a.id::text = v_elem->>'account_id';

                                    v_added := v_added || jsonb_build_array(
                                        v_elem || jsonb_build_object('salesforce_account_id', v_acct_sf_id)
                                    );
                                END IF;
                            END LOOP;

                            -- Find removed users (in old but not in new, matched by account_id)
                            FOR v_elem IN SELECT value FROM jsonb_array_elements(v_old_arr)
                            LOOP
                                IF NOT EXISTS (
                                    SELECT 1 FROM jsonb_array_elements(v_new_arr) new_el
                                    WHERE new_el.value->>'account_id' = v_elem->>'account_id'
                                ) THEN
                                    SELECT a.salesforce_account_id INTO v_acct_sf_id
                                    FROM public.accounts a
                                    WHERE a.id::text = v_elem->>'account_id';

                                    v_removed := v_removed || jsonb_build_array(
                                        v_elem || jsonb_build_object('salesforce_account_id', v_acct_sf_id)
                                    );
                                END IF;
                            END LOOP;

                            -- Find modified users (same account_id but data changed)
                            FOR v_elem IN SELECT value FROM jsonb_array_elements(v_new_arr)
                            LOOP
                                SELECT old_el.value INTO v_old_elem
                                FROM jsonb_array_elements(v_old_arr) old_el
                                WHERE old_el.value->>'account_id' = v_elem->>'account_id';

                                IF v_old_elem IS NOT NULL AND v_old_elem IS DISTINCT FROM v_elem THEN
                                    SELECT a.salesforce_account_id INTO v_acct_sf_id
                                    FROM public.accounts a
                                    WHERE a.id::text = v_elem->>'account_id';

                                    v_modified := v_modified || jsonb_build_array(
                                        jsonb_build_object(
                                            'old_value', v_old_elem || jsonb_build_object('salesforce_account_id', v_acct_sf_id),
                                            'new_value', v_elem || jsonb_build_object('salesforce_account_id', v_acct_sf_id)
                                        )
                                    );
                                END IF;
                            END LOOP;

                            IF v_added != '[]'::jsonb OR v_removed != '[]'::jsonb OR v_modified != '[]'::jsonb THEN
                                v_qu_changes := jsonb_build_object(
                                    'added', v_added,
                                    'removed', v_removed,
                                    'modified', v_modified
                                );
                            END IF;
                        END;
                    ELSE
                        -- Any other field changed — we'll send the entire row
                        v_has_non_qu_change := TRUE;
                    END IF;
                END IF;
            END LOOP;

            -- If nothing meaningful changed at all, skip the webhook
            IF NOT v_has_non_qu_change AND v_qu_changes IS NULL THEN
                RETURN NEW;
            END IF;

            -- Send the entire current row as the changes payload
            v_changes := v_new_json;

            -- For apartments: replace the full qualified_users array with the diff,
            -- or remove it entirely if only other fields changed
            IF TG_TABLE_NAME = 'apartments' THEN
                IF v_qu_changes IS NOT NULL THEN
                    v_changes := v_changes || jsonb_build_object('qualified_users_changes', v_qu_changes);
                END IF;
                -- Remove the raw qualified_users array (too large, not useful)
                v_changes := v_changes - 'qualified_users';
            END IF;
        END;

    ELSIF TG_OP = 'INSERT' THEN
        -- For inserts, include all non-null fields as changes
        v_changes := v_new_json;

    ELSIF TG_OP = 'DELETE' THEN
        -- For deletes, include the deleted row data
        v_changes := v_old_json;
    END IF;

    -- ---------------------------------------------------------------
    -- Build final payload
    -- ---------------------------------------------------------------
    v_payload := jsonb_build_object(
        'table_name',       TG_TABLE_NAME,
        'event_type',       TG_OP,
        'record_id',        v_record_id,
        'salesforce_id',    v_salesforce_id,
        'whatsapp_number',  v_whatsapp_number,
        'changes',          v_changes,
        'timestamp',        NOW()
    );

    -- ---------------------------------------------------------------
    -- Fire the webhook (non-blocking via pg_net)
    -- ---------------------------------------------------------------
    BEGIN
        PERFORM net.http_post(
            url     := v_webhook_url,
            body    := v_payload,
            headers := jsonb_build_object('Content-Type', 'application/json')
        );
        RAISE NOTICE '[n8n Change Webhook] Sent for table=% id=%', TG_TABLE_NAME, v_record_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[n8n Change Webhook] Failed for table=% id=%: %', TG_TABLE_NAME, v_record_id, SQLERRM;
    END;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


-- ==========================================================================
-- Triggers — one per table, fires on INSERT / UPDATE / DELETE
-- ==========================================================================

-- 1. accounts
DROP TRIGGER IF EXISTS trigger_n8n_accounts_change ON public.accounts;
CREATE TRIGGER trigger_n8n_accounts_change
    AFTER INSERT OR UPDATE OR DELETE ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_n8n_table_change();

-- 2. apartments
DROP TRIGGER IF EXISTS trigger_n8n_apartments_change ON public.apartments;
CREATE TRIGGER trigger_n8n_apartments_change
    AFTER INSERT OR UPDATE OR DELETE ON public.apartments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_n8n_table_change();

-- 3. tenants
DROP TRIGGER IF EXISTS trigger_n8n_tenants_change ON public.tenants;
CREATE TRIGGER trigger_n8n_tenants_change
    AFTER INSERT OR UPDATE OR DELETE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_n8n_table_change();

-- 4. real_estate_agents
DROP TRIGGER IF EXISTS trigger_n8n_real_estate_agents_change ON public.real_estate_agents;
CREATE TRIGGER trigger_n8n_real_estate_agents_change
    AFTER INSERT OR UPDATE OR DELETE ON public.real_estate_agents
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_n8n_table_change();


-- ==========================================================================
-- Re-add dedicated CreateLink webhook trigger (fires alongside the generic one)
-- Calls send_create_link_webhook() → POSTs to trigger-status-change-create-link
-- ==========================================================================
DROP TRIGGER IF EXISTS trigger_apartment_create_link_webhook ON public.apartments;
CREATE TRIGGER trigger_apartment_create_link_webhook
    AFTER INSERT OR UPDATE OF status ON public.apartments
    FOR EACH ROW
    EXECUTE FUNCTION public.send_create_link_webhook();


-- Comments
COMMENT ON FUNCTION public.notify_n8n_table_change() IS
'Generic trigger function that sends a webhook to n8n whenever a row in accounts, apartments, tenants, or real_estate_agents is inserted, updated, or deleted. Each table has its own dedicated webhook URL. Payload includes salesforce_id, whatsapp_number, table_name, and a detailed changes object showing old/new values for every modified column.';
