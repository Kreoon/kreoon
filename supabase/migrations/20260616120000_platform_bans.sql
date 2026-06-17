-- ============================================================================
-- Sistema de Baneos de Plataforma
-- ============================================================================
-- Moderacion a nivel de plataforma (global, solo super-admins/ROOT) con tres
-- vectores: usuario (perfil), direccion IP y email/dominio.
--
-- - user_bans:     metadata/auditoria del baneo de usuario. El bloqueo de login
--                  lo aplica Supabase Auth (banned_until); esta tabla guarda la
--                  razon, quien baneo, expiracion e historial.
-- - blocked_emails: emails o dominios bloqueados para impedir el re-registro.
-- - blocked_ips:   ya existe (baseline). Aqui solo se anade un indice.
--
-- El enforcement de IP/email corre en la edge function publica access-gate,
-- que consume las funciones is_ip_blocked / is_email_blocked / is_user_banned.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabla: user_bans (metadata + historial de baneos de usuario)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,                         -- snapshot del email al momento de banear (auditoria)
  reason text,
  banned_by uuid REFERENCES auth.users(id),
  banned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,             -- NULL = ban permanente
  is_active boolean NOT NULL DEFAULT true,
  unbanned_by uuid REFERENCES auth.users(id),
  unbanned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_bans_user ON public.user_bans(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON public.user_bans(is_active) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- Tabla: blocked_emails (emails y dominios bloqueados para registro)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,              -- email completo (spam@x.com) o dominio (x.com), siempre en minusculas
  pattern_type text NOT NULL DEFAULT 'email' CHECK (pattern_type IN ('email', 'domain')),
  reason text,
  blocked_by uuid REFERENCES auth.users(id),
  blocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,             -- NULL = bloqueo permanente
  is_active boolean NOT NULL DEFAULT true
);

-- Un mismo patron no puede repetirse mientras este activo
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocked_emails_pattern ON public.blocked_emails(lower(pattern)) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- blocked_ips: reusar la tabla existente (baseline). Solo indice de lookup.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active_ip ON public.blocked_ips(ip_address) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- RLS: solo admins gestionan; service_role acceso total
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage user_bans" ON public.user_bans;
CREATE POLICY "Admins manage user_bans"
ON public.user_bans FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role full access user_bans" ON public.user_bans;
CREATE POLICY "Service role full access user_bans"
ON public.user_bans FOR ALL
USING (auth.role() = 'service_role');

ALTER TABLE public.blocked_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage blocked_emails" ON public.blocked_emails;
CREATE POLICY "Admins manage blocked_emails"
ON public.blocked_emails FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role full access blocked_emails" ON public.blocked_emails;
CREATE POLICY "Service role full access blocked_emails"
ON public.blocked_emails FOR ALL
USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
GRANT SELECT ON public.user_bans TO authenticated;
GRANT ALL ON public.user_bans TO service_role;
GRANT SELECT ON public.blocked_emails TO authenticated;
GRANT ALL ON public.blocked_emails TO service_role;

-- ----------------------------------------------------------------------------
-- Funciones de chequeo (SECURITY DEFINER) consumidas por access-gate / admin
-- ----------------------------------------------------------------------------

-- Resuelve si una IP esta bloqueada y vigente
CREATE OR REPLACE FUNCTION public.is_ip_blocked(_ip text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_ips
    WHERE ip_address = _ip
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Resuelve si un email esta bloqueado por coincidencia exacta o por dominio
CREATE OR REPLACE FUNCTION public.is_email_blocked(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_emails
    WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (
        (pattern_type = 'email'  AND lower(_email) = lower(pattern)) OR
        (pattern_type = 'domain' AND lower(split_part(_email, '@', 2)) = lower(pattern))
      )
  );
$$;

-- Estado de baneo de usuario (metadata; el login lo bloquea Supabase Auth)
CREATE OR REPLACE FUNCTION public.is_user_banned(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE user_id = _uid
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_ip_blocked(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_email_blocked(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated, anon, service_role;

-- ----------------------------------------------------------------------------
-- Comentarios
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.user_bans IS 'Metadata e historial de baneos de usuario a nivel de plataforma. El bloqueo de login lo aplica Supabase Auth (banned_until).';
COMMENT ON TABLE public.blocked_emails IS 'Emails y dominios bloqueados para impedir el registro/re-registro.';
COMMENT ON FUNCTION public.is_ip_blocked(text) IS 'TRUE si la IP esta en blocked_ips activa y vigente.';
COMMENT ON FUNCTION public.is_email_blocked(text) IS 'TRUE si el email coincide con un patron de blocked_emails (exacto o por dominio) activo y vigente.';
COMMENT ON FUNCTION public.is_user_banned(uuid) IS 'TRUE si el usuario tiene un baneo activo y vigente en user_bans.';
