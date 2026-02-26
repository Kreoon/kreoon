-- ============================================================================
-- PARTNER COMMUNITIES SYSTEM
-- Sistema de comunidades partner para referidos con beneficios especiales
-- ============================================================================

-- Tabla principal de comunidades
CREATE TABLE IF NOT EXISTS partner_communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,

    -- Beneficios
    free_months INTEGER DEFAULT 0,
    commission_discount_points INTEGER DEFAULT 0,  -- Puntos de descuento (ej: 5 = 30% -> 25%)
    bonus_ai_tokens INTEGER DEFAULT 0,
    custom_badge_text TEXT,
    custom_badge_color TEXT DEFAULT '#9333ea',

    -- Restricciones
    target_types TEXT[] DEFAULT ARRAY['brand'],  -- 'brand', 'creator', 'organization'
    max_redemptions INTEGER,  -- NULL = ilimitado
    current_redemptions INTEGER DEFAULT 0,

    -- Vigencia
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,  -- NULL = sin fecha límite

    -- Metadata
    partner_contact_email TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membresías de usuarios/marcas en comunidades
CREATE TABLE IF NOT EXISTS partner_community_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES partner_communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,

    -- Beneficios aplicados
    free_months_granted INTEGER DEFAULT 0,
    commission_discount_applied INTEGER DEFAULT 0,
    bonus_tokens_granted INTEGER DEFAULT 0,

    -- Estado
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),

    -- Timestamps
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- NULL = perpetuo
    metadata JSONB DEFAULT '{}',

    -- Constraints: solo uno por comunidad por usuario/marca
    CONSTRAINT unique_user_community UNIQUE (community_id, user_id),
    CONSTRAINT unique_brand_community UNIQUE (community_id, brand_id),
    -- Al menos uno debe estar definido
    CONSTRAINT membership_has_target CHECK (user_id IS NOT NULL OR brand_id IS NOT NULL)
);

-- Agregar columnas de badge a brands (si no existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'partner_community_id') THEN
        ALTER TABLE brands ADD COLUMN partner_community_id UUID REFERENCES partner_communities(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'community_badge_text') THEN
        ALTER TABLE brands ADD COLUMN community_badge_text TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'community_badge_color') THEN
        ALTER TABLE brands ADD COLUMN community_badge_color TEXT;
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_partner_communities_slug ON partner_communities(slug);
CREATE INDEX IF NOT EXISTS idx_partner_communities_active ON partner_communities(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_partner_community_memberships_user ON partner_community_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_community_memberships_brand ON partner_community_memberships(brand_id);
CREATE INDEX IF NOT EXISTS idx_partner_community_memberships_community ON partner_community_memberships(community_id);

-- ============================================================================
-- SEED: Comunidad Mastershop
-- ============================================================================

INSERT INTO partner_communities (
    slug,
    name,
    description,
    free_months,
    commission_discount_points,
    bonus_ai_tokens,
    custom_badge_text,
    custom_badge_color,
    target_types,
    partner_contact_email,
    notes
) VALUES (
    'mastershop',
    'Mastershop',
    'Comunidad exclusiva de emprendedores y marcas de Mastershop. Obtén beneficios especiales: 2 meses gratis en tu primer plan, descuento permanente en comisiones del marketplace, y una etiqueta especial en tu perfil.',
    2,      -- 2 meses gratis
    5,      -- 5 puntos de descuento (30% -> 25%)
    1000,   -- 1000 tokens AI de bienvenida
    'Comunidad Mastershop',
    '#f59e0b',  -- Amber/Gold color
    ARRAY['brand'],
    'hola@mastershop.co',
    'Comunidad de Mastershop'
) ON CONFLICT (slug) DO UPDATE SET
    description = EXCLUDED.description,
    free_months = EXCLUDED.free_months,
    commission_discount_points = EXCLUDED.commission_discount_points,
    bonus_ai_tokens = EXCLUDED.bonus_ai_tokens,
    custom_badge_text = EXCLUDED.custom_badge_text,
    custom_badge_color = EXCLUDED.custom_badge_color,
    updated_at = NOW();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE partner_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_community_memberships ENABLE ROW LEVEL SECURITY;

-- Comunidades: lectura pública para activas
DROP POLICY IF EXISTS "Public can read active communities" ON partner_communities;
CREATE POLICY "Public can read active communities" ON partner_communities
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date > NOW()));

