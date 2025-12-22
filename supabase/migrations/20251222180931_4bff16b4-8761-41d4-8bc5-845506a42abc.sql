-- Add 'corrected' status to content_status enum
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'corrected';