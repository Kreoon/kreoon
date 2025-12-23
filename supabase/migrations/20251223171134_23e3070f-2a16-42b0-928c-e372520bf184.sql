
-- Add new required fields to clients table for complete company profile
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS document_type text,
ADD COLUMN IF NOT EXISTS document_number text,
ADD COLUMN IF NOT EXISTS main_contact text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS linkedin text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Add comment for category values
COMMENT ON COLUMN public.clients.category IS 'Company category: productos_digitales, bienestar, comunidad, perfume, vehicular, hogar, juguetes, suplementos, belleza, cosmeticos, educacion, tecnologia, saas, otro';
