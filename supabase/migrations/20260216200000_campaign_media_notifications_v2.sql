-- ============================================================================
-- MIGRACIÓN: Sistema de Media y Notificaciones para Campañas V2 (Corregida)
-- Fecha: 2026-02-16
-- Descripción: Añade soporte para media enriquecido, notificaciones inteligentes
--              y control de acceso por membresía
--
-- CORRECCIONES vs borrador original:
--   1. Nombres de columna corregidos en funciones de matching
--      (display_name, location_country, rating_avg, marketplace_roles)
--   2. RLS INSERT en campaign_notifications restringido (era WITH CHECK true)
--   3. Sin FK circular: no cover_media_id/video_brief_id en marketplace_campaigns
--      (usar campaign_media con is_primary + media_type en su lugar)
--   4. Sin columnas target_* duplicadas: matching lee de creator_requirements JSONB
--      y desired_roles column existentes
--   5. Unique indexes parciales en subscriptions para ON CONFLICT
--   6. Matching optimizado: bulk query set-based, sin CROSS JOIN LATERAL per-row
--   7. Sin seed agresivo de planes free para todos los usuarios
--   8. Política redundante eliminada en creator_notification_preferences
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1: TIPOS ENUMERADOS
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE campaign_notification_type AS ENUM (
    'new_campaign',
    'campaign_invitation',
    'application_status',
    'deliverable_feedback',
    'payment_released',
    'campaign_reminder',
    'counter_offer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'read',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_media_type AS ENUM (
    'cover_image',
    'video_brief',
    'gallery_image',
    'reference_video',
    'product_image'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- PARTE 2: TABLA DE MEDIA DE CAMPAÑAS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS campaign_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketplace_campaigns(id) ON DELETE CASCADE,

  -- Información del archivo
  media_type campaign_media_type NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Metadatos
  file_name VARCHAR(255),
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  duration_seconds INTEGER,
  width INTEGER,
  height INTEGER,

  -- Orden y estado
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,

  -- Procesamiento
  processing_status VARCHAR(50) DEFAULT 'completed',
  bunny_video_id VARCHAR(100),

  -- Auditoría
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_media_campaign ON campaign_media(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_media_type ON campaign_media(media_type);
CREATE INDEX IF NOT EXISTS idx_campaign_media_primary
  ON campaign_media(campaign_id, is_primary) WHERE is_primary = true;

CREATE TRIGGER trigger_campaign_media_updated_at
  BEFORE UPDATE ON campaign_media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Solo una cover image principal por campaña
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_media_single_primary
  ON campaign_media(campaign_id)
  WHERE is_primary = true AND media_type = 'cover_image';

-- ----------------------------------------------------------------------------
-- PARTE 3: TABLA DE NOTIFICACIONES DE CAMPAÑAS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS campaign_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Destinatario
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_profile_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,

  -- Contexto
  campaign_id UUID REFERENCES marketplace_campaigns(id) ON DELETE CASCADE,
  application_id UUID REFERENCES campaign_applications(id) ON DELETE SET NULL,
  invitation_id UUID REFERENCES campaign_invitations(id) ON DELETE SET NULL,

  -- Tipo y contenido
  notification_type campaign_notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',

  -- Estado
  status notification_status DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,

  -- Canales de envío
  send_push BOOLEAN DEFAULT true,
  send_email BOOLEAN DEFAULT true,
  send_in_app BOOLEAN DEFAULT true,

  -- Matching score (para new_campaign)
  match_score DECIMAL(5,2),
  match_reasons JSONB,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_notif_user ON campaign_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_notif_campaign ON campaign_notifications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_notif_status ON campaign_notifications(status);
CREATE INDEX IF NOT EXISTS idx_campaign_notif_unread
  ON campaign_notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_notif_type ON campaign_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_campaign_notif_created ON campaign_notifications(created_at DESC);

CREATE TRIGGER trigger_campaign_notifications_updated_at
  BEFORE UPDATE ON campaign_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- PARTE 4: TABLA DE PREFERENCIAS DE NOTIFICACIÓN
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS creator_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,

  -- Preferencias por tipo
  notify_new_campaigns BOOLEAN DEFAULT true,
  notify_invitations BOOLEAN DEFAULT true,
  notify_application_updates BOOLEAN DEFAULT true,
  notify_payments BOOLEAN DEFAULT true,
  notify_reminders BOOLEAN DEFAULT true,

  -- Filtros de campañas
  min_budget_notification DECIMAL(10,2),
  preferred_categories TEXT[] DEFAULT '{}',
  preferred_campaign_types TEXT[] DEFAULT '{}',

  -- Frecuencia
  instant_notifications BOOLEAN DEFAULT true,
  daily_digest_enabled BOOLEAN DEFAULT false,
  daily_digest_time TIME DEFAULT '09:00',

  -- Canales
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(creator_profile_id)
);

CREATE TRIGGER trigger_creator_notification_prefs_updated_at
  BEFORE UPDATE ON creator_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- PARTE 5: TABLA DE SUSCRIPCIONES/MEMBRESÍAS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Titular (exactamente UNO de estos debe ser NOT NULL)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,

  -- Plan
  plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('free', 'starter', 'pro', 'enterprise')),
  plan_name VARCHAR(100),

  -- Estado
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired', 'trial')),

  -- Fechas
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,

  -- Pagos
  stripe_subscription_id VARCHAR(100),
  stripe_customer_id VARCHAR(100),
  payment_method VARCHAR(50),
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),

  -- Límites del plan
  max_campaigns_per_month INTEGER,
  max_active_campaigns INTEGER,
  max_creators_per_campaign INTEGER,
  commission_discount_pct DECIMAL(5,2) DEFAULT 0,

  -- Features
  features JSONB DEFAULT '{}',

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Exactamente una entidad titular
  CONSTRAINT subscription_one_owner CHECK (
    (user_id IS NOT NULL)::int +
    (organization_id IS NOT NULL)::int +
    (brand_id IS NOT NULL)::int = 1
  )
);

