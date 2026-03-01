-- ============================================================================
-- KREOON LIVE STREAMING DIRECT
-- Sistema de transmisión en vivo desde el navegador con Cloudflare Stream
-- Migración: 20260228200000_live_streaming_direct.sql
-- ============================================================================

-- ============================================================================
-- PARTE 1: ENUM PARA ESTADO DEL STREAM
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE live_stream_status AS ENUM (
        'idle',         -- Sin transmitir
        'connecting',   -- Conectando a Cloudflare
        'live',         -- En vivo
        'ending',       -- Terminando
        'ended'         -- Finalizado
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PARTE 2: TABLA creator_live_streams
-- Streams de creadores
-- ============================================================================

CREATE TABLE IF NOT EXISTS creator_live_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relaciones
    creator_profile_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    -- Cloudflare Stream
    cf_live_input_id TEXT,              -- ID del Live Input en Cloudflare
    cf_stream_key TEXT,                 -- Clave RTMPS
    cf_whip_url TEXT,                   -- URL WebRTC (WHIP) para transmitir
    cf_playback_url TEXT,               -- URL HLS para viewers
    cf_playback_url_webrtc TEXT,        -- URL WebRTC para viewers (baja latencia)
    cf_thumbnail_url TEXT,              -- Thumbnail generado por Cloudflare
    cf_recording_uid TEXT,              -- ID de la grabación cuando termina

    -- Estado
    status live_stream_status NOT NULL DEFAULT 'idle',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,           -- Para lives programados

    -- Información
    title TEXT NOT NULL DEFAULT 'En Vivo',
    description TEXT,
    thumbnail_url TEXT,                 -- Thumbnail personalizado
    category TEXT,                      -- gaming, music, talk, shopping, etc.
    tags TEXT[] DEFAULT '{}',

    -- Configuración
    is_shopping_enabled BOOLEAN DEFAULT false,
    max_duration_minutes INTEGER DEFAULT 240,
    allow_comments BOOLEAN DEFAULT true,
    allow_reactions BOOLEAN DEFAULT true,
    is_unlisted BOOLEAN DEFAULT false,
    is_mature_content BOOLEAN DEFAULT false,

    -- Métricas en tiempo real
    current_viewers INTEGER DEFAULT 0,
    peak_viewers INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    total_unique_viewers INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,

    -- Duración
    duration_seconds INTEGER DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_live_streams_user ON creator_live_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_creator ON creator_live_streams(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON creator_live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_live ON creator_live_streams(status) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS idx_live_streams_cf_input ON creator_live_streams(cf_live_input_id);

-- ============================================================================
-- PARTE 3: TABLA live_stream_viewers
-- Tracking de viewers
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_stream_viewers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    stream_id UUID NOT NULL REFERENCES creator_live_streams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Session tracking (para anónimos)
    session_id TEXT NOT NULL,

    -- Tiempos
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    last_ping_at TIMESTAMPTZ DEFAULT NOW(),

    -- Métricas
    watch_duration_seconds INTEGER DEFAULT 0,

    -- Info
    ip_country TEXT,
    device_type TEXT,           -- mobile, desktop, tablet

    UNIQUE(stream_id, session_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_live_viewers_stream ON live_stream_viewers(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_viewers_active ON live_stream_viewers(stream_id, left_at) WHERE left_at IS NULL;

-- ============================================================================
-- PARTE 4: TABLA live_stream_comments
-- Chat del live
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_stream_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    stream_id UUID NOT NULL REFERENCES creator_live_streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Contenido
    message TEXT NOT NULL,

    -- Estado
    is_pinned BOOLEAN DEFAULT false,
    is_highlighted BOOLEAN DEFAULT false,   -- Para super chats/donaciones
    is_deleted BOOLEAN DEFAULT false,

    -- Donación (si aplica)
    donation_amount_usd DECIMAL(10,2),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_live_comments_stream ON live_stream_comments(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_comments_stream_time ON live_stream_comments(stream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_comments_pinned ON live_stream_comments(stream_id) WHERE is_pinned = true;

-- ============================================================================
-- PARTE 5: TABLA live_stream_reactions
-- Reacciones del live
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_stream_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    stream_id UUID NOT NULL REFERENCES creator_live_streams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,            -- Para anónimos

    -- Reacción
    reaction_type TEXT NOT NULL,  -- like, love, fire, clap, wow, sad

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_live_reactions_stream ON live_stream_reactions(stream_id);

-- ============================================================================
-- PARTE 6: TABLA live_stream_products
-- Productos destacados durante el live (Live Shopping)
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_stream_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    stream_id UUID NOT NULL REFERENCES creator_live_streams(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,

    -- Info del producto (cache para rendimiento)
    product_name TEXT NOT NULL,
    product_image_url TEXT,
    product_price_usd DECIMAL(10,2),
    product_url TEXT,

    -- Estado
    is_featured BOOLEAN DEFAULT false,
    featured_at TIMESTAMPTZ,
    display_order INTEGER DEFAULT 0,

    -- Métricas
    clicks INTEGER DEFAULT 0,
    purchases INTEGER DEFAULT 0,
    revenue_usd DECIMAL(10,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_live_products_stream ON live_stream_products(stream_id);

-- ============================================================================
-- PARTE 7: TRIGGERS
-- ============================================================================

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_live_stream_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_live_streams_updated ON creator_live_streams;
CREATE TRIGGER trg_live_streams_updated
    BEFORE UPDATE ON creator_live_streams
    FOR EACH ROW EXECUTE FUNCTION update_live_stream_timestamp();

-- Trigger para actualizar métricas cuando viewer se une/sale
CREATE OR REPLACE FUNCTION update_live_stream_viewers_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE creator_live_streams
        SET current_viewers = current_viewers + 1,
            total_views = total_views + 1,
            peak_viewers = GREATEST(peak_viewers, current_viewers + 1)
        WHERE id = NEW.stream_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.left_at IS NULL AND NEW.left_at IS NOT NULL THEN
        UPDATE creator_live_streams
        SET current_viewers = GREATEST(0, current_viewers - 1)
        WHERE id = NEW.stream_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_viewers_count ON live_stream_viewers;
CREATE TRIGGER trg_update_viewers_count
    AFTER INSERT OR UPDATE ON live_stream_viewers
    FOR EACH ROW EXECUTE FUNCTION update_live_stream_viewers_count();

-- Trigger para contar likes
CREATE OR REPLACE FUNCTION update_live_stream_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reaction_type = 'like' THEN
        UPDATE creator_live_streams
        SET total_likes = total_likes + 1
        WHERE id = NEW.stream_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_likes_count ON live_stream_reactions;
CREATE TRIGGER trg_update_likes_count
    AFTER INSERT ON live_stream_reactions
    FOR EACH ROW EXECUTE FUNCTION update_live_stream_likes_count();

-- Trigger para contar comentarios
CREATE OR REPLACE FUNCTION update_live_stream_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE creator_live_streams
    SET total_comments = total_comments + 1
    WHERE id = NEW.stream_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_comments_count ON live_stream_comments;
CREATE TRIGGER trg_update_comments_count
    AFTER INSERT ON live_stream_comments
    FOR EACH ROW EXECUTE FUNCTION update_live_stream_comments_count();

-- ============================================================================
-- PARTE 8: RLS POLICIES
-- ============================================================================

ALTER TABLE creator_live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_stream_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_stream_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_stream_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_stream_products ENABLE ROW LEVEL SECURITY;

-- Policies para creator_live_streams
CREATE POLICY "anyone_can_view_public_lives" ON creator_live_streams
    FOR SELECT TO authenticated, anon
    USING (
        status = 'live' AND is_unlisted = false
        OR user_id = auth.uid()
    );

CREATE POLICY "creator_can_manage_own_streams" ON creator_live_streams
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policies para live_stream_viewers
CREATE POLICY "anyone_can_join_live" ON live_stream_viewers
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM creator_live_streams
            WHERE id = stream_id AND status = 'live'
        )
    );

CREATE POLICY "update_own_viewer_session" ON live_stream_viewers
    FOR UPDATE TO authenticated, anon
    USING (session_id = session_id);

CREATE POLICY "creator_can_view_viewers" ON live_stream_viewers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM creator_live_streams
            WHERE id = stream_id AND user_id = auth.uid()
        )
    );

-- Policies para live_stream_comments
CREATE POLICY "anyone_can_view_comments" ON live_stream_comments
    FOR SELECT TO authenticated, anon
    USING (is_deleted = false);

CREATE POLICY "authenticated_can_comment" ON live_stream_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM creator_live_streams
            WHERE id = stream_id AND status = 'live' AND allow_comments = true
        )
    );

CREATE POLICY "creator_can_manage_comments" ON live_stream_comments
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM creator_live_streams
            WHERE id = stream_id AND user_id = auth.uid()
        )
    );

