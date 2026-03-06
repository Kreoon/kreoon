-- =====================================================
-- Permitir a administradores modificar servicios de creadores
-- Migration: 20260305400000_admin_creator_services_rls
-- =====================================================

-- Función auxiliar para verificar si el usuario es admin de plataforma
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM profiles WHERE id = auth.uid()),
    false
  )
  OR
  (SELECT email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com')
   FROM auth.users WHERE id = auth.uid())
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "creator_services_update_policy" ON public.creator_services;
DROP POLICY IF EXISTS "creator_services_delete_policy" ON public.creator_services;
DROP POLICY IF EXISTS "creator_services_insert_policy" ON public.creator_services;

-- Recreate with admin access
CREATE POLICY "creator_services_insert_policy" ON public.creator_services
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_platform_admin());

CREATE POLICY "creator_services_update_policy" ON public.creator_services
    FOR UPDATE USING (user_id = auth.uid() OR is_platform_admin());

CREATE POLICY "creator_services_delete_policy" ON public.creator_services
    FOR DELETE USING (user_id = auth.uid() OR is_platform_admin());

-- También actualizar portfolio_items para admins
DROP POLICY IF EXISTS "portfolio_items_update_policy" ON public.portfolio_items;
DROP POLICY IF EXISTS "portfolio_items_delete_policy" ON public.portfolio_items;
DROP POLICY IF EXISTS "portfolio_items_insert_policy" ON public.portfolio_items;

-- Verificar si las políticas existen antes de crearlas
DO $$
BEGIN
  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'portfolio_items' AND policyname = 'portfolio_items_insert_admin_policy'
  ) THEN
    CREATE POLICY "portfolio_items_insert_admin_policy" ON public.portfolio_items
      FOR INSERT WITH CHECK (
        creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
        OR is_platform_admin()
      );
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'portfolio_items' AND policyname = 'portfolio_items_update_admin_policy'
  ) THEN
    CREATE POLICY "portfolio_items_update_admin_policy" ON public.portfolio_items
      FOR UPDATE USING (
        creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
        OR is_platform_admin()
      );
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'portfolio_items' AND policyname = 'portfolio_items_delete_admin_policy'
  ) THEN
    CREATE POLICY "portfolio_items_delete_admin_policy" ON public.portfolio_items
      FOR DELETE USING (
        creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
        OR is_platform_admin()
      );
  END IF;
END $$;

-- También actualizar creator_profiles para admins
DROP POLICY IF EXISTS "creator_profiles_update_policy" ON public.creator_profiles;

CREATE POLICY "creator_profiles_update_admin_policy" ON public.creator_profiles
    FOR UPDATE USING (user_id = auth.uid() OR is_platform_admin());
