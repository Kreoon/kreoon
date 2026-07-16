-- MCP: OAuth DCR (dynamic client registration), one-time auth codes, y rate-limit atómico.
-- Contexto: el MCP autorizaba scopes fijos elegidos al crear la key (client/talent/organization),
-- desacoplados del rol real del usuario. Este cambio soporta el nuevo modelo rol-aware:
-- scopes derivados de organization_members.role en cada request (ver kreoon-mcp-server/src/permissions.ts).

-- ============================================================
-- 1. mcp_oauth_clients — registro dinámico de clientes OAuth (RFC 7591)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mcp_oauth_clients (
    client_id TEXT PRIMARY KEY,
    client_name TEXT,
    redirect_uris TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.mcp_oauth_clients ENABLE ROW LEVEL SECURITY;
-- Sin policies de usuario: esta tabla la gestiona únicamente el service_role del MCP server.

-- ============================================================
-- 2. mcp_oauth_codes — códigos de autorización de un solo uso
-- ============================================================
-- El "code" del flujo OAuth ya NO es la api key en texto plano (evita que viaje
-- por query params / historial / Referer). Es un valor opaco de corta vida que
-- se canjea una sola vez por el access_token real en /oauth/token.
CREATE TABLE IF NOT EXISTS public.mcp_oauth_codes (
    code TEXT PRIMARY KEY,
    raw_key TEXT NOT NULL,
    client_id TEXT REFERENCES public.mcp_oauth_clients(client_id) ON DELETE SET NULL,
    code_challenge TEXT,              -- PKCE (RFC 7636), NULL si el cliente no lo envía
    code_challenge_method TEXT,       -- 'S256' esperado
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_oauth_codes_expires ON public.mcp_oauth_codes(expires_at);

ALTER TABLE public.mcp_oauth_codes ENABLE ROW LEVEL SECURITY;
-- Sin policies de usuario: solo el service_role del MCP server lee/escribe esta tabla.

-- ============================================================
-- 3. mcp_rate_limit_counters — ventanas de rate limit persistentes
-- ============================================================
-- Reemplaza el Map en memoria de api/index.ts (se perdía en cada cold start
-- de Vercel y no se compartía entre instancias, por lo que el límite real
-- nunca se aplicaba bajo carga concurrente).
CREATE TABLE IF NOT EXISTS public.mcp_rate_limit_counters (
    key_id UUID PRIMARY KEY REFERENCES public.mcp_api_keys(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.mcp_rate_limit_counters ENABLE ROW LEVEL SECURITY;
-- Sin policies de usuario: solo el service_role del MCP server la toca.

-- ============================================================
-- 4. RPC: mcp_check_rate_limit — incremento atómico + ventana de 1 hora
-- ============================================================
CREATE OR REPLACE FUNCTION public.mcp_check_rate_limit(
    p_key_id UUID,
    p_limit_per_hour INTEGER
)
RETURNS TABLE (allowed BOOLEAN, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_count INTEGER;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Insert-or-lock la fila del contador para esta key
    INSERT INTO public.mcp_rate_limit_counters (key_id, window_start, request_count)
    VALUES (p_key_id, v_now, 0)
    ON CONFLICT (key_id) DO NOTHING;

    SELECT window_start, request_count INTO v_window_start, v_count
    FROM public.mcp_rate_limit_counters
    WHERE key_id = p_key_id
    FOR UPDATE;

    -- Ventana expirada: resetear
    IF v_window_start < v_now - INTERVAL '1 hour' THEN
        UPDATE public.mcp_rate_limit_counters
        SET window_start = v_now, request_count = 1
        WHERE key_id = p_key_id;
        RETURN QUERY SELECT TRUE, 0;
        RETURN;
    END IF;

    -- Dentro de la ventana: chequear límite
    IF v_count >= p_limit_per_hour THEN
        RETURN QUERY SELECT FALSE,
            GREATEST(0, EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 hour' - v_now))::INTEGER);
        RETURN;
    END IF;

    UPDATE public.mcp_rate_limit_counters
    SET request_count = request_count + 1
    WHERE key_id = p_key_id;

    RETURN QUERY SELECT TRUE, 0;
END;
$$;

COMMENT ON FUNCTION public.mcp_check_rate_limit IS
    'Rate limit atómico por key_id con ventana deslizante de 1 hora. Reemplaza el Map en memoria del MCP server.';

-- ============================================================
-- 5. Limpieza periódica de códigos OAuth vencidos (mantenimiento manual/cron)
-- ============================================================
CREATE OR REPLACE FUNCTION public.mcp_cleanup_expired_oauth_codes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.mcp_oauth_codes WHERE expires_at < NOW() - INTERVAL '1 day';
$$;
