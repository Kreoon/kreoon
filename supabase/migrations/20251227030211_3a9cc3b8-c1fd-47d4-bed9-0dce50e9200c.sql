-- Create or replace trigger function to auto-assign editor when creator has both roles
CREATE OR REPLACE FUNCTION public.auto_assign_editor_if_creator_is_editor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_org_id UUID;
  creator_has_editor_role BOOLEAN := false;
BEGIN
  -- Only trigger when creator_id changes from NULL to a value and editor_id is still NULL
  IF NEW.creator_id IS NOT NULL 
     AND (OLD.creator_id IS NULL OR OLD.creator_id != NEW.creator_id) 
     AND NEW.editor_id IS NULL THEN
    
    -- Get organization_id (from content or from client)
    content_org_id := NEW.organization_id;
    
    IF content_org_id IS NULL AND NEW.client_id IS NOT NULL THEN
      SELECT organization_id INTO content_org_id
      FROM clients
      WHERE id = NEW.client_id;
    END IF;
    
    IF content_org_id IS NOT NULL THEN
      -- Check if creator has editor role in this organization
      SELECT EXISTS (
        SELECT 1 
        FROM organization_member_roles
        WHERE organization_id = content_org_id
          AND user_id = NEW.creator_id
          AND role = 'editor'
      ) INTO creator_has_editor_role;
      
      IF creator_has_editor_role THEN
        NEW.editor_id := NEW.creator_id;
        NEW.editor_assigned_at := now();
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on content table (runs before the auto_assign_editor_on_recorded trigger)
DROP TRIGGER IF EXISTS trigger_auto_assign_editor_if_creator ON public.content;
CREATE TRIGGER trigger_auto_assign_editor_if_creator
  BEFORE INSERT OR UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_editor_if_creator_is_editor();