-- Restore the apartment-side viewing_participants sync trigger.
--
-- Root cause (found 2026-07-01 via live introspection): the function
-- public.sync_apartment_viewing_participants_from_qualified() existed on live,
-- but the trigger that fires it — trigger_sync_viewing_participants_from_qualified,
-- originally created in 20260221100000_sync_tenants_to_viewing_participants.sql —
-- had drifted off the live database. As a result, when an apartment's
-- qualified_users changed, its viewing_participants was never rebuilt, so the CRM
-- "Bookings" tab (which reads apartments.viewing_participants) showed empty even
-- though matching tenants existed by phone (e.g. 44 matching tenants, 0 shown).
--
-- This migration re-creates the trigger (idempotent) and runs the same one-time
-- reconcile the original migration used, so existing apartments are backfilled.
-- No new message-sending automations are involved: viewing reminders live on the
-- tenants table, not on apartments.viewing_participants.

DROP TRIGGER IF EXISTS trigger_sync_viewing_participants_from_qualified ON public.apartments;
CREATE TRIGGER trigger_sync_viewing_participants_from_qualified
  AFTER UPDATE OF qualified_users ON public.apartments
  FOR EACH ROW
  WHEN (OLD.qualified_users IS DISTINCT FROM NEW.qualified_users)
  EXECUTE FUNCTION public.sync_apartment_viewing_participants_from_qualified();

-- One-time reconcile: rebuild viewing_participants for every apartment that has
-- qualified_users, matching tenants by normalized phone (mirrors step 7 of
-- 20260221100000_sync_tenants_to_viewing_participants.sql).
UPDATE public.apartments a
SET
  viewing_participants = (
    SELECT COALESCE(jsonb_agg(public.build_tenant_participant(t)), '[]'::jsonb)
    FROM public.tenants t
    WHERE t.whatsapp_number IS NOT NULL
      AND trim(t.whatsapp_number) != ''
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(a.qualified_users, '[]'::jsonb)) qu
        WHERE public.normalize_phone_for_match(COALESCE(
              qu->>'whatsapp_number',
              qu->>'WhatsApp Number',
              qu->>'whatsAppNumber',
              qu->>'WhatsAppNumber'
            )) = public.normalize_phone_for_match(t.whatsapp_number)
      )
  ),
  updated_at = timezone('utc'::text, now())
WHERE a.qualified_users IS NOT NULL
  AND jsonb_array_length(COALESCE(a.qualified_users, '[]'::jsonb)) > 0;
