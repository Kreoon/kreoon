-- FASE 0 · Fix 1: cerrar escalada a admin en perfil y onboarding
--
-- Hallazgo (docs/AUDITORIA-MODULOS-2026-07-04.md §5): la policy UPDATE de
-- profiles ("Users can update own profile", baseline.sql:200) es
-- FOR UPDATE USING(id=auth.uid()) sin restricción de columnas. Cualquier
-- usuario autenticado puede hacer PATCH directo a /profiles?id=eq.<self>
-- con { active_role: 'admin' }. complete_onboarding() confiaba en ese
-- active_role y lo reenviaba a register_user_to_organization(), que
-- inserta el rol directo en organization_member_roles (SECURITY DEFINER,
-- row_security=off). Resultado: talento auto-escalado a admin de la org.
--
-- Fix (aditivo, en capas):
--   1. WITH CHECK explícito en la policy UPDATE (documenta la invariante;
--      el USING ya la implica, pero la hacemos explícita).
--   2. Trigger BEFORE UPDATE que bloquea cambios directos a columnas de
--      privilegio (email, is_superadmin siempre; active_role solo cuando
--      el valor destino no es un rol que el usuario ya posee). El trigger
--      NO es SECURITY DEFINER, así que current_user refleja el rol Postgres
--      real bajo el que corre el UPDATE: 'authenticated' para un PATCH
--      directo de PostgREST (se guarda), o el dueño de la función para
--      llamadas SECURITY DEFINER de confianza (register_user_to_organization,
--      handle_new_user), o 'service_role' para admin-users (se deja pasar).
--      Esto NO rompe el selector de rol activo existente (useAuth.tsx
--      setActiveRole), que solo permite cambiar entre roles que el usuario
--      YA tiene.
--   3. complete_onboarding: guardia auth.uid() = p_user_id, y deja de usar
--      profiles.active_role como fuente del rol otorgado en la org (deriva
--      siempre de user_type, con 'content_creator' como fallback seguro).

-- ============================================================
-- 1. Policy UPDATE con WITH CHECK explícito
-- ============================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 2. Helper (SECURITY DEFINER, solo lectura) + trigger de guardia
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_holds_role(p_user_id uuid, p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.organization_member_roles WHERE user_id = p_user_id AND role::text = p_role)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role::text = p_role);
$$;

GRANT EXECUTE ON FUNCTION public.user_holds_role(uuid, text) TO authenticated;

-- Nota: esta función de trigger deliberadamente NO es SECURITY DEFINER,
-- para que current_user refleje el rol Postgres real del llamador.
CREATE OR REPLACE FUNCTION public.trg_guard_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Solo se aplica cuando el UPDATE llega como el rol 'authenticated' de
  -- PostgREST (un PATCH directo del cliente). Cualquier otro current_user
  -- (dueño de una función SECURITY DEFINER de confianza, service_role,
  -- postgres) se deja pasar.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'forbidden: cannot modify profiles.email directly';
  END IF;

  IF NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin THEN
    RAISE EXCEPTION 'forbidden: cannot modify profiles.is_superadmin directly';
  END IF;

  IF NEW.active_role IS DISTINCT FROM OLD.active_role THEN
    IF NOT public.user_holds_role(NEW.id, NEW.active_role) THEN
      RAISE EXCEPTION 'forbidden: cannot set active_role to a role you do not hold (%)', NEW.active_role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_privileged ON public.profiles;
CREATE TRIGGER trg_profiles_guard_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_guard_profile_privileged_columns();

-- ============================================================
-- 3. complete_onboarding: validar auth.uid() y dejar de confiar en
--    profiles.active_role como fuente del rol otorgado
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_onboarding(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists  BOOLEAN;
  v_pending_count   INT := 0;
  v_user_type       TEXT;
  v_org_id          UUID;
  v_valid_role      public.app_role;
BEGIN
  -- Guardia: nadie completa el onboarding de otro usuario.
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden: cannot complete onboarding for another user';
  END IF;

  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE WARNING 'complete_onboarding: perfil no existe para %', p_user_id;
    RETURN false;
  END IF;

  BEGIN
    SELECT COUNT(*) INTO v_pending_count
    FROM get_pending_consents(p_user_id)
    WHERE is_required = true;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'complete_onboarding: error get_pending_consents: %', SQLERRM;
    v_pending_count := 0;
  END;

  IF v_pending_count > 0 THEN
    RAISE WARNING 'complete_onboarding: % docs pendientes (continuando igual)', v_pending_count;
  END IF;

  UPDATE profiles SET
    profile_completed           = true,
    profile_completed_at        = COALESCE(profile_completed_at, NOW()),
    legal_consents_completed    = true,
    legal_consents_completed_at = COALESCE(legal_consents_completed_at, NOW()),
    onboarding_completed        = true,
    onboarding_completed_at     = NOW(),
    platform_access_unlocked    = true,
    updated_at                  = NOW()
  WHERE id = p_user_id
  RETURNING user_type INTO v_user_type;

  IF NOT FOUND THEN
    RAISE WARNING 'complete_onboarding: UPDATE no afectó filas para %', p_user_id;
    RETURN false;
  END IF;

  SELECT current_organization_id INTO v_org_id
  FROM profiles WHERE id = p_user_id;

  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;

    IF v_org_id IS NOT NULL THEN
      -- El rol otorgado se deriva SIEMPRE de user_type, nunca de
      -- profiles.active_role (columna escribible por el cliente).
      v_valid_role := CASE WHEN v_user_type = 'client' THEN 'client'::public.app_role
                           ELSE 'content_creator'::public.app_role END;

      PERFORM register_user_to_organization(v_org_id, p_user_id, v_valid_role::TEXT);

      RAISE NOTICE 'complete_onboarding: user % (%) registrado en org % con rol %',
        p_user_id, v_user_type, v_org_id, v_valid_role;
    ELSE
      RAISE WARNING 'complete_onboarding: no se encontró organización principal para %', p_user_id;
    END IF;
  END IF;

  RAISE NOTICE 'complete_onboarding: ÉXITO para % (tipo: %)', p_user_id, v_user_type;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_onboarding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_onboarding(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