-- Unique parciales: máximo UNA suscripción activa/trial por entidad
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_unique_active_user
  ON subscriptions(user_id) WHERE user_id IS NOT NULL AND status IN ('active', 'trial');
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_unique_active_org
  ON subscriptions(organization_id) WHERE organization_id IS NOT NULL AND status IN ('active', 'trial');
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_unique_active_brand
  ON subscriptions(brand_id) WHERE brand_id IS NOT NULL AND status IN ('active', 'trial');

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires
  ON subscriptions(expires_at) WHERE status = 'active';

CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- PARTE 6: COLUMNAS ADICIONALES EN marketplace_campaigns
-- Solo tracking de notificaciones (sin target_* duplicados ni FKs circulares)
-- El matching lee de creator_requirements JSONB + desired_roles column existentes
-- ----------------------------------------------------------------------------

ALTER TABLE marketplace_campaigns
ADD COLUMN IF NOT EXISTS notifications_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notifications_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notifications_count INTEGER DEFAULT 0;

-- ----------------------------------------------------------------------------
-- PARTE 7: FUNCIONES HELPER DE MEDIA
-- Reemplazan FKs circulares cover_media_id / video_brief_id
-- ----------------------------------------------------------------------------

-- Obtener la URL de la cover image de una campaña
CREATE OR REPLACE FUNCTION get_campaign_cover_url(p_campaign_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT cm.file_url
  FROM campaign_media cm
  WHERE cm.campaign_id = p_campaign_id
    AND cm.media_type = 'cover_image'
    AND cm.is_primary = true
    AND cm.is_visible = true
  LIMIT 1;
$$;

-- Obtener la URL del video brief de una campaña
CREATE OR REPLACE FUNCTION get_campaign_video_brief_url(p_campaign_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT cm.file_url
  FROM campaign_media cm
  WHERE cm.campaign_id = p_campaign_id
    AND cm.media_type = 'video_brief'
    AND cm.is_visible = true
  ORDER BY cm.created_at DESC
  LIMIT 1;
$$;

-- Obtener toda la media de una campaña
CREATE OR REPLACE FUNCTION get_campaign_media(p_campaign_id UUID)
RETURNS TABLE(
  id UUID,
  media_type campaign_media_type,
  file_url TEXT,
  thumbnail_url TEXT,
  file_name VARCHAR,
  duration_seconds INTEGER,
  width INTEGER,
  height INTEGER,
  display_order INTEGER,
  is_primary BOOLEAN,
  bunny_video_id VARCHAR
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    cm.id, cm.media_type, cm.file_url, cm.thumbnail_url,
    cm.file_name, cm.duration_seconds, cm.width, cm.height,
    cm.display_order, cm.is_primary, cm.bunny_video_id
  FROM campaign_media cm
  WHERE cm.campaign_id = p_campaign_id
    AND cm.is_visible = true
  ORDER BY cm.display_order ASC, cm.created_at ASC;
$$;

-- ----------------------------------------------------------------------------
-- PARTE 8: FUNCIONES DE VERIFICACIÓN DE MEMBRESÍA
-- Compatibles hacia atrás: sin suscripción = sin restricción
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION can_create_campaigns(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_paid BOOLEAN;
  v_has_any_sub BOOLEAN;
BEGIN
  -- Si no existe ninguna suscripción para este usuario/org/brand,
  -- asumimos que el sistema de suscripciones aún no está activo → permitir
  SELECT EXISTS(
    SELECT 1 FROM subscriptions s
    WHERE (
      s.user_id = p_user_id
      OR s.organization_id IN (
        SELECT om.organization_id FROM organization_members om WHERE om.user_id = p_user_id
      )
      OR s.brand_id IN (
        SELECT bm.brand_id FROM brand_members bm WHERE bm.user_id = p_user_id
      )
    )
    AND s.status IN ('active', 'trial')
  ) INTO v_has_any_sub;

  -- Sin suscripción = sistema no activado = permitir (backwards compatible)
  IF NOT v_has_any_sub THEN
    RETURN true;
  END IF;

  -- Tiene suscripción → verificar que sea paga
  SELECT EXISTS(
    SELECT 1 FROM subscriptions s
    WHERE (
      s.user_id = p_user_id
      OR s.organization_id IN (
        SELECT om.organization_id FROM organization_members om WHERE om.user_id = p_user_id
      )
      OR s.brand_id IN (
        SELECT bm.brand_id FROM brand_members bm WHERE bm.user_id = p_user_id
      )
    )
    AND s.status IN ('active', 'trial')
    AND s.plan_type IN ('starter', 'pro', 'enterprise')
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
  ) INTO v_has_paid;

  RETURN v_has_paid;
END;
$$;

-- Obtener los límites de campaña del usuario (con defaults si no hay suscripción)
CREATE OR REPLACE FUNCTION get_campaign_limits(p_user_id UUID)
RETURNS TABLE(
  max_campaigns_per_month INTEGER,
  max_active_campaigns INTEGER,
  max_creators_per_campaign INTEGER,
  commission_discount_pct DECIMAL,
  plan_type VARCHAR,
  plan_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_subs AS (
    SELECT s.*
    FROM subscriptions s
    WHERE (
      s.user_id = p_user_id
      OR s.organization_id IN (
        SELECT om.organization_id FROM organization_members om WHERE om.user_id = p_user_id
      )
      OR s.brand_id IN (
        SELECT bm.brand_id FROM brand_members bm WHERE bm.user_id = p_user_id
      )
    )
    AND s.status IN ('active', 'trial')
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
    ORDER BY
      CASE s.plan_type
        WHEN 'enterprise' THEN 4
        WHEN 'pro' THEN 3
        WHEN 'starter' THEN 2
        WHEN 'free' THEN 1
        ELSE 0
      END DESC
    LIMIT 1
  )
  SELECT
    COALESCE(us.max_campaigns_per_month,
      CASE us.plan_type
        WHEN 'free' THEN 1
        WHEN 'starter' THEN 5
        WHEN 'pro' THEN 20
        WHEN 'enterprise' THEN 999
        ELSE 999  -- sin suscripción = sin límite
      END
    )::INTEGER,
    COALESCE(us.max_active_campaigns,
      CASE us.plan_type
        WHEN 'free' THEN 1
        WHEN 'starter' THEN 2
        WHEN 'pro' THEN 10
        WHEN 'enterprise' THEN 50
        ELSE 50
      END
    )::INTEGER,
    COALESCE(us.max_creators_per_campaign,
      CASE us.plan_type
        WHEN 'free' THEN 3
        WHEN 'starter' THEN 5
        WHEN 'pro' THEN 20
        WHEN 'enterprise' THEN 100
        ELSE 100
      END
    )::INTEGER,
    COALESCE(us.commission_discount_pct, 0)::DECIMAL,
    us.plan_type::VARCHAR,
    us.plan_name::VARCHAR
  FROM user_subs us;

  -- Si no retornó filas (sin suscripción), devolver defaults generosos
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      999::INTEGER,   -- max campaigns/month
      50::INTEGER,    -- max active
      100::INTEGER,   -- max creators
      0::DECIMAL,     -- no discount
      'none'::VARCHAR,
      'Sin plan'::VARCHAR;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- PARTE 9: FUNCIONES DE MATCHING CREADOR-CAMPAÑA
-- Lee de creator_requirements JSONB + desired_roles (columnas existentes)
-- Usa columnas reales de creator_profiles:
--   display_name, location_country, rating_avg, marketplace_roles,
--   categories, completed_projects
-- ----------------------------------------------------------------------------

-- Función individual: retorna score + razones detalladas (para UI de detalle)
CREATE OR REPLACE FUNCTION calculate_creator_campaign_match(
  p_creator_profile_id UUID,
  p_campaign_id UUID
)
RETURNS TABLE(
  score DECIMAL,
  reasons JSONB,
  is_eligible BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creator RECORD;
  v_campaign RECORD;
  v_score DECIMAL := 0;
  v_max_score DECIMAL := 100;
  v_reasons JSONB := '[]'::JSONB;
  v_is_eligible BOOLEAN := true;
  -- Requisitos extraídos del JSONB
  v_req_categories TEXT[];
  v_req_countries TEXT[];
  v_req_min_rating NUMERIC;
  v_req_min_projects INTEGER;
BEGIN
  -- Obtener datos del creador (columnas REALES de creator_profiles)
  SELECT
    cp.marketplace_roles,
    cp.categories,
    cp.location_country,
    cp.rating_avg,
    cp.completed_projects
  INTO v_creator
  FROM creator_profiles cp
  WHERE cp.id = p_creator_profile_id;

  -- Obtener datos de la campaña + extraer requisitos del JSONB
  SELECT
    mc.desired_roles,
    mc.creator_requirements
  INTO v_campaign
  FROM marketplace_campaigns mc
  WHERE mc.id = p_campaign_id;

  IF v_creator IS NULL OR v_campaign IS NULL THEN
    RETURN QUERY SELECT 0::DECIMAL, '[]'::JSONB, false;
    RETURN;
  END IF;

  -- Extraer requisitos del JSONB existente
  v_req_categories := COALESCE(
    (SELECT array_agg(x.val) FROM jsonb_array_elements_text(
      v_campaign.creator_requirements->'categories'
    ) x(val)),
    '{}'::TEXT[]
  );
  v_req_countries := COALESCE(
    (SELECT array_agg(x.val) FROM jsonb_array_elements_text(
      v_campaign.creator_requirements->'countries'
    ) x(val)),
    '{}'::TEXT[]
  );
  v_req_min_rating := (v_campaign.creator_requirements->>'min_rating')::NUMERIC;
  v_req_min_projects := (v_campaign.creator_requirements->>'min_completed_projects')::INTEGER;

  -- 1. Match por rol (30 puntos max)
  IF v_campaign.desired_roles IS NOT NULL
     AND array_length(v_campaign.desired_roles, 1) > 0 THEN
    IF v_creator.marketplace_roles && v_campaign.desired_roles THEN
      v_score := v_score + 30;
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'role_match', 'points', 30,
        'message', 'Tu rol coincide con lo que busca la campaña'
      );
    ELSE
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'role_mismatch', 'points', 0,
        'message', 'Tu rol no coincide con los requeridos'
      );
    END IF;
  ELSE
    v_score := v_score + 15;
  END IF;

  -- 2. Match por categoría (25 puntos max)
  IF array_length(v_req_categories, 1) > 0 THEN
    IF v_creator.categories && v_req_categories THEN
      v_score := v_score + 25;
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'category_match', 'points', 25,
        'message', 'Tus categorías coinciden con la campaña'
      );
    ELSE
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'category_mismatch', 'points', 0,
        'message', 'Tus categorías no coinciden'
      );
    END IF;
  ELSE
    v_score := v_score + 12;
  END IF;

  -- 3. Match por país (15 puntos max, HARD requirement)
  IF array_length(v_req_countries, 1) > 0 THEN
    IF v_creator.location_country = ANY(v_req_countries) THEN
      v_score := v_score + 15;
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'country_match', 'points', 15,
        'message', 'Tu ubicación es ideal para esta campaña'
      );
    ELSE
      v_is_eligible := false;
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'country_mismatch', 'points', 0,
        'message', 'La campaña requiere creadores de otros países'
      );
    END IF;
  ELSE
    v_score := v_score + 15;
  END IF;

  -- 4. Rating mínimo (15 puntos max, HARD requirement)
  IF v_req_min_rating IS NOT NULL THEN
    IF COALESCE(v_creator.rating_avg, 0) >= v_req_min_rating THEN
      v_score := v_score + 15;
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'rating_match', 'points', 15,
        'message', 'Tu rating cumple con el mínimo requerido'
      );
    ELSE
      v_is_eligible := false;
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'rating_low', 'points', 0,
        'message', format('Se requiere rating mínimo de %s', v_req_min_rating)
      );
    END IF;
  ELSE
    v_score := v_score + 15;
  END IF;

  -- 5. Proyectos completados (15 puntos max)
  IF v_req_min_projects IS NOT NULL THEN
    IF COALESCE(v_creator.completed_projects, 0) >= v_req_min_projects THEN
      v_score := v_score + 15;
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'experience_match', 'points', 15,
        'message', 'Tienes suficiente experiencia en proyectos'
      );
    ELSE
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'experience_low', 'points', 0,
        'message', format('Se requieren mínimo %s proyectos completados', v_req_min_projects)
      );
    END IF;
  ELSE
    v_score := v_score + 15;
  END IF;

  RETURN QUERY SELECT v_score, v_reasons, v_is_eligible;
