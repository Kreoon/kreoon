-- ============================================
-- STREAMING V2 - COMPLETE REWRITE
-- Migración: 20260227184928_streaming_v2_complete.sql
-- Descripción: Hub profesional de Live Streaming + Live Shopping
-- ============================================

-- Extensión necesaria para gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================
-- TIPOS ENUM
-- ============================================

DO $$ BEGIN
  CREATE TYPE streaming_platform_type AS ENUM (
    'youtube', 'tiktok', 'instagram', 'facebook', 'twitch',
    'linkedin', 'twitter', 'custom_rtmp', 'kreoon_native'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE streaming_session_type AS ENUM (
    'standard', 'live_shopping', 'interview', 'webinar', 'launch', 'multi_creator'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE streaming_session_status AS ENUM (
    'draft', 'scheduled', 'pre_live', 'live', 'paused', 'ended', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE streaming_channel_status AS ENUM (
    'pending', 'connecting', 'live', 'error', 'ended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE streaming_guest_status AS ENUM (
    'invited', 'accepted', 'connected', 'on_screen', 'off_screen', 'disconnected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE streaming_overlay_type AS ENUM (
    'banner', 'lower_third', 'full_screen', 'countdown', 'poll',
    'product_card', 'alert', 'logo', 'social_proof', 'ticker', 'custom_html'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE streaming_chat_message_type AS ENUM (
    'text', 'emoji', 'gif', 'product_mention', 'purchase_notification',
    'poll_vote', 'question', 'pinned', 'system', 'donation'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TABLA: streaming_channels_v2
-- Destinos de streaming configurados por org
-- ============================================

CREATE TABLE IF NOT EXISTS streaming_channels_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Plataforma
  platform streaming_platform_type NOT NULL,
  platform_display_name TEXT NOT NULL,

  -- Credenciales RTMP
  rtmp_url TEXT,
  rtmp_key_encrypted TEXT,
  backup_rtmp_url TEXT,

  -- OAuth (para plataformas que lo soporten)
  oauth_token_encrypted TEXT,
  oauth_refresh_token_encrypted TEXT,
  oauth_expires_at TIMESTAMPTZ,
  platform_user_id TEXT,
  platform_username TEXT,

  -- Config
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  max_resolution TEXT DEFAULT '1080p',
  max_bitrate INTEGER DEFAULT 6000,

  -- Metadata
  custom_overlay_url TEXT,
  channel_logo_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- TABLA: streaming_sessions_v2
-- Cada transmisión en vivo
-- ============================================

CREATE TABLE IF NOT EXISTS streaming_sessions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Tipo de sesión
  session_type streaming_session_type NOT NULL DEFAULT 'standard',

  -- Info básica
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Estado
  status streaming_session_status NOT NULL DEFAULT 'draft',

  -- Configuración técnica
  stream_settings JSONB DEFAULT '{
    "resolution": "1080p",
    "fps": 30,
    "bitrate": 6000,
    "encoder": "browser",
    "audio_bitrate": 128,
    "latency_mode": "normal"
  }'::jsonb,

  -- OBS Integration
  obs_connected BOOLEAN DEFAULT false,
  obs_websocket_url TEXT,
  obs_current_scene TEXT,

  -- Métricas en tiempo real
  peak_viewers INTEGER DEFAULT 0,
  total_viewers INTEGER DEFAULT 0,
  avg_watch_time_seconds INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_reactions INTEGER DEFAULT 0,

  -- Live Shopping específico
  is_shopping_enabled BOOLEAN DEFAULT false,
  total_revenue_usd NUMERIC(12,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,4) DEFAULT 0,

  -- IA
  ai_script_id UUID,
  ai_suggestions JSONB DEFAULT '[]'::jsonb,

  -- Grabación
  recording_url TEXT,
  recording_bunny_id TEXT,
  recording_duration_seconds INTEGER,

  -- Relaciones
  host_user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id),
  product_id UUID REFERENCES products(id),
  campaign_id UUID REFERENCES marketplace_campaigns(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: streaming_session_channels_v2
-- Relación N:N entre sesiones y canales destino
-- ============================================

CREATE TABLE IF NOT EXISTS streaming_session_channels_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES streaming_sessions_v2(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES streaming_channels_v2(id) ON DELETE CASCADE,

  -- Estado por canal
  status streaming_channel_status DEFAULT 'pending',
  error_message TEXT,

  -- Métricas por canal
  viewers_current INTEGER DEFAULT 0,
  viewers_peak INTEGER DEFAULT 0,
  messages_count INTEGER DEFAULT 0,

  -- Platform-specific stream ID
  platform_stream_id TEXT,
  platform_broadcast_url TEXT,

  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  UNIQUE(session_id, channel_id)
);

-- ============================================
-- TABLA: streaming_guests_v2
-- Guests/co-hosts invitados a la sesión
-- ============================================

CREATE TABLE IF NOT EXISTS streaming_guests_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES streaming_sessions_v2(id) ON DELETE CASCADE,

  -- Guest info
  user_id UUID REFERENCES auth.users(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_avatar_url TEXT,

  -- Estado
  status streaming_guest_status DEFAULT 'invited',

  -- Permisos
  can_share_screen BOOLEAN DEFAULT false,
  can_share_audio BOOLEAN DEFAULT true,
  can_share_video BOOLEAN DEFAULT true,
  can_manage_products BOOLEAN DEFAULT false,

  -- Conexión
  join_token TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: streaming_products_v2
-- Productos disponibles durante live shopping
-- ============================================

CREATE TABLE IF NOT EXISTS streaming_products_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES streaming_sessions_v2(id) ON DELETE CASCADE,

  -- Producto
  product_id UUID REFERENCES products(id),
  external_product_url TEXT,

  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Pricing (todo en USD internamente)
  original_price_usd NUMERIC(10,2) NOT NULL,
  live_price_usd NUMERIC(10,2),
  discount_percentage INTEGER,

  -- Stock
  total_stock INTEGER,
  reserved_stock INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,

  -- Estado en el live
  is_featured BOOLEAN DEFAULT false,
  featured_at TIMESTAMPTZ,
  display_order INTEGER DEFAULT 0,

  -- Ofertas flash
  flash_offer_active BOOLEAN DEFAULT false,
  flash_offer_price_usd NUMERIC(10,2),
  flash_offer_ends_at TIMESTAMPTZ,
  flash_offer_stock INTEGER,

  -- CTA
  cta_text TEXT DEFAULT 'Comprar ahora',
  cta_url TEXT,

  -- Métricas
  clicks INTEGER DEFAULT 0,
  add_to_cart_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  revenue_usd NUMERIC(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: streaming_chat_messages_v2
-- Chat unificado multi-plataforma
-- ============================================

CREATE TABLE IF NOT EXISTS streaming_chat_messages_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES streaming_sessions_v2(id) ON DELETE CASCADE,

  -- Origen
  source_platform TEXT NOT NULL DEFAULT 'kreoon',
  source_message_id TEXT,

  -- Autor
  user_id UUID REFERENCES auth.users(id),
  author_name TEXT NOT NULL,
  author_avatar_url TEXT,
  author_platform_id TEXT,
  is_moderator BOOLEAN DEFAULT false,
  is_host BOOLEAN DEFAULT false,

  -- Mensaje
  message_type streaming_chat_message_type DEFAULT 'text',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Moderación
  is_hidden BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  pinned_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: streaming_overlays_v2
-- Overlays y elementos visuales
-- ============================================

CREATE TABLE IF NOT EXISTS streaming_overlays_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  overlay_type streaming_overlay_type NOT NULL,

  -- Contenido (estructura varía por tipo)
  content JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Dimensiones
  width INTEGER,
  height INTEGER,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  z_index INTEGER DEFAULT 1,

  -- Estado
  is_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT false,

  -- Animación
  enter_animation TEXT DEFAULT 'fadeIn',
  exit_animation TEXT DEFAULT 'fadeOut',
  auto_hide_seconds INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: streaming_analytics_v2
-- Métricas granulares por minuto
-- ============================================

CREATE TABLE IF NOT EXISTS streaming_analytics_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES streaming_sessions_v2(id) ON DELETE CASCADE,

  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Viewers
  concurrent_viewers INTEGER DEFAULT 0,
  new_viewers INTEGER DEFAULT 0,

  -- Engagement
  messages_count INTEGER DEFAULT 0,
  reactions_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,

  -- Shopping
  product_clicks INTEGER DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue_usd NUMERIC(10,2) DEFAULT 0,

  -- Por plataforma
  platform_breakdown JSONB DEFAULT '{}'::jsonb,

  -- Producto featured en este momento
  featured_product_id UUID REFERENCES streaming_products_v2(id)
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_streaming_channels_v2_org ON streaming_channels_v2(organization_id);
CREATE INDEX IF NOT EXISTS idx_streaming_channels_v2_platform ON streaming_channels_v2(platform);
CREATE INDEX IF NOT EXISTS idx_streaming_channels_v2_active ON streaming_channels_v2(organization_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_streaming_sessions_v2_org ON streaming_sessions_v2(organization_id);
CREATE INDEX IF NOT EXISTS idx_streaming_sessions_v2_status ON streaming_sessions_v2(status);
CREATE INDEX IF NOT EXISTS idx_streaming_sessions_v2_scheduled ON streaming_sessions_v2(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_streaming_sessions_v2_live ON streaming_sessions_v2(organization_id) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS idx_streaming_sessions_v2_host ON streaming_sessions_v2(host_user_id);
CREATE INDEX IF NOT EXISTS idx_streaming_sessions_v2_client ON streaming_sessions_v2(client_id);

CREATE INDEX IF NOT EXISTS idx_session_channels_v2_session ON streaming_session_channels_v2(session_id);
CREATE INDEX IF NOT EXISTS idx_session_channels_v2_channel ON streaming_session_channels_v2(channel_id);

CREATE INDEX IF NOT EXISTS idx_streaming_guests_v2_session ON streaming_guests_v2(session_id);
CREATE INDEX IF NOT EXISTS idx_streaming_guests_v2_user ON streaming_guests_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_streaming_guests_v2_token ON streaming_guests_v2(join_token);

CREATE INDEX IF NOT EXISTS idx_streaming_products_v2_session ON streaming_products_v2(session_id);
CREATE INDEX IF NOT EXISTS idx_streaming_products_v2_featured ON streaming_products_v2(session_id) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_streaming_products_v2_flash ON streaming_products_v2(session_id) WHERE flash_offer_active = true;

CREATE INDEX IF NOT EXISTS idx_streaming_chat_v2_session ON streaming_chat_messages_v2(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_streaming_chat_v2_pinned ON streaming_chat_messages_v2(session_id) WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_streaming_overlays_v2_org ON streaming_overlays_v2(organization_id);
CREATE INDEX IF NOT EXISTS idx_streaming_overlays_v2_template ON streaming_overlays_v2(organization_id) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_streaming_overlays_v2_active ON streaming_overlays_v2(organization_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_streaming_analytics_v2_session ON streaming_analytics_v2(session_id, timestamp DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE streaming_channels_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_sessions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_session_channels_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_guests_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_products_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_chat_messages_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_overlays_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_analytics_v2 ENABLE ROW LEVEL SECURITY;

-- Helper function para verificar membresía
CREATE OR REPLACE FUNCTION is_streaming_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- streaming_channels_v2 policies
CREATE POLICY "streaming_channels_v2_select" ON streaming_channels_v2
FOR SELECT TO authenticated
USING (is_streaming_org_member(organization_id));

CREATE POLICY "streaming_channels_v2_insert" ON streaming_channels_v2
FOR INSERT TO authenticated
WITH CHECK (is_streaming_org_member(organization_id));

CREATE POLICY "streaming_channels_v2_update" ON streaming_channels_v2
FOR UPDATE TO authenticated
USING (is_streaming_org_member(organization_id));

CREATE POLICY "streaming_channels_v2_delete" ON streaming_channels_v2
FOR DELETE TO authenticated
USING (is_streaming_org_member(organization_id));

-- streaming_sessions_v2 policies
CREATE POLICY "streaming_sessions_v2_select" ON streaming_sessions_v2
FOR SELECT TO authenticated
USING (is_streaming_org_member(organization_id));

CREATE POLICY "streaming_sessions_v2_insert" ON streaming_sessions_v2
FOR INSERT TO authenticated
WITH CHECK (is_streaming_org_member(organization_id));

CREATE POLICY "streaming_sessions_v2_update" ON streaming_sessions_v2
FOR UPDATE TO authenticated
USING (is_streaming_org_member(organization_id));

CREATE POLICY "streaming_sessions_v2_delete" ON streaming_sessions_v2
FOR DELETE TO authenticated
USING (is_streaming_org_member(organization_id));

-- streaming_session_channels_v2 policies (based on session org)
CREATE POLICY "streaming_session_channels_v2_select" ON streaming_session_channels_v2
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM streaming_sessions_v2 s
  WHERE s.id = session_id AND is_streaming_org_member(s.organization_id)
));

CREATE POLICY "streaming_session_channels_v2_all" ON streaming_session_channels_v2
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM streaming_sessions_v2 s
  WHERE s.id = session_id AND is_streaming_org_member(s.organization_id)
));

-- streaming_guests_v2 policies
CREATE POLICY "streaming_guests_v2_select" ON streaming_guests_v2
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM streaming_sessions_v2 s
    WHERE s.id = session_id AND is_streaming_org_member(s.organization_id)
  )
);

CREATE POLICY "streaming_guests_v2_all" ON streaming_guests_v2
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM streaming_sessions_v2 s
  WHERE s.id = session_id AND is_streaming_org_member(s.organization_id)
));

-- streaming_products_v2 policies
CREATE POLICY "streaming_products_v2_select" ON streaming_products_v2
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM streaming_sessions_v2 s
  WHERE s.id = session_id AND is_streaming_org_member(s.organization_id)
));

CREATE POLICY "streaming_products_v2_all" ON streaming_products_v2
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM streaming_sessions_v2 s
  WHERE s.id = session_id AND is_streaming_org_member(s.organization_id)
));

