-- Drop rental_leads and verkoop_leads sync triggers and functions

DROP TRIGGER IF EXISTS trg_rental_leads_to_leads ON public.rental_leads;
DROP TRIGGER IF EXISTS trg_verkoop_leads_to_leads ON public.verkoop_leads;

DROP FUNCTION IF EXISTS public.sync_rental_lead();
DROP FUNCTION IF EXISTS public.sync_verkoop_lead();