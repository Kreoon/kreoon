-- ============================================================================
-- FIX: Corregir política de INSERT para clients con brand_id
-- La política anterior tenía un bug con OR brand_id IS NULL
-- ============================================================================

-- 1. Corregir la política de brand clients
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

-- 2. Platform root puede insertar cualquier cliente
DROP POLICY IF EXISTS "Platform root can insert any client" ON clients;
CREATE POLICY "Platform root can insert any client" ON clients
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_platform_root(auth.uid()));

-- 3. Platform root puede actualizar cualquier cliente
DROP POLICY IF EXISTS "Platform root can update any client" ON clients;
CREATE POLICY "Platform root can update any client" ON clients
    FOR UPDATE
    TO authenticated
    USING (public.is_platform_root(auth.uid()));

-- 4. Platform root puede eliminar cualquier cliente
DROP POLICY IF EXISTS "Platform root can delete any client" ON clients;
CREATE POLICY "Platform root can delete any client" ON clients
    FOR DELETE
    TO authenticated
    USING (public.is_platform_root(auth.uid()));
