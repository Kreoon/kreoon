-- Allow brands.owner_id to be NULL so users can be deleted without FK violation
-- Previously owner_id was NOT NULL which prevented user deletion when they owned brands

ALTER TABLE public.brands ALTER COLUMN owner_id DROP NOT NULL;
