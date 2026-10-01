-- Hotfix de seguridad (subconjunto H1 de 20260930100000_lockdown_membership_paths, que se aplicará completa
-- junto con el frontend del relanzamiento). approve_join_request no validaba quién llamaba y anon tenía EXECUTE:
-- cualquiera podía aprobar solicitudes de ingreso. main no llama a esta función, así que es seguro ya.
-- Idempotente: la Fase 1 completa vuelve a definir lo mismo.

CREATE OR REPLACE FUNCTION public.approve_join_request(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_caller uuid := auth.uid();
  v_is_platform_root boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_request
  FROM organization_join_requests
  WHERE id = request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  v_is_platform_root := public.is_platform_root(v_caller);

  IF NOT (
    v_is_platform_root
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = v_request.organization_id
        AND om.user_id = v_caller
        AND om.deleted_at IS NULL
        AND (om.is_owner OR om.role IN ('admin', 'team_leader'))
    )
  ) THEN
    RAISE EXCEPTION 'forbidden: only organization admins can approve requests';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, is_owner, invited_by)
  VALUES (v_request.organization_id, v_request.user_id, v_request.requested_role, false, v_caller)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  INSERT INTO organization_member_roles (organization_id, user_id, role)
  VALUES (v_request.organization_id, v_request.user_id, v_request.requested_role)
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  UPDATE organization_join_requests
  SET status = 'approved', reviewed_by = v_caller, reviewed_at = NOW(), updated_at = NOW()
  WHERE id = request_id;

  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_join_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated, service_role;
