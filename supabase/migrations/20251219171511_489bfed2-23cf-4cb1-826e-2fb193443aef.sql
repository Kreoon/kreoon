-- Add columns for multiple video URLs and guidelines
ALTER TABLE public.content
ADD COLUMN video_urls text[] DEFAULT '{}',
ADD COLUMN editor_guidelines text,
ADD COLUMN strategist_guidelines text,
ADD COLUMN trafficker_guidelines text;

-- Migrate existing video_url to video_urls array if it exists
UPDATE public.content 
SET video_urls = ARRAY[video_url]
WHERE video_url IS NOT NULL AND video_url != '';