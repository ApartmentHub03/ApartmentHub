-- Retire the Salesforce document-forwarding automation.
--
-- The /aanvraag + LetterOfIntent flow now persists the full dossier to Supabase
-- (dossiers / personen / documenten + storage) and no longer pushes anything to
-- Salesforce. This removes the DB trigger that POSTed account metadata to the
-- `forward-docs-to-salesforce` edge function whenever
-- accounts.documentation_status became 'Complete' (defined in
-- 20260416000000, body last set in 20260416010000).
--
-- IMPORTANT — scope: this drops ONLY the Salesforce automation. It deliberately
-- leaves intact:
--   * trigger_document_status_complete_webhook  (n8n `document-status-completed`
--     WhatsApp — SAME event, DIFFERENT trigger)
--   * trigger_update_accounts_documentation_status + ..._on_persoon (the
--     recompute that drives documentation_status in the first place)
--
-- After applying this, also undeploy the edge function:
--   supabase functions delete forward-docs-to-salesforce

DROP TRIGGER IF EXISTS trigger_salesforce_documents_complete_webhook ON public.accounts;
DROP FUNCTION IF EXISTS public.trigger_salesforce_documents_complete_webhook();
