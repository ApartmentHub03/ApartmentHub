-- Migration: Route Salesforce document delivery through an edge function
-- so the actual PDF bytes (not just file_path) are forwarded to the
-- unified webhook.
--
-- This REPLACES the body of `trigger_salesforce_documents_complete_webhook()`
-- created in 20260416000000. The TRIGGER definition itself is unchanged —
-- same event, same condition — so the existing n8n webhook and the
-- `update_accounts_documentation_status` sync remain entirely untouched.
--
-- How it works:
--   accounts.documentation_status -> 'Complete'
--     -> trigger fires
--     -> pg_net POSTs account metadata to edge function
--          /functions/v1/forward-docs-to-salesforce
--     -> edge function queries documents, downloads each from storage,
--        base64-encodes, and POSTs one request per document to Salesforce,
--        then a final documents_complete summary call.
--
-- Configuration:
--   The edge function URL is read from a Postgres setting so it can be
--   rotated without a new migration. Set it once per database:
--
--     ALTER DATABASE postgres
--       SET app.forward_docs_fn_url =
--         'https://<project>.supabase.co/functions/v1/forward-docs-to-salesforce';
--
--     ALTER DATABASE postgres
--       SET app.service_role_key = '<service-role-key>';
--
--   Both values are also read via current_setting(..., true) so a missing
--   setting logs a warning instead of breaking the trigger.

CREATE OR REPLACE FUNCTION public.trigger_salesforce_documents_complete_webhook()
RETURNS TRIGGER AS $$
DECLARE
    v_fn_url TEXT;
    v_service_key TEXT;
    v_payload JSONB;
BEGIN
    v_fn_url := current_setting('app.forward_docs_fn_url', true);
    v_service_key := current_setting('app.service_role_key', true);

    IF v_fn_url IS NULL OR v_fn_url = '' THEN
        RAISE WARNING '[Salesforce Docs] app.forward_docs_fn_url is not set — skipping webhook for account %', NEW.id;
        RETURN NEW;
    END IF;

    -- Minimal payload: the edge function re-queries everything it needs via
    -- the service role key so the trigger stays fast and cheap.
    v_payload := jsonb_build_object(
        'account_id', NEW.id,
        'tenant_name', NEW.tenant_name,
        'phone_number', NEW.whatsapp_number,
        'salesforce_account_id', NEW.salesforce_account_id
    );

    BEGIN
        PERFORM net.http_post(
            url := v_fn_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'User-Agent', 'Supabase-Salesforce-Documents-Trigger',
                'Authorization',
                    CASE WHEN v_service_key IS NOT NULL AND v_service_key <> ''
                         THEN 'Bearer ' || v_service_key
                         ELSE ''
                    END
            ),
            body := v_payload
        );
        RAISE NOTICE '[Salesforce Docs] Forward-to-edge dispatched for account %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[Salesforce Docs] Forward-to-edge failed for account %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.trigger_salesforce_documents_complete_webhook() IS
'Calls the forward-docs-to-salesforce edge function when accounts.documentation_status becomes Complete. Edge function downloads every PDF from storage and POSTs each to the Salesforce unified webhook with source=AptHub.';
