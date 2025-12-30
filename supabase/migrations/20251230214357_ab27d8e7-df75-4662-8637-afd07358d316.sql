-- Create storage bucket for organization assets (logos, banners, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('organizations', 'organizations', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload organization assets
CREATE POLICY "Org owners can upload organization assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organizations' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND is_owner = true
  )
);

-- Allow authenticated users to update organization assets
CREATE POLICY "Org owners can update organization assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organizations' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND is_owner = true
  )
);

-- Allow authenticated users to delete organization assets
CREATE POLICY "Org owners can delete organization assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'organizations' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND is_owner = true
  )
);

-- Allow public access to view organization assets (for registration page)
CREATE POLICY "Public can view organization assets"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'organizations');