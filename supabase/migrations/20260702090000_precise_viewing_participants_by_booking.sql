-- Make viewing_participants (the CRM "Bookings" list) reflect ACTUAL bookings
-- for each apartment, instead of the inflated "qualified + booked-anything" set.
--
-- Background (2026-07-02): tenants rows are Cal.com booking payloads ingested by
-- n8n. Every tenant carries EventURL/MeetingURL (100% populated) which maps to an
-- apartment's event_link, but tenants.apartment_id was never set (0/1138). The
-- previous sync built viewing_participants from BOTH the precise event-URL/
-- apartment_id match AND a broad phone-vs-qualified_users match, so an apartment
-- showed everyone qualified for it (e.g. 44) rather than the ~2 who actually
-- booked it.
--
-- This migration:
--   1. Backfills tenants.apartment_id from the unambiguous EventURL -> event_link match.
--   2. Rewrites both sync functions to build viewing_participants ONLY from tenants
--      that booked THIS apartment (apartment_id = a.id OR EventURL matches event_link).
--   3. Fires the apartment-side rebuild on event_link changes too (new slots).
--   4. One-time precise rebuild of every apartment.
--
-- The one-time data steps run with session_replication_role=replica so the bulk
-- writes don't fire tenants' message/webhook triggers (e.g. schedule_viewing_reminders,
-- which is un-guarded AFTER UPDATE). New bookings arrive as tenant INSERTs (which
-- carry EventURL), so participants stay correct even before n8n sets apartment_id.

-- 1. Apartment-side rebuild: participants = tenants who booked this apartment ----
CREATE OR REPLACE FUNCTION public.sync_apartment_viewing_participants_from_qualified()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  UPDATE public.apartments
  SET viewing_participants = (
        SELECT COALESCE(jsonb_agg(public.build_tenant_participant(t)), '[]'::jsonb)
        FROM public.tenants t
        WHERE t.apartment_id = NEW.id
           OR public.event_url_matches(public.extract_tenant_event_url(t), NEW.event_link)
      ),
      updated_at = timezone('utc'::text, now())
  WHERE id = NEW.id;
  RETURN NEW;
END;
$fn$;

-- 2. Tenant-side rebuild: when a booking (tenant) changes, rebuild the apartment(s)
--    it belongs to, matched by apartment_id or EventURL -----------------------
CREATE OR REPLACE FUNCTION public.sync_tenant_to_viewing_participants()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  UPDATE public.apartments a
  SET viewing_participants = (
        SELECT COALESCE(jsonb_agg(public.build_tenant_participant(t)), '[]'::jsonb)
        FROM public.tenants t
        WHERE t.apartment_id = a.id
           OR public.event_url_matches(public.extract_tenant_event_url(t), a.event_link)
      ),
      updated_at = timezone('utc'::text, now())
  WHERE a.id = NEW.apartment_id
     OR public.event_url_matches(public.extract_tenant_event_url(NEW), a.event_link);
  RETURN NEW;
END;
$fn$;

-- 3. Apartment-side trigger: also fire when event_link changes (new bookable slot)
DROP TRIGGER IF EXISTS trigger_sync_viewing_participants_from_qualified ON public.apartments;
CREATE TRIGGER trigger_sync_viewing_participants_from_qualified
  AFTER UPDATE OF qualified_users, event_link ON public.apartments
  FOR EACH ROW
  WHEN (OLD.qualified_users IS DISTINCT FROM NEW.qualified_users
        OR OLD.event_link IS DISTINCT FROM NEW.event_link)
  EXECUTE FUNCTION public.sync_apartment_viewing_participants_from_qualified();

-- 4. One-time reconcile (triggers off so bulk writes don't message tenants) ------
SET session_replication_role = replica;

-- 4a. Backfill apartment_id for tenants whose EventURL matches exactly one apartment
UPDATE public.tenants t
SET apartment_id = a.id, updated_at = now()
FROM public.apartments a
WHERE t.apartment_id IS NULL
  AND public.event_url_matches(public.extract_tenant_event_url(t), a.event_link)
  AND (SELECT count(*) FROM public.apartments a2
       WHERE public.event_url_matches(public.extract_tenant_event_url(t), a2.event_link)) = 1;

-- 4b. Precise rebuild of every apartment's viewing_participants
UPDATE public.apartments a
SET viewing_participants = (
      SELECT COALESCE(jsonb_agg(public.build_tenant_participant(t)), '[]'::jsonb)
      FROM public.tenants t
      WHERE t.apartment_id = a.id
         OR public.event_url_matches(public.extract_tenant_event_url(t), a.event_link)
    ),
    updated_at = timezone('utc'::text, now());

SET session_replication_role = origin;
