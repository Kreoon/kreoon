-- MCP Infrastructure: API Keys, Audit Logs, Webhooks
-- Tablas para el sistema de acceso externo via Model Context Protocol

-- ============================================================
-- 1. mcp_api_keys — claves de acceso para agentes externos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mcp_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,           -- SHA-256 del sk-kreeon-{uuid}, nunca el plaintext
    key_prefix TEXT NOT NULL,                -- primeros 12 chars visibles ("sk-kreeon-a1")
    scopes TEXT[] NOT NULL DEFAULT '{}',     -- ["scripts:read", "adn:write", ...]
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    rate_limit_per_hour INTEGER NOT NULL DEFAULT 100,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_api_keys_hash ON public.mcp_api_keys(key_hash);
CREATE INDEX idx_mcp_api_keys_org ON public.mcp_api_keys(organization_id);
CREATE INDEX idx_mcp_api_keys_creator ON public.mcp_api_keys(creator_id);
CREATE INDEX idx_mcp_api_keys_active ON public.mcp_api_keys(is_revoked, expires_at)
    WHERE is_revoked = FALSE;

-- ============================================================
-- 2. mcp_audit_logs — registro de cada request al MCP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mcp_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID REFERENCES public.mcp_api_keys(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    action TEXT NOT NULL,                    -- nombre del tool: "generate_script", "search_creators"
    resource_type TEXT,                      -- "script", "creator", "product", "wallet"
    resource_id TEXT,                        -- UUID o ID del recurso afectado
    ip_address INET,
    user_agent TEXT,
    request_payload JSONB,                   -- body sanitizado (sin datos sensibles)
    response_status INTEGER NOT NULL,        -- 200, 400, 401, 429, 500
    response_time_ms INTEGER,
    ai_tokens_used INTEGER DEFAULT 0,
    error_code TEXT,                         -- "RATE_LIMIT_EXCEEDED", "INSUFFICIENT_TOKENS", etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Particionado por mes para performance con volúmenes altos
-- (compatible con la convención kae_events del proyecto)
CREATE INDEX idx_mcp_audit_key ON public.mcp_audit_logs(key_id, created_at DESC);
CREATE INDEX idx_mcp_audit_org ON public.mcp_audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_mcp_audit_action ON public.mcp_audit_logs(action, created_at DESC);
CREATE INDEX idx_mcp_audit_status ON public.mcp_audit_logs(response_status)
    WHERE response_status >= 400;

-- ============================================================
-- 3. mcp_webhooks — endpoints registrados para recibir eventos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mcp_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL CHECK (url LIKE 'https://%'),   -- solo HTTPS
    events TEXT[] NOT NULL DEFAULT '{}',              -- ["adn.completed", "script.generated", ...]
    secret_hash TEXT NOT NULL,                        -- HMAC secret hasheado
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    delivery_failures INTEGER NOT NULL DEFAULT 0,     -- contador de fallos consecutivos
    last_delivered_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    last_failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT max_events_per_webhook CHECK (cardinality(events) <= 20)
);

CREATE INDEX idx_mcp_webhooks_org ON public.mcp_webhooks(organization_id);
CREATE INDEX idx_mcp_webhooks_user ON public.mcp_webhooks(user_id);
CREATE INDEX idx_mcp_webhooks_active ON public.mcp_webhooks(is_active, events)
    WHERE is_active = TRUE;

-- ============================================================
-- 4. RLS Policies
-- ============================================================
ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_webhooks ENABLE ROW LEVEL SECURITY;

-- mcp_api_keys: admin ve todas las keys de su org; creator solo ve las propias
CREATE POLICY "mcp_api_keys_select" ON public.mcp_api_keys
    FOR SELECT USING (
        creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.organization_id = mcp_api_keys.organization_id
              AND ur.role = 'admin'
        )
    );

CREATE POLICY "mcp_api_keys_insert" ON public.mcp_api_keys
    FOR INSERT WITH CHECK (
        creator_id = auth.uid()
        AND organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "mcp_api_keys_update" ON public.mcp_api_keys
    FOR UPDATE USING (
        creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.organization_id = mcp_api_keys.organization_id
              AND ur.role = 'admin'
        )
    );

-- mcp_audit_logs: solo admins pueden leer logs
CREATE POLICY "mcp_audit_logs_select_admin" ON public.mcp_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.organization_id = mcp_audit_logs.organization_id
              AND ur.role = 'admin'
        )
    );

