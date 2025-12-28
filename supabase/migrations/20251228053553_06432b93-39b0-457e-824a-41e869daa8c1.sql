-- Add availability_status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'available';