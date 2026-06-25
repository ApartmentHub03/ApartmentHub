-- Migrate old 'default' pipeline stages to type-specific pipeline stages.
-- After the kanban_type_pipelines migration, leads may still have old stage values
-- that don't match any column in the new pipelines, causing them to be invisible.

-- ===========================================
-- 1. Sale leads (type = 'sale')
-- ===========================================
UPDATE public.leads SET stage = 'new'                WHERE type = 'sale' AND stage = 'new';
UPDATE public.leads SET stage = 'phone_call'         WHERE type = 'sale' AND stage = 'qualified';
UPDATE public.leads SET stage = 'intake_scheduled'   WHERE type = 'sale' AND stage = 'intake_scheduled';
UPDATE public.leads SET stage = 'document_completed'  WHERE type = 'sale' AND stage IN ('portal_invited', 'documents_complete');
UPDATE public.leads SET stage = 'viewing'            WHERE type = 'sale' AND stage = 'active';
UPDATE public.leads SET stage = 'negotiation'         WHERE type = 'sale' AND stage = 'offer_negotiation';
UPDATE public.leads SET stage = 'deal_done'           WHERE type = 'sale' AND stage = 'closed_won';
UPDATE public.leads SET stage = 'deal_failed'         WHERE type = 'sale' AND stage = 'closed_lost';

-- ===========================================
-- 2. Buyer leads (type = 'buyer_intake')
-- ===========================================
UPDATE public.leads SET stage = 'new_lead'           WHERE type = 'buyer_intake' AND stage IN ('new', 'qualified');
UPDATE public.leads SET stage = 'first_call'         WHERE type = 'buyer_intake' AND stage = 'intake_scheduled';
UPDATE public.leads SET stage = 'need_qualified'      WHERE type = 'buyer_intake' AND stage IN ('portal_invited', 'documents_complete');
UPDATE public.leads SET stage = 'making_offer'        WHERE type = 'buyer_intake' AND stage IN ('active', 'offer_negotiation');
UPDATE public.leads SET stage = 'deal_won'            WHERE type = 'buyer_intake' AND stage = 'closed_won';
UPDATE public.leads SET stage = 'deal_failed'          WHERE type = 'buyer_intake' AND stage = 'closed_lost';

-- ===========================================
-- 3. Meta leads (type = 'meta_ads')
-- ===========================================
UPDATE public.leads SET stage = 'new'                  WHERE type = 'meta_ads' AND stage = 'new';
UPDATE public.leads SET stage = 'scheduled_viewing'    WHERE type = 'meta_ads' AND stage IN ('qualified', 'intake_scheduled', 'portal_invited', 'documents_complete', 'active');
UPDATE public.leads SET stage = 'deal_closed'          WHERE type = 'meta_ads' AND stage IN ('offer_negotiation', 'closed_won');
UPDATE public.leads SET stage = 'deal_failed'           WHERE type = 'meta_ads' AND stage = 'closed_lost';

-- ===========================================
-- 4. Catch-all: any lead with an unrecognized stage falls back to the
--    first stage of its pipeline so it's never invisible.
-- ===========================================
UPDATE public.leads SET stage = 'new'                WHERE type = 'sale'        AND stage NOT IN ('new','phone_call','intake_scheduled','document_completed','viewing','negotiation','deal_done','deal_failed');
UPDATE public.leads SET stage = 'new_lead'            WHERE type = 'buyer_intake' AND stage NOT IN ('new_lead','first_call','need_qualified','making_offer','negotiation','deal_won','deal_failed');
UPDATE public.leads SET stage = 'new'                WHERE type = 'meta_ads'    AND stage NOT IN ('new','scheduled_viewing','deal_closed','deal_failed');