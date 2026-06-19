-- Add bid-related columns to dossiers table
-- Run this in your Supabase SQL Editor AFTER running supabase-dossiers-schema.sql

ALTER TABLE public.dossiers 
ADD COLUMN IF NOT EXISTS bid_amount NUMERIC,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS motivation TEXT,
ADD COLUMN IF NOT EXISTS months_advance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS property_address TEXT;

-- Add comment
COMMENT ON COLUMN public.dossiers.bid_amount IS 'The bid amount for the property (EUR/month)';
COMMENT ON COLUMN public.dossiers.start_date IS 'Desired start date for the rental';
COMMENT ON COLUMN public.dossiers.motivation IS 'Motivation for renting';
COMMENT ON COLUMN public.dossiers.months_advance IS 'Number of months advance payment offered';
COMMENT ON COLUMN public.dossiers.property_address IS 'Address of the property being applied for';
