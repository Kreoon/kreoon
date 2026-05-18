-- 1. Función para obtener paquetes de un cliente con slots disponibles
--    Usada en CreateContentDialog para mostrar capacidad y validar antes de crear.

CREATE OR REPLACE FUNCTION public.get_client_packages_with_availability(
  p_client_id UUID
)
RETURNS TABLE (
  id              UUID,
  name            TEXT,
  hooks_per_video INT,
  is_active       BOOLEAN,
  content_quantity INT,
  assigned_count  BIGINT,
  available_slots INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.name,
    cp.hooks_per_video,
    cp.is_active,
    cp.content_quantity,
    COUNT(c.id)                                                         AS assigned_count,
    GREATEST(0, cp.content_quantity - COUNT(c.id)::int)::int           AS available_slots
  FROM client_packages cp
  LEFT JOIN content c ON c.client_package_id = cp.id
  WHERE cp.client_id = p_client_id
  GROUP BY cp.id, cp.name, cp.hooks_per_video, cp.is_active, cp.content_quantity
  ORDER BY cp.is_active DESC, cp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_packages_with_availability(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_client_packages_with_availability(UUID) IS
  'Retorna paquetes de un cliente con conteo de proyectos asignados y slots disponibles (content_quantity - assigned).';


-- 2. Eliminar versión 3-params y recrear con 4-params (backwards-compatible via DEFAULT NULL)
DROP FUNCTION IF EXISTS public.create_content_manual(TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.create_content_manual(
  p_title             TEXT,
  p_organization_id   UUID,
  p_creation_mode     TEXT  DEFAULT 'manual',
  p_client_package_id UUID  DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content_id UUID;
  v_is_member  BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'No eres miembro de esta organizacion';
  END IF;

  INSERT INTO content (
    title,
    status,
    creation_mode,
    organization_id,
    client_package_id
  ) VALUES (
    p_title,
    'draft',
    p_creation_mode,
    p_organization_id,
    p_client_package_id
  )
  RETURNING id INTO v_content_id;

  RETURN v_content_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_content_manual(TEXT, UUID, TEXT, UUID) TO authenticated;


-- 3. Backfill: asignar proyectos existentes sin paquete al paquete activo más reciente del cliente.
--    Solo aplica a proyectos con cliente asignado y sin paquete, donde el cliente tenga al menos
--    un paquete activo.

UPDATE content c
SET client_package_id = (
  SELECT cp.id
  FROM client_packages cp
  WHERE cp.client_id = c.client_id
    AND cp.is_active = true
  ORDER BY cp.created_at DESC
  LIMIT 1
)
WHERE c.client_package_id IS NULL
  AND c.client_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM client_packages cp2
    WHERE cp2.client_id = c.client_id
      AND cp2.is_active = true
  );
