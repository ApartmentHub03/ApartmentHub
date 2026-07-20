-- Add `address` to crm_users.
--
-- The "Generate offer" Gmail draft signature is per-logged-in-agent and
-- includes a street address. crm_users already has email + phone; address
-- is the missing piece. The Team page in the CRM admin gets a new input field
-- so each agent fills in their own address once.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS). Non-destructive.

ALTER TABLE public.crm_users
    ADD COLUMN IF NOT EXISTS address TEXT;