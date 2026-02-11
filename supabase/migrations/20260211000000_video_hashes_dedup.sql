-- Video deduplication: prevent same video from being uploaded multiple times to Bunny Stream.
-- Uses a partial file hash (first 2MB + last 2MB + file size) for fast fingerprinting.
-- Client computes hash → checks via RPC → if match, reuses existing embed_url.
-- Edge function saves hash after successful upload.

CREATE TABLE IF NOT EXISTS public.video_hashes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_hash text NOT NULL UNIQUE,
  file_size bigint NOT NULL,
  bunny_video_id text NOT NULL,
  embed_url text NOT NULL,
  thumbnail_url text,
  mp4_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_video_hashes_created_at ON public.video_hashes(created_at DESC);

-- RLS enabled but no direct policies needed:
-- Reads go through SECURITY DEFINER RPC, writes go through edge function (service role)
ALTER TABLE public.video_hashes ENABLE ROW LEVEL SECURITY;

-- RPC for client-side dedup check (any authenticated user can check)
CREATE OR REPLACE FUNCTION public.check_video_hash(p_file_hash text)
RETURNS TABLE(embed_url text, thumbnail_url text, bunny_video_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT vh.embed_url, vh.thumbnail_url, vh.bunny_video_id
  FROM public.video_hashes vh
  WHERE vh.file_hash = p_file_hash
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.check_video_hash(text) TO authenticated;
GRANT SELECT, INSERT ON public.video_hashes TO service_role;
