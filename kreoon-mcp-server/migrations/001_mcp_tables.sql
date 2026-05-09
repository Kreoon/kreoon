-- MCP Infrastructure — Kreoon
-- Tablas para API keys, audit logs y webhooks del MCP Server
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- ───────────────────────────────────────────────────────────────────────────
-- 1. mcp_api_keys
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mcp_api_keys (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  key_hash            TEXT NOT NULL UNIQUE,
  key_prefix          TEXT NOT NULL,
  scopes              TEXT[] NOT NULL DEFAULT '{}',
  creator_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 100,
  is_revoked          BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_hash   ON public.mcp_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_org    ON public.mcp_api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_active ON public.mcp_api_keys(is_revoked, expires_at)
  WHERE is_revoked = FALSE;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. mcp_audit_logs
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mcp_audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id           UUID REFERENCES public.mcp_api_keys(id) ON DELETE SET NULL,
  organization_id  UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  action           TEXT NOT NULL,
  resource_type    TEXT,
  resource_id      TEXT,
  ip_address       INET,
  user_agent       TEXT,
  request_payload  JSONB,
  response_status  INTEGER NOT NULL,
  response_time_ms INTEGER,
  ai_tokens_used   INTEGER DEFAULT 0,
  error_code       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_audit_key    ON public.mcp_audit_logs(key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_org    ON public.mcp_audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_action ON public.mcp_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_errors ON public.mcp_audit_logs(response_status)
  WHERE response_status >= 400;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. mcp_webhooks
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mcp_webhooks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  url                  TEXT NOT NULL CHECK (url LIKE 'https://%'),
  events               TEXT[] NOT NULL DEFAULT '{}',
  secret_hash          TEXT NOT NULL,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_failures    INTEGER NOT NULL DEFAULT 0,
  last_delivered_at    TIMESTAMPTZ,
  last_failure_at      TIMESTAMPTZ,
  last_failure_reason  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT max_events CHECK (cardinality(events) <= 20)
);

CREATE INDEX IF NOT EXISTS idx_mcp_webhooks_org    ON public.mcp_webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_mcp_webhooks_active ON public.mcp_webhooks(is_active)
  WHERE is_active = TRUE;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. RLS
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.mcp_api_keys   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_webhooks   ENABLE ROW LEVEL SECURITY;

-- API Keys: creator ve las suyas; admin ve todas de su org
CREATE POLICY "mcp_keys_select" ON public.mcp_api_keys FOR SELECT
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND organization_id = mcp_api_keys.organization_id
        AND role = 'admin'
    )
  );

CREATE POLICY "mcp_keys_insert" ON public.mcp_api_keys FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "mcp_keys_update" ON public.mcp_api_keys FOR UPDATE
  USING (creator_id = auth.uid());

-- Audit logs: solo admin puede leer; inserts via service_role (sin policy)
CREATE POLICY "mcp_audit_select" ON public.mcp_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND organization_id = mcp_audit_logs.organization_id
        AND role = 'admin'
    )
  );

-- Webhooks: dueño gestiona los suyos; admin ve todos de la org
CREATE POLICY "mcp_webhooks_select" ON public.mcp_webhooks FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND organization_id = mcp_webhooks.organization_id
        AND role = 'admin'
    )
  );

CREATE POLICY "mcp_webhooks_insert" ON public.mcp_webhooks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mcp_webhooks_update" ON public.mcp_webhooks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "mcp_webhooks_delete" ON public.mcp_webhooks FOR DELETE
  USING (user_id = auth.uid());

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Triggers updated_at
-- ───────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_mcp_keys_updated_at'
  ) THEN
    CREATE TRIGGER set_mcp_keys_updated_at
      BEFORE UPDATE ON public.mcp_api_keys
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_mcp_webhooks_updated_at'
  ) THEN
    CREATE TRIGGER set_mcp_webhooks_updated_at
      BEFORE UPDATE ON public.mcp_webhooks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Función helper: validar key y retornar contexto
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mcp_validate_api_key(
  p_key_hash TEXT,
  p_required_scope TEXT DEFAULT NULL
)
RETURNS TABLE (
  key_id          UUID,
  organization_id UUID,
  creator_id      UUID,
  scopes          TEXT[],
  rate_limit_per_hour INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
    SELECT k.id, k.organization_id, k.creator_id, k.scopes, k.rate_limit_per_hour
    FROM public.mcp_api_keys k
    WHERE k.key_hash = p_key_hash
      AND k.is_revoked = FALSE
      AND k.expires_at > NOW()
      AND (p_required_scope IS NULL OR p_required_scope = ANY(k.scopes));

  UPDATE public.mcp_api_keys
    SET last_used_at = NOW()
    WHERE key_hash = p_key_hash;
END;
$$;
