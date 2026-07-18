-- Bug: Cal.com cancellation doubles "People Joining Viewing" instead of moving to "Viewing Canceled"
--
-- Root cause: n8n INSERTs a NEW tenants row for each Cal.com webhook event
-- (BOOKING_CREATED, BOOKING_CANCELLED, etc.) rather than updating the existing row.
-- The two competing triggers on the tenants table both fire:
--
--   1. trigger_handle_team_cancellation (20260222030000)
--      Fires AFTER UPDATE OF "anyCancellation ?" — but n8n INSERTs, not UPDATEs,
--      so this trigger NEVER fires for Cal.com-initiated cancellations.
--      → viewing_cancellations never gets the cancelled tenant.
--
--   2. trigger_sync_tenant_to_viewing_participants (20260718000000)
--      Fires AFTER INSERT OR UPDATE — rebuilds viewing_participants from ALL
--      matching tenants with NO cancellation filter and NO dedup.
--      → Both the BOOKING_CREATED row AND the BOOKING_CANCELLED row match,
--        so the person appears TWICE in viewing_participants (doubled).
--
-- Fix (Approach A): Update the rebuild functions to:
--   1. Dedup by phone (DISTINCT ON ... ORDER BY updated_at DESC) — only the
--      LATEST row per person counts, so a later cancellation overrides an
--      earlier booking.
--   2. Split by cancellation status:
--      - Latest row is cancelled (status='CANCELLED' OR "anyCancellation ?"=true)
--        → viewing_cancellations
--      - Latest row is NOT cancelled → viewing_participants
--   3. Update BOTH columns in the apartment UPDATE (previously only
--      viewing_participants was touched, so viewing_cancellations was never
--      populated by this trigger).
--
-- The trigger DDL (AFTER INSERT OR UPDATE) is unchanged — only the function
-- bodies change. n8n INSERTs a cancellation row → trigger fires → rebuild
-- picks the latest row (the cancellation) → person moves to
-- viewing_cancellations and is removed from viewing_participants automatically.
--
-- handle_team_cancellation (for team-initiated CRM cancellations) is left
-- untouched — it still handles the manual anyCancellation flip path including
-- the n8n webhook and account booking move.

-- ============================================================================
-- 1. Helper: is a tenant row cancelled?
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_tenant_cancelled(p_tenant public.tenants)
RETURNS boolean AS $$
DECLARE
  v_row jsonb;
