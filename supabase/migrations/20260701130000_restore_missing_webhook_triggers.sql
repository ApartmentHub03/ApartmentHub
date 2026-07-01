-- Restore three n8n automation triggers that had drifted off the live database
-- (confirmed missing 2026-07-01 via live introspection). These were NOT the
-- duplicates intentionally removed by 20260220110000_cleanup_duplicate_webhook_triggers.sql
-- — they are the genuine keepers whose trigger definitions were lost.
--
-- Safe by design: CREATE TRIGGER does not fire on existing rows (only future
-- INSERT/UPDATE), and every function below wraps its net.http_post in an
-- EXCEPTION block so a failed webhook never aborts the underlying write. No
-- backfill is performed.
--
--   1. trigger_generate_offer              -> handle_generate_offer()            (n8n send-offer-to-the-tenant)
--   2. trigger_qualified_user_active_webhook -> send_qualified_user_active_webhook()(n8n trigger-status-change-active; the keeper)
--   3. trigger_document_status_complete_webhook -> (recreated fn) (n8n document-status-completed; tenant WhatsApp on docs Complete)
--
-- Functions (1) and (2) already exist live and are left untouched — only their
-- triggers are re-attached. Function (3) was also missing, so it is recreated.

-- 1. Offer sender (function already present) --------------------------------
DROP TRIGGER IF EXISTS trigger_generate_offer ON public.apartments;
CREATE TRIGGER trigger_generate_offer
  BEFORE UPDATE OF "generate_offer" ON public.apartments
  FOR EACH ROW
  WHEN (NEW."generate_offer" IS NOT NULL AND trim(NEW."generate_offer") != ''
        AND (OLD."generate_offer" IS DISTINCT FROM NEW."generate_offer"))
  EXECUTE FUNCTION public.handle_generate_offer();

-- 2. Apartment status -> Active webhook (function already present; the keeper) -
DROP TRIGGER IF EXISTS trigger_qualified_user_active_webhook ON public.apartments;
CREATE TRIGGER trigger_qualified_user_active_webhook
  AFTER INSERT OR UPDATE OF status ON public.apartments
  FOR EACH ROW
  EXECUTE FUNCTION public.send_qualified_user_active_webhook();

-- 3. documentation_status -> Complete => n8n document-status-completed --------
CREATE OR REPLACE FUNCTION public.trigger_document_status_complete_webhook()
RETURNS TRIGGER AS $fn$
DECLARE
    v_webhook_url TEXT := 'https://davidvanwachem.app.n8n.cloud/webhook/document-status-completed';
    v_payload JSONB;
BEGIN
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
    BEGIN
        PERFORM net.http_post(
            url := v_webhook_url,
            headers := jsonb_build_object('Content-Type', 'application/json',
                                          'User-Agent', 'Supabase-Document-Status-Trigger'),
            body := v_payload
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[Document Status] Webhook call failed for account %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_document_status_complete_webhook ON public.accounts;
CREATE TRIGGER trigger_document_status_complete_webhook
    AFTER UPDATE OF documentation_status ON public.accounts
    FOR EACH ROW
    WHEN (NEW.documentation_status = 'Complete' AND OLD.documentation_status IS DISTINCT FROM NEW.documentation_status)
    EXECUTE FUNCTION public.trigger_document_status_complete_webhook();