END;
$$;

-- Función BULK optimizada: query set-based sin CROSS JOIN LATERAL per-row
-- Para obtener creadores elegibles para enviar notificaciones
CREATE OR REPLACE FUNCTION get_eligible_creators_for_campaign(
  p_campaign_id UUID,
  p_min_score DECIMAL DEFAULT 50
)
RETURNS TABLE(
  creator_profile_id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  match_score DECIMAL,
  notification_enabled BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH campaign_reqs AS (
    SELECT
      mc.desired_roles,
      COALESCE(
        (SELECT array_agg(x.val)
         FROM jsonb_array_elements_text(mc.creator_requirements->'categories') x(val)),
        '{}'::TEXT[]
      ) AS req_categories,
      COALESCE(
        (SELECT array_agg(x.val)
         FROM jsonb_array_elements_text(mc.creator_requirements->'countries') x(val)),
        '{}'::TEXT[]
      ) AS req_countries,
      (mc.creator_requirements->>'min_rating')::NUMERIC AS req_min_rating,
      (mc.creator_requirements->>'min_completed_projects')::INTEGER AS req_min_projects
    FROM marketplace_campaigns mc
    WHERE mc.id = p_campaign_id
  ),
  scored AS (
    SELECT
      cp.id,
      cp.user_id,
      cp.display_name,
      cp.avatar_url,
      (
        -- Rol (30 pts)
        CASE
          WHEN cr.desired_roles IS NULL OR array_length(cr.desired_roles, 1) IS NULL THEN 15
          WHEN cp.marketplace_roles && cr.desired_roles THEN 30
          ELSE 0
        END
        +
        -- Categoría (25 pts)
        CASE
          WHEN array_length(cr.req_categories, 1) IS NULL THEN 12
          WHEN cp.categories && cr.req_categories THEN 25
          ELSE 0
        END
        +
        -- País (15 pts)
        CASE
          WHEN array_length(cr.req_countries, 1) IS NULL THEN 15
          WHEN cp.location_country = ANY(cr.req_countries) THEN 15
          ELSE 0
        END
        +
        -- Rating (15 pts)
        CASE
          WHEN cr.req_min_rating IS NULL THEN 15
          WHEN COALESCE(cp.rating_avg, 0) >= cr.req_min_rating THEN 15
          ELSE 0
        END
        +
        -- Proyectos (15 pts)
        CASE
          WHEN cr.req_min_projects IS NULL THEN 15
          WHEN COALESCE(cp.completed_projects, 0) >= cr.req_min_projects THEN 15
          ELSE 0
        END
      )::DECIMAL AS raw_score,
      -- Elegibilidad (hard requirements)
      NOT (
        (cr.req_countries IS NOT NULL AND array_length(cr.req_countries, 1) > 0
         AND NOT (cp.location_country = ANY(cr.req_countries)))
        OR
        (cr.req_min_rating IS NOT NULL
         AND COALESCE(cp.rating_avg, 0) < cr.req_min_rating)
      ) AS is_eligible,
      COALESCE(cnp.notify_new_campaigns, true) AS notif_enabled
    FROM creator_profiles cp
    CROSS JOIN campaign_reqs cr
    LEFT JOIN creator_notification_preferences cnp
      ON cnp.creator_profile_id = cp.id
    WHERE cp.is_active = true
  )
  SELECT
    s.id,
    s.user_id,
    s.display_name,
    s.avatar_url,
    ROUND(s.raw_score, 2),
    s.notif_enabled
  FROM scored s
  WHERE s.is_eligible = true
    AND s.raw_score >= p_min_score
  ORDER BY s.raw_score DESC;
$$;

-- ----------------------------------------------------------------------------
-- PARTE 10: FUNCIÓN SEGURA PARA CREAR NOTIFICACIONES
-- Reemplaza el WITH CHECK (true) inseguro
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_campaign_notification(
  p_user_id UUID,
  p_campaign_id UUID,
  p_notification_type campaign_notification_type,
  p_title VARCHAR,
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_application_id UUID DEFAULT NULL,
  p_invitation_id UUID DEFAULT NULL,
  p_creator_profile_id UUID DEFAULT NULL,
  p_match_score DECIMAL DEFAULT NULL,
  p_match_reasons JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
  v_prefs RECORD;
BEGIN
  -- Verificar preferencias del creador
  IF p_creator_profile_id IS NOT NULL THEN
    SELECT * INTO v_prefs
    FROM creator_notification_preferences
    WHERE creator_profile_id = p_creator_profile_id;

    -- Respetar preferencias si existen
    IF v_prefs IS NOT NULL THEN
      CASE p_notification_type
        WHEN 'new_campaign' THEN
          IF NOT v_prefs.notify_new_campaigns THEN RETURN NULL; END IF;
        WHEN 'campaign_invitation' THEN
          IF NOT v_prefs.notify_invitations THEN RETURN NULL; END IF;
        WHEN 'application_status' THEN
          IF NOT v_prefs.notify_application_updates THEN RETURN NULL; END IF;
        WHEN 'payment_released' THEN
          IF NOT v_prefs.notify_payments THEN RETURN NULL; END IF;
        WHEN 'campaign_reminder' THEN
          IF NOT v_prefs.notify_reminders THEN RETURN NULL; END IF;
        ELSE
          NULL; -- counter_offer, deliverable_feedback siempre se envían
      END CASE;
    END IF;
  END IF;

  INSERT INTO campaign_notifications (
    user_id, creator_profile_id, campaign_id, application_id, invitation_id,
    notification_type, title, message, data,
    match_score, match_reasons,
    send_push, send_email, send_in_app
  ) VALUES (
    p_user_id, p_creator_profile_id, p_campaign_id, p_application_id, p_invitation_id,
    p_notification_type, p_title, p_message, p_data,
    p_match_score, p_match_reasons,
    COALESCE(v_prefs.push_enabled, true),
    COALESCE(v_prefs.email_enabled, true),
    true
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- PARTE 11: RLS POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE campaign_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ---- campaign_media ----

CREATE POLICY "campaign_media_select"
  ON campaign_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_campaigns mc
      WHERE mc.id = campaign_media.campaign_id
      AND can_see_campaign(mc.id, auth.uid())
    )
  );

CREATE POLICY "campaign_media_insert"
  ON campaign_media FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM marketplace_campaigns mc
      WHERE mc.id = campaign_media.campaign_id
      AND (
        mc.created_by = auth.uid()
        OR is_brand_admin(mc.brand_id)
        OR is_org_admin(mc.organization_id)
      )
    )
  );

