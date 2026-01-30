
-- Corregir la política RLS de profiles que tiene los argumentos invertidos
-- La función is_org_member tiene firma: is_org_member(_user_id uuid, _org_id uuid)
-- La política actual está pasando: is_org_member(org_id, profile_id) - INCORRECTO

-- Eliminar la política incorrecta
DROP POLICY IF EXISTS "Org members can view org profiles" ON public.profiles;

-- Crear la política corregida con los argumentos en el orden correcto
-- Necesitamos verificar que el perfil que queremos ver pertenece a nuestra organización
-- Un perfil pertenece a una org si: profiles.current_organization_id = nuestra org actual
CREATE POLICY "Org members can view org profiles"
ON public.profiles
FOR SELECT
USING (
  (get_current_organization_id(auth.uid()) IS NOT NULL)
  AND (
    -- El perfil pertenece a la misma organización que el usuario actual
    current_organization_id = get_current_organization_id(auth.uid())
    -- O es el propio usuario
    OR id = auth.uid()
  )
);
