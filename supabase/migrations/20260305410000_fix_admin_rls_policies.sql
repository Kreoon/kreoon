-- =====================================================
-- FIX: Políticas RLS más robustas para administradores
-- Migration: 20260305410000_fix_admin_rls_policies
-- =====================================================

-- Recrear función is_platform_admin más robusta
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
  v_email TEXT;
BEGIN
  -- Primero verificar is_platform_admin en profiles
  SELECT is_platform_admin INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF v_is_admin = true THEN
    RETURN true;
  END IF;

  -- Luego verificar si el email está en la lista de root
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- =====================================================
-- CREATOR_SERVICES
-- =====================================================

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "creator_services_select_policy" ON public.creator_services;
DROP POLICY IF EXISTS "creator_services_insert_policy" ON public.creator_services;
DROP POLICY IF EXISTS "creator_services_update_policy" ON public.creator_services;
DROP POLICY IF EXISTS "creator_services_delete_policy" ON public.creator_services;

-- Crear políticas nuevas con soporte admin
CREATE POLICY "creator_services_select_policy" ON public.creator_services
    FOR SELECT USING (true);  -- Todos pueden ver servicios

CREATE POLICY "creator_services_insert_policy" ON public.creator_services
    FOR INSERT WITH CHECK (
      user_id = auth.uid()
      OR is_platform_admin()
    );

CREATE POLICY "creator_services_update_policy" ON public.creator_services
    FOR UPDATE USING (
      user_id = auth.uid()
      OR is_platform_admin()
    );

CREATE POLICY "creator_services_delete_policy" ON public.creator_services
    FOR DELETE USING (
      user_id = auth.uid()
      OR is_platform_admin()
    );

-- =====================================================
-- PORTFOLIO_ITEMS
-- =====================================================

DROP POLICY IF EXISTS "portfolio_items_select_policy" ON public.portfolio_items;
DROP POLICY IF EXISTS "portfolio_items_insert_policy" ON public.portfolio_items;
DROP POLICY IF EXISTS "portfolio_items_update_policy" ON public.portfolio_items;
DROP POLICY IF EXISTS "portfolio_items_delete_policy" ON public.portfolio_items;
DROP POLICY IF EXISTS "portfolio_items_insert_admin_policy" ON public.portfolio_items;
DROP POLICY IF EXISTS "portfolio_items_update_admin_policy" ON public.portfolio_items;
DROP POLICY IF EXISTS "portfolio_items_delete_admin_policy" ON public.portfolio_items;

CREATE POLICY "portfolio_items_select_policy" ON public.portfolio_items
    FOR SELECT USING (true);  -- Todos pueden ver

CREATE POLICY "portfolio_items_insert_policy" ON public.portfolio_items
    FOR INSERT WITH CHECK (
      creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
      OR is_platform_admin()
    );

CREATE POLICY "portfolio_items_update_policy" ON public.portfolio_items
    FOR UPDATE USING (
      creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
      OR is_platform_admin()
    );

CREATE POLICY "portfolio_items_delete_policy" ON public.portfolio_items
    FOR DELETE USING (
      creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
      OR is_platform_admin()
    );

-- =====================================================
-- CREATOR_PROFILES
-- =====================================================

DROP POLICY IF EXISTS "creator_profiles_update_policy" ON public.creator_profiles;
DROP POLICY IF EXISTS "creator_profiles_update_admin_policy" ON public.creator_profiles;

CREATE POLICY "creator_profiles_update_policy" ON public.creator_profiles
    FOR UPDATE USING (
      user_id = auth.uid()
      OR is_platform_admin()
    );

-- Asegurar que profiles también permite actualización por admin
DROP POLICY IF EXISTS "profiles_update_admin_policy" ON public.profiles;

-- Solo crear si no existe ya una política de update para profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "profiles_update_admin_policy" ON public.profiles
      FOR UPDATE USING (id = auth.uid() OR is_platform_admin());
  END IF;
END $$;
