-- Migration: Optimizar search_marketplace_creators — reemplazar NOT IN con UNION por NOT EXISTS
-- Date: 2026-04-01
-- Author: Alexander Cast
--
-- PROBLEMA:
--   La cláusula anterior usaba NOT IN con una subconsulta UNION:
--
--     AND cp.user_id NOT IN (
--       SELECT cu.user_id FROM public.client_users cu
--       UNION
--       SELECT omx.user_id FROM public.organization_members omx WHERE omx.role = 'client'
--     )
--
--   PostgreSQL no puede usar índices en NOT IN con UNION porque el planner
--   debe materializar todo el conjunto antes de comparar. Esto produce un
--   Sequential Scan en tablas grandes, degradando la búsqueda en marketplace.
--
-- SOLUCIÓN:
--   Reemplazar por dos NOT EXISTS independientes. El planner puede usar el
--   índice en user_id de cada tabla y detener la búsqueda en el primer match
--   (short-circuit evaluation), reduciendo el costo de I/O significativamente.
--
--   Índices beneficiados:
--     - idx_client_users_user_id (o PK de client_users)
--     - idx_organization_members_user_id + filtro role = 'client'

-- ============================================================
-- Drop versiones anteriores (firma con y sin p_specializations)
-- ============================================================
DROP FUNCTION IF EXISTS search_marketplace_creators(text, text[], text, text, text[], text[], numeric, numeric, boolean, boolean, integer, integer);
DROP FUNCTION IF EXISTS search_marketplace_creators(text, text[], text, text, text[], numeric, numeric, boolean, boolean, integer, integer);