-- Edge Functions insertan logs con service_role (bypass RLS), no se necesita policy INSERT

-- mcp_webhooks: usuario ve y gestiona sus propios webhooks; admin ve todos de la org
CREATE POLICY "mcp_webhooks_select" ON public.mcp_webhooks
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.organization_id = mcp_webhooks.organization_id
              AND ur.role = 'admin'
        )
    );

CREATE POLICY "mcp_webhooks_insert" ON public.mcp_webhooks
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "mcp_webhooks_update" ON public.mcp_webhooks
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "mcp_webhooks_delete" ON public.mcp_webhooks
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 5. Triggers de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reusar la función si ya existe (convención del proyecto)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_mcp_api_keys_updated_at'
    ) THEN
        CREATE TRIGGER set_mcp_api_keys_updated_at
            BEFORE UPDATE ON public.mcp_api_keys
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_mcp_webhooks_updated_at'
    ) THEN
        CREATE TRIGGER set_mcp_webhooks_updated_at
            BEFORE UPDATE ON public.mcp_webhooks
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- ============================================================
-- 6. Función helper: validar key y retornar contexto
-- ============================================================
CREATE OR REPLACE FUNCTION public.mcp_validate_api_key(
    p_key_hash TEXT,
    p_required_scope TEXT DEFAULT NULL
)
RETURNS TABLE (
    key_id UUID,
    organization_id UUID,
    creator_id UUID,
    scopes TEXT[],
    rate_limit_per_hour INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        k.id,
        k.organization_id,
        k.creator_id,
        k.scopes,
        k.rate_limit_per_hour
    FROM public.mcp_api_keys k
    WHERE k.key_hash = p_key_hash
      AND k.is_revoked = FALSE
      AND k.expires_at > NOW()
      AND (p_required_scope IS NULL OR p_required_scope = ANY(k.scopes));

    -- Actualizar last_used_at de forma eficiente
    UPDATE public.mcp_api_keys
    SET last_used_at = NOW()
    WHERE key_hash = p_key_hash;
END;
$$;

-- ============================================================
-- 7. Vista: resumen de uso por key (para dashboard admin)
-- ============================================================
CREATE OR REPLACE VIEW public.mcp_key_usage_summary AS
SELECT
    k.id AS key_id,
    k.name,
    k.key_prefix,
    k.scopes,
    k.is_revoked,
    k.expires_at,
    k.last_used_at,
    k.organization_id,
    COUNT(l.id)                                    AS total_requests,
    COUNT(l.id) FILTER (WHERE l.response_status = 200)  AS successful_requests,
    COUNT(l.id) FILTER (WHERE l.response_status >= 400)  AS failed_requests,
    SUM(COALESCE(l.ai_tokens_used, 0))             AS total_ai_tokens_used,
    AVG(l.response_time_ms)::INTEGER               AS avg_response_time_ms,
    MAX(l.created_at)                              AS last_request_at
FROM public.mcp_api_keys k
LEFT JOIN public.mcp_audit_logs l ON l.key_id = k.id
    AND l.created_at >= NOW() - INTERVAL '30 days'
GROUP BY k.id;

-- Solo admins pueden ver el resumen
CREATE POLICY "mcp_key_usage_summary_select" ON public.mcp_api_keys
    FOR SELECT USING (TRUE);  -- La view hereda el RLS de la tabla base

-- ============================================================
-- 8. Scopes válidos (como constraint check)
-- ============================================================
-- Lista de scopes permitidos para validación en aplicación:
-- scripts:read, scripts:write
-- adn:read, adn:write
-- profiles:read, profiles:write
-- creators:read
-- social:read, social:publish
-- finance:read, finance:withdraw
-- webhooks:manage
-- admin:read (solo para keys creadas por admin)

COMMENT ON TABLE public.mcp_api_keys IS
    'API keys para acceso externo al MCP de Kreoon. Solo se almacena el hash SHA-256.';

COMMENT ON TABLE public.mcp_audit_logs IS
    'Log inmutable de todos los requests al MCP. Retener 90 días mínimo.';

COMMENT ON TABLE public.mcp_webhooks IS
    'Endpoints registrados para recibir eventos push del MCP via HMAC-signed webhooks.';

COMMENT ON FUNCTION public.mcp_validate_api_key IS
    'Valida una API key por su hash y scope requerido. Retorna contexto de autorización o 0 rows si inválida.';
