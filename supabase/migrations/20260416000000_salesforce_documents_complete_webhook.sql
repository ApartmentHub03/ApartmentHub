-- Migration: Salesforce Documents Complete Webhook
-- Fires a NEW, independent webhook to the Salesforce unified endpoint whenever
-- an account's documentation_status transitions to 'Complete'.
--
-- This trigger is deliberately decoupled from the existing n8n webhook
-- (`trigger_document_status_complete_webhook`) and the accounts sync trigger
-- (`trigger_update_accounts_documentation_status`). All three coexist on the
-- same condition — adding this one does NOT modify or disable the others.
--
-- Payload shape:
--   {
--     "source": "AptHub",
--     "event_type": "documents_complete",
--     "account_id": "...",
--     "tenant_name": "...",
--     "phone_number": "...",
--     "salesforce_account_id": "...",
--     "timestamp": "...",
--     "documents": [
--       {
--         "id": "<documenten.id>",
--         "type": "...",
--         "status": "ontvangen|ontbreekt|pending",
--         "is_required": true|false,
--         "file_path": "...",
--         "person": {
--           "name": "<personen.naam>",
--           "phone_number": "<personen.whatsapp>",
--           "role": "main_tenant|co_tenant|guarantor",
--           "server_id": "<dossiers.id>"       -- the aanvraag page id
--         }
--       },
--       ...
--     ]
--   }

-- Make sure pg_net is available (same pattern as the existing n8n trigger).
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net extension not available. Webhook calls may not work.';
END $$;

CREATE OR REPLACE FUNCTION public.trigger_salesforce_documents_complete_webhook()
RETURNS TRIGGER AS $$
DECLARE
    v_webhook_url TEXT := 'https://apartmenthub--hubdev.sandbox.my.salesforce-sites.com/services/apexrest/unified/webhook?source=AptHub';
    v_documents JSONB;
    v_payload JSONB;
BEGIN
    -- Collect every document tied (via personen -> dossiers.phone_number) to
    -- this account. Role values are mapped to the english terms the Salesforce
    -- side expects; unknown values fall back to the raw Dutch value.
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', d.id,
                'type', d.type,
                'status', d.status,
                'is_required', d.is_required,
                'file_path', d.file_path,
                'person', jsonb_build_object(
                    'name', p.naam,
                    'phone_number', p.whatsapp,
                    'role', CASE p.rol
                        WHEN 'Hoofdhuurder' THEN 'main_tenant'
                        WHEN 'Medehuurder' THEN 'co_tenant'
                        WHEN 'Garantsteller' THEN 'guarantor'
                        ELSE p.rol
                    END,
                    'server_id', p.dossier_id
                )
            )
            ORDER BY p.dossier_id, p.rol, d.type
        ),
        '[]'::jsonb
    )
    INTO v_documents
    FROM public.documenten d
    INNER JOIN public.personen p ON p.id = d.persoon_id
    INNER JOIN public.dossiers ds ON ds.id = p.dossier_id
    WHERE ds.phone_number = NEW.whatsapp_number;

    v_payload := jsonb_build_object(
        'source', 'AptHub',
        'event_type', 'documents_complete',
        'account_id', NEW.id,
        'tenant_name', NEW.tenant_name,
        'phone_number', NEW.whatsapp_number,
        'salesforce_account_id', NEW.salesforce_account_id,
        'timestamp', NOW(),
        'documents', v_documents
    );

    -- Fire asynchronously via pg_net and absorb all errors so we never
    -- break the UPDATE transaction or the neighbouring triggers.
    BEGIN
        PERFORM net.http_post(
            url := v_webhook_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'User-Agent', 'Supabase-Salesforce-Documents-Trigger'
            ),
            body := v_payload
        );
        RAISE NOTICE '[Salesforce Docs] Webhook dispatched for account %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[Salesforce Docs] Webhook failed for account %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop-and-recreate so re-running the migration stays idempotent.
DROP TRIGGER IF EXISTS trigger_salesforce_documents_complete_webhook ON public.accounts;
CREATE TRIGGER trigger_salesforce_documents_complete_webhook
    AFTER UPDATE OF documentation_status ON public.accounts
    FOR EACH ROW
    WHEN (
        NEW.documentation_status = 'Complete'
        AND OLD.documentation_status IS DISTINCT FROM NEW.documentation_status
    )
    EXECUTE FUNCTION public.trigger_salesforce_documents_complete_webhook();

COMMENT ON FUNCTION public.trigger_salesforce_documents_complete_webhook() IS
'Independent webhook to Salesforce unified endpoint fired when accounts.documentation_status becomes Complete. Does not touch the existing n8n trigger.';
