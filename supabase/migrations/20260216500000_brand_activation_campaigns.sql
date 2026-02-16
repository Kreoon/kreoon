-- ============================================================================
-- MIGRACIÓN: Sistema de Campañas de Activación de Marca
-- Fecha: 2026-02-16
-- Descripción: Nuevo tipo de campaña donde creadores publican en sus redes
--   - Enums: publication_verification_status, social_platform, verification_method
--   - Tablas: activation_publications, creator_social_stats, publication_verification_queue
--   - Funciones: creator_meets_activation_requirements, calculate_engagement_bonus,
--               get_eligible_activation_campaigns
--   - RLS: 7 policies + grants
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1: TIPOS ENUMERADOS (idempotente)
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'publication_verification_status') THEN
    CREATE TYPE publication_verification_status AS ENUM (
      'pending_content',
      'content_approved',
      'pending_publication',
      'pending_verification',
      'verified',
      'violation',
      'completed'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_platform') THEN
    CREATE TYPE social_platform AS ENUM (
      'instagram_feed',
      'instagram_reels',
      'instagram_stories',
      'tiktok',
      'youtube',
      'youtube_shorts',
      'facebook',
      'twitter',
      'linkedin',
      'threads'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_method') THEN
    CREATE TYPE verification_method AS ENUM (
      'manual',
      'api',
      'screenshot',
      'creator_confirm'
    );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PARTE 2: EXTENSIÓN DE marketplace_campaigns
-- ----------------------------------------------------------------------------

ALTER TABLE marketplace_campaigns
ADD COLUMN IF NOT EXISTS is_brand_activation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS activation_config JSONB DEFAULT '{}';

COMMENT ON COLUMN marketplace_campaigns.activation_config IS '
{
  "required_platforms": ["instagram_reels", "tiktok"],
  "min_followers": { "instagram": 5000, "tiktok": 10000 },
  "required_hashtags": ["#ad", "#publi", "#brandname"],
  "required_mentions": ["@brandhandle"],
  "min_post_duration_days": 30,
  "content_approval_required": true,
  "allow_reshare_brand": true,
  "usage_rights_duration_days": 90,
  "engagement_bonus": {
    "enabled": true,
    "per_1k_likes": 5000,
    "per_1k_comments": 10000,
    "per_1k_shares": 15000,
    "max_bonus": 500000
  },
  "verification_method": "screenshot",
  "requires_insights_screenshot": true
}';

-- Índice parcial para filtrar campañas de activación rápidamente
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_activation
  ON marketplace_campaigns(is_brand_activation)
  WHERE is_brand_activation = true;

-- ----------------------------------------------------------------------------
-- PARTE 3: TABLA DE PUBLICACIONES DE ACTIVACIÓN
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS activation_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencias
  campaign_id UUID NOT NULL REFERENCES marketplace_campaigns(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES campaign_applications(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES campaign_deliverables(id) ON DELETE SET NULL,

  -- Plataforma y publicación
  platform social_platform NOT NULL,
  publication_url TEXT,
  publication_id VARCHAR(100),

  -- Contenido de la publicación
  caption TEXT,
  hashtags_used TEXT[],
  mentions_used TEXT[],

  -- Verificación
  verification_status publication_verification_status DEFAULT 'pending_content',
  verification_method verification_method,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  verification_notes TEXT,

  -- Screenshots de evidencia
  publication_screenshot_url TEXT,
  insights_screenshot_url TEXT,

  -- Métricas capturadas
  metrics_captured_at TIMESTAMPTZ,
  followers_at_post INTEGER,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  reach_count INTEGER DEFAULT 0,
  impressions_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),

  -- Métricas actualizadas (se pueden refrescar)
  metrics_last_updated TIMESTAMPTZ,

  -- Duración del post
  must_stay_until TIMESTAMPTZ,
  is_still_live BOOLEAN DEFAULT true,
  removed_detected_at TIMESTAMPTZ,

  -- Pagos por engagement
  base_payment DECIMAL(10,2),
  engagement_bonus DECIMAL(10,2) DEFAULT 0,
  total_payment DECIMAL(10,2),
  bonus_calculated_at TIMESTAMPTZ,

  -- Fechas
  content_submitted_at TIMESTAMPTZ,
  content_approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_activation_pub_campaign ON activation_publications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_activation_pub_creator ON activation_publications(creator_id);
CREATE INDEX IF NOT EXISTS idx_activation_pub_status ON activation_publications(verification_status);
CREATE INDEX IF NOT EXISTS idx_activation_pub_platform ON activation_publications(platform);
CREATE INDEX IF NOT EXISTS idx_activation_pub_must_stay ON activation_publications(must_stay_until)
  WHERE is_still_live = true;

-- Una publicación por plataforma por aplicación
CREATE UNIQUE INDEX IF NOT EXISTS idx_activation_pub_unique_platform
  ON activation_publications(application_id, platform);

-- Trigger updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_activation_publications_updated_at'
  ) THEN
    CREATE TRIGGER trigger_activation_publications_updated_at
      BEFORE UPDATE ON activation_publications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PARTE 4: TABLA DE STATS SOCIALES DEL CREADOR
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS creator_social_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,

  -- Plataforma
  platform social_platform NOT NULL,
  username VARCHAR(100),
  profile_url TEXT,

  -- Métricas de audiencia
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  avg_likes_per_post INTEGER DEFAULT 0,
  avg_comments_per_post INTEGER DEFAULT 0,
  avg_views_per_reel INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),

  -- Datos demográficos
  audience_demographics JSONB DEFAULT '{}',

  -- Verificación
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verification_screenshot_url TEXT,

  -- Última actualización
  stats_updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(creator_profile_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_creator_social_stats_creator ON creator_social_stats(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_creator_social_stats_platform ON creator_social_stats(platform);
CREATE INDEX IF NOT EXISTS idx_creator_social_stats_followers ON creator_social_stats(followers_count DESC);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_creator_social_stats_updated_at'
  ) THEN
    CREATE TRIGGER trigger_creator_social_stats_updated_at
      BEFORE UPDATE ON creator_social_stats
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PARTE 5: COLA DE VERIFICACIONES PROGRAMADAS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS publication_verification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES activation_publications(id) ON DELETE CASCADE,

  -- Programación
  scheduled_for TIMESTAMPTZ NOT NULL,
  verification_type VARCHAR(50) NOT NULL,  -- 'initial', 'periodic', 'final'

  -- Estado
  status VARCHAR(50) DEFAULT 'pending',    -- 'pending', 'processing', 'completed', 'failed'
  processed_at TIMESTAMPTZ,
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_queue_scheduled ON publication_verification_queue(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_verification_queue_publication ON publication_verification_queue(publication_id);

-- ----------------------------------------------------------------------------
-- PARTE 6: FUNCIONES
-- ----------------------------------------------------------------------------

-- Verificar si un creador cumple requisitos de audiencia para una campaña
CREATE OR REPLACE FUNCTION creator_meets_activation_requirements(
  p_creator_profile_id UUID,
  p_campaign_id UUID
)
RETURNS TABLE(
  meets_requirements BOOLEAN,
  missing_requirements JSONB,
  creator_stats JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config JSONB;
  v_is_activation BOOLEAN;
  v_missing JSONB := '[]'::JSONB;
  v_stats JSONB := '{}'::JSONB;
  v_platform TEXT;
  v_min_followers_text TEXT;   -- jsonb_each_text returns TEXT
  v_min_followers_int INTEGER;
  v_creator_followers INTEGER;
  v_meets BOOLEAN := true;
BEGIN
  -- Obtener config de la campaña
  SELECT mc.is_brand_activation, mc.activation_config
  INTO v_is_activation, v_config
  FROM marketplace_campaigns mc
  WHERE mc.id = p_campaign_id;

  -- Si no es activación, siempre cumple
  IF NOT COALESCE(v_is_activation, false) THEN
    RETURN QUERY SELECT true, '[]'::JSONB, '{}'::JSONB;
    RETURN;
  END IF;

  -- Verificar requisitos de seguidores por plataforma
  IF v_config ? 'min_followers' THEN
    FOR v_platform, v_min_followers_text IN
      SELECT key, value FROM jsonb_each_text(v_config->'min_followers')
    LOOP
      v_min_followers_int := v_min_followers_text::integer;

      SELECT css.followers_count INTO v_creator_followers
      FROM creator_social_stats css
      WHERE css.creator_profile_id = p_creator_profile_id
        AND css.platform::text ILIKE v_platform || '%'
        AND css.is_verified = true;

      v_stats := v_stats || jsonb_build_object(
        v_platform, jsonb_build_object(
          'required', v_min_followers_int,
          'actual', COALESCE(v_creator_followers, 0)
        )
      );

      IF COALESCE(v_creator_followers, 0) < v_min_followers_int THEN
        v_meets := false;
        v_missing := v_missing || jsonb_build_array(
          jsonb_build_object(
            'type', 'min_followers',
            'platform', v_platform,
            'required', v_min_followers_int,
            'actual', COALESCE(v_creator_followers, 0)
          )
        );
      END IF;
    END LOOP;
  END IF;

  RETURN QUERY SELECT v_meets, v_missing, v_stats;
END;
$$;

-- Calcular bonus por engagement
CREATE OR REPLACE FUNCTION calculate_engagement_bonus(
  p_publication_id UUID
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pub RECORD;
  v_config JSONB;
  v_bonus DECIMAL := 0;
  v_max_bonus DECIMAL;
BEGIN
  -- Obtener publicación + config en un solo query
  SELECT ap.*, mc.activation_config
  INTO v_pub
  FROM activation_publications ap
  JOIN marketplace_campaigns mc ON mc.id = ap.campaign_id
  WHERE ap.id = p_publication_id;

  IF v_pub IS NULL THEN
    RETURN 0;
  END IF;

  v_config := v_pub.activation_config;

  IF NOT COALESCE((v_config->'engagement_bonus'->>'enabled')::boolean, false) THEN
    RETURN 0;
  END IF;

  v_max_bonus := COALESCE((v_config->'engagement_bonus'->>'max_bonus')::decimal, 500000);

  -- Bonus por likes
  IF v_pub.likes_count > 0 AND v_config->'engagement_bonus' ? 'per_1k_likes' THEN
    v_bonus := v_bonus + (v_pub.likes_count / 1000.0) *
               (v_config->'engagement_bonus'->>'per_1k_likes')::decimal;
  END IF;

  -- Bonus por comentarios
  IF v_pub.comments_count > 0 AND v_config->'engagement_bonus' ? 'per_1k_comments' THEN
    v_bonus := v_bonus + (v_pub.comments_count / 1000.0) *
               (v_config->'engagement_bonus'->>'per_1k_comments')::decimal;
  END IF;

  -- Bonus por shares
  IF v_pub.shares_count > 0 AND v_config->'engagement_bonus' ? 'per_1k_shares' THEN
    v_bonus := v_bonus + (v_pub.shares_count / 1000.0) *
               (v_config->'engagement_bonus'->>'per_1k_shares')::decimal;
  END IF;

  -- Aplicar máximo
  v_bonus := LEAST(v_bonus, v_max_bonus);

  -- Actualizar publicación
  UPDATE activation_publications
  SET engagement_bonus = v_bonus,
      total_payment = COALESCE(base_payment, 0) + v_bonus,
      bonus_calculated_at = NOW()
  WHERE id = p_publication_id;

  RETURN v_bonus;
END;
$$;

-- Obtener campañas de activación elegibles para un creador
-- Usa LATERAL JOIN para evaluar creator_meets_activation_requirements una sola vez por fila
CREATE OR REPLACE FUNCTION get_eligible_activation_campaigns(
  p_creator_profile_id UUID
)
RETURNS TABLE(
  campaign_id UUID,
  title TEXT,
  brand_name TEXT,
  budget_per_creator DECIMAL,
  required_platforms TEXT[],
  min_followers JSONB,
  meets_requirements BOOLEAN,
  missing_requirements JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id AS campaign_id,
    mc.title,
    COALESCE(mc.brand_name_override, b.name) AS brand_name,
    mc.budget_per_video AS budget_per_creator,
    ARRAY(SELECT jsonb_array_elements_text(mc.activation_config->'required_platforms')) AS required_platforms,
    mc.activation_config->'min_followers' AS min_followers,
    reqs.meets_requirements,
    reqs.missing_requirements
  FROM marketplace_campaigns mc
  LEFT JOIN brands b ON b.id = mc.brand_id
  -- LATERAL JOIN: evalúa la función UNA vez por fila
  LEFT JOIN LATERAL creator_meets_activation_requirements(p_creator_profile_id, mc.id) reqs ON true
  WHERE mc.is_brand_activation = true
    AND mc.status = 'active'
    AND mc.visibility = 'public'
  ORDER BY
    reqs.meets_requirements DESC,
    mc.created_at DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- PARTE 7: RLS POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE activation_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_social_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_verification_queue ENABLE ROW LEVEL SECURITY;

-- ── activation_publications ────────────────────────────────────────────────

-- SELECT: creador ve las suyas + brand owner/admin ve las de sus campañas
CREATE POLICY "activation_pub_select"
  ON activation_publications FOR SELECT
  USING (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM marketplace_campaigns mc
      WHERE mc.id = activation_publications.campaign_id
      AND (mc.created_by = auth.uid() OR is_brand_admin(mc.brand_id) OR is_org_admin(mc.organization_id))
    )
  );

-- INSERT: solo el creador asignado
CREATE POLICY "activation_pub_insert"
  ON activation_publications FOR INSERT
  WITH CHECK (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
  );

-- UPDATE: creador actualiza las suyas + brand owner puede verificar
CREATE POLICY "activation_pub_update"
  ON activation_publications FOR UPDATE
  USING (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM marketplace_campaigns mc
      WHERE mc.id = activation_publications.campaign_id
      AND (mc.created_by = auth.uid() OR is_brand_admin(mc.brand_id))
    )
  );

-- ── creator_social_stats ───────────────────────────────────────────────────

-- SELECT: público (marcas necesitan ver stats para evaluar creadores)
CREATE POLICY "social_stats_select_public"
  ON creator_social_stats FOR SELECT
  USING (true);

-- INSERT: solo el dueño del perfil
CREATE POLICY "social_stats_insert"
  ON creator_social_stats FOR INSERT
  WITH CHECK (
    creator_profile_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
  );

-- UPDATE: solo el dueño del perfil
CREATE POLICY "social_stats_update"
  ON creator_social_stats FOR UPDATE
  USING (
    creator_profile_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
  );

-- DELETE: solo el dueño del perfil
CREATE POLICY "social_stats_delete"
  ON creator_social_stats FOR DELETE
  USING (
    creator_profile_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
  );

-- ── publication_verification_queue ─────────────────────────────────────────
-- Solo accesible vía SECURITY DEFINER functions o service_role.
-- No se crean policies → authenticated no puede acceder directamente.
-- Esto es intencional: la cola es manejada por edge functions/cron jobs.

-- ----------------------------------------------------------------------------
-- PARTE 8: GRANTS
-- ----------------------------------------------------------------------------

GRANT ALL ON activation_publications TO authenticated;
GRANT ALL ON creator_social_stats TO authenticated;
-- verification_queue: NO grant a authenticated (solo service_role)
GRANT SELECT ON publication_verification_queue TO authenticated;

GRANT EXECUTE ON FUNCTION creator_meets_activation_requirements(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_engagement_bonus(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eligible_activation_campaigns(UUID) TO authenticated;
