-- ============================================================================
-- Comunidad Partner: UGC Colombia
-- ============================================================================
-- Permite trackear usuarios registrados desde ugccolombia.co
-- con beneficios especiales y badge distintivo.

-- Insertar comunidad UGC Colombia
INSERT INTO partner_communities (
    slug,
    name,
    description,
    logo_url,
    free_months,
    commission_discount_points,
    bonus_ai_tokens,
    custom_badge_text,
    custom_badge_color,
    target_types,
    partner_contact_email,
    notes,
    metadata
) VALUES (
    'ugc-colombia',
    'UGC Colombia',
    'Comunidad oficial de creadores y marcas de UGC Colombia. Beneficios exclusivos: 1 mes gratis de suscripcion, tokens AI de bienvenida, descuento en comisiones del marketplace, y badge especial en tu perfil.',
    'https://ugccolombia.co/logo.png',
    1,      -- 1 mes gratis
    3,      -- 3 puntos de descuento en comisiones (30% -> 27%)
    500,    -- 500 tokens AI de bienvenida
    'UGC Colombia',
    '#f97316',  -- Orange color (brand de UGC Colombia)
    ARRAY['brand', 'creator'],  -- Aplica tanto para marcas como creadores
    'hola@ugccolombia.co',
    'Comunidad de UGC Colombia - Registros desde ugccolombia.co',
    '{"source": "ugccolombia.co", "integration": "public-registration"}'::jsonb
) ON CONFLICT (slug) DO UPDATE SET
    description = EXCLUDED.description,
    free_months = EXCLUDED.free_months,
    commission_discount_points = EXCLUDED.commission_discount_points,
    bonus_ai_tokens = EXCLUDED.bonus_ai_tokens,
    custom_badge_text = EXCLUDED.custom_badge_text,
    custom_badge_color = EXCLUDED.custom_badge_color,
    target_types = EXCLUDED.target_types,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- Agregar columna de comunidad a profiles si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'partner_community_id') THEN
        ALTER TABLE profiles ADD COLUMN partner_community_id UUID REFERENCES partner_communities(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'community_badge_text') THEN
        ALTER TABLE profiles ADD COLUMN community_badge_text TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'community_badge_color') THEN
        ALTER TABLE profiles ADD COLUMN community_badge_color TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'registration_source') THEN
        ALTER TABLE profiles ADD COLUMN registration_source TEXT;
    END IF;
END $$;

-- Agregar columna de comunidad a creator_profiles si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'creator_profiles' AND column_name = 'partner_community_id') THEN
        ALTER TABLE creator_profiles ADD COLUMN partner_community_id UUID REFERENCES partner_communities(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'creator_profiles' AND column_name = 'community_badge_text') THEN
        ALTER TABLE creator_profiles ADD COLUMN community_badge_text TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'creator_profiles' AND column_name = 'community_badge_color') THEN
        ALTER TABLE creator_profiles ADD COLUMN community_badge_color TEXT;
    END IF;
END $$;

-- Indices para busquedas por comunidad
CREATE INDEX IF NOT EXISTS idx_profiles_partner_community ON profiles(partner_community_id) WHERE partner_community_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_creator_profiles_partner_community ON creator_profiles(partner_community_id) WHERE partner_community_id IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN profiles.partner_community_id IS 'Comunidad partner a la que pertenece el usuario (ej: UGC Colombia, Mastershop)';
COMMENT ON COLUMN profiles.community_badge_text IS 'Texto del badge de comunidad mostrado en el perfil';
COMMENT ON COLUMN profiles.community_badge_color IS 'Color del badge de comunidad (hex)';
COMMENT ON COLUMN profiles.registration_source IS 'Fuente de registro (ej: ugccolombia.co, mastershop.co, direct)';