-- Policies para live_stream_reactions
CREATE POLICY "anyone_can_react" ON live_stream_reactions
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM creator_live_streams
            WHERE id = stream_id AND status = 'live' AND allow_reactions = true
        )
    );

CREATE POLICY "anyone_can_view_reactions" ON live_stream_reactions
    FOR SELECT TO authenticated, anon
    USING (true);

-- Policies para live_stream_products
CREATE POLICY "anyone_can_view_live_products" ON live_stream_products
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "creator_can_manage_products" ON live_stream_products
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM creator_live_streams
            WHERE id = stream_id AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM creator_live_streams
            WHERE id = stream_id AND user_id = auth.uid()
        )
    );

-- ============================================================================
-- PARTE 9: GRANTS
-- ============================================================================

GRANT ALL ON creator_live_streams TO authenticated;
GRANT ALL ON creator_live_streams TO service_role;
GRANT SELECT ON creator_live_streams TO anon;

GRANT ALL ON live_stream_viewers TO authenticated;
GRANT ALL ON live_stream_viewers TO service_role;
GRANT INSERT, UPDATE ON live_stream_viewers TO anon;

GRANT ALL ON live_stream_comments TO authenticated;
GRANT ALL ON live_stream_comments TO service_role;
GRANT SELECT ON live_stream_comments TO anon;

