-- Add corrected_at column for tracking when content is corrected
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMP WITH TIME ZONE;

-- Update tracking function to set corrected_at timestamp
CREATE OR REPLACE FUNCTION public.track_content_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only track when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Set timestamp based on new status
    CASE NEW.status
      WHEN 'draft' THEN 
        NEW.draft_at := COALESCE(NEW.draft_at, now());
      WHEN 'script_pending' THEN 
        NEW.script_pending_at := COALESCE(NEW.script_pending_at, now());
      WHEN 'script_approved' THEN 
        NEW.script_approved_at_v2 := COALESCE(NEW.script_approved_at_v2, now());
      WHEN 'assigned' THEN 
        NEW.assigned_at := COALESCE(NEW.assigned_at, now());
      WHEN 'recording' THEN 
        NEW.recording_at := COALESCE(NEW.recording_at, now());
      WHEN 'recorded' THEN 
        NEW.recorded_at := COALESCE(NEW.recorded_at, now());
      WHEN 'editing' THEN 
        NEW.editing_at := COALESCE(NEW.editing_at, now());
      WHEN 'review' THEN 
        NEW.review_at := COALESCE(NEW.review_at, now());
      WHEN 'issue' THEN 
        NEW.issue_at := COALESCE(NEW.issue_at, now());
      WHEN 'corrected' THEN
        NEW.corrected_at := COALESCE(NEW.corrected_at, now());
      WHEN 'approved' THEN 
        NEW.approved_at_v2 := COALESCE(NEW.approved_at_v2, now());
      WHEN 'delivered' THEN 
        NEW.delivered_at := COALESCE(NEW.delivered_at, now());
      WHEN 'paid' THEN 
        NEW.paid_at_v2 := COALESCE(NEW.paid_at_v2, now());
      ELSE
        NULL;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update marketing available content view to include corrected status
DROP VIEW IF EXISTS public.marketing_available_content;
CREATE OR REPLACE VIEW public.marketing_available_content AS
SELECT 
  c.id,
  c.title,
  c.status,
  c.video_url,
  c.video_urls,
  c.thumbnail_url,
  c.bunny_embed_url,
  c.views_count,
  c.likes_count,
  c.is_published,
  c.content_type,
  c.client_id,
  cl.name AS client_name,
  cl.logo_url AS client_logo,
  c.organization_id,
  c.creator_id,
  c.created_at
FROM public.content c
LEFT JOIN public.clients cl ON c.client_id = cl.id
WHERE c.status IN ('approved', 'paid', 'delivered', 'corrected')
  AND c.video_url IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON public.marketing_available_content TO authenticated;