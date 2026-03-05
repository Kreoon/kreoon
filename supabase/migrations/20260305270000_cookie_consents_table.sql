-- =====================================================
-- Tabla para consentimientos de cookies (GDPR)
-- Migration: 20260305270000_cookie_consents_table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_cookie_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL DEFAULT '1.0',

  -- Categorías de cookies
  essential BOOLEAN NOT NULL DEFAULT true,
  analytics BOOLEAN NOT NULL DEFAULT false,
  marketing BOOLEAN NOT NULL DEFAULT false,
  personalization BOOLEAN NOT NULL DEFAULT false,

  -- Datos técnicos para prueba legal
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamps
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un registro por usuario
  CONSTRAINT user_cookie_consents_user_unique UNIQUE (user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cookie_consents_user ON user_cookie_consents(user_id);

-- RLS
ALTER TABLE user_cookie_consents ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver y actualizar su propio consentimiento
CREATE POLICY "users_own_cookie_consent" ON user_cookie_consents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins pueden ver todos los consentimientos
CREATE POLICY "admins_view_cookie_consents" ON user_cookie_consents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_platform_admin = true
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_cookie_consent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cookie_consent_updated ON user_cookie_consents;
CREATE TRIGGER trigger_cookie_consent_updated
  BEFORE UPDATE ON user_cookie_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_cookie_consent_timestamp();

-- Comentarios
COMMENT ON TABLE user_cookie_consents IS 'Consentimientos de cookies por usuario (GDPR compliance)';
COMMENT ON COLUMN user_cookie_consents.essential IS 'Cookies esenciales (siempre true)';
COMMENT ON COLUMN user_cookie_consents.analytics IS 'Cookies de analítica (Google Analytics, etc.)';
COMMENT ON COLUMN user_cookie_consents.marketing IS 'Cookies de marketing (Facebook Pixel, etc.)';
COMMENT ON COLUMN user_cookie_consents.personalization IS 'Cookies de personalización';
