-- =====================================================
-- get_talent_activity_metrics
-- Clasificación automática de talento: activo / inactivo
-- Basado en: contenido en progreso vs contenido completado
-- Incluye pendientes de pago y todas las fechas relevantes
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_talent_activity_metrics(p_org_id uuid)
RETURNS TABLE (
  talent_id                 uuid,
  full_name                 text,
  email                     text,
  avatar_url                text,
  org_role                  text,
  joined_at                 timestamptz,    -- organization_members.created_at
  activity_status           text,           -- 'active' | 'inactive'
  active_content_count      bigint,         -- contenido en progreso
  pending_payment_count     bigint,         -- entregado sin pagar
  pending_payment_amount    numeric,        -- SUM(creator_payment) de los pendientes
  total_content_count       bigint,         -- todo el contenido asignado
  last_delivery_at          timestamptz,    -- MAX(delivered_at)
  last_assigned_at          timestamptz,    -- MAX(creator_assigned_at)
  last_approved_at          timestamptz,    -- MAX(approved_at)
  first_content_at          timestamptz,    -- MIN(content.created_at)
  days_since_last_delivery  integer,        -- días desde last_delivery_at (NULL si no hay)
  days_on_team              integer         -- días desde joined_at
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH

  -- 1. Miembros de talento de la organización
  team_members AS (
    SELECT om.user_id, om.role::text AS org_role, om.joined_at
    FROM organization_members om
    WHERE om.organization_id = p_org_id
      AND om.deleted_at IS NULL
  ),

  -- 2. Métricas de contenido agrupadas por creator_id
  content_stats AS (
    SELECT
      ct.creator_id,

      -- Total de piezas asignadas al talento
      COUNT(*)::bigint                                          AS total_content_count,

      -- Activo: asignado pero NO completado (no approved, paid, ni rejected)
      COUNT(*) FILTER (
        WHERE ct.status NOT IN ('approved', 'paid', 'rejected')
      )::bigint                                                 AS active_content_count,

      -- Pendientes de pago: entregado/aprobado/pagado pero creator_paid = false
      COUNT(*) FILTER (
        WHERE ct.creator_paid = false
          AND ct.status IN ('delivered', 'approved', 'paid')
      )::bigint                                                 AS pending_payment_count,

      -- Monto pendiente de pago
      COALESCE(
        SUM(ct.creator_payment) FILTER (
          WHERE ct.creator_paid = false
            AND ct.status IN ('delivered', 'approved', 'paid')
        ),
        0
      )::numeric                                               AS pending_payment_amount,

      -- Fechas relevantes
      MAX(ct.delivered_at)                                      AS last_delivery_at,
      MAX(ct.creator_assigned_at)                               AS last_assigned_at,
      MAX(ct.approved_at)                                       AS last_approved_at,
      MIN(ct.created_at)                                        AS first_content_at

    FROM content ct
    WHERE ct.creator_id IS NOT NULL
      AND ct.organization_id = p_org_id
    GROUP BY ct.creator_id
  )

  SELECT
    tm.user_id                                                  AS talent_id,
    p.full_name,
    p.email,
    p.avatar_url,
    tm.org_role,
    tm.created_at                                               AS joined_at,

    -- Clasificación: activo si tiene piezas en flujo de producción
    CASE
      WHEN COALESCE(cs.active_content_count, 0) > 0 THEN 'active'
      ELSE 'inactive'
    END                                                         AS activity_status,

    COALESCE(cs.active_content_count,   0)                      AS active_content_count,
    COALESCE(cs.pending_payment_count,  0)                      AS pending_payment_count,
    COALESCE(cs.pending_payment_amount, 0)                      AS pending_payment_amount,
    COALESCE(cs.total_content_count,    0)                      AS total_content_count,

    cs.last_delivery_at,
    cs.last_assigned_at,
    cs.last_approved_at,
    cs.first_content_at,

    -- Días desde última entrega (NULL si nunca ha entregado)
    CASE
      WHEN cs.last_delivery_at IS NOT NULL
      THEN EXTRACT(DAY FROM NOW() - cs.last_delivery_at)::integer
      ELSE NULL
    END                                                         AS days_since_last_delivery,

    -- Días en el equipo desde que se incorporó a la organización
    EXTRACT(DAY FROM NOW() - tm.created_at)::integer            AS days_on_team

  FROM team_members tm
  INNER JOIN profiles p ON p.id = tm.user_id
  LEFT JOIN  content_stats cs ON cs.creator_id = tm.user_id

  ORDER BY
    -- 1. Activos primero
    CASE WHEN COALESCE(cs.active_content_count, 0) > 0 THEN 1 ELSE 0 END DESC,
    -- 2. Con pendientes de pago antes que los totalmente inactivos
    CASE WHEN COALESCE(cs.pending_payment_count, 0) > 0 THEN 1 ELSE 0 END DESC,
    -- 3. Dentro de cada grupo, por nombre
    p.full_name ASC;

END;
$$;

GRANT EXECUTE ON FUNCTION public.get_talent_activity_metrics(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_talent_activity_metrics IS
  'Clasificación de talento por actividad: activo (contenido en progreso) o inactivo (sin piezas en flujo). Incluye pendientes de pago, montos y fechas clave de seguimiento.';
