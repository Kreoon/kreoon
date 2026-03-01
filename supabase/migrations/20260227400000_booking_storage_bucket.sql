-- Create storage bucket for booking branding assets (logos, etc.)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'booking-assets',
  'booking-assets',
  true,  -- public for logo display
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for booking-assets bucket

-- Allow authenticated users to upload their own assets
CREATE POLICY "Users can upload booking assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'booking-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to read public booking assets (for public booking pages)
CREATE POLICY "Anyone can view booking assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'booking-assets');

-- Allow users to update their own assets
CREATE POLICY "Users can update their booking assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'booking-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'booking-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own assets
CREATE POLICY "Users can delete their booking assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'booking-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: booking-assets bucket added for booking branding logos
