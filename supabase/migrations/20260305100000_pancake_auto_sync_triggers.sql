-- ============================================================
-- PANCAKE CRM AUTO-SYNC TRIGGERS
-- Sincronización automática de usuarios hacia Pancake CRM
-- ============================================================

-- Habilitar extensión pg_net para llamadas HTTP asíncronas
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- FUNCIÓN: Llamar a pancake-sync-user de forma asíncrona
-- ============================================================
CREATE OR REPLACE FUNCTION sync_user_to_pancake(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sync_enabled TEXT;
BEGIN
  -- Verificar si la sincronización está habilitada
  SELECT config_value INTO v_sync_enabled
  FROM pancake_integration_config
  WHERE config_key = 'sync_users_enabled';

  IF v_sync_enabled IS NULL OR v_sync_enabled != 'true' THEN
    RETURN; -- Sincronización deshabilitada
  END IF;

  -- Llamar a la edge function de forma asíncrona usando pg_net
  -- Fire-and-forget: no esperamos respuesta para no bloquear la transacción
  -- No requiere autenticación porque verify_jwt = false en la edge function
  PERFORM net.http_post(
    url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/pancake-sync-user',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('user_id', p_user_id)
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log del error pero no falla la transacción principal
    RAISE WARNING 'Error sincronizando usuario % a Pancake: %', p_user_id, SQLERRM;
END;
$$;

-- ============================================================
-- TRIGGER: Sincronizar al crear/actualizar perfil
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_sync_profile_to_pancake()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sincronizar después de INSERT o UPDATE
  -- Usamos un pequeño delay para asegurar que todos los datos relacionados estén listos
  PERFORM pg_sleep(0.5);
  PERFORM sync_user_to_pancake(NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger en profiles (INSERT)
DROP TRIGGER IF EXISTS trg_pancake_sync_profile_insert ON profiles;
CREATE TRIGGER trg_pancake_sync_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_profile_to_pancake();

-- Trigger en profiles (UPDATE) - solo si cambian campos relevantes
DROP TRIGGER IF EXISTS trg_pancake_sync_profile_update ON profiles;
CREATE TRIGGER trg_pancake_sync_profile_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.username IS DISTINCT FROM NEW.username OR
    OLD.country IS DISTINCT FROM NEW.country OR
    OLD.city IS DISTINCT FROM NEW.city OR
    OLD.current_organization_id IS DISTINCT FROM NEW.current_organization_id OR
    OLD.active_brand_id IS DISTINCT FROM NEW.active_brand_id
  )
  EXECUTE FUNCTION trigger_sync_profile_to_pancake();

-- ============================================================
-- TRIGGER: Sincronizar al crear/actualizar creator_profile
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_sync_creator_profile_to_pancake()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM pg_sleep(0.5);
  PERFORM sync_user_to_pancake(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Trigger en creator_profiles (INSERT)
DROP TRIGGER IF EXISTS trg_pancake_sync_creator_insert ON creator_profiles;
CREATE TRIGGER trg_pancake_sync_creator_insert
  AFTER INSERT ON creator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_creator_profile_to_pancake();

-- Trigger en creator_profiles (UPDATE)
DROP TRIGGER IF EXISTS trg_pancake_sync_creator_update ON creator_profiles;
CREATE TRIGGER trg_pancake_sync_creator_update
  AFTER UPDATE ON creator_profiles
  FOR EACH ROW
  WHEN (
    OLD.categories IS DISTINCT FROM NEW.categories OR
    OLD.marketplace_roles IS DISTINCT FROM NEW.marketplace_roles
  )
  EXECUTE FUNCTION trigger_sync_creator_profile_to_pancake();

-- ============================================================
-- TRIGGER: Sincronizar cuando cambia membresía de organización
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_sync_org_member_to_pancake()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Determinar el user_id afectado
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  PERFORM pg_sleep(0.5);
  PERFORM sync_user_to_pancake(v_user_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger en organization_members (INSERT, UPDATE, DELETE)
DROP TRIGGER IF EXISTS trg_pancake_sync_org_member ON organization_members;
CREATE TRIGGER trg_pancake_sync_org_member
  AFTER INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_org_member_to_pancake();

-- ============================================================
-- TRIGGER: Sincronizar cuando cambian roles en organización
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_sync_org_roles_to_pancake()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  PERFORM pg_sleep(0.5);
  PERFORM sync_user_to_pancake(v_user_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger en organization_member_roles (INSERT, UPDATE, DELETE)
DROP TRIGGER IF EXISTS trg_pancake_sync_org_roles ON organization_member_roles;
CREATE TRIGGER trg_pancake_sync_org_roles
  AFTER INSERT OR UPDATE OR DELETE ON organization_member_roles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_org_roles_to_pancake();

-- ============================================================
-- COMENTARIOS
-- ============================================================
COMMENT ON FUNCTION sync_user_to_pancake IS 'Sincroniza un usuario a Pancake CRM de forma asíncrona';
COMMENT ON FUNCTION trigger_sync_profile_to_pancake IS 'Trigger para sincronizar perfil a Pancake';
COMMENT ON FUNCTION trigger_sync_creator_profile_to_pancake IS 'Trigger para sincronizar creator_profile a Pancake';
COMMENT ON FUNCTION trigger_sync_org_member_to_pancake IS 'Trigger para sincronizar cambios de membresía a Pancake';
COMMENT ON FUNCTION trigger_sync_org_roles_to_pancake IS 'Trigger para sincronizar cambios de roles a Pancake';

NOTIFY pgrst, 'reload schema';
