-- Atomic append helper to avoid lost updates when multiple uploads happen
CREATE OR REPLACE FUNCTION public.append_raw_video_url(
  _content_id uuid,
  _url text
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_urls text[];
BEGIN
  UPDATE public.content
  SET raw_video_urls = array_append(COALESCE(raw_video_urls, '{}'::text[]), _url),
      drive_url = _url,
      video_processing_status = 'completed',
      updated_at = now()
  WHERE id = _content_id
  RETURNING raw_video_urls INTO updated_urls;

  RETURN updated_urls;
END;
$$;