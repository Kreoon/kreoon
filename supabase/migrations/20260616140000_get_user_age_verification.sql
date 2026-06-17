-- ============================================================================
-- RPC get_user_age_verification — lectura admin-safe de la verificacion de edad
-- ============================================================================
-- age_verifications tiene RLS que solo permite al propio usuario ver su fila.
-- Esta funcion (SECURITY DEFINER) permite a un admin (o al propio usuario) leer
-- la verificacion de edad de un usuario, para incluirla en el expediente legal.
-- Mismo patron de autorizacion que get_user_consents / get_user_signatures.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_age_verification(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_result jsonb;
BEGIN
  SELECT (
    is_platform_admin = true
    OR id = p_user_id
    OR email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com')
  )
  INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'declared_age_18_plus', declared_age_18_plus,
        'declared_at', declared_at,
        'ip_address', ip_address,
        'user_agent', user_agent,
        'verification_method', verification_method,
        'verification_status', verification_status,
        'verified_at', verified_at
      ) ORDER BY declared_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM age_verifications
  WHERE user_id = p_user_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_age_verification(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_user_age_verification(uuid) IS 'Devuelve la verificacion de edad de un usuario (admin o el propio usuario).';
