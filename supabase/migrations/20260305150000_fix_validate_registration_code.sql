-- Fix: Restaurar función validate_registration_code que falta

-- Primero asegurar que las dependencias existen
CREATE OR REPLACE FUNCTION public.check_registration_rate_limit(ip TEXT, org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts INT;
BEGIN
  -- Count failed attempts in last hour
  SELECT COUNT(*) INTO failed_attempts
  FROM public.registration_attempts
  WHERE ip_address = ip
    AND organization_id = org_id
    AND success = false
    AND created_at > now() - interval '1 hour';

  -- Return false if more than 5 failed attempts
  RETURN failed_attempts < 5;
END;
$$;

-- Función principal para validar código de registro
CREATE OR REPLACE FUNCTION public.validate_registration_code(org_slug TEXT, code TEXT, ip TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_record RECORD;
  result JSONB;
BEGIN
  -- Find organization by slug
  SELECT * INTO org_record
  FROM public.organizations
  WHERE slug = org_slug;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'organization_not_found');
  END IF;

  -- Check if registration is enabled
  IF NOT COALESCE(org_record.is_registration_open, false) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'registration_disabled');
  END IF;

  -- Check rate limit
  IF NOT check_registration_rate_limit(ip, org_record.id) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'rate_limited');
  END IF;

  -- Check if invite is required
  IF COALESCE(org_record.registration_require_invite, true) THEN
    -- Validate code
    IF org_record.registration_code IS NULL OR org_record.registration_code != upper(code) THEN
      -- Log failed attempt
      INSERT INTO public.registration_attempts (ip_address, organization_id, attempted_code, success)
      VALUES (ip, org_record.id, code, false);

      RETURN jsonb_build_object('valid', false, 'error', 'invalid_code');
    END IF;
  END IF;

  -- Log successful attempt
  INSERT INTO public.registration_attempts (ip_address, organization_id, attempted_code, success)
  VALUES (ip, org_record.id, code, true);

  RETURN jsonb_build_object(
    'valid', true,
    'organization_id', org_record.id,
    'organization_name', org_record.name,
    'default_role', COALESCE(org_record.default_role, 'creator'),
    'page_config', COALESCE(org_record.registration_page_config, '{}'::jsonb)
  );
END;
$$;

-- Asegurar permisos para llamar la función desde el cliente
GRANT EXECUTE ON FUNCTION public.validate_registration_code(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_registration_code(TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
