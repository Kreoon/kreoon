-- Drop existing trigger if exists to replace with new comprehensive one
DROP TRIGGER IF EXISTS validate_internal_org_content_trigger ON public.content;
DROP FUNCTION IF EXISTS public.validate_internal_org_content();

-- Create comprehensive validation function for internal organization content
CREATE OR REPLACE FUNCTION public.validate_internal_org_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_is_internal_brand BOOLEAN := FALSE;
  creator_is_ambassador BOOLEAN := FALSE;
  editor_is_ambassador BOOLEAN := FALSE;
BEGIN
  -- Check if client is internal brand
  IF NEW.client_id IS NOT NULL THEN
    SELECT is_internal_brand INTO client_is_internal_brand
    FROM public.clients
    WHERE id = NEW.client_id;
  END IF;

  -- If this is internal org content
  IF client_is_internal_brand = TRUE THEN
    
    -- Validate creator is ambassador (if assigned)
    IF NEW.creator_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.organization_member_badges
        WHERE user_id = NEW.creator_id
          AND organization_id = NEW.organization_id
          AND badge = 'ambassador'
          AND is_active = TRUE
      ) INTO creator_is_ambassador;
      
      IF NOT creator_is_ambassador THEN
        RAISE EXCEPTION 'Solo usuarios con insignia de Embajador pueden ser asignados como creador en contenido interno de la organización';
      END IF;
    END IF;
    
    -- Validate editor is ambassador (if assigned)
    IF NEW.editor_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.organization_member_badges
        WHERE user_id = NEW.editor_id
          AND organization_id = NEW.organization_id
          AND badge = 'ambassador'
          AND is_active = TRUE
      ) INTO editor_is_ambassador;
      
      IF NOT editor_is_ambassador THEN
        RAISE EXCEPTION 'Solo usuarios con insignia de Embajador pueden ser asignados como editor en contenido interno de la organización';
      END IF;
    END IF;
    
    -- FORCE internal content values - no monetary payments allowed
    NEW.creator_payment := 0;
    NEW.editor_payment := 0;
    NEW.is_ambassador_content := TRUE;
    NEW.content_type := 'ambassador_internal';
    NEW.is_paid := FALSE;
    NEW.reward_type := 'UP';
    NEW.creator_paid := FALSE;
    NEW.editor_paid := FALSE;
    
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER validate_internal_org_content_trigger
  BEFORE INSERT OR UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_internal_org_content();

-- Add helpful comment
COMMENT ON FUNCTION public.validate_internal_org_content() IS 
'Validates internal organization content rules:
1. Only ambassadors can be assigned as creator/editor
2. Payments are forced to 0
3. Content type is auto-marked as ambassador_internal
4. Reward type is forced to UP points';