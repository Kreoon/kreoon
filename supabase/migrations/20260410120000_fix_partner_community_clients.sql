-- ============================================================================
-- Fix: Agregar campos de comunidad partner a clients y funcion de incremento
-- ============================================================================
-- Requerido para public-registration Edge Function

-- 1. Agregar campos de comunidad a tabla clients
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'partner_community_id') THEN
        ALTER TABLE clients ADD COLUMN partner_community_id UUID REFERENCES partner_communities(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'community_badge_text') THEN
        ALTER TABLE clients ADD COLUMN community_badge_text TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'community_badge_color') THEN
        ALTER TABLE clients ADD COLUMN community_badge_color TEXT;
    END IF;
END $$;

-- 2. Indice para busquedas por comunidad en clients
CREATE INDEX IF NOT EXISTS idx_clients_partner_community ON clients(partner_community_id) WHERE partner_community_id IS NOT NULL;

-- 3. Funcion para incrementar contador de redenciones de comunidad
CREATE OR REPLACE FUNCTION increment_community_redemptions(community_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE partner_communities
    SET
        redemption_count = COALESCE(redemption_count, 0) + 1,
        updated_at = NOW()
    WHERE slug = community_slug;
END;
$$;

-- 4. Agregar columna redemption_count si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_communities' AND column_name = 'redemption_count') THEN
        ALTER TABLE partner_communities ADD COLUMN redemption_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 5. Comentarios
COMMENT ON COLUMN clients.partner_community_id IS 'Comunidad partner a la que pertenece el cliente (ej: UGC Colombia)';
COMMENT ON COLUMN clients.community_badge_text IS 'Texto del badge de comunidad mostrado en el cliente';
COMMENT ON COLUMN clients.community_badge_color IS 'Color del badge de comunidad (hex)';
COMMENT ON FUNCTION increment_community_redemptions(TEXT) IS 'Incrementa el contador de redenciones de una comunidad partner';
