-- Migración: Agregar política para que owners puedan gestionar sus comunidades
-- Fecha: 2026-04-10
-- Problema: Solo platform_root podía editar comunidades, los owners no podían
-- Nota: La política ALL no funciona correctamente, se necesitan políticas explícitas por operación
-- IMPORTANTE: La tabla necesita GRANT de UPDATE/INSERT/DELETE para que RLS funcione

-- Otorgar permisos base a authenticated (RLS controla el acceso específico)
GRANT UPDATE, INSERT, DELETE ON partner_communities TO authenticated;

-- 0. Eliminar política ALL que causa conflictos
DROP POLICY IF EXISTS "Admins can manage communities" ON partner_communities;

-- 1. Política para que owners puedan ver su propia comunidad (incluso si no está activa)
CREATE POLICY "Owners can view their communities"
ON partner_communities
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

-- 2. Política para que owners puedan actualizar su propia comunidad
CREATE POLICY "Owners can update their communities"
ON partner_communities
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- 3. Políticas explícitas para platform_root (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Platform root can view all communities"
ON partner_communities
FOR SELECT
TO authenticated
USING (is_platform_root(auth.uid()));

CREATE POLICY "Platform root can update communities"
ON partner_communities
FOR UPDATE
TO authenticated
USING (is_platform_root(auth.uid()))
WITH CHECK (is_platform_root(auth.uid()));

CREATE POLICY "Platform root can insert communities"
ON partner_communities
FOR INSERT
TO authenticated
WITH CHECK (is_platform_root(auth.uid()));

CREATE POLICY "Platform root can delete communities"
ON partner_communities
FOR DELETE
TO authenticated
USING (is_platform_root(auth.uid()));

-- 4. Política de lectura pública para comunidades activas
DROP POLICY IF EXISTS "Public can read active communities" ON partner_communities;

CREATE POLICY "Public can read active communities"
ON partner_communities
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date > now())
);
