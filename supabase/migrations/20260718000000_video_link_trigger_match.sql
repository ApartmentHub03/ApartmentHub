-- Bug 4a: Video link not matched by viewing_participants trigger
-- Bug 4b: Flip existing CreateLink apartments with links to Active
--
-- The viewing_participants trigger (migration 20260702090000) only matched
-- tenants.EventURL against apartments.event_link. Bookings made via the video
-- link were never matched, so participants who booked the video viewing never
-- appeared in the CRM "People Joining Viewing" list.
--
-- This migration:
--   1. Updates both trigger functions to also match against eventlink_video.
--   2. Recreates the apartment-side trigger to fire on eventlink_video changes.
--   3. Backfills eventlink_video from slot_dates for existing apartments.
--   4. Flips existing CreateLink apartments that have links to Active.
--   5. One-time rebuild of viewing_participants to catch any missed video bookings.
--
-- SAFETY: Steps 3-5 run with session_replication_role = replica to suppress ALL
-- triggers on apartments/tenants. This prevents the status-change webhooks
-- (trigger_apartment_active_webhook, trigger_apartment_create_link_webhook)
-- from firing n8n webhooks during the bulk CreateLink→Active flip, which would
-- otherwise message tenants about "new active apartments" for stale listings.
-- The one-time viewing_participants rebuild in step 5 is what actually fixes
-- the data; the suppressed triggers would only have sent unwanted comms.

-- 1. Apartment-side rebuild: also match eventlink_video -----------------------
CREATE OR REPLACE FUNCTION public.sync_apartment_viewing_participants_from_qualified()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  UPDATE public.apartments
  SET viewing_participants = (
        SELECT COALESCE(jsonb_agg(public.build_tenant_participant(t)), '[]'::jsonb)
        FROM public.tenants t
        WHERE t.apartment_id = NEW.id
           OR public.event_url_matches(public.extract_tenant_event_url(t), NEW.event_link)
           OR public.event_url_matches(public.extract_tenant_event_url(t), NEW.eventlink_video)
      ),
      updated_at = timezone('utc'::text, now())
  WHERE id = NEW.id;
  RETURN NEW;
END;
$fn$;

-- 2. Tenant-side rebuild: also match eventlink_video -------------------------
CREATE OR REPLACE FUNCTION public.sync_tenant_to_viewing_participants()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  UPDATE public.apartments a
  SET viewing_participants = (
        SELECT COALESCE(jsonb_agg(public.build_tenant_participant(t)), '[]'::jsonb)
        FROM public.tenants t
        WHERE t.apartment_id = a.id
           OR public.event_url_matches(public.extract_tenant_event_url(t), a.event_link)
           OR public.event_url_matches(public.extract_tenant_event_url(t), a.eventlink_video)
      ),
      updated_at = timezone('utc'::text, now())
  WHERE a.id = NEW.apartment_id
     OR public.event_url_matches(public.extract_tenant_event_url(NEW), a.event_link)
     OR public.event_url_matches(public.extract_tenant_event_url(NEW), a.eventlink_video);
  RETURN NEW;
END;
$fn$;

-- 3. Recreate trigger to also fire on eventlink_video change -----------------
DROP TRIGGER IF EXISTS trigger_sync_viewing_participants_from_qualified ON public.apartments;
CREATE TRIGGER trigger_sync_viewing_participants_from_qualified
  AFTER UPDATE OF qualified_users, event_link, eventlink_video ON public.apartments
  FOR EACH ROW
  WHEN (OLD.qualified_users IS DISTINCT FROM NEW.qualified_users
        OR OLD.event_link IS DISTINCT FROM NEW.event_link
        OR OLD.eventlink_video IS DISTINCT FROM NEW.eventlink_video)
  EXECUTE FUNCTION public.sync_apartment_viewing_participants_from_qualified();

-- Steps 3-5: bulk data writes — suppress ALL triggers (no n8n webhooks) ------
SET session_replication_role = replica;

-- 3. Backfill eventlink_video from slot_dates for existing apartments --------
UPDATE public.apartments a
SET eventlink_video = sub.video_link
FROM (
  SELECT a2.id, (
    SELECT (slot->>'eventlink_video')
    FROM jsonb_array_elements(a2.slot_dates) AS slot
    WHERE slot->>'eventlink_video' IS NOT NULL
    ORDER BY (slot->>'created_at') DESC
    LIMIT 1
  ) AS video_link
  FROM public.apartments a2
  WHERE a2.eventlink_video IS NULL
    AND a2.slot_dates IS NOT NULL
    AND jsonb_array_length(a2.slot_dates) > 0
) AS sub
WHERE a.id = sub.id
  AND sub.video_link IS NOT NULL;

-- 4. Flip existing CreateLink apartments that have links to Active -----------
-- (No webhooks fire — suppressed. n8n "status active" endpoint would otherwise
--  message matched tenants about these now-Active listings.)
UPDATE public.apartments
SET status = 'Active'
WHERE status = 'CreateLink'
  AND (event_link IS NOT NULL OR eventlink_video IS NOT NULL);

-- 5. One-time rebuild of viewing_participants (catch missed video bookings) --
UPDATE public.apartments a
SET viewing_participants = (
      SELECT COALESCE(jsonb_agg(public.build_tenant_participant(t)), '[]'::jsonb)
      FROM public.tenants t
      WHERE t.apartment_id = a.id
         OR public.event_url_matches(public.extract_tenant_event_url(t), a.event_link)
         OR public.event_url_matches(public.extract_tenant_event_url(t), a.eventlink_video)
    ),
    updated_at = timezone('utc'::text, now());

SET session_replication_role = origin;