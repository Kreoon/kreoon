-- ============================================================================
-- FIX: Permitir que platform root gestione brand_members
-- El admin de plataforma necesita agregar/eliminar miembros de brands
-- ============================================================================

-- 1. Actualizar política de INSERT para brand_members
DROP POLICY IF EXISTS brand_members_insert ON brand_members;
CREATE POLICY brand_members_insert ON brand_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Usuario se agrega a sí mismo
        user_id = auth.uid()
        -- O es dueño de la brand
        OR brand_id IN (SELECT b.id FROM brands b WHERE b.owner_id = auth.uid())
        -- O es platform root
        OR public.is_platform_root(auth.uid())
    );

-- 2. Actualizar política de UPDATE para brand_members
DROP POLICY IF EXISTS brand_members_update ON brand_members;
CREATE POLICY brand_members_update ON brand_members
    FOR UPDATE
    TO authenticated
    USING (
        -- Es dueño de la brand
        brand_id IN (SELECT b.id FROM brands b WHERE b.owner_id = auth.uid())
        -- O es el propio usuario
        OR user_id = auth.uid()
        -- O es platform root
        OR public.is_platform_root(auth.uid())
    );

-- 3. Actualizar política de DELETE para brand_members
DROP POLICY IF EXISTS brand_members_delete ON brand_members;
CREATE POLICY brand_members_delete ON brand_members
    FOR DELETE
    TO authenticated
    USING (
        -- Es dueño de la brand
        brand_id IN (SELECT b.id FROM brands b WHERE b.owner_id = auth.uid())
        -- O es el propio usuario (puede salirse)
        OR user_id = auth.uid()
        -- O es platform root
        OR public.is_platform_root(auth.uid())
    );

-- 4. También actualizar clients para que platform root pueda insertar clientes de brand
DROP POLICY IF EXISTS "Brand owners can insert client for their brand" ON clients;
CREATE POLICY "Brand owners can insert client for their brand" ON clients
    FOR INSERT
    TO authenticated
    WITH CHECK (
        brand_id IS NOT NULL
        AND (
            -- Es owner de la brand
            brand_id IN (
                SELECT bm.brand_id FROM brand_members bm
                WHERE bm.user_id = auth.uid()
                AND bm.status = 'active'
                AND bm.role = 'owner'
            )
            -- O es platform root
            OR public.is_platform_root(auth.uid())
        )
    );

-- 5. Platform root puede insertar cualquier cliente (incluyendo de organizaciones)
DROP POLICY IF EXISTS "Platform root can insert any client" ON clients;
CREATE POLICY "Platform root can insert any client" ON clients
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_platform_root(auth.uid()));