-- ============================================================
-- Función optimizada
-- ============================================================
CREATE OR REPLACE FUNCTION search_marketplace_creators(
  p_query              text    DEFAULT '',
  p_roles              text[]  DEFAULT NULL,
  p_location_country   text    DEFAULT NULL,
  p_location_city      text    DEFAULT NULL,
  p_niches             text[]  DEFAULT NULL,
  p_specializations    text[]  DEFAULT NULL,
  p_min_rating         numeric DEFAULT NULL,
  p_max_price          numeric DEFAULT NULL,
  p_accepts_exchange   boolean DEFAULT NULL,
  p_is_available       boolean DEFAULT NULL,
  p_limit              integer DEFAULT 20,
  p_offset             integer DEFAULT 0
)
RETURNS TABLE (
  id                  uuid,
  user_id             uuid,
  display_name        text,
  username            text,
  slug                text,
  avatar_url          text,
  bio                 text,
  primary_role        text,
  location_city       text,
  location_country    text,
  rating_avg          numeric,
  rating_count        integer,
  total_projects      integer,
  response_time_hours integer,
  base_price          numeric,
  currency            text,
  accepts_exchange    boolean,
  is_verified         boolean,
  portfolio_count     integer,
  portfolio_thumbnail text,
  search_score        numeric,
  quality_score       numeric,
  activity_score      numeric,
  text_rank           real,
  final_rank          numeric,
  organization_id     uuid,
  organization_name   text,
  organization_logo   text,
  marketplace_roles   text[],
  categories          text[],
  content_types       text[],
  languages           text[],
  level               text,
  specializations     text[]
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tsquery tsquery;
BEGIN
  IF p_query IS NOT NULL AND length(trim(p_query)) > 0 THEN
    v_tsquery := websearch_to_tsquery('spanish', p_query);
  END IF;

  RETURN QUERY
  WITH creator_specs AS (
    SELECT
      us.user_id,
      array_agg(us.specialization ORDER BY us.created_at) AS specs
    FROM user_specializations us
    GROUP BY us.user_id
  ),
  ranked_creators AS (
    SELECT DISTINCT ON (cp.id)
      cp.id,
      cp.user_id,
      cp.display_name,
      cp.username,
      cp.slug,
      cp.avatar_url,
      cp.bio,
      cp.primary_role,
      cp.location_city,
      cp.location_country,
      cp.rating_avg,
      cp.rating_count,
      cp.total_projects,
      cp.response_time_hours,
      cp.base_price,
      cp.currency,
      cp.accepts_product_exchange AS accepts_exchange,
      cp.is_verified,
      cp.portfolio_count,
      COALESCE(
        -- 1. portfolio_items con thumbnail explícito
        (SELECT pi.thumbnail_url FROM portfolio_items pi
         WHERE pi.creator_id = cp.id AND pi.is_public = true AND pi.thumbnail_url IS NOT NULL AND pi.thumbnail_url != ''
         ORDER BY pi.is_featured DESC, pi.display_order ASC LIMIT 1),
        -- 2. portfolio_items imagen directa (sin thumbnail)
        (SELECT pi.media_url FROM portfolio_items pi
         WHERE pi.creator_id = cp.id AND pi.is_public = true AND pi.media_type = 'image' AND pi.media_url IS NOT NULL
         ORDER BY pi.is_featured DESC, pi.display_order ASC LIMIT 1),
        -- 3. content con thumbnail
        (SELECT c.thumbnail_url FROM content c
         WHERE c.creator_id = cp.user_id AND c.is_published = true AND c.thumbnail_url IS NOT NULL AND c.thumbnail_url != ''
         ORDER BY c.created_at DESC LIMIT 1),
        -- 4. content con bunny_embed_url (extraer thumbnail de URL)
        (SELECT REPLACE(c.bunny_embed_url, '/embed/', '/thumbnail/') || '?time=1' FROM content c
         WHERE c.creator_id = cp.user_id AND c.is_published = true AND c.bunny_embed_url IS NOT NULL AND c.bunny_embed_url LIKE '%bunny%'
         ORDER BY c.created_at DESC LIMIT 1),
        -- 5. portfolio_posts con thumbnail
        (SELECT pp.thumbnail_url FROM portfolio_posts pp
         WHERE pp.user_id = cp.user_id AND pp.thumbnail_url IS NOT NULL AND pp.thumbnail_url != ''
         ORDER BY pp.created_at DESC LIMIT 1)
      ) AS portfolio_thumbnail,
      cp.search_score,
      cp.quality_score,
      cp.activity_score,
      CASE
        WHEN v_tsquery IS NOT NULL THEN ts_rank_cd(cp.search_vector, v_tsquery, 32)
        ELSE 0.0
      END AS text_rank,
      CASE
        WHEN v_tsquery IS NOT NULL THEN
          ROUND((COALESCE(cp.search_score, 0) * 0.60 + ts_rank_cd(cp.search_vector, v_tsquery, 32) * 0.40)::numeric, 4)
        ELSE COALESCE(cp.search_score, 0)
      END AS final_rank,
      om.organization_id,
      o.name  AS organization_name,
      o.logo_url AS organization_logo,
      cp.marketplace_roles,
      cp.categories,
      cp.content_types,
      cp.languages,
      cp.level,
      COALESCE(cs.specs, ARRAY[]::text[]) AS specializations,
      cp.last_active_at
    FROM creator_profiles cp
    LEFT JOIN organization_members om ON om.user_id = cp.user_id
    LEFT JOIN organizations o          ON o.id = om.organization_id
    LEFT JOIN creator_specs cs         ON cs.user_id = cp.user_id
    WHERE
      cp.is_active = true
      AND COALESCE(cp.is_published, true) = true
      AND COALESCE(cp.portfolio_count, 0) > 0
      -- OPTIMIZACIÓN: NOT EXISTS permite usar índices en cada tabla por separado.
      -- NOT IN con UNION materializa todo el conjunto antes de comparar (seq scan).
      AND NOT EXISTS (
        SELECT 1 FROM public.client_users cu
        WHERE cu.user_id = cp.user_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.organization_members omx
        WHERE omx.user_id = cp.user_id AND omx.role = 'client'::app_role
      )
      AND (v_tsquery IS NULL OR cp.search_vector @@ v_tsquery)
      AND (p_roles IS NULL OR cp.primary_role = ANY(p_roles) OR cp.marketplace_roles && p_roles)
      AND (p_location_country IS NULL OR cp.location_country ILIKE p_location_country OR cp.location_country ILIKE '%' || p_location_country || '%')
      AND (p_location_city IS NULL OR cp.location_city ILIKE '%' || p_location_city || '%')
      AND (p_niches IS NULL OR cp.niches && p_niches OR cp.categories && p_niches)
      AND (p_specializations IS NULL OR cs.specs && p_specializations)
      AND (p_min_rating IS NULL OR cp.rating_avg >= p_min_rating)
      AND (p_max_price IS NULL OR cp.base_price <= p_max_price)
      AND (p_accepts_exchange IS NULL OR cp.accepts_product_exchange = p_accepts_exchange)
      AND (p_is_available IS NULL OR cp.is_available = p_is_available)
    ORDER BY cp.id
  )
  SELECT
    rc.id,
    rc.user_id,
    rc.display_name,
    rc.username,
    rc.slug,
    rc.avatar_url,
    rc.bio,
    rc.primary_role,
    rc.location_city,
    rc.location_country,
    rc.rating_avg,
    rc.rating_count,
    rc.total_projects,
    rc.response_time_hours,
    rc.base_price,
    rc.currency,
    rc.accepts_exchange,
    rc.is_verified,
    rc.portfolio_count,
    rc.portfolio_thumbnail,
    rc.search_score,
    rc.quality_score,
    rc.activity_score,
    rc.text_rank,
    rc.final_rank,
    rc.organization_id,
    rc.organization_name,
    rc.organization_logo,
    rc.marketplace_roles,
    rc.categories,
    rc.content_types,
    rc.languages,
    rc.level,
    rc.specializations
  FROM ranked_creators rc
  ORDER BY rc.final_rank DESC, rc.last_active_at DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ============================================================
-- Permisos
-- ============================================================
GRANT EXECUTE ON FUNCTION search_marketplace_creators TO authenticated;
GRANT EXECUTE ON FUNCTION search_marketplace_creators TO anon;

NOTIFY pgrst, 'reload schema';
