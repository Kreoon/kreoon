-- Vista y función para contexto de campaña unificado
-- Agrega producto + research + contenidos para uso en módulos IA

-- Vista que agrega contexto de campaña
CREATE OR REPLACE VIEW campaign_context AS
SELECT
  c.id AS content_id,
  c.title,
  c.status,
  c.sales_angle,
  c.sphere_phase,
  c.deadline,
  c.created_at,
  c.creator_id,
  c.editor_id,

  -- Producto
  p.id AS product_id,
  p.name AS product_name,
  p.description AS product_description,
  p.market_research,
  p.avatar_profiles,
  p.sales_angles_data,
  p.content_strategy,
  p.brief_status,

  -- Cliente
  cl.id AS client_id,
  cl.name AS client_name,

  -- Campaña de marketing (si existe)
  mc.id AS campaign_id,
  mc.name AS campaign_name,
  mc.start_date AS campaign_start,
  mc.end_date AS campaign_end,

  -- Organización
  c.organization_id

FROM content c
LEFT JOIN products p ON c.product_id = p.id
LEFT JOIN clients cl ON c.client_id = cl.id
LEFT JOIN marketing_campaigns mc ON c.marketing_campaign_id = mc.id;

-- RLS: la vista hereda permisos de las tablas subyacentes
-- Grant para roles autenticados
GRANT SELECT ON campaign_context TO authenticated;
GRANT SELECT ON campaign_context TO service_role;

COMMENT ON VIEW campaign_context IS 'Contexto unificado de campaña: content + product + client + marketing_campaign para uso en módulos IA';

-- Función RPC para obtener contexto completo por content_id
CREATE OR REPLACE FUNCTION get_campaign_context(p_content_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'content', jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'status', c.status,
      'sales_angle', c.sales_angle,
      'sphere_phase', c.sphere_phase,
      'deadline', c.deadline
    ),
    'product', CASE
      WHEN p.id IS NOT NULL THEN jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'primary_avatar', (p.avatar_profiles->'profiles'->0),
        'sales_angles', COALESCE(
          (p.sales_angles_data->'angles'),
          (p.sales_angles_data->'angulos'),
          to_jsonb(COALESCE(p.sales_angles, ARRAY[]::text[]))
        ),
        'pains', COALESCE(
          ((p.market_research)::jsonb->'pains'),
          ((p.market_research)::jsonb->'dolores'),
          '[]'::jsonb
        ),
        'desires', COALESCE(
          ((p.market_research)::jsonb->'desires'),
          ((p.market_research)::jsonb->'deseos'),
          '[]'::jsonb
        )
      )
      ELSE NULL
    END,
    'client', CASE
      WHEN cl.id IS NOT NULL THEN jsonb_build_object(
        'id', cl.id,
        'name', cl.name
      )
      ELSE NULL
    END,
    'campaign', CASE
      WHEN mc.id IS NOT NULL THEN jsonb_build_object(
        'id', mc.id,
        'name', mc.name,
        'dates', jsonb_build_object(
          'start', mc.start_date,
          'end', mc.end_date
        )
      )
      ELSE NULL
    END
  ) INTO result
  FROM content c
  LEFT JOIN products p ON c.product_id = p.id
  LEFT JOIN clients cl ON c.client_id = cl.id
  LEFT JOIN marketing_campaigns mc ON c.marketing_campaign_id = mc.id
  WHERE c.id = p_content_id;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_campaign_context(UUID) IS 'Devuelve contexto completo de campaña (content + product + client + campaign) para content_id dado. Usa SECURITY INVOKER para respetar RLS.';