-- streaming_chat_messages_v2 policies (más permisivas para viewers)
CREATE POLICY "streaming_chat_v2_select" ON streaming_chat_messages_v2
FOR SELECT TO authenticated
USING (true); -- Cualquier usuario autenticado puede ver el chat

CREATE POLICY "streaming_chat_v2_insert" ON streaming_chat_messages_v2
FOR INSERT TO authenticated
WITH CHECK (true); -- Cualquier usuario autenticado puede escribir

CREATE POLICY "streaming_chat_v2_update" ON streaming_chat_messages_v2
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM streaming_sessions_v2 s
    WHERE s.id = session_id AND is_streaming_org_member(s.organization_id)
  )
);

-- streaming_overlays_v2 policies
CREATE POLICY "streaming_overlays_v2_select" ON streaming_overlays_v2
FOR SELECT TO authenticated
USING (is_streaming_org_member(organization_id));

CREATE POLICY "streaming_overlays_v2_all" ON streaming_overlays_v2
FOR ALL TO authenticated
USING (is_streaming_org_member(organization_id));

-- streaming_analytics_v2 policies
CREATE POLICY "streaming_analytics_v2_select" ON streaming_analytics_v2
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM streaming_sessions_v2 s
  WHERE s.id = session_id AND is_streaming_org_member(s.organization_id)
));

