-- =====================================================
-- get_client_activity_metrics
-- Clasificación automática de clientes: activo / inactivo / prospecto
-- Basado en: paquetes comprados vs contenido aprobado/pagado
-- Incluye todas las fechas relevantes para seguimiento
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_client_activity_metrics(p_org_id uuid)
RETURNS TABLE (
  client_id              uuid,
  client_name            text,
  activity_status        text,         -- 'active' | 'inactive' | 'prospect'
  total_packages         bigint,
  total_content_purchased numeric,     -- SUM(content_quantity) paquetes activos
  total_content_approved  bigint,      -- COUNT content WHERE status IN ('approved','paid')
  pending_content_count   numeric,     -- purchased - approved (mín 0)
  -- Fechas de incorporación
  joined_at              timestamptz,  -- clients.created_at
  -- Fechas de paquetes
  first_package_at       timestamptz,
  last_package_at        timestamptz,
  -- Fechas de contenido
  first_content_created_at timestamptz,
  last_content_created_at  timestamptz,
  last_delivery_at         timestamptz,
  last_approved_at         timestamptz,
  -- Inactividad
  inactive_since         timestamptz,  -- última fecha activa (cuando aplica)
  days_inactive          integer,      -- días desde inactive_since
  days_as_client         integer       -- días totales como cliente
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH

  -- Métricas de paquetes por cliente
  package_stats AS (
    SELECT
      cp.client_id,
      COUNT(*)::bigint                            AS total_packages,
      COALESCE(SUM(cp.content_quantity), 0)::numeric AS total_purchased,
      MIN(cp.created_at)                          AS first_package_at,
      MAX(cp.created_at)                          AS last_package_at
    FROM client_packages cp
    WHERE cp.is_active = true
    GROUP BY cp.client_id
  ),

  -- Métricas de contenido por cliente
  content_stats AS (
    SELECT
      ct.client_id,
      COUNT(*) FILTER (
        WHERE ct.status IN ('approved', 'paid')
      )::bigint                                   AS total_approved,
      MIN(ct.created_at)                          AS first_content_created_at,
      MAX(ct.created_at)                          AS last_content_created_at,
      MAX(ct.delivered_at)                        AS last_delivery_at,
      MAX(ct.approved_at)                         AS last_approved_at
    FROM content ct
    GROUP BY ct.client_id
  )

  SELECT
    c.id                                          AS client_id,
    c.name                                        AS client_name,

    -- Clasificación automática
    CASE
      WHEN COALESCE(ps.total_purchased, 0) = 0 THEN 'prospect'
      WHEN COALESCE(ps.total_purchased, 0) - COALESCE(cs.total_approved, 0) > 0 THEN 'active'
      ELSE 'inactive'
    END                                           AS activity_status,

    -- Métricas de paquetes
    COALESCE(ps.total_packages, 0)                AS total_packages,
    COALESCE(ps.total_purchased, 0)               AS total_content_purchased,
    COALESCE(cs.total_approved, 0)                AS total_content_approved,
    GREATEST(0, COALESCE(ps.total_purchased, 0) - COALESCE(cs.total_approved, 0)) AS pending_content_count,

    -- Fechas de incorporación
    c.created_at                                  AS joined_at,

    -- Fechas de paquetes
    ps.first_package_at,
    ps.last_package_at,

    -- Fechas de contenido
    cs.first_content_created_at,
    cs.last_content_created_at,
    cs.last_delivery_at,
    cs.last_approved_at,

    -- Inactividad: solo aplica cuando el cliente está inactivo
    CASE
      WHEN COALESCE(ps.total_purchased, 0) > 0
        AND COALESCE(ps.total_purchased, 0) - COALESCE(cs.total_approved, 0) <= 0
      THEN GREATEST(cs.last_approved_at, cs.last_delivery_at)
      ELSE NULL
    END                                           AS inactive_since,

    CASE
      WHEN COALESCE(ps.total_purchased, 0) > 0
        AND COALESCE(ps.total_purchased, 0) - COALESCE(cs.total_approved, 0) <= 0
      THEN EXTRACT(DAY FROM NOW() - GREATEST(cs.last_approved_at, cs.last_delivery_at))::integer
      ELSE NULL
    END                                           AS days_inactive,

    -- Días totales como cliente en la plataforma
    EXTRACT(DAY FROM NOW() - c.created_at)::integer AS days_as_client

  FROM clients c
  LEFT JOIN package_stats  ps ON ps.client_id  = c.id
  LEFT JOIN content_stats  cs ON cs.client_id  = c.id
  WHERE c.organization_id = p_org_id
    AND COALESCE(c.is_internal_brand, false) = false  -- excluir marcas internas

  ORDER BY
    CASE
      WHEN COALESCE(ps.total_purchased, 0) > 0
        AND COALESCE(ps.total_purchased, 0) - COALESCE(cs.total_approved, 0) > 0
      THEN 1  -- activos primero
      WHEN COALESCE(ps.total_purchased, 0) > 0 THEN 2  -- inactivos después
      ELSE 3  -- prospectos al final
    END,
    c.name;

END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_activity_metrics(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_client_activity_metrics IS
  'Clasificación automática de clientes: activo/inactivo/prospecto basada en paquetes comprados vs contenido aprobado. Incluye todas las fechas relevantes para seguimiento.';
