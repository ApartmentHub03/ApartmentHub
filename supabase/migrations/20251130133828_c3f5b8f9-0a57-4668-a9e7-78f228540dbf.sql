-- Create dossiers table
CREATE TABLE public.dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  apartment_id TEXT,
  apartment_address TEXT,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create personen table
CREATE TABLE public.personen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  rol TEXT NOT NULL CHECK (rol IN ('Hoofdhuurder', 'Medehuurder', 'Garantsteller')),
  naam TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  docs_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create documenten table
CREATE TABLE public.documenten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persoon_id UUID NOT NULL REFERENCES public.personen(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'ontbreekt' CHECK (status IN ('ontvangen', 'ontbreekt')),
  reason_missing TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create biedingen table
CREATE TABLE public.biedingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  motivation TEXT NOT NULL,
  start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create verification_codes table for WhatsApp codes
CREATE TABLE public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documenten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biedingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dossiers (public can access their own via phone number stored in JWT)
CREATE POLICY "Users can view their own dossier"
  ON public.dossiers FOR SELECT
  USING (phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number');

CREATE POLICY "Users can update their own dossier"
  ON public.dossiers FOR UPDATE
  USING (phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number');

-- RLS Policies for personen
CREATE POLICY "Users can view personen in their dossier"
  ON public.personen FOR SELECT
  USING (
    dossier_id IN (
      SELECT id FROM public.dossiers 
      WHERE phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number'
    )
  );

CREATE POLICY "Users can insert personen in their dossier"
  ON public.personen FOR INSERT
  WITH CHECK (
    dossier_id IN (
      SELECT id FROM public.dossiers 
      WHERE phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number'
    )
  );

-- RLS Policies for documenten
CREATE POLICY "Users can view documenten in their dossier"
  ON public.documenten FOR SELECT
  USING (
    persoon_id IN (
      SELECT p.id FROM public.personen p
      INNER JOIN public.dossiers d ON p.dossier_id = d.id
      WHERE d.phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number'
    )
  );

CREATE POLICY "Users can update documenten in their dossier"
  ON public.documenten FOR UPDATE
  USING (
    persoon_id IN (
      SELECT p.id FROM public.personen p
      INNER JOIN public.dossiers d ON p.dossier_id = d.id
      WHERE d.phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number'
    )
  );

-- RLS Policies for biedingen
CREATE POLICY "Users can view their own biedingen"
  ON public.biedingen FOR SELECT
  USING (
    dossier_id IN (
      SELECT id FROM public.dossiers 
      WHERE phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number'
    )
  );

CREATE POLICY "Users can insert their own biedingen"
  ON public.biedingen FOR INSERT
  WITH CHECK (
    dossier_id IN (
      SELECT id FROM public.dossiers 
      WHERE phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number'
    )
  );

-- RLS Policies for verification_codes (no access needed via RLS, only via edge functions)
CREATE POLICY "Service role can manage verification codes"
  ON public.verification_codes FOR ALL
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_dossiers_updated_at
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documenten_updated_at
  BEFORE UPDATE ON public.documenten
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();