GRANT ALL ON live_stream_reactions TO authenticated;
GRANT ALL ON live_stream_reactions TO service_role;
GRANT SELECT, INSERT ON live_stream_reactions TO anon;

GRANT ALL ON live_stream_products TO authenticated;
GRANT ALL ON live_stream_products TO service_role;
GRANT SELECT ON live_stream_products TO anon;

-- ============================================================================
-- PARTE 10: RPCs
-- ============================================================================

-- Obtener lives activos
CREATE OR REPLACE FUNCTION get_active_live_streams(
    p_limit INTEGER DEFAULT 20,
    p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    creator_profile_id UUID,
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    cf_playback_url TEXT,
    cf_playback_url_webrtc TEXT,
    category TEXT,
    current_viewers INTEGER,
    total_likes INTEGER,
    started_at TIMESTAMPTZ,
    is_shopping_enabled BOOLEAN,
    -- Joined creator info
    creator_name TEXT,
    creator_slug TEXT,
    creator_avatar TEXT,
    creator_rating DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.user_id,
        s.creator_profile_id,
        s.title,
        s.description,
        COALESCE(s.thumbnail_url, s.cf_thumbnail_url) as thumbnail_url,
        s.cf_playback_url,
        s.cf_playback_url_webrtc,
        s.category,
        s.current_viewers,
        s.total_likes,
        s.started_at,
        s.is_shopping_enabled,
        p.full_name as creator_name,
        cp.slug as creator_slug,
        p.avatar_url as creator_avatar,
        cp.rating_avg as creator_rating
    FROM creator_live_streams s
    LEFT JOIN profiles p ON p.id = s.user_id
    LEFT JOIN creator_profiles cp ON cp.id = s.creator_profile_id
    WHERE s.status = 'live'
      AND s.is_unlisted = false
      AND (p_category IS NULL OR s.category = p_category)
    ORDER BY s.current_viewers DESC, s.started_at DESC
    LIMIT p_limit;
END;
$$;

-- Obtener stream por creador slug
CREATE OR REPLACE FUNCTION get_live_stream_by_creator(
    p_creator_slug TEXT
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    cf_playback_url TEXT,
    cf_playback_url_webrtc TEXT,
    status live_stream_status,
    current_viewers INTEGER,
    total_likes INTEGER,
    total_comments INTEGER,
    started_at TIMESTAMPTZ,
    is_shopping_enabled BOOLEAN,
    allow_comments BOOLEAN,
    allow_reactions BOOLEAN,
    creator_name TEXT,
    creator_slug TEXT,
    creator_avatar TEXT,
    creator_bio TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.user_id,
        s.title,
        s.description,
        COALESCE(s.thumbnail_url, s.cf_thumbnail_url),
        s.cf_playback_url,
        s.cf_playback_url_webrtc,
        s.status,
        s.current_viewers,
        s.total_likes,
        s.total_comments,
        s.started_at,
        s.is_shopping_enabled,
        s.allow_comments,
        s.allow_reactions,
        p.full_name,
        cp.slug,
        p.avatar_url,
        cp.bio
    FROM creator_live_streams s
    JOIN creator_profiles cp ON cp.id = s.creator_profile_id
    JOIN profiles p ON p.id = s.user_id
    WHERE cp.slug = p_creator_slug
      AND s.status = 'live'
    LIMIT 1;
END;
$$;

-- Verificar si un creador está en vivo
CREATE OR REPLACE FUNCTION is_creator_live(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM creator_live_streams
        WHERE user_id = p_user_id AND status = 'live'
    );
END;
$$;

-- Ping de viewer (para mantener activo)
CREATE OR REPLACE FUNCTION ping_live_viewer(
    p_stream_id UUID,
    p_session_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE live_stream_viewers
    SET last_ping_at = NOW(),
        watch_duration_seconds = watch_duration_seconds + 30
    WHERE stream_id = p_stream_id
      AND session_id = p_session_id
      AND left_at IS NULL;

    RETURN FOUND;
END;
$$;

-- ============================================================================
-- PARTE 11: REALTIME
-- ============================================================================

-- Habilitar realtime para comentarios y métricas
ALTER PUBLICATION supabase_realtime ADD TABLE live_stream_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE creator_live_streams;

-- ============================================================================
-- PARTE 12: NOTIFY SCHEMA CHANGE
-- ============================================================================

NOTIFY pgrst, 'reload schema';
