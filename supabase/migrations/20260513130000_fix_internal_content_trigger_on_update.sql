-- =====================================================
-- Fix: validate_internal_org_content trigger
-- Antes: validaba embajador en CUALQUIER UPDATE
-- Ahora: solo valida cuando el campo cambia (asignación nueva)
-- Esto previene 400 al desasignar talento de contenido interno
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_internal_org_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_is_internal_brand BOOLEAN := FALSE;
  creator_is_ambassador     BOOLEAN := FALSE;
  editor_is_ambassador      BOOLEAN := FALSE;
BEGIN
  -- Check if client is internal brand
  IF NEW.client_id IS NOT NULL THEN
    SELECT is_internal_brand INTO client_is_internal_brand
    FROM public.clients
    WHERE id = NEW.client_id;
  END IF;

  IF client_is_internal_brand = TRUE THEN

    -- Validate creator ambassador only when the assignment is NEW or CHANGED
    IF NEW.creator_id IS NOT NULL
       AND (TG_OP = 'INSERT' OR NEW.creator_id IS DISTINCT FROM OLD.creator_id) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.organization_member_badges
        WHERE user_id        = NEW.creator_id
          AND organization_id = NEW.organization_id
          AND badge           = 'ambassador'
          AND is_active       = TRUE
      ) INTO creator_is_ambassador;

      IF NOT creator_is_ambassador THEN
        RAISE EXCEPTION 'Solo usuarios con insignia de Embajador pueden ser asignados como creador en contenido interno de la organización';
      END IF;
    END IF;

    -- Validate editor ambassador only when the assignment is NEW or CHANGED
    IF NEW.editor_id IS NOT NULL
       AND (TG_OP = 'INSERT' OR NEW.editor_id IS DISTINCT FROM OLD.editor_id) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.organization_member_badges
        WHERE user_id        = NEW.editor_id
          AND organization_id = NEW.organization_id
          AND badge           = 'ambassador'
          AND is_active       = TRUE
      ) INTO editor_is_ambassador;

      IF NOT editor_is_ambassador THEN
        RAISE EXCEPTION 'Solo usuarios con insignia de Embajador pueden ser asignados como editor en contenido interno de la organización';
      END IF;
    END IF;

    -- Force internal content values (no monetary payments)
    NEW.creator_payment    := 0;
    NEW.editor_payment     := 0;
    NEW.is_ambassador_content := TRUE;
    NEW.content_type       := 'ambassador_internal';
    NEW.is_paid            := FALSE;
    NEW.reward_type        := 'UP';
    NEW.creator_paid       := FALSE;
    NEW.editor_paid        := FALSE;

  END IF;

  RETURN NEW;
END;
$$;

-- Re-create trigger (same name, just refreshed function body)
DROP TRIGGER IF EXISTS validate_internal_org_content_trigger ON public.content;
CREATE TRIGGER validate_internal_org_content_trigger
  BEFORE INSERT OR UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_internal_org_content();

COMMENT ON FUNCTION public.validate_internal_org_content() IS
  'Valida asignaciones de embajador en contenido interno. Solo verifica cuando el campo creator_id/editor_id realmente cambia, no en updates de otros campos.';
