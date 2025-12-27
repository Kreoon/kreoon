-- Add status change timestamps to content table
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS draft_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS script_pending_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS script_approved_at_v2 TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recording_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS editing_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS review_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS issue_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_at_v2 TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paid_at_v2 TIMESTAMP WITH TIME ZONE;

-- Create a function to automatically track status change timestamps
CREATE OR REPLACE FUNCTION public.track_content_status_change()
RETURNS TRIGGER AS $$
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
      WHEN 'approved' THEN 
        NEW.approved_at_v2 := COALESCE(NEW.approved_at_v2, now());
      WHEN 'delivered' THEN 
        NEW.delivered_at := COALESCE(NEW.delivered_at, now());
      WHEN 'published' THEN 
        NEW.published_at := COALESCE(NEW.published_at, now());
      WHEN 'paid' THEN 
        NEW.paid_at_v2 := COALESCE(NEW.paid_at_v2, now());
      ELSE
        NULL;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for status tracking
DROP TRIGGER IF EXISTS trigger_track_status_change ON public.content;
CREATE TRIGGER trigger_track_status_change
  BEFORE UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.track_content_status_change();

-- Set initial draft_at for new content
CREATE OR REPLACE FUNCTION public.set_initial_draft_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.draft_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_set_initial_draft ON public.content;
CREATE TRIGGER trigger_set_initial_draft
  BEFORE INSERT ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.set_initial_draft_timestamp();