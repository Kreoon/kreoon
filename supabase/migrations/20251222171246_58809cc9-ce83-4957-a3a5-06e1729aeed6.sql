-- Trigger to auto-change status to 'script_approved' when script is approved by client
CREATE OR REPLACE FUNCTION public.auto_status_on_script_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When script_approved_at changes from NULL to a value, set status to 'script_approved'
  IF OLD.script_approved_at IS NULL AND NEW.script_approved_at IS NOT NULL THEN
    -- Only change status if it's currently 'draft' or 'script_pending'
    IF NEW.status IN ('draft', 'script_pending') THEN
      NEW.status := 'script_approved';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_status_on_script_approval ON public.content;

-- Create trigger for script approval
CREATE TRIGGER trigger_auto_status_on_script_approval
  BEFORE UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_status_on_script_approval();

-- Trigger to auto-change status to 'assigned' when creator is assigned
CREATE OR REPLACE FUNCTION public.auto_status_on_creator_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- When creator_id changes from NULL to a value, set status to 'assigned'
  IF OLD.creator_id IS NULL AND NEW.creator_id IS NOT NULL THEN
    -- Only change status if it's currently 'draft', 'script_pending', or 'script_approved'
    IF NEW.status IN ('draft', 'script_pending', 'script_approved') THEN
      NEW.status := 'assigned';
      NEW.creator_assigned_at := COALESCE(NEW.creator_assigned_at, now());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_status_on_creator_assignment ON public.content;

-- Create trigger for creator assignment
CREATE TRIGGER trigger_auto_status_on_creator_assignment
  BEFORE UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_status_on_creator_assignment();