-- Fix product-documents storage bucket: add missing UPDATE policy required for upsert uploads
-- Also add file_size_limit and allowed_mime_types for consistency with other buckets

-- Update bucket with file size limit (10MB) and allowed mime types
UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown'
  ]
WHERE id = 'product-documents';

-- Add missing UPDATE policy (required for upsert: true in the upload component)
CREATE POLICY "Authenticated users can update product documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-documents');
