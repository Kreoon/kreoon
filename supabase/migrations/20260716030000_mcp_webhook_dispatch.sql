-- Fase 2 del roadmap de expansión del MCP: dispatcher de webhooks salientes.
-- mcp_webhooks existía solo como esquema (tabla + RLS), sin lógica de entrega.

-- ============================================================
-- 1. secret_hash → secret (plaintext, necesario para firmar HMAC)
-- ============================================================
-- secret_hash se diseñó como hash one-way (como una API key: se compara,
-- nunca se "usa"). Pero un secreto de HMAC para firmar webhooks necesita
-- recuperarse en texto plano en CADA entrega — no es una credencial que se
-- compara, es una clave que se usa para calcular la firma del payload. Con
-- solo un hash, el dispatcher nunca podría firmar nada. Tabla con 0 filas
-- (sin dispatcher implementado hasta ahora) — renombrar es seguro.
ALTER TABLE public.mcp_webhooks RENAME COLUMN secret_hash TO secret;

COMMENT ON COLUMN public.mcp_webhooks.secret IS
    'Secreto HMAC en texto plano — necesario para firmar cada entrega (no es un hash de comparación como mcp_api_keys.key_hash). Nunca se expone vía SELECT directo de authenticated; solo vía mcp_webhooks_safe (sin esta columna) o service_role (dispatcher).';

-- ============================================================
-- 2. Cerrar la sobre-exposición: nadie debe poder leer `secret` en texto
--    plano vía una query normal. La policy SELECT original permitía al
--    dueño/admin leer la fila completa (incluida `secret`, cuando era hash
--    no importaba — ahora sí importa).
-- ============================================================
DROP POLICY IF EXISTS "mcp_webhooks_select" ON public.mcp_webhooks;

CREATE POLICY "mcp_webhooks_select_none" ON public.mcp_webhooks
    FOR SELECT USING (false);
    -- Nadie lee la tabla base directo (rol authenticated). Lectura de datos
    -- no sensibles vía la vista mcp_webhooks_safe (abajo). El dispatcher y
    -- las tools del MCP usan service_role, que ignora RLS.

CREATE OR REPLACE VIEW public.mcp_webhooks_safe
WITH (security_invoker = true) AS
SELECT id, user_id, organization_id, name, url, events, is_active,
       delivery_failures, last_delivered_at, last_failure_at, last_failure_reason,
       created_at, updated_at
FROM public.mcp_webhooks
WHERE user_id = auth.uid()
   OR EXISTS (
     SELECT 1 FROM public.organization_members om
     WHERE om.user_id = auth.uid()
       AND om.organization_id = mcp_webhooks.organization_id
       AND (om.role = 'admin' OR om.is_owner = true)
       AND om.deleted_at IS NULL
   );

GRANT SELECT ON public.mcp_webhooks_safe TO authenticated;

COMMENT ON VIEW public.mcp_webhooks_safe IS
    'Lectura segura de mcp_webhooks para el rol authenticated — nunca expone la columna secret. Mismo criterio de ownership que la policy SELECT original (dueño u owner/admin de la org).';
