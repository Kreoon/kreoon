-- RPC para crear contenido con SECURITY DEFINER
-- Permite a miembros de la organizacion crear contenido sin necesitar rol admin

CREATE OR REPLACE FUNCTION public.create_content_manual(
  p_title TEXT,
  p_organization_id UUID,
  p_creation_mode TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content_id UUID;
  v_is_member BOOLEAN;
BEGIN
  -- Verificar que el usuario es miembro de la organizacion
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'No eres miembro de esta organizacion';
  END IF;

  -- Crear el contenido
  INSERT INTO content (
    title,
    status,
    creation_mode,
    organization_id
  ) VALUES (
    p_title,
    'draft',
    p_creation_mode,
    p_organization_id
  )
  RETURNING id INTO v_content_id;

  RETURN v_content_id;
END;
$$;

-- Dar permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.create_content_manual(TEXT, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.create_content_manual IS 'Crea contenido en modo manual. Verifica membresia en la organizacion.';
