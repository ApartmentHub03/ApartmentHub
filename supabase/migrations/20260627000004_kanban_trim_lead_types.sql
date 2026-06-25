-- Remove unused lead_type values: buying_power, rental, contact, newsletter
-- Only keep: sale, buyer_intake, meta_ads

-- Migrate any existing rows (should be none for removed types, but safe)
UPDATE public.leads SET type = 'sale' WHERE type::text IN ('rental', 'contact', 'newsletter');
UPDATE public.leads SET type = 'buyer_intake' WHERE type::text = 'buying_power';

-- Recreate the enum without the removed values
ALTER TYPE public.lead_type RENAME TO lead_type_old;
CREATE TYPE public.lead_type AS ENUM (
  'sale', 'buyer_intake', 'meta_ads'
);
ALTER TABLE public.leads ALTER COLUMN type TYPE public.lead_type USING type::text::public.lead_type;
DROP TYPE public.lead_type_old;