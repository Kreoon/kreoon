-- ============================================================================
-- Baneo por IP y por dispositivo (cookie) — captura y enforcement
-- ============================================================================
-- Complementa el sistema de baneos:
-- - user_ip_log:     registra las IPs y device_id (cookie) desde las que cada
--                    usuario accede, para poder bloquearlas desde su panel.
-- - blocked_devices: dispositivos (identificador persistente en cookie) bloqueados.
--                    Bloquea aunque la persona cambie de cuenta o de IP.
-- El access-gate consulta is_device_blocked y registra accesos via log_user_ip.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabla: user_ip_log (IPs y dispositivos por usuario)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_ip_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text NOT NULL DEFAULT 'unknown',
  device_id text NOT NULL DEFAULT '',
  user_agent text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 1,
  UNIQUE (user_id, ip_address, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_ip_log_user ON public.user_ip_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ip_log_ip ON public.user_ip_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_ip_log_device ON public.user_ip_log(device_id) WHERE device_id <> '';

-- ----------------------------------------------------------------------------
-- Tabla: blocked_devices (dispositivos/cookies bloqueados)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  reason text,
  blocked_by uuid REFERENCES auth.users(id),
  blocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blocked_devices_device ON public.blocked_devices(device_id) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_ip_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read user_ip_log" ON public.user_ip_log;
CREATE POLICY "Admins read user_ip_log"
ON public.user_ip_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role full access user_ip_log" ON public.user_ip_log;
CREATE POLICY "Service role full access user_ip_log"
ON public.user_ip_log FOR ALL
USING (auth.role() = 'service_role');

ALTER TABLE public.blocked_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage blocked_devices" ON public.blocked_devices;
CREATE POLICY "Admins manage blocked_devices"
ON public.blocked_devices FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role full access blocked_devices" ON public.blocked_devices;
CREATE POLICY "Service role full access blocked_devices"
ON public.blocked_devices FOR ALL
USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
GRANT SELECT ON public.user_ip_log TO authenticated;
GRANT ALL ON public.user_ip_log TO service_role;
GRANT SELECT ON public.blocked_devices TO authenticated;
GRANT ALL ON public.blocked_devices TO service_role;

-- ----------------------------------------------------------------------------
-- Funciones
-- ----------------------------------------------------------------------------

-- TRUE si el dispositivo (cookie) esta bloqueado y vigente
CREATE OR REPLACE FUNCTION public.is_device_blocked(_device_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (_device_id IS NOT NULL AND _device_id <> '') AND EXISTS (
    SELECT 1 FROM public.blocked_devices
    WHERE device_id = _device_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Registra (upsert) el acceso de un usuario desde una IP/dispositivo
CREATE OR REPLACE FUNCTION public.log_user_ip(
  _user_id uuid,
  _ip text,
  _device_id text DEFAULT '',
  _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL OR _ip IS NULL OR _ip = 'unknown' THEN
    RETURN;
  END IF;

  INSERT INTO public.user_ip_log (user_id, ip_address, device_id, user_agent)
  VALUES (_user_id, _ip, COALESCE(_device_id, ''), _user_agent)
  ON CONFLICT (user_id, ip_address, device_id)
  DO UPDATE SET
    last_seen = now(),
    hits = public.user_ip_log.hits + 1,
    user_agent = COALESCE(EXCLUDED.user_agent, public.user_ip_log.user_agent);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_device_blocked(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.log_user_ip(uuid, text, text, text) TO authenticated, anon, service_role;

-- ----------------------------------------------------------------------------
-- Comentarios
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.user_ip_log IS 'IPs y dispositivos (cookie) registrados por usuario, para bloqueo dirigido.';
COMMENT ON TABLE public.blocked_devices IS 'Dispositivos bloqueados por identificador persistente en cookie.';
COMMENT ON FUNCTION public.is_device_blocked(text) IS 'TRUE si el device_id esta en blocked_devices activo y vigente.';
COMMENT ON FUNCTION public.log_user_ip(uuid, text, text, text) IS 'Upsert del acceso de un usuario desde una IP/dispositivo (incrementa hits).';
