-- BUG CRÍTICO: la policy SELECT de academy_memberships (migración 14)
-- hacía SELECT a la MISMA tabla dentro del USING → recursión infinita →
-- PostgreSQL bloqueaba TODOS los reads con
-- "42P17: infinite recursion detected in policy".
--
-- Síntoma: users SÍ suscritos veían el SpaceJoinGate de pago al entrar
-- a la academia. useMyMembership devolvía error/null porque la query
-- never resolved. La pestaña Creadores tampoco funcionaba.
--
-- Fix: extraer la verificación de "soy miembro activo del space" a una
-- función SECURITY DEFINER que bypasse RLS (no dispara la policy de la
-- tabla porque corre con privilegios del owner del schema).

CREATE OR REPLACE FUNCTION public._is_active_member_of(p_space_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM academy_memberships
    WHERE space_id = p_space_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public._is_active_member_of(UUID) TO authenticated;

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
      AND public._is_active_member_of(space_id)
    )
  );
