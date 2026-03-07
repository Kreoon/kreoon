-- ============================================================
-- FIX: Eliminar duplicados en búsqueda AI y mejorar filtro de portafolio
-- Migration: 20260305770000_fix_marketplace_search_duplicates
-- ============================================================

-- Problema 1: El LEFT JOIN con organization_members causa duplicados
--             cuando un usuario pertenece a múltiples organizaciones
-- Problema 2: portfolio_count puede estar desactualizado

-- Actualizar RPC con DISTINCT ON para evitar duplicados
CREATE OR REPLACE FUNCTION search_marketplace_creators(
  p_query              text    DEFAULT '',
  p_roles              text[]  DEFAULT NULL,
  p_location_country   text    DEFAULT NULL,
  p_location_city      text    DEFAULT NULL,
  p_niches             text[]  DEFAULT NULL,
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
  level               text
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tsquery tsquery;
BEGIN
  IF p_query IS NOT NULL AND length(trim(p_query)) > 0 THEN
    v_tsquery := websearch_to_tsquery('spanish', p_query);
  END IF;

  RETURN QUERY
  WITH ranked_creators AS (
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
      o.name AS organization_name,
      o.logo_url AS organization_logo,
      cp.marketplace_roles,
      cp.categories,
      cp.content_types,
      cp.languages,
      cp.level,
      cp.last_active_at
    FROM creator_profiles cp
    LEFT JOIN organization_members om ON om.user_id = cp.user_id
    LEFT JOIN organizations o ON o.id = om.organization_id
    WHERE
      -- Perfil activo y publicado
      cp.is_active = true
      AND COALESCE(cp.is_published, true) = true
      -- REQUERIR al menos 1 item en portafolio
      AND COALESCE(cp.portfolio_count, 0) > 0
      -- EXCLUIR usuarios clientes
      AND cp.user_id NOT IN (
        SELECT cu.user_id FROM public.client_users cu
        UNION
        SELECT omx.user_id FROM public.organization_members omx WHERE omx.role = 'client'::app_role
      )
      -- Filtros de búsqueda
      AND (v_tsquery IS NULL OR cp.search_vector @@ v_tsquery)
      AND (p_roles IS NULL OR cp.primary_role = ANY(p_roles) OR cp.marketplace_roles && p_roles)
      AND (p_location_country IS NULL OR cp.location_country ILIKE p_location_country OR cp.location_country ILIKE '%' || p_location_country || '%')
      AND (p_location_city IS NULL OR cp.location_city ILIKE '%' || p_location_city || '%')
      AND (p_niches IS NULL OR cp.niches && p_niches OR cp.categories && p_niches)
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
    rc.level
  FROM ranked_creators rc
  ORDER BY rc.final_rank DESC, rc.last_active_at DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Re-grant permisos
GRANT EXECUTE ON FUNCTION search_marketplace_creators TO authenticated;
GRANT EXECUTE ON FUNCTION search_marketplace_creators TO anon;

-- Forzar recálculo de portfolio_count para TODOS los perfiles
-- (incluyendo los que podrían tener contenido en content o portfolio_posts)
DO $$
DECLARE
  r RECORD;
  v_count integer;
BEGIN
  FOR r IN SELECT id, user_id FROM creator_profiles LOOP
    -- Contar de las 3 fuentes
    SELECT
      COALESCE((SELECT COUNT(*) FROM portfolio_items WHERE creator_id = r.id AND is_public = true), 0) +
      COALESCE((SELECT COUNT(*) FROM content WHERE creator_id = r.user_id AND is_published = true), 0) +
      COALESCE((SELECT COUNT(*) FROM portfolio_posts WHERE user_id = r.user_id), 0)
    INTO v_count;

    UPDATE creator_profiles SET portfolio_count = v_count WHERE id = r.id;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
