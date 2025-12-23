-- Create storage bucket for public assets if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/x-icon', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the bucket
CREATE POLICY "Public assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- Allow authenticated users to upload to branding folder (admins only in practice via frontend)
CREATE POLICY "Authenticated users can upload to public-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'public-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update public-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'public-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete from public-assets
CREATE POLICY "Authenticated users can delete from public-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'public-assets' AND auth.role() = 'authenticated');