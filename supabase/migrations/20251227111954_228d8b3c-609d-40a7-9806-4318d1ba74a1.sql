-- Add field to mark client as internal brand (organization itself)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS is_internal_brand boolean DEFAULT false;

-- Mark UGC Colombia as internal brand (where id = organization_id)
UPDATE public.clients 
SET is_internal_brand = true 
WHERE id = organization_id;