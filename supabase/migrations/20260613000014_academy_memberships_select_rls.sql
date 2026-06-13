-- BUG: la pestaña Creadores solo mostraba al usuario logueado, no a los
-- demás miembros del space. Causa: academy_memberships tenía RLS ON pero
-- sin policy SELECT, así que cada user solo veía su propia fila.
--
-- Fix: policy que permite leer:
--   1. Tu propia fila siempre.
--   2. Si sos owner del space, podés ver todas las filas del space.
--   3. Si sos miembro activo del space, ves las filas de otros miembros
--      activos del MISMO space (no de otros spaces).
--
-- También aseguramos que profiles tenga SELECT para authenticated, sino
-- el JOIN con profiles para mostrar nombre/avatar no devuelve nada.

DROP POLICY IF EXISTS "members_can_read_space_memberships" ON public.academy_memberships;
CREATE POLICY "members_can_read_space_memberships"
  ON public.academy_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM academy_spaces s
       WHERE s.id = space_id AND s.owner_id = auth.uid()
    )
    OR (
      is_active = true
      AND EXISTS (
        SELECT 1 FROM academy_memberships me
         WHERE me.space_id = academy_memberships.space_id
           AND me.user_id = auth.uid()
           AND me.is_active = true
      )
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND cmd = 'SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "profiles_read_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;
