-- ============================================================
-- FIX: Excluir clientes y perfiles sin portafolio de búsqueda AI
-- Migration: 20260305600000_fix_marketplace_search_filters
-- ============================================================

-- Actualizar RPC de búsqueda para:
-- 1. Excluir usuarios clientes (client_users + organization_members con role='client')
-- 2. Requerir portfolio_count > 0 (al menos un item en portafolio)
-- 3. Excluir perfiles no publicados (is_published = false)

-- ── 1. Función para recalcular portfolio_count ──────────────────────────
-- Cuenta: portfolio_items + content publicado + portfolio_posts
CREATE OR REPLACE FUNCTION recalc_creator_portfolio_count(p_creator_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_count integer := 0;
  v_user_id uuid;
BEGIN
  -- Obtener user_id del creator_profile
  SELECT user_id INTO v_user_id FROM creator_profiles WHERE id = p_creator_id;
  IF v_user_id IS NULL THEN RETURN 0; END IF;

  -- Contar portfolio_items
  SELECT COUNT(*) INTO v_count
  FROM portfolio_items
  WHERE creator_id = p_creator_id AND is_public = true;

  -- Sumar content publicado
  v_count := v_count + COALESCE((
    SELECT COUNT(*) FROM content
    WHERE creator_id = v_user_id AND is_published = true
  ), 0);

  -- Sumar portfolio_posts
  v_count := v_count + COALESCE((
    SELECT COUNT(*) FROM portfolio_posts
    WHERE user_id = v_user_id
  ), 0);

  -- Actualizar el perfil
  UPDATE creator_profiles SET portfolio_count = v_count WHERE id = p_creator_id;

  RETURN v_count;
END;
$$;

-- ── 2. Trigger para actualizar portfolio_count automáticamente ──────────
-- Trigger en portfolio_items
CREATE OR REPLACE FUNCTION trg_update_portfolio_count_items()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_creator_portfolio_count(OLD.creator_id);
    RETURN OLD;
  ELSE
    PERFORM recalc_creator_portfolio_count(NEW.creator_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_portfolio_items_count ON portfolio_items;
CREATE TRIGGER trg_portfolio_items_count
  AFTER INSERT OR UPDATE OR DELETE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION trg_update_portfolio_count_items();

-- Trigger en content (por user_id -> buscar creator_profile)
CREATE OR REPLACE FUNCTION trg_update_portfolio_count_content()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_creator_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT id INTO v_creator_id FROM creator_profiles WHERE user_id = OLD.creator_id LIMIT 1;
  ELSE
    SELECT id INTO v_creator_id FROM creator_profiles WHERE user_id = NEW.creator_id LIMIT 1;
  END IF;

  IF v_creator_id IS NOT NULL THEN
    PERFORM recalc_creator_portfolio_count(v_creator_id);
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_content_portfolio_count ON content;
CREATE TRIGGER trg_content_portfolio_count
  AFTER INSERT OR UPDATE OF is_published OR DELETE ON content
  FOR EACH ROW EXECUTE FUNCTION trg_update_portfolio_count_content();

-- Trigger en portfolio_posts (por user_id -> buscar creator_profile)
CREATE OR REPLACE FUNCTION trg_update_portfolio_count_posts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_creator_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT id INTO v_creator_id FROM creator_profiles WHERE user_id = OLD.user_id LIMIT 1;
  ELSE
    SELECT id INTO v_creator_id FROM creator_profiles WHERE user_id = NEW.user_id LIMIT 1;
  END IF;

  IF v_creator_id IS NOT NULL THEN
    PERFORM recalc_creator_portfolio_count(v_creator_id);
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_posts_portfolio_count ON portfolio_posts;
CREATE TRIGGER trg_posts_portfolio_count
  AFTER INSERT OR DELETE ON portfolio_posts
  FOR EACH ROW EXECUTE FUNCTION trg_update_portfolio_count_posts();

-- ── 3. Actualizar portfolio_count de todos los perfiles existentes ──────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM creator_profiles WHERE is_active = true LOOP
    PERFORM recalc_creator_portfolio_count(r.id);
  END LOOP;
END;
$$;

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
  SELECT
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
    -- Rank final: score base (60%) + relevancia textual (40%)
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
    cp.level
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
  ORDER BY final_rank DESC, cp.last_active_at DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Re-grant permisos
GRANT EXECUTE ON FUNCTION search_marketplace_creators TO authenticated;
GRANT EXECUTE ON FUNCTION search_marketplace_creators TO anon;

NOTIFY pgrst, 'reload schema';