CREATE POLICY "campaign_media_update"
  ON campaign_media FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_campaigns mc
      WHERE mc.id = campaign_media.campaign_id
      AND (
        mc.created_by = auth.uid()
        OR is_brand_admin(mc.brand_id)
        OR is_org_admin(mc.organization_id)
      )
    )
  );

CREATE POLICY "campaign_media_delete"
  ON campaign_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_campaigns mc
      WHERE mc.id = campaign_media.campaign_id
      AND (
        mc.created_by = auth.uid()
        OR is_brand_admin(mc.brand_id)
        OR is_org_admin(mc.organization_id)
      )
    )
  );

-- ---- campaign_notifications ----

CREATE POLICY "campaign_notif_select_own"
  ON campaign_notifications FOR SELECT
  USING (user_id = auth.uid());

-- INSERT restringido: usuarios solo pueden crearse notificaciones a sí mismos.
-- Las notificaciones para OTROS usuarios se crean via create_campaign_notification()
-- (SECURITY DEFINER) o via Edge Functions con service_role.
CREATE POLICY "campaign_notif_insert_own"
  ON campaign_notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "campaign_notif_update_own"
  ON campaign_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- creator_notification_preferences ----
-- Una sola política FOR ALL cubre SELECT, INSERT, UPDATE, DELETE

