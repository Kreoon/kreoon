-- Aumentar límites de rate limiting para registro abierto de freelancers
-- El límite anterior de 5 intentos por hora era muy restrictivo

-- 1. Actualizar función de rate limit para registro (de 5 a 100 por hora)
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

  -- Return false if more than 100 failed attempts (antes era 5)
  RETURN failed_attempts < 100;
END;
$$;

-- 2. Actualizar función genérica de rate limit (aumentar límites)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier TEXT,
  _identifier_type TEXT,
  _action_type TEXT,
  _max_attempts INT DEFAULT 100,  -- Aumentado de 10 a 100
  _window_minutes INT DEFAULT 60,
  _block_minutes INT DEFAULT 5    -- Reducido de 15 a 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_record rate_limits%ROWTYPE;
  is_blocked BOOLEAN := false;
  remaining_attempts INT := _max_attempts;
  block_remaining_seconds INT := 0;
BEGIN
  -- Get or create rate limit record
  INSERT INTO public.rate_limits (identifier, identifier_type, action_type)
  VALUES (_identifier, _identifier_type, _action_type)
  ON CONFLICT (identifier, identifier_type, action_type)
  DO UPDATE SET
    attempts = CASE
      WHEN rate_limits.first_attempt_at < now() - (_window_minutes || ' minutes')::interval
      THEN 1
      ELSE rate_limits.attempts + 1
    END,
    first_attempt_at = CASE
      WHEN rate_limits.first_attempt_at < now() - (_window_minutes || ' minutes')::interval
      THEN now()
      ELSE rate_limits.first_attempt_at
    END,
    last_attempt_at = now(),
    blocked_until = CASE
      WHEN rate_limits.attempts >= _max_attempts - 1
        AND rate_limits.first_attempt_at >= now() - (_window_minutes || ' minutes')::interval
      THEN now() + (_block_minutes || ' minutes')::interval
      ELSE rate_limits.blocked_until
    END
  RETURNING * INTO current_record;

  -- Check if currently blocked
  IF current_record.blocked_until IS NOT NULL AND current_record.blocked_until > now() THEN
    is_blocked := true;
    block_remaining_seconds := EXTRACT(EPOCH FROM (current_record.blocked_until - now()))::INT;
  END IF;

  remaining_attempts := GREATEST(0, _max_attempts - current_record.attempts);

  RETURN jsonb_build_object(
    'allowed', NOT is_blocked AND remaining_attempts > 0,
    'attempts', current_record.attempts,
    'remaining_attempts', remaining_attempts,
    'is_blocked', is_blocked,
    'block_remaining_seconds', block_remaining_seconds
  );
END;
$$;

-- 3. Limpiar registros de rate limit antiguos (más de 24 horas)
DELETE FROM public.rate_limits WHERE last_attempt_at < now() - interval '24 hours';
DELETE FROM public.registration_attempts WHERE created_at < now() - interval '24 hours';

-- 4. Comentario explicativo
COMMENT ON FUNCTION public.check_registration_rate_limit IS
  'Rate limit para registros: 100 intentos fallidos por hora por IP (aumentado para producción)';
