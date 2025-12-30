-- Add missing available_hours column to live_hour_wallets
ALTER TABLE public.live_hour_wallets 
ADD COLUMN IF NOT EXISTS available_hours NUMERIC DEFAULT 0;

-- Update available_hours based on existing data (total - used - reserved)
UPDATE public.live_hour_wallets 
SET available_hours = GREATEST(0, total_hours - used_hours - reserved_hours);