CREATE POLICY "creator_notif_prefs_all"
  ON creator_notification_preferences FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM creator_profiles cp
      WHERE cp.id = creator_notification_preferences.creator_profile_id
      AND cp.user_id = auth.uid()
    )
  );

-- ---- subscriptions ----
-- Solo lectura via RLS. Escritura exclusivamente via service_role o SECURITY DEFINER.

CREATE POLICY "subscriptions_select"
  ON subscriptions FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = subscriptions.organization_id
      AND om.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM brand_members bm
      WHERE bm.brand_id = subscriptions.brand_id
      AND bm.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies para subscriptions:
-- La gestión de suscripciones es exclusiva del backend (service_role / webhooks de Stripe)

-- ----------------------------------------------------------------------------
-- PARTE 12: GRANTS
-- ----------------------------------------------------------------------------

GRANT ALL ON campaign_media TO authenticated;
GRANT ALL ON campaign_notifications TO authenticated;
GRANT ALL ON creator_notification_preferences TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;

GRANT SELECT ON campaign_media TO anon;

GRANT EXECUTE ON FUNCTION get_campaign_cover_url(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_campaign_video_brief_url(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_campaign_media(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_create_campaigns(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_limits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_creator_campaign_match(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eligible_creators_for_campaign(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION create_campaign_notification(UUID, UUID, campaign_notification_type, VARCHAR, TEXT, JSONB, UUID, UUID, UUID, DECIMAL, JSONB) TO authenticated;
