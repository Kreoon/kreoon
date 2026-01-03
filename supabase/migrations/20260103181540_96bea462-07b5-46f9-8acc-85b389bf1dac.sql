-- Fix invalid enum reference 'published' in triggers/functions on public.content

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
        -- optional: keep a timestamp if you add one later; no-op for now
        NULL;
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

CREATE OR REPLACE FUNCTION public.trigger_emit_up_event_on_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_data jsonb;
BEGIN
  -- Only trigger on actual status changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status AND 
     OLD.custom_status_id IS NOT DISTINCT FROM NEW.custom_status_id THEN
    RETURN NEW;
  END IF;

  event_data := jsonb_build_object(
    'old_status', OLD.status,
    'new_status', NEW.status,
    'old_custom_status_id', OLD.custom_status_id,
    'new_custom_status_id', NEW.custom_status_id,
    'title', NEW.title,
    'client_id', NEW.client_id
  );

  -- Emit event for creator on recording completion
  IF NEW.status = 'recorded' AND OLD.status != 'recorded' AND NEW.creator_id IS NOT NULL THEN
    PERFORM public.emit_up_event('content_recorded', NEW.creator_id, NEW.id, event_data);
  END IF;

  -- Emit event for editor on editing completion
  IF NEW.status = 'review' AND OLD.status = 'editing' AND NEW.editor_id IS NOT NULL THEN
    PERFORM public.emit_up_event('content_edited', NEW.editor_id, NEW.id, event_data);
  END IF;

  -- Emit event for delivery
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    IF NEW.editor_id IS NOT NULL THEN
      PERFORM public.emit_up_event('content_delivered', NEW.editor_id, NEW.id, event_data);
    END IF;
  END IF;

  -- Emit event for approval
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NEW.editor_id IS NOT NULL THEN
      PERFORM public.emit_up_event('content_approved', NEW.editor_id, NEW.id, event_data);
    END IF;
    IF NEW.creator_id IS NOT NULL THEN
      PERFORM public.emit_up_event('content_approved', NEW.creator_id, NEW.id, event_data);
    END IF;
  END IF;

  -- Emit event for corrections (issue status)
  IF NEW.status = 'issue' AND OLD.status = 'review' THEN
    IF NEW.editor_id IS NOT NULL THEN
      PERFORM public.emit_up_event('correction_requested', NEW.editor_id, NEW.id, event_data);
    END IF;
  END IF;

  -- Emit deadline missed event
  IF NEW.deadline IS NOT NULL AND NEW.deadline < now() AND 
     (OLD.deadline IS NULL OR OLD.deadline >= now()) THEN
    IF NEW.editor_id IS NOT NULL AND NEW.status NOT IN ('delivered', 'approved', 'paid') THEN
      PERFORM public.emit_up_event('deadline_missed', NEW.editor_id, NEW.id, event_data);
    END IF;
    IF NEW.creator_id IS NOT NULL AND NEW.status NOT IN ('recorded', 'editing', 'review', 'delivered', 'approved', 'paid') THEN
      PERFORM public.emit_up_event('deadline_missed', NEW.creator_id, NEW.id, event_data);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;