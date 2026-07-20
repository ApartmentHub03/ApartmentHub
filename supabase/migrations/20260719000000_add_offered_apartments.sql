-- Migration: Add accounts.offered_apartments column
--
-- /api/dossier/link-offers mirrors each submitted apartment's id onto
-- accounts.offered_apartments (a UUID[]) so the tenant's
-- /appartementen-selectie page can render "apartments I applied to" without
-- joining through dossiers. The column had no migration — link-offers
-- wrapped the write in try/console.warn so it failed silently whenever the
-- column was missing, leaving the tenant's apartment-selection page empty.
--
-- Non-destructive: ADD COLUMN IF NOT EXISTS with a default empty array.

ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS offered_apartments UUID[] DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.accounts.offered_apartments IS
    'UUID array of apartments the account has submitted an offer for. Mirrored by /api/dossier/link-offers when the tenant submits /nl/aanvraag.';