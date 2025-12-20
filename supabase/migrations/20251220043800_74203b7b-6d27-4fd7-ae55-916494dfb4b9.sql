-- Add raw_video_urls column to store multiple raw video URLs
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS raw_video_urls text[] DEFAULT '{}';

-- Migrate existing drive_url data to raw_video_urls
UPDATE public.content 
SET raw_video_urls = ARRAY[drive_url]
WHERE drive_url IS NOT NULL AND drive_url != '' AND (raw_video_urls IS NULL OR raw_video_urls = '{}');