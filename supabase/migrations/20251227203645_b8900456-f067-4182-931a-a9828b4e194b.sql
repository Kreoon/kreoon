-- Create storage bucket for chat attachments with 200MB limit
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-attachments', 'chat-attachments', true, 209715200)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 209715200;

-- RLS policies for chat attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table to track chat attachment metadata for cleanup
CREATE TABLE IF NOT EXISTS public.chat_attachment_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '8 days'),
  file_size INTEGER,
  file_type TEXT
);

-- Enable RLS
ALTER TABLE public.chat_attachment_metadata ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert own attachments"
ON public.chat_attachment_metadata FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can view attachments in their conversations"
ON public.chat_attachment_metadata FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can delete own attachments"
ON public.chat_attachment_metadata FOR DELETE TO authenticated
USING (uploaded_by = auth.uid());

-- Index for cleanup queries
CREATE INDEX idx_chat_attachments_expires ON public.chat_attachment_metadata(expires_at);