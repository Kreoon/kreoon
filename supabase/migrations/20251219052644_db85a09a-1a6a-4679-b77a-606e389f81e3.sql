-- Add editor rating and performance fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS editor_rating numeric DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS editor_completed_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS editor_on_time_count integer DEFAULT 0;

-- Create function to get best available editor based on workload, performance and rating
CREATE OR REPLACE FUNCTION public.get_best_available_editor()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  best_editor_id uuid;
BEGIN
  -- Select editor with:
  -- 1. Lowest current workload (pending editing tasks)
  -- 2. Highest completion rate (on_time_count / completed_count)
  -- 3. Highest rating
  SELECT p.id INTO best_editor_id
  FROM profiles p
  INNER JOIN user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'editor'
  ORDER BY 
    -- First priority: least pending work
    (
      SELECT COUNT(*) 
      FROM content c 
      WHERE c.editor_id = p.id 
      AND c.status IN ('recorded', 'editing', 'review', 'issue')
    ) ASC,
    -- Second priority: best completion rate (avoid division by zero)
    CASE 
      WHEN COALESCE(p.editor_completed_count, 0) = 0 THEN 0.5
      ELSE COALESCE(p.editor_on_time_count, 0)::numeric / p.editor_completed_count
    END DESC,
    -- Third priority: highest rating
    COALESCE(p.editor_rating, 5.0) DESC,
    -- Random tiebreaker
    random()
  LIMIT 1;
  
  RETURN best_editor_id;
END;
$$;

-- Create function to auto-assign editor when content moves to 'recorded'
CREATE OR REPLACE FUNCTION public.auto_assign_editor_on_recorded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  best_editor uuid;
BEGIN
  -- Only trigger when status changes TO 'recorded' and no editor is assigned
  IF NEW.status = 'recorded' AND OLD.status != 'recorded' AND NEW.editor_id IS NULL THEN
    best_editor := public.get_best_available_editor();
    
    IF best_editor IS NOT NULL THEN
      NEW.editor_id := best_editor;
      NEW.editor_assigned_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-assignment
DROP TRIGGER IF EXISTS trigger_auto_assign_editor ON public.content;
CREATE TRIGGER trigger_auto_assign_editor
  BEFORE UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_editor_on_recorded();

-- Create function to update editor stats when content is completed
CREATE OR REPLACE FUNCTION public.update_editor_stats_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When content moves to 'approved' or 'delivered', update editor stats
  IF NEW.status IN ('approved', 'delivered') AND OLD.status NOT IN ('approved', 'delivered', 'paid') AND NEW.editor_id IS NOT NULL THEN
    -- Increment completed count
    UPDATE profiles 
    SET editor_completed_count = COALESCE(editor_completed_count, 0) + 1,
        -- If delivered before deadline, increment on-time count
        editor_on_time_count = CASE 
          WHEN NEW.deadline IS NULL OR now() <= NEW.deadline 
          THEN COALESCE(editor_on_time_count, 0) + 1
          ELSE COALESCE(editor_on_time_count, 0)
        END
    WHERE id = NEW.editor_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for stats update
DROP TRIGGER IF EXISTS trigger_update_editor_stats ON public.content;
CREATE TRIGGER trigger_update_editor_stats
  AFTER UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_editor_stats_on_completion();