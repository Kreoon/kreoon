-- =====================================================
-- Permitir lectura pública de datos básicos de organizaciones
-- Para mostrar insignias en el marketplace
-- Migration: 20260305420000_organizations_public_read
-- =====================================================

-- Política para permitir SELECT público de organizaciones
-- Solo campos básicos necesarios para el marketplace
DROP POLICY IF EXISTS "organizations_public_read_basic" ON public.organizations;

CREATE POLICY "organizations_public_read_basic" ON public.organizations
    FOR SELECT
    USING (true);

-- Nota: Esta política permite leer todas las organizaciones.
-- Si se requiere más restricción, se puede cambiar a:
-- USING (marketplace_enabled = true)
