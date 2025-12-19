-- Add hooks_count column to content table
ALTER TABLE public.content
ADD COLUMN hooks_count integer DEFAULT 1;