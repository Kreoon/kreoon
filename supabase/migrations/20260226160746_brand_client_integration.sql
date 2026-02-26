-- ============================================================================
-- BRAND CLIENT INTEGRATION
-- Permite que las brands independientes tengan las mismas funcionalidades
-- que los clientes de organizaciones (productos, contenido, paquetes, etc.)
-- ============================================================================

-- 1. Agregar columna brand_id a clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;

-- 2. Crear índice para búsquedas por brand_id
CREATE INDEX IF NOT EXISTS idx_clients_brand_id ON clients(brand_id) WHERE brand_id IS NOT NULL;

-- 3. Constraint: un cliente por brand (similar a is_internal_brand per org)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_client_per_brand
ON clients(brand_id)
WHERE brand_id IS NOT NULL;

-- 4. RLS Policy: Brand members pueden ver su cliente
DROP POLICY IF EXISTS "Brand members can view their brand client" ON clients;
CREATE POLICY "Brand members can view their brand client" ON clients
    FOR SELECT
    TO authenticated
    USING (
        brand_id IS NOT NULL
        AND brand_id IN (
            SELECT bm.brand_id FROM brand_members bm
            WHERE bm.user_id = auth.uid() AND bm.status = 'active'
        )
    );

-- 5. RLS Policy: Brand owners pueden actualizar su cliente
DROP POLICY IF EXISTS "Brand owners can update their brand client" ON clients;
CREATE POLICY "Brand owners can update their brand client" ON clients
    FOR UPDATE
    TO authenticated
    USING (
        brand_id IS NOT NULL
        AND brand_id IN (
            SELECT bm.brand_id FROM brand_members bm
            WHERE bm.user_id = auth.uid()
            AND bm.status = 'active'
            AND bm.role = 'owner'
        )
    );

-- 6. RLS Policy: Brand owners pueden insertar cliente para su brand
DROP POLICY IF EXISTS "Brand owners can insert client for their brand" ON clients;
CREATE POLICY "Brand owners can insert client for their brand" ON clients
    FOR INSERT
    TO authenticated
    WITH CHECK (
        brand_id IS NOT NULL
        AND brand_id IN (
            SELECT bm.brand_id FROM brand_members bm
            WHERE bm.user_id = auth.uid()
            AND bm.status = 'active'
            AND bm.role = 'owner'
        )
    );

-- 7. Función para crear cliente de brand automáticamente
CREATE OR REPLACE FUNCTION create_brand_client(
    p_brand_id UUID,
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_client_id UUID;
    v_brand_name TEXT;
BEGIN
    -- Verificar que el usuario sea owner de la brand
    IF NOT EXISTS (
        SELECT 1 FROM brand_members
        WHERE brand_id = p_brand_id
        AND user_id = p_user_id
        AND role = 'owner'
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Usuario no es owner de la brand';
    END IF;

    -- Verificar si ya existe cliente para esta brand
    SELECT id INTO v_client_id
    FROM clients
    WHERE brand_id = p_brand_id
    LIMIT 1;

    IF v_client_id IS NOT NULL THEN
        -- Ya existe, verificar que el usuario esté en client_users
        INSERT INTO client_users (client_id, user_id, role)
        VALUES (v_client_id, p_user_id, 'owner')
        ON CONFLICT (client_id, user_id) DO NOTHING;

        RETURN v_client_id;
    END IF;

    -- Obtener nombre de la brand
    SELECT name INTO v_brand_name FROM brands WHERE id = p_brand_id;

    -- Crear el cliente
    INSERT INTO clients (
        name,
        brand_id,
        is_internal_brand,
        is_public,
        bio,
        created_by
    ) VALUES (
        v_brand_name,
        p_brand_id,
        false,  -- No es interno de org, es de brand independiente
        false,
        'Cliente de marca independiente: ' || v_brand_name,
        p_user_id
    )
    RETURNING id INTO v_client_id;

    -- Agregar al owner como usuario del cliente
    INSERT INTO client_users (client_id, user_id, role)
    VALUES (v_client_id, p_user_id, 'owner');

    RETURN v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger para crear cliente automáticamente cuando se crea una brand
CREATE OR REPLACE FUNCTION on_brand_created() RETURNS TRIGGER AS $$
BEGIN
    -- Crear cliente para la nueva brand
    PERFORM create_brand_client(NEW.id, NEW.owner_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_brand_created ON brands;
CREATE TRIGGER trg_brand_created
    AFTER INSERT ON brands
    FOR EACH ROW
    EXECUTE FUNCTION on_brand_created();

-- 9. Agregar brand members a client_users cuando se unen a la brand
CREATE OR REPLACE FUNCTION on_brand_member_added() RETURNS TRIGGER AS $$
DECLARE
    v_client_id UUID;
BEGIN
    -- Solo si el miembro está activo
    IF NEW.status = 'active' THEN
        -- Buscar el cliente de la brand
        SELECT id INTO v_client_id
        FROM clients
        WHERE brand_id = NEW.brand_id
        LIMIT 1;

        IF v_client_id IS NOT NULL THEN
            -- Agregar al cliente con rol apropiado
            INSERT INTO client_users (client_id, user_id, role)
            VALUES (
                v_client_id,
                NEW.user_id,
                CASE WHEN NEW.role = 'owner' THEN 'owner' ELSE 'viewer' END
            )
            ON CONFLICT (client_id, user_id) DO UPDATE SET role = EXCLUDED.role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_brand_member_added ON brand_members;
CREATE TRIGGER trg_brand_member_added
    AFTER INSERT OR UPDATE ON brand_members
    FOR EACH ROW
    EXECUTE FUNCTION on_brand_member_added();

-- 10. Migrar brands existentes: crear clientes para brands que no tienen
DO $$
DECLARE
    r RECORD;
    v_client_id UUID;
BEGIN
    FOR r IN
        SELECT b.id as brand_id, b.name, b.owner_id
        FROM brands b
        WHERE NOT EXISTS (
            SELECT 1 FROM clients c WHERE c.brand_id = b.id
        )
        AND b.owner_id IS NOT NULL
    LOOP
        -- Crear cliente para esta brand
        INSERT INTO clients (
            name,
            brand_id,
            is_internal_brand,
            is_public,
            bio,
            created_by
        ) VALUES (
            r.name,
            r.brand_id,
            false,
            false,
            'Cliente de marca independiente: ' || r.name,
            r.owner_id
        )
        RETURNING id INTO v_client_id;

        -- Agregar owner a client_users
        INSERT INTO client_users (client_id, user_id, role)
        VALUES (v_client_id, r.owner_id, 'owner')
        ON CONFLICT DO NOTHING;

        -- Agregar otros miembros activos
        INSERT INTO client_users (client_id, user_id, role)
        SELECT v_client_id, bm.user_id,
            CASE WHEN bm.role = 'owner' THEN 'owner' ELSE 'viewer' END
        FROM brand_members bm
        WHERE bm.brand_id = r.brand_id
        AND bm.status = 'active'
        AND bm.user_id != r.owner_id
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Created client for brand: %', r.name;
    END LOOP;
END $$;

-- 11. Grant permisos
GRANT EXECUTE ON FUNCTION create_brand_client(UUID, UUID) TO authenticated;
