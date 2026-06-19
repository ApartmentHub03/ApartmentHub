-- Create rental_leads table for ApartmentHub
-- This table stores leads from the Rental Calculator form

CREATE TABLE IF NOT EXISTS public.rental_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Property Details
    address TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    square_meters INTEGER,
    rooms INTEGER,
    interior TEXT CHECK (interior IN ('shell', 'unfurnished', 'partlyFurnished', 'furnished')),
    condition TEXT CHECK (condition IN ('brandNew', 'average', 'belowAverage')),
    
    -- Contact Information
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    
    -- Calculated Data
    estimated_rent INTEGER,
    
    -- Metadata
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed')),
    notes TEXT
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_rental_leads_email ON public.rental_leads(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_rental_leads_created_at ON public.rental_leads(created_at DESC);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_rental_leads_status ON public.rental_leads(status);

-- Enable Row Level Security
ALTER TABLE public.rental_leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.rental_leads;
DROP POLICY IF EXISTS "Allow authenticated reads" ON public.rental_leads;
DROP POLICY IF EXISTS "Allow authenticated updates" ON public.rental_leads;

-- Policy: Allow anyone to insert new leads (for the public form)
CREATE POLICY "Allow anonymous inserts"
ON public.rental_leads
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Allow authenticated users to read all leads
CREATE POLICY "Allow authenticated reads"
ON public.rental_leads
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to update leads
CREATE POLICY "Allow authenticated updates"
ON public.rental_leads
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.rental_leads;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.rental_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comment to table
COMMENT ON TABLE public.rental_leads IS 'Stores rental property leads from the ApartmentHub calculator form';

-- Add comments to important columns
COMMENT ON COLUMN public.rental_leads.estimated_rent IS 'Calculated rental price in EUR per month';
COMMENT ON COLUMN public.rental_leads.status IS 'Lead status for CRM tracking';
