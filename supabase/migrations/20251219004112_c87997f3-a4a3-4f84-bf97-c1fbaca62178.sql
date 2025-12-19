-- Add is_published column to content table for public portfolio
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

-- Create index for faster queries on published content
CREATE INDEX IF NOT EXISTS idx_content_is_published ON public.content(is_published) WHERE is_published = true;

-- Add RLS policy to allow public read access to published content
CREATE POLICY "Anyone can view published content" 
ON public.content 
FOR SELECT 
USING (is_published = true);
