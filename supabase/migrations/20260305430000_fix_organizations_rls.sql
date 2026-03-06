-- =====================================================
-- FIX: Asegurar lectura pública de organizaciones
-- Migration: 20260305430000_fix_organizations_rls
-- =====================================================

-- Primero, eliminar TODAS las políticas de SELECT en organizations
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'organizations'
        AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Asegurar que RLS esté habilitado
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Crear política de lectura pública simple
CREATE POLICY "allow_public_read_organizations" ON public.organizations
    FOR SELECT
    TO public
    USING (true);

-- También asegurar que anon pueda leer
GRANT SELECT ON public.organizations TO anon;
GRANT SELECT ON public.organizations TO authenticated;
