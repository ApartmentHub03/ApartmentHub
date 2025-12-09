-- Add linked_to_persoon_id column to personen table
-- This allows guarantors to be linked to specific tenants

ALTER TABLE public.personen 
ADD COLUMN linked_to_persoon_id uuid REFERENCES public.personen(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_personen_linked_to ON public.personen(linked_to_persoon_id);

-- Add check to ensure only guarantors can have a linked_to_persoon_id
ALTER TABLE public.personen 
ADD CONSTRAINT check_guarantor_link 
CHECK (
  (rol = 'Garantsteller' AND linked_to_persoon_id IS NOT NULL) OR
  (rol != 'Garantsteller' AND linked_to_persoon_id IS NULL) OR
  (rol = 'Garantsteller' AND linked_to_persoon_id IS NULL)
);