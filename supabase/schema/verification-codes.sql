-- Verification Codes table for WhatsApp OTP
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    code TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON public.verification_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON public.verification_codes(expires_at);

-- Enable Row Level Security
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Policies (service role only - no direct access from client)
DROP POLICY IF EXISTS "Service role only for verification_codes" ON public.verification_codes;
CREATE POLICY "Service role only for verification_codes" ON public.verification_codes
    FOR ALL TO service_role USING (true);

-- Auto-cleanup expired codes (optional - run as cron job)
-- DELETE FROM public.verification_codes WHERE expires_at < NOW();

COMMENT ON TABLE public.verification_codes IS 'Stores temporary OTP codes for WhatsApp verification';