CREATE POLICY "streaming_analytics_v2_insert" ON streaming_analytics_v2
FOR INSERT TO service_role
WITH CHECK (true);

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL ON streaming_channels_v2 TO authenticated;
GRANT ALL ON streaming_channels_v2 TO service_role;

GRANT ALL ON streaming_sessions_v2 TO authenticated;
GRANT ALL ON streaming_sessions_v2 TO service_role;

GRANT ALL ON streaming_session_channels_v2 TO authenticated;
GRANT ALL ON streaming_session_channels_v2 TO service_role;

GRANT ALL ON streaming_guests_v2 TO authenticated;
GRANT ALL ON streaming_guests_v2 TO service_role;

GRANT ALL ON streaming_products_v2 TO authenticated;
GRANT ALL ON streaming_products_v2 TO service_role;

GRANT ALL ON streaming_chat_messages_v2 TO authenticated;
GRANT ALL ON streaming_chat_messages_v2 TO service_role;

GRANT ALL ON streaming_overlays_v2 TO authenticated;
GRANT ALL ON streaming_overlays_v2 TO service_role;

GRANT ALL ON streaming_analytics_v2 TO authenticated;
GRANT ALL ON streaming_analytics_v2 TO service_role;

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para obtener sesiones de una org con métricas
CREATE OR REPLACE FUNCTION get_org_streaming_sessions(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  session_type streaming_session_type,
  status streaming_session_status,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  peak_viewers INTEGER,
  total_revenue_usd NUMERIC,
  is_shopping_enabled BOOLEAN,
  host_name TEXT,
  channels_count BIGINT,
  products_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.session_type,
    s.status,
    s.scheduled_at,
    s.started_at,
    s.ended_at,
    s.peak_viewers,
    s.total_revenue_usd,
    s.is_shopping_enabled,
    p.full_name as host_name,
    (SELECT COUNT(*) FROM streaming_session_channels_v2 sc WHERE sc.session_id = s.id) as channels_count,
    (SELECT COUNT(*) FROM streaming_products_v2 sp WHERE sp.session_id = s.id) as products_count
  FROM streaming_sessions_v2 s
  LEFT JOIN profiles p ON p.id = s.host_user_id
  WHERE s.organization_id = p_organization_id
  ORDER BY
    CASE WHEN s.status = 'live' THEN 0
         WHEN s.status = 'scheduled' THEN 1
         ELSE 2 END,
    COALESCE(s.scheduled_at, s.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener analytics agregado de una sesión
CREATE OR REPLACE FUNCTION get_session_analytics_summary(p_session_id UUID)
RETURNS TABLE (
  total_minutes INTEGER,
  peak_viewers INTEGER,
  avg_viewers INTEGER,
  total_messages INTEGER,
  total_purchases INTEGER,
  total_revenue NUMERIC,
  top_products JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_minutes,
    MAX(a.concurrent_viewers) as peak_viewers,
    AVG(a.concurrent_viewers)::INTEGER as avg_viewers,
    SUM(a.messages_count)::INTEGER as total_messages,
    SUM(a.purchases)::INTEGER as total_purchases,
    SUM(a.revenue_usd) as total_revenue,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'revenue', p.revenue_usd,
        'purchases', p.purchase_count
      ) ORDER BY p.revenue_usd DESC)
      FROM streaming_products_v2 p
      WHERE p.session_id = p_session_id
      LIMIT 5
    ) as top_products
  FROM streaming_analytics_v2 a
  WHERE a.session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para feature un producto (atomico)
