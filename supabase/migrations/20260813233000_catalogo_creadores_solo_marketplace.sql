-- ============================================================================
-- KREOON — El catálogo del cliente muestra EXACTAMENTE el marketplace
--
-- Dos correcciones sobre 20260813210000_catalogo_creadores_para_cliente.sql:
--
-- 1. ANTES devolvía a todo miembro de la organización con rol de creador: 291
--    personas, la mayoría sin perfil público ni portafolio. El cliente veía un
--    listado interno, no el marketplace. AHORA aplica el mismo criterio que
--    `search_marketplace_creators`, que es la fuente de verdad de "quién está
--    activo en el marketplace":
--      · está en el marketplace de ESA organización (organization_marketplace_creators)
--      · creator_profiles.is_active = true
--      · is_published (nulo cuenta como publicado, igual que el marketplace)
--      · tiene portafolio (portfolio_count > 0)
--    En la organización de prueba: de 425 en la tabla puente pasan 95.
--
--    Con UNA diferencia deliberada frente a search_marketplace_creators: ese
--    RPC descarta a cualquiera que aparezca en `client_users` o tenga rol
--    `client`, y eso deja fuera a gente del equipo que además entra al portal
--    como usuario de alguna marca. Caso real: Diana Milena Torres, admin de la
--    organización con 52 piezas de portafolio, desaparecía del catálogo por
--    estar vinculada al cliente "UGC Colombia". Aquí no hace falta ese filtro:
--    exigir portafolio real + estar dado de alta en el marketplace de la
--    organización ya deja fuera a los clientes de verdad (medido: quitarlo
--    suma exactamente 1 persona, Diana, y ningún cliente).
--
-- 2. Las muestras salían SIEMPRE vacías. `portfolio_items.creator_id` apunta a
--    `creator_profiles.id`, no a `user_id` — verificado: 0 coincidencias por
--    user_id contra 96 por profile id. Ahora se unen bien y además solo trae
--    piezas públicas, como hace el marketplace.
--
-- Rollback: reaplicar 20260813210000_catalogo_creadores_para_cliente.sql
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
    cp.user_id,
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
    -- por una ficha. El join va contra creator_profiles.id: es a lo que
    -- apunta portfolio_items.creator_id.
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'titulo', pi.title,
               'media_url', pi.media_url,
               'thumbnail_url', pi.thumbnail_url
             ))
      FROM (
        SELECT pi2.title, pi2.media_url, pi2.thumbnail_url
        FROM public.portfolio_items pi2
        WHERE pi2.creator_id = cp.id
          AND pi2.is_public = true
        ORDER BY pi2.is_featured DESC NULLS LAST, pi2.display_order ASC NULLS LAST
        LIMIT 3
      ) pi
    ), '[]'::jsonb)                                                  AS muestras
  FROM public.organization_marketplace_creators omc
  JOIN public.creator_profiles cp                 ON cp.user_id = omc.creator_user_id
  LEFT JOIN public.profiles p                     ON p.id = cp.user_id
  LEFT JOIN public.creator_creative_profile ccp   ON ccp.user_id = cp.user_id
  WHERE omc.organization_id = v_org_id
    AND omc.status = 'active'
    -- Mismo criterio que search_marketplace_creators: si no lo ve en el
    -- marketplace, tampoco puede elegirlo aquí.
    AND cp.is_active = true
    AND COALESCE(cp.is_published, true) = true
    AND COALESCE(cp.portfolio_count, 0) > 0
  ORDER BY COALESCE(ccp.completitud, 0) DESC, nombre ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_creator_catalog_for_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_creator_catalog_for_client(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_creator_catalog_for_client(uuid) IS
  'Catálogo de creadores para que el CLIENTE elija quién graba sus videos. Devuelve EXACTAMENTE los que están activos en el marketplace de su organización (mismo criterio que search_marketplace_creators): en la tabla puente organization_marketplace_creators, con perfil activo, publicado y con portafolio. SECURITY DEFINER porque el cliente no es miembro de la organización; valida por dentro que sea el usuario de ese cliente o staff. Solo datos de presentación: nada de contacto ni tarifas.';