BEGIN
  v_row := to_jsonb(p_tenant);
  -- Check both signals: status='CANCELLED' and "anyCancellation ?"=true
  -- (n8n sets both, but check either for robustness)
  RETURN COALESCE(
    upper(trim(COALESCE(v_row->>'status', ''))) = 'CANCELLED',
    false
  ) OR COALESCE(
    (v_row->>'anyCancellation ?')::boolean,
    false
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.is_tenant_cancelled(public.tenants) IS
'Returns true if the tenant row represents a cancelled booking (status=CANCELLED or anyCancellation ?=true).';

-- ============================================================================
-- 1b. Update build_tenant_participant to include event_url + cancelled_by
--     The 20260222030000 version dropped event_url (which the CRM UI reads as
--     p.event_url) and the rich fields. Restore them while keeping cancelled_by.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.build_tenant_participant(p_tenant public.tenants)
RETURNS jsonb AS $$
DECLARE
  v_row jsonb;
BEGIN
  v_row := to_jsonb(p_tenant);
  RETURN jsonb_build_object(
    'tenant_id', p_tenant.id,
    'name', p_tenant.name,
    'whatsapp_number', p_tenant.whatsapp_number,
    'salesforce_account_id', p_tenant.salesforce_account_id,
    'tags', p_tenant.tags,
    'apartment_id', p_tenant.apartment_id,
    'cancelled_by', COALESCE(v_row->>'cancelledBy', v_row->>'cancelled_by'),
    'event_url', public.extract_tenant_event_url(p_tenant),
    'event_type', v_row->>'EventType',
    'trigger_event', v_row->>'TriggerEvent',
    'booking_at', v_row->>'BookingAt',
    'event_title', COALESCE(v_row->>'EventTitle', v_row->>'eventTitle'),
    'viewing_start_time', v_row->>'Viewing_StartTime',
    'viewing_end_time', v_row->>'Viewing_EndTime',
    'additional_notes', v_row->>'AdditionalNotes',
    'meeting_url', COALESCE(v_row->>'MeetingURL', v_row->>'meetcoURL'),
    'email', v_row->>'Email',
    'status', v_row->>'status',
    'created_at', p_tenant.created_at,
    'updated_at', p_tenant.updated_at
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.build_tenant_participant(public.tenants) IS
'Builds a JSONB object with tenant details for viewing_participants/viewing_cancellations. Includes event_url, cancelled_by, and booking details.';

-- ============================================================================
-- 2. Update: sync_apartment_viewing_participants_from_qualified()
--    Apartment-side rebuild — fires when qualified_users/event_link/eventlink_video change
--    Now rebuilds BOTH viewing_participants AND viewing_cancellations with dedup.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_apartment_viewing_participants_from_qualified()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  UPDATE public.apartments
  SET viewing_participants = (
        SELECT COALESCE(jsonb_agg(public.build_tenant_participant(latest.t)), '[]'::jsonb)
        FROM (
          SELECT DISTINCT ON (COALESCE(public.normalize_phone_for_match(t.whatsapp_number), t.id::text)) t
          FROM public.tenants t
          WHERE t.apartment_id = NEW.id
             OR public.event_url_matches(public.extract_tenant_event_url(t), NEW.event_link)
             OR public.event_url_matches(public.extract_tenant_event_url(t), NEW.eventlink_video)
          ORDER BY COALESCE(public.normalize_phone_for_match(t.whatsapp_number), t.id::text), t.updated_at DESC
        ) latest
        WHERE NOT public.is_tenant_cancelled(latest.t)
      ),
      viewing_cancellations = (
        SELECT COALESCE(jsonb_agg(public.build_tenant_participant(latest.t)), '[]'::jsonb)
        FROM (
          SELECT DISTINCT ON (COALESCE(public.normalize_phone_for_match(t.whatsapp_number), t.id::text)) t
          FROM public.tenants t
          WHERE t.apartment_id = NEW.id
             OR public.event_url_matches(public.extract_tenant_event_url(t), NEW.event_link)
             OR public.event_url_matches(public.extract_tenant_event_url(t), NEW.eventlink_video)
          ORDER BY COALESCE(public.normalize_phone_for_match(t.whatsapp_number), t.id::text), t.updated_at DESC
        ) latest
        WHERE public.is_tenant_cancelled(latest.t)
      ),
      updated_at = timezone('utc'::text, now())
  WHERE id = NEW.id;
  RETURN NEW;
END;
$fn$;

-- ============================================================================
-- 3. Update: sync_tenant_to_viewing_participants()
--    Tenant-side rebuild — fires on tenant INSERT or UPDATE
--    Now rebuilds BOTH viewing_participants AND viewing_cancellations with dedup.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_tenant_to_viewing_participants()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  UPDATE public.apartments a
  SET viewing_participants = (
        SELECT COALESCE(jsonb_agg(public.build_tenant_participant(latest.t)), '[]'::jsonb)
        FROM (
          SELECT DISTINCT ON (COALESCE(public.normalize_phone_for_match(t.whatsapp_number), t.id::text)) t
          FROM public.tenants t
          WHERE t.apartment_id = a.id
             OR public.event_url_matches(public.extract_tenant_event_url(t), a.event_link)
             OR public.event_url_matches(public.extract_tenant_event_url(t), a.eventlink_video)
          ORDER BY COALESCE(public.normalize_phone_for_match(t.whatsapp_number), t.id::text), t.updated_at DESC
        ) latest
        WHERE NOT public.is_tenant_cancelled(latest.t)
      ),
      viewing_cancellations = (
        SELECT COALESCE(jsonb_agg(public.build_tenant_participant(latest.t)), '[]'::jsonb)
        FROM (
          SELECT DISTINCT ON (COALESCE(public.normalize_phone_for_match(t.whatsapp_number), t.id::text)) t
          FROM public.tenants t
          WHERE t.apartment_id = a.id
             OR public.event_url_matches(public.extract_tenant_event_url(t), a.event_link)
             OR public.event_url_matches(public.extract_tenant_event_url(t), a.eventlink_video)
          ORDER BY COALESCE(public.normalize_phone_for_match(t.whatsapp_number), t.id::text), t.updated_at DESC
        ) latest
        WHERE public.is_tenant_cancelled(latest.t)
      ),
      updated_at = timezone('utc'::text, now())
  WHERE a.id = NEW.apartment_id
     OR public.event_url_matches(public.extract_tenant_event_url(NEW), a.event_link)
     OR public.event_url_matches(public.extract_tenant_event_url(NEW), a.eventlink_video);
  RETURN NEW;
END;
$fn$;

-- ============================================================================
-- 4. One-time reconcile: rebuild BOTH columns for all apartments
--    Suppress ALL triggers (no n8n webhooks, no cascading rebuilds) during bulk write
-- ============================================================================
SET session_replication_role = replica;

UPDATE public.apartments a
SET viewing_participants = (
      SELECT COALESCE(jsonb_agg(public.build_tenant_participant(latest.t)), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (COALESCE(public.normalize_phone_for_match(t.whatsapp_number), t.id::text)) t
        FROM public.tenants t
        WHERE t.apartment_id = a.id
           OR public.event_url_matches(public.extract_tenant_event_url(t), a.event_link)
           OR public.event_url_matches(public.extract_tenant_event_url(t), a.eventlink_video)
        ORDER BY COALESCE(public.normalize_phone_for_match(t.whatsapp_number), t.id::text), t.updated_at DESC
      ) latest
      WHERE NOT public.is_tenant_cancelled(latest.t)
    ),
    viewing_cancellations = (
      SELECT COALESCE(jsonb_agg(public.build_tenant_participant(latest.t)), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (COALESCE(public.normalize_phone_for_match(t.whatsapp_number), t.id::text)) t
        FROM public.tenants t
        WHERE t.apartment_id = a.id
           OR public.event_url_matches(public.extract_tenant_event_url(t), a.event_link)
           OR public.event_url_matches(public.extract_tenant_event_url(t), a.eventlink_video)
        ORDER BY COALESCE(public.normalize_phone_for_match(t.whatsapp_number), t.id::text), t.updated_at DESC
      ) latest
      WHERE public.is_tenant_cancelled(latest.t)
    ),
    updated_at = timezone('utc'::text, now());

SET session_replication_role = origin;