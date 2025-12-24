-- Create storage bucket for product documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-documents', 'product-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload product documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-documents');

-- Allow authenticated users to view documents
CREATE POLICY "Authenticated users can view product documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-documents');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete product documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-documents');

-- Add columns to products table for stored document URLs
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS brief_file_url TEXT,
ADD COLUMN IF NOT EXISTS onboarding_file_url TEXT,
ADD COLUMN IF NOT EXISTS research_file_url TEXT;