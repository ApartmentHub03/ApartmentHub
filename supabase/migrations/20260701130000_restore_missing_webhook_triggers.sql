-- Restore two n8n automation triggers that had drifted off the live database
-- (confirmed missing 2026-07-01 via live introspection). Both are genuine keepers
-- whose functions still exist live — only their trigger definitions were lost. We
-- re-attach the triggers only (functions untouched).
--
-- Safe by design: CREATE TRIGGER does not fire on existing rows (only future
-- INSERT/UPDATE), and both functions wrap net.http_post in an EXCEPTION block, so
-- a failed webhook never aborts the underlying write. No backfill is performed.
--
--   1. trigger_generate_offer               -> handle_generate_offer()             (n8n send-offer-to-the-tenant)
--   2. trigger_qualified_user_active_webhook -> send_qualified_user_active_webhook() (n8n trigger-status-change-active)
--
-- NOTE: trigger_document_status_complete_webhook and trigger_accounts_tags_webhook
-- are deliberately NOT restored — they were intentionally dropped by
-- 20260314190000_n8n_change_webhook_triggers.sql and replaced by the generic
-- notify_n8n_table_change feed (get-account-table-update), which already carries
-- documentation_status / tags changes to n8n. Re-adding them would double-fire.

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
