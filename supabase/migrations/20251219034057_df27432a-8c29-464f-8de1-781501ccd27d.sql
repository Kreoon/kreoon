-- Add ambassador value to app_role enum
-- In PostgreSQL you can add a value to an existing enum
ALTER TYPE public.app_role ADD VALUE 'ambassador';