-- Migration: Move Salesforce-forwarder config out of GUC into a normal table.
-- Supabase locks down `ALTER DATABASE ... SET app.xxx`, so the
-- current_setting() approach from 20260416010000 can't be configured via the
-- Management API. We switch to a small key/value table in public that the
-- trigger reads at fire time. Secrets are NEVER written in the migration —
-- callers insert the rows separately.
--
-- Does not touch the existing n8n webhook, accounts-sync trigger, or the
-- trigger definition itself (only the function body is swapped).

CREATE TABLE IF NOT EXISTS public.webhook_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lock the table: only the service role (and superuser) can read/write.
-- Ensures the anon / authenticated JWTs can't leak the service-role key.
ALTER TABLE public.webhook_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_config service role only" ON public.webhook_config;
CREATE POLICY "webhook_config service role only"
    ON public.webhook_config
    FOR ALL
    TO authenticated, anon
    USING (false)
    WITH CHECK (false);

COMMENT ON TABLE public.webhook_config IS
'Key/value store for webhook URLs and auth tokens consumed by Postgres triggers. RLS denies read to anon/authenticated; triggers run as definer with access.';

-- Re-define the trigger function to read from webhook_config.
CREATE OR REPLACE FUNCTION public.trigger_salesforce_documents_complete_webhook()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
    v_fn_url TEXT;
    v_service_key TEXT;
    v_payload JSONB;
BEGIN
    SELECT value INTO v_fn_url
        FROM public.webhook_config
        WHERE key = 'forward_docs_fn_url';
    SELECT value INTO v_service_key
        FROM public.webhook_config
        WHERE key = 'service_role_key';

    IF v_fn_url IS NULL OR v_fn_url = '' THEN
        RAISE WARNING '[Salesforce Docs] webhook_config.forward_docs_fn_url missing — skipping for account %', NEW.id;
        RETURN NEW;
    END IF;

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
'Reads forward_docs_fn_url + service_role_key from public.webhook_config and POSTs account metadata to the forward-docs-to-salesforce edge function. Runs SECURITY DEFINER so the trigger can read the table even though RLS blocks regular clients.';
