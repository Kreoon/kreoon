-- Fix: Solo sincronizar a Pancake cuando el perfil esté completo
-- Evita múltiples sincronizaciones durante el registro paso a paso

-- Actualizar el trigger de INSERT en profiles
-- Solo sincroniza si tiene nombre Y email completos
CREATE OR REPLACE FUNCTION trigger_sync_profile_to_pancake()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo sincronizar si el perfil tiene datos mínimos completos
  -- Nombre y email son requeridos para considerar el perfil "listo"
  IF NEW.full_name IS NOT NULL
     AND NEW.full_name != ''
     AND NEW.email IS NOT NULL
     AND NEW.email != '' THEN

    -- Para INSERT: esperar un poco más para que se completen otros datos
    IF TG_OP = 'INSERT' THEN
      -- No sincronizar en INSERT, esperar al UPDATE con datos completos
      RETURN NEW;
    END IF;

    -- Para UPDATE: sincronizar solo si ya tiene los datos básicos
    PERFORM sync_user_to_pancake(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Nuevo trigger que se activa después de que el registro esté completo
-- Se activa cuando se actualiza el perfil con datos completos
DROP TRIGGER IF EXISTS trg_pancake_sync_profile_insert ON profiles;
DROP TRIGGER IF EXISTS trg_pancake_sync_profile_update ON profiles;

-- Solo trigger en UPDATE (no en INSERT)
CREATE TRIGGER trg_pancake_sync_profile_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    -- Solo si tiene datos mínimos
    NEW.full_name IS NOT NULL AND NEW.full_name != '' AND
    NEW.email IS NOT NULL AND NEW.email != '' AND
    (
      -- Y si cambió algún campo relevante
      OLD.full_name IS DISTINCT FROM NEW.full_name OR
      OLD.email IS DISTINCT FROM NEW.email OR
      OLD.phone IS DISTINCT FROM NEW.phone OR
      OLD.username IS DISTINCT FROM NEW.username OR
      OLD.country IS DISTINCT FROM NEW.country OR
      OLD.city IS DISTINCT FROM NEW.city OR
      OLD.current_organization_id IS DISTINCT FROM NEW.current_organization_id OR
      OLD.active_brand_id IS DISTINCT FROM NEW.active_brand_id
    )
  )
  EXECUTE FUNCTION trigger_sync_profile_to_pancake();

-- Trigger especial para primera sincronización
-- Se activa cuando el perfil pasa de incompleto a completo
CREATE OR REPLACE FUNCTION trigger_sync_profile_first_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Detectar cuando el perfil se "completa" por primera vez
  -- Es decir, cuando pasa de no tener nombre/email a tenerlos
  IF (OLD.full_name IS NULL OR OLD.full_name = '' OR OLD.email IS NULL OR OLD.email = '')
     AND (NEW.full_name IS NOT NULL AND NEW.full_name != '' AND NEW.email IS NOT NULL AND NEW.email != '') THEN

    -- Perfil recién completado, sincronizar
    PERFORM sync_user_to_pancake(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pancake_sync_profile_first_complete
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_profile_first_complete();

-- También actualizar el trigger de creator_profiles para que no se dispare inmediatamente
DROP TRIGGER IF EXISTS trg_pancake_sync_creator_insert ON creator_profiles;
DROP TRIGGER IF EXISTS trg_pancake_sync_creator_update ON creator_profiles;

CREATE OR REPLACE FUNCTION trigger_sync_creator_profile_to_pancake()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_complete BOOLEAN;
BEGIN
  -- Verificar si el perfil base está completo antes de sincronizar
  SELECT (full_name IS NOT NULL AND full_name != '' AND email IS NOT NULL AND email != '')
  INTO v_profile_complete
  FROM profiles
  WHERE id = NEW.user_id;

  -- Solo sincronizar si el perfil base está completo
  IF v_profile_complete THEN
    PERFORM sync_user_to_pancake(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Solo en UPDATE de creator_profiles (no en INSERT)
CREATE TRIGGER trg_pancake_sync_creator_update
  AFTER UPDATE ON creator_profiles
  FOR EACH ROW
  WHEN (
    OLD.categories IS DISTINCT FROM NEW.categories OR
    OLD.marketplace_roles IS DISTINCT FROM NEW.marketplace_roles
  )
  EXECUTE FUNCTION trigger_sync_creator_profile_to_pancake();

NOTIFY pgrst, 'reload schema';
