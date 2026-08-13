-- ============================================================================
-- KREOON — El cliente elige a su creador
--
-- Cambio de criterio (2026-08-13): la etapa `creadores` la resuelve el CLIENTE,
-- no el equipo. Es su marca y es su cara la que va a salir en los videos.
--
-- Problema técnico: el cliente NO es miembro de la organización, así que la
-- RLS le cierra `organization_members`, `creator_profiles` y
-- `creator_creative_profile`. Sin esta función vería un catálogo vacío.
--
-- La función es SECURITY DEFINER y por eso valida ella misma quién pregunta:
-- solo el usuario vinculado a ese cliente (client_users) o el staff de la
-- organización dueña. Y devuelve SOLO lo que un cliente debe ver de un
-- creador: cómo se presenta y qué sabe hacer. Nada de correos, teléfonos,
-- tarifas ni datos internos.
--
-- Rollback:
--   DROP FUNCTION public.get_creator_catalog_for_client(uuid);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_creator_catalog_for_client(p_client_id uuid)
RETURNS TABLE (
  user_id           uuid,
  nombre            text,
  avatar_url        text,
  ciudad            text,
  bio               text,
  rango_edad        text,
  genero            text,
  estilo_energia    text,
  nichos_afines     text[],
  formatos_fuertes  text[],
  escenarios        text[],
  restricciones     text[],
  completitud       int,
  muestras          jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT c.organization_id INTO v_org_id FROM public.clients c WHERE c.id = p_client_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  -- Quien pregunta tiene que ser el usuario de ESE cliente, o staff de la
  -- organización dueña. Un cliente no puede fisgonear el talento de otra
  -- agencia pasando un client_id ajeno.
  IF NOT EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.client_id = p_client_id AND cu.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = v_org_id AND om.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    om.user_id,
    COALESCE(cp.display_name, p.full_name, 'Creador')::text          AS nombre,
    COALESCE(cp.avatar_url, p.avatar_url)::text                      AS avatar_url,
    COALESCE(ccp.ciudad, cp.location_city)::text                     AS ciudad,
    cp.bio::text                                                     AS bio,
    ccp.rango_edad,
    ccp.genero,
    ccp.estilo_energia,
    COALESCE(ccp.nichos_afines, cp.niches, '{}')                     AS nichos_afines,
    COALESCE(ccp.formatos_fuertes, cp.content_types, '{}')           AS formatos_fuertes,
    COALESCE(ccp.escenarios, '{}')                                   AS escenarios,
    COALESCE(ccp.restricciones, '{}')                                AS restricciones,
    COALESCE(ccp.completitud, 0)                                     AS completitud,
    -- Hasta 3 trabajos suyos, para que el cliente juzgue por lo que ve y no
    -- por una ficha.
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'titulo', pi.title,
               'media_url', pi.media_url,
               'thumbnail_url', pi.thumbnail_url
             ) ORDER BY pi.created_at DESC)
      FROM (
        SELECT pi2.title, pi2.media_url, pi2.thumbnail_url, pi2.created_at
        FROM public.portfolio_items pi2
        WHERE pi2.creator_id = om.user_id
        ORDER BY pi2.created_at DESC
        LIMIT 3
      ) pi
    ), '[]'::jsonb)                                                  AS muestras
  FROM public.organization_members om
  LEFT JOIN public.profiles p                     ON p.id = om.user_id
  LEFT JOIN public.creator_profiles cp            ON cp.user_id = om.user_id
  LEFT JOIN public.creator_creative_profile ccp   ON ccp.user_id = om.user_id
  WHERE om.organization_id = v_org_id
    AND om.deleted_at IS NULL
    AND om.role IN ('content_creator'::app_role, 'creator'::app_role)
  ORDER BY COALESCE(ccp.completitud, 0) DESC, nombre ASC;
END;
$$;

-- La ejecuta el cliente autenticado; la propia función decide si puede.
REVOKE EXECUTE ON FUNCTION public.get_creator_catalog_for_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_creator_catalog_for_client(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_creator_catalog_for_client(uuid) IS
  'Catálogo de creadores de la organización para que el CLIENTE elija quién graba sus videos. SECURITY DEFINER porque el cliente no es miembro de la organización y la RLS le cerraría las tablas de talento; valida por dentro que sea el usuario de ese cliente o staff de la organización. Devuelve solo datos de presentación: nada de contacto ni tarifas.';
