-- Migration: Replace candidate_segments with the 10 canonical Zoko segments.
--
-- The previous migration (20260723000000) defined 36 price x bedroom combos.
-- The real Zoko contact list only uses 10 segments. This migration resets
-- candidate_segments to match Zoko exactly.
--
-- TRUNCATE cascades to candidate_segment_members (FK ON DELETE CASCADE),
-- wiping all member rows. Members are repopulated via CSV upload from the CRM
-- admin (downloaded from Zoko), not via the n8n daily sync.

TRUNCATE TABLE public.candidate_segments CASCADE;

INSERT INTO public.candidate_segments (name, min_budget, max_budget, min_bedrooms) VALUES
('Customer €1250 - €1500 & 1 Bedroom', 1250, 1500, 1),
('Customer €1500 - €2000 & 1 Bedroom', 1500, 2000, 1),
('Customer €1500 - €2000 & 2 Bedroom', 1500, 2000, 2),
('Customer €1500 - €2000 & 3 Bedroom', 1500, 2000, 3),
('Customer €2000 - €2500 & 1 Bedroom', 2000, 2500, 1),
('Customer €2000 - €2500 & 2 Bedroom', 2000, 2500, 2),
('Customer €2000 - €2500 & 3 Bedroom', 2000, 2500, 3),
('Customer €2500 - €3000 & 1 Bedroom', 2500, 3000, 1),
('Customer €2500 - €3000 & 2 Bedroom', 2500, 3000, 2),
('Customer €3000 - €3500 & 3 Bedroom', 3000, 3500, 3);