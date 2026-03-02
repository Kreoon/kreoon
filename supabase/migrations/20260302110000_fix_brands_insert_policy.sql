-- ============================================================================
-- FIX: Permitir que platform root cree brands para otros usuarios
-- El admin de plataforma necesita crear marcas asignando owner_id a otros usuarios
-- ============================================================================

-- 1. Eliminar la política actual de INSERT
DROP POLICY IF EXISTS brands_insert ON brands;

-- 2. Crear nueva política que permite:
--    a) Usuario crea su propia brand (owner_id = auth.uid())
--    b) Platform root crea brand para cualquier usuario
CREATE POLICY brands_insert ON brands
    FOR INSERT
    TO authenticated
    WITH CHECK (
        owner_id = auth.uid()
        OR public.is_platform_root(auth.uid())
    );

-- 3. También actualizar UPDATE y DELETE para que platform root pueda gestionar todas las brands
DROP POLICY IF EXISTS brands_update ON brands;
CREATE POLICY brands_update ON brands
    FOR UPDATE
    TO authenticated
    USING (
        owner_id = auth.uid()
        OR public.is_platform_root(auth.uid())
    )
    WITH CHECK (
        owner_id = auth.uid()
        OR public.is_platform_root(auth.uid())
    );

DROP POLICY IF EXISTS brands_delete ON brands;
CREATE POLICY brands_delete ON brands
    FOR DELETE
    TO authenticated
    USING (
        owner_id = auth.uid()
        OR public.is_platform_root(auth.uid())
    );
