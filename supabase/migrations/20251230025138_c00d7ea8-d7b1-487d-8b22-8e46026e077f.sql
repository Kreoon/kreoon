-- Create storage bucket for streaming media (thumbnails, overlays, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'streaming-media', 
  'streaming-media', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4']
);

-- RLS policies for streaming-media bucket
CREATE POLICY "Authenticated users can upload streaming media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'streaming-media');

CREATE POLICY "Anyone can view streaming media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'streaming-media');

CREATE POLICY "Authenticated users can update their uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'streaming-media');

CREATE POLICY "Authenticated users can delete their uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'streaming-media');