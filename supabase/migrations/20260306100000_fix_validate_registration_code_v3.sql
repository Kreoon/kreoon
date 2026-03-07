-- Fix: Recrear funciones de validación de registro

-- Eliminar funciones existentes
DROP FUNCTION IF EXISTS public.check_registration_rate_limit(TEXT, UUID);
DROP FUNCTION IF EXISTS public.validate_registration_code(TEXT, TEXT, TEXT);

-- Crear tabla de intentos de registro si no existe
CREATE TABLE IF NOT EXISTS public.registration_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  attempted_code TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para rate limiting
CREATE INDEX IF NOT EXISTS idx_registration_attempts_rate_limit
ON public.registration_attempts(ip_address, organization_id, created_at);

-- Función auxiliar para rate limiting
CREATE OR REPLACE FUNCTION public.check_registration_rate_limit(p_ip TEXT, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts INT;
BEGIN
  SELECT COUNT(*) INTO failed_attempts
  FROM public.registration_attempts
  WHERE ip_address = p_ip
    AND organization_id = p_org_id
    AND success = false
    AND created_at > now() - interval '1 hour';

  RETURN failed_attempts < 10;
END;
$$;

-- Función principal para validar código de registro
CREATE OR REPLACE FUNCTION public.validate_registration_code(org_slug TEXT, code TEXT, ip TEXT DEFAULT 'unknown')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_record RECORD;
BEGIN
  SELECT * INTO org_record
  FROM public.organizations
  WHERE slug = org_slug;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Organización no encontrada');
  END IF;

  IF NOT COALESCE(org_record.is_registration_open, false) THEN
    RETURN jsonb_build_object('valid', false, 'message', 'El registro no está habilitado para esta organización');
  END IF;

  IF ip NOT IN ('client', 'unknown') THEN
    IF NOT check_registration_rate_limit(ip, org_record.id) THEN
      RETURN jsonb_build_object('valid', false, 'message', 'Demasiados intentos. Intenta más tarde.');
    END IF;
  END IF;

  IF COALESCE(org_record.registration_require_invite, true) THEN
    IF org_record.registration_code IS NULL OR upper(org_record.registration_code) != upper(code) THEN
      INSERT INTO public.registration_attempts (ip_address, organization_id, attempted_code, success)
      VALUES (COALESCE(NULLIF(ip, 'client'), 'unknown'), org_record.id, code, false);

      RETURN jsonb_build_object('valid', false, 'message', 'Código inválido o expirado');
    END IF;
  END IF;

  INSERT INTO public.registration_attempts (ip_address, organization_id, attempted_code, success)
  VALUES (COALESCE(NULLIF(ip, 'client'), 'unknown'), org_record.id, code, true);

  RETURN jsonb_build_object(
    'valid', true,
    'organization_id', org_record.id,
    'organization_name', org_record.name,
    'default_role', COALESCE(org_record.default_role, 'creator'),
    'page_config', COALESCE(org_record.registration_page_config, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_registration_rate_limit(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_registration_rate_limit(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_registration_code(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_registration_code(TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
