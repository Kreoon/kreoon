-- Checklist salida a produccion, seccion 3 (QA logica onboarding): al
-- verificar de punta a punta el fix de FASE0 (20260704000000_fix_profile_
-- privilege_escalation.sql) se encontro que ese fix cerro el bypass via
-- PATCH directo a profiles.active_role, pero NO el hueco real detras del
-- hallazgo original (auditoria §5, "talento auto-escalado a admin"):
-- register_user_to_organization() en si.
--
-- register_user_to_organization es SECURITY DEFINER, row_security=off,
-- y estaba GRANTed a PUBLIC (confirmado en vivo via information_schema.
-- role_routine_grants: PUBLIC tenia EXECUTE, ademas de anon/authenticated
-- explicitos en el baseline). No valida auth.uid() en absoluto. Recibe
-- p_organization_id, p_user_id y p_role como parametros libres y:
--   1. Inserta en organization_members y organization_member_roles con
--      ese rol exacto.
--   2. Hace UPDATE profiles SET active_role = p_role (bypasea totalmente
--      el trigger trg_profiles_guard_privileged de la migracion anterior,
--      porque corre con current_user = dueño de la funcion, no
--      'authenticated' -- eso es intencional para llamadas de confianza,
--      pero esta funcion nunca debio ser una llamada "de confianza" sin
--      verificar identidad primero).
--
-- Resultado: CUALQUIERA (incluso sin sesion, via anon key) podia llamar
-- supabase.rpc('register_user_to_organization', {p_organization_id: '<org
-- cualquiera>', p_user_id: '<cualquier uuid>', p_role: 'admin'}) directo
-- desde el navegador y quedar admin de esa organizacion -- sin pasar por
-- ningun flujo de frontend. Los 4 call sites legitimos en src/
-- (useRegistrationSubmitV2.ts x3, OrgRegister.tsx) siempre pasan
-- p_user_id = el propio usuario recien autenticado y p_role de un set fijo
-- (client/creator), nunca 'admin' -- pero eso es una restriccion del
-- frontend, no de la funcion.
--
-- Fix (aditivo, no rompe los 4 call sites legitimos, todos ya cumplen
-- ambas condiciones):
--   1. auth.uid() = p_user_id obligatorio -- nadie registra/asigna rol a
--      otro usuario. Confirmado sin callers desde edge functions con
--      service_role (que tendrian auth.uid() NULL), asi que no rompe nada.
--   2. p_role = 'admin' bloqueado explicitamente -- el auto-registro nunca
--      debe poder otorgar admin. Otorgar admin a otro usuario sigue
--      disponible via admin-users (accion assign_to_org/set_active_role),
--      que ya valida isPlatformAdmin/isRootUser del caller.
--   3. REVOKE de PUBLIC y anon -- solo authenticated (y service_role por
--      si a futuro se necesita) puede ejecutarla.

CREATE OR REPLACE FUNCTION public.register_user_to_organization(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text DEFAULT 'creator'::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
  v_role public.app_role;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden: cannot register another user';
  END IF;

  IF p_role = 'admin' THEN
    RAISE EXCEPTION 'forbidden: cannot self-register as admin';
  END IF;

  -- Validate role
  BEGIN
    v_role := p_role::public.app_role;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'INVALID_ROLE: %', p_role;
  END;

  -- Insert into organization_members
  INSERT INTO public.organization_members (organization_id, user_id, role, is_owner)
  VALUES (p_organization_id, p_user_id, v_role, false)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- Insert into organization_member_roles
  INSERT INTO public.organization_member_roles (organization_id, user_id, role)
  VALUES (p_organization_id, p_user_id, v_role)
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  -- Update profile with ACTIVE status AND active_role for immediate access
  UPDATE public.profiles
  SET current_organization_id = p_organization_id,
      organization_status = 'active',
      active_role = p_role,
      is_active = true
  WHERE id = p_user_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'REGISTER_USER_TO_ORG_FAILED: %', SQLERRM;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.register_user_to_organization(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_user_to_organization(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_user_to_organization(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_user_to_organization(uuid, uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';