CREATE OR REPLACE FUNCTION feature_streaming_product(
  p_session_id UUID,
  p_product_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Quitar featured de todos los demás
  UPDATE streaming_products_v2
  SET is_featured = false, featured_at = NULL
  WHERE session_id = p_session_id AND id != p_product_id;

  -- Poner featured al seleccionado
  UPDATE streaming_products_v2
  SET is_featured = true, featured_at = NOW()
  WHERE id = p_product_id AND session_id = p_session_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear flash offer
CREATE OR REPLACE FUNCTION create_flash_offer(
  p_product_id UUID,
  p_flash_price NUMERIC,
  p_duration_minutes INTEGER,
  p_stock INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE streaming_products_v2
  SET
    flash_offer_active = true,
    flash_offer_price_usd = p_flash_price,
    flash_offer_ends_at = NOW() + (p_duration_minutes || ' minutes')::INTERVAL,
    flash_offer_stock = COALESCE(p_stock, total_stock)
  WHERE id = p_product_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para registrar compra en live shopping
CREATE OR REPLACE FUNCTION record_live_shopping_purchase(
  p_session_id UUID,
  p_product_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_amount_usd NUMERIC DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
  v_session streaming_sessions_v2%ROWTYPE;
  v_product streaming_products_v2%ROWTYPE;
BEGIN
  -- Obtener sesión
  SELECT * INTO v_session FROM streaming_sessions_v2 WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Obtener producto
  SELECT * INTO v_product FROM streaming_products_v2 WHERE id = p_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Actualizar producto
  UPDATE streaming_products_v2
  SET
    sold_count = sold_count + p_quantity,
    purchase_count = purchase_count + 1,
    revenue_usd = revenue_usd + p_amount_usd,
    -- Reducir flash offer stock si aplica
    flash_offer_stock = CASE
      WHEN flash_offer_active AND flash_offer_stock IS NOT NULL
      THEN GREATEST(0, flash_offer_stock - p_quantity)
      ELSE flash_offer_stock
    END,
    -- Desactivar flash offer si se agota stock
    flash_offer_active = CASE
      WHEN flash_offer_active AND flash_offer_stock IS NOT NULL AND flash_offer_stock - p_quantity <= 0
      THEN false
      ELSE flash_offer_active
    END
  WHERE id = p_product_id;

  -- Actualizar sesión
  UPDATE streaming_sessions_v2
  SET
    total_orders = total_orders + 1,
    total_revenue_usd = total_revenue_usd + p_amount_usd
  WHERE id = p_session_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_org_streaming_sessions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_analytics_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION feature_streaming_product(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_flash_offer(UUID, NUMERIC, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION record_live_shopping_purchase(UUID, UUID, INTEGER, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION is_streaming_org_member(UUID) TO authenticated;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION streaming_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER streaming_channels_v2_updated_at
  BEFORE UPDATE ON streaming_channels_v2
  FOR EACH ROW EXECUTE FUNCTION streaming_update_timestamp();

CREATE TRIGGER streaming_sessions_v2_updated_at
  BEFORE UPDATE ON streaming_sessions_v2
  FOR EACH ROW EXECUTE FUNCTION streaming_update_timestamp();

CREATE TRIGGER streaming_overlays_v2_updated_at
  BEFORE UPDATE ON streaming_overlays_v2
  FOR EACH ROW EXECUTE FUNCTION streaming_update_timestamp();

-- ============================================
-- Notificar a PostgREST
-- ============================================
NOTIFY pgrst, 'reload schema';
