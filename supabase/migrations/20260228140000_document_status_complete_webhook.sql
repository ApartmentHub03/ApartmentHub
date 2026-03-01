-- Migration: Document Status Completion Webhook
-- Triggers a webhook when an account's documentation_status is changed to 'Complete'

-- Enable pg_net extension for async HTTP requests
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net extension not available. Webhook calls may not work.';
END $$;

-- Function to call webhook when status becomes 'Complete'
CREATE OR REPLACE FUNCTION public.trigger_document_status_complete_webhook()
RETURNS TRIGGER AS $$
DECLARE
    v_webhook_url TEXT := 'https://davidvanwachem.app.n8n.cloud/webhook/document-status-completed';
    v_payload JSONB;
BEGIN
    -- Build payload with account information
    v_payload := jsonb_build_object(
        'event_type', 'document_status_completed',
        'account_id', NEW.id,
        'tenant_name', NEW.tenant_name,
        'whatsapp_number', NEW.whatsapp_number,
        'email', NEW.email,
        'documentation_status', NEW.documentation_status,
        'apartment_selected', COALESCE(to_jsonb(NEW.apartment_selected), '[]'::jsonb),
        'timestamp', NOW(),
        'salesforce_account_id', NEW.salesforce_account_id
    );

    -- Call webhook asynchronously using pg_net (non-blocking)
    BEGIN
        PERFORM net.http_post(
            url := v_webhook_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'User-Agent', 'Supabase-Document-Status-Trigger'
            ),
            body := v_payload -- Removed ::text cast, pg_net expects jsonb
        );
        RAISE NOTICE '[Document Status] Completion webhook sent for account %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING '[Document Status] Webhook call failed for account %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on accounts table
DROP TRIGGER IF EXISTS trigger_document_status_complete_webhook ON public.accounts;
CREATE TRIGGER trigger_document_status_complete_webhook
    AFTER UPDATE OF documentation_status ON public.accounts
    FOR EACH ROW
    WHEN (NEW.documentation_status = 'Complete' AND OLD.documentation_status IS DISTINCT FROM NEW.documentation_status)
    EXECUTE FUNCTION public.trigger_document_status_complete_webhook();

-- Comment on function
COMMENT ON FUNCTION public.trigger_document_status_complete_webhook() IS 
'Triggers webhook when documentation_status is updated to Complete in accounts table. Webhook URL: https://davidvanwachem.app.n8n.cloud/webhook/document-status-completed';
