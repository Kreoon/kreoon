-- =====================================================
-- KREOON RLS FIX - Goals Table
-- =====================================================
-- Ejecuta este script en el SQL Editor del dashboard de Supabase Kreoon
-- URL: https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/sql

-- 1. Primero eliminar políticas existentes que pueden estar mal configuradas
DROP POLICY IF EXISTS "Members can view org goals" ON public.goals;
DROP POLICY IF EXISTS "Org owners can manage org goals" ON public.goals;
DROP POLICY IF EXISTS "Platform admins can manage goals in current org" ON public.goals;
DROP POLICY IF EXISTS "Users can view goals from their organization" ON public.goals;
DROP POLICY IF EXISTS "Users can create goals for their organization" ON public.goals;
DROP POLICY IF EXISTS "Users can update goals from their organization" ON public.goals;
DROP POLICY IF EXISTS "Users can delete goals from their organization" ON public.goals;

-- 2. Asegurarse que RLS está habilitado
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- 3. Crear nuevas políticas basadas en current_organization_id del perfil
-- SELECT: Los usuarios pueden ver metas de su organización actual
CREATE POLICY "Users can view goals from their organization" 
ON public.goals 
FOR SELECT 
TO authenticated
USING (
  organization_id IN (
    SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- INSERT: Los usuarios pueden crear metas para su organización actual
CREATE POLICY "Users can create goals for their organization" 
ON public.goals 
FOR INSERT 
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- UPDATE: Los usuarios pueden actualizar metas de su organización actual
CREATE POLICY "Users can update goals from their organization" 
ON public.goals 
FOR UPDATE 
TO authenticated
USING (
  organization_id IN (
    SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- DELETE: Los usuarios pueden eliminar metas de su organización actual
CREATE POLICY "Users can delete goals from their organization" 
ON public.goals 
FOR DELETE 
TO authenticated
USING (
  organization_id IN (
    SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- =====================================================
-- Verificación: Ejecuta esto para confirmar
-- =====================================================
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'goals';