-- Comunidades: admins de plataforma pueden todo
DROP POLICY IF EXISTS "Admins can manage communities" ON partner_communities;
CREATE POLICY "Admins can manage communities" ON partner_communities
    FOR ALL
    TO authenticated
    USING (public.is_platform_root(auth.uid()));

-- Membresías: usuarios pueden ver las suyas
DROP POLICY IF EXISTS "Users can read own memberships" ON partner_community_memberships;
CREATE POLICY "Users can read own memberships" ON partner_community_memberships
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Membresías: usuarios pueden ver membresías de sus marcas
DROP POLICY IF EXISTS "Users can read brand memberships" ON partner_community_memberships;
CREATE POLICY "Users can read brand memberships" ON partner_community_memberships
    FOR SELECT
    TO authenticated
    USING (
        brand_id IN (
            SELECT brand_id FROM brand_members WHERE user_id = auth.uid()
        )
    );

-- Membresías: service_role puede todo
DROP POLICY IF EXISTS "Service role can manage memberships" ON partner_community_memberships;
CREATE POLICY "Service role can manage memberships" ON partner_community_memberships
    FOR ALL
    TO service_role
    USING (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON partner_communities TO anon;
GRANT SELECT ON partner_communities TO authenticated;
GRANT ALL ON partner_communities TO service_role;

GRANT SELECT ON partner_community_memberships TO authenticated;
GRANT ALL ON partner_community_memberships TO service_role;

-- ============================================================================
-- FUNCIÓN: get_applicable_commission (actualizada para considerar comunidades)
-- ============================================================================

-- Si ya existe, actualizarla para considerar custom_pricing_agreements
CREATE OR REPLACE FUNCTION get_applicable_commission(
    p_user_id UUID,
    p_org_id UUID DEFAULT NULL,
    p_project_type TEXT DEFAULT 'marketplace_direct'
) RETURNS NUMERIC AS $$
DECLARE
    v_base_rate NUMERIC;
    v_custom_rate NUMERIC;
BEGIN
    -- Tasas base por tipo de proyecto
    CASE p_project_type
        WHEN 'marketplace_direct' THEN v_base_rate := 0.25;
        WHEN 'campaign_managed' THEN v_base_rate := 0.30;
        WHEN 'live_shopping' THEN v_base_rate := 0.20;
        WHEN 'professional_service' THEN v_base_rate := 0.25;
        WHEN 'corporate_package' THEN v_base_rate := 0.35;
        ELSE v_base_rate := 0.25;
    END CASE;

    -- Buscar pricing personalizado activo
    SELECT
        CASE p_project_type
            WHEN 'marketplace_direct' THEN cpa.marketplace_fee_override
            WHEN 'campaign_managed' THEN cpa.campaign_fee_override
            ELSE cpa.marketplace_fee_override
        END INTO v_custom_rate
    FROM custom_pricing_agreements cpa
    WHERE cpa.is_active = true
        AND (cpa.valid_until IS NULL OR cpa.valid_until > NOW())
        AND (
            (p_user_id IS NOT NULL AND cpa.user_id = p_user_id)
            OR (p_org_id IS NOT NULL AND cpa.organization_id = p_org_id)
        )
    ORDER BY
        CASE WHEN cpa.organization_id = p_org_id THEN 0 ELSE 1 END,
        cpa.created_at DESC
    LIMIT 1;

    -- Retornar custom si existe, sino base
    RETURN COALESCE(v_custom_rate, v_base_rate);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCIÓN HELPER: Verificar si usuario es miembro activo de una comunidad
-- ============================================================================

CREATE OR REPLACE FUNCTION is_community_member(
    p_user_id UUID,
    p_community_slug TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM partner_community_memberships pcm
        JOIN partner_communities pc ON pc.id = pcm.community_id
        WHERE pcm.user_id = p_user_id
            AND pcm.status = 'active'
            AND (pcm.expires_at IS NULL OR pcm.expires_at > NOW())
            AND (p_community_slug IS NULL OR pc.slug = p_community_slug)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Actualizar updated_at en partner_communities
-- ============================================================================

CREATE OR REPLACE FUNCTION update_partner_communities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_partner_communities_updated_at ON partner_communities;
CREATE TRIGGER trigger_partner_communities_updated_at
    BEFORE UPDATE ON partner_communities
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_communities_updated_at();

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
