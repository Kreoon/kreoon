-- ============================================================================
-- KREOON — La lista de empresas deja de mostrar las archivadas
--
-- `get_unified_clients` es la que alimenta la página de Clientes, y no miraba
-- `clients.deleted_at`. Sin este filtro, archivar una empresa no servía de
-- nada: la RPC la seguía devolviendo y el frontend tenía que descartarla por
-- su cuenta cruzando IDs — una defensa frágil que se rompe en cuanto alguien
-- consulta la RPC desde otro sitio.
--
-- Se filtra en los DOS bloques que leen `clients`: las empresas propias de la
-- organización y las marcas vinculadas por `brand_organization_links`. Los
-- contactos (`org_contacts`) no tienen archivado y quedan igual.
--
-- Va junto con 20260814020000_admin_archive_delete_clients.sql, que crea
-- admin_archive_client / admin_restore_client / get_client_deletion_impact.
--
-- OJO: los alias de columna (AS entity_type, AS email, ...) son OBLIGATORIOS.
-- La consulta cierra con ORDER BY entity_type, y sin el alias ese nombre no
-- existe: la funcion entera falla con 400 y la pagina de Clientes se queda
-- sin empresas. Paso en produccion al escribir esta migracion.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_unified_clients(p_org_id uuid)
 RETURNS TABLE(id uuid, entity_type text, name text, email text, phone text, avatar_url text, created_at timestamp with time zone, updated_at timestamp with time zone, is_vip boolean, is_internal_brand boolean, content_count bigint, active_projects bigint, users_count bigint, username text, client_notes text, company text, "position" text, contact_type text, pipeline_stage text, deal_value numeric, expected_close_date date, relationship_strength text, contact_notes text, tags text[], custom_fields jsonb, brand_id uuid, lead_source text, community_name text, referred_by text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of this organization';
  END IF;

  RETURN QUERY

  -- Empresas propias de la organización
  SELECT
    c.id,
    'empresa'::text AS entity_type,
    c.name,
    c.contact_email AS email,
    c.contact_phone AS phone,
    c.logo_url AS avatar_url,
    c.created_at,
    c.created_at AS updated_at,
    COALESCE(c.is_vip, false) AS is_vip,
    COALESCE(c.is_internal_brand, false) AS is_internal_brand,
    (SELECT COUNT(*) FROM content ct WHERE ct.client_id = c.id)::bigint AS content_count,
    (SELECT COUNT(*) FROM client_packages cp WHERE cp.client_id = c.id)::bigint AS active_projects,
    (SELECT COUNT(*) FROM client_users cu WHERE cu.client_id = c.id)::bigint AS users_count,
    c.username,
    c.notes AS client_notes,
    NULL::text AS company,
    NULL::text AS "position",
    NULL::text AS contact_type,
    NULL::text AS pipeline_stage,
    NULL::numeric AS deal_value,
    NULL::date AS expected_close_date,
    NULL::text AS relationship_strength,
    NULL::text AS contact_notes,
    NULL::text[] AS tags,
    NULL::jsonb AS custom_fields,
    c.brand_id,
    c.lead_source,
    c.community_name,
    c.referred_by
  FROM clients c
  WHERE c.organization_id = p_org_id
    AND c.deleted_at IS NULL

  UNION ALL

  -- Marcas vinculadas por brand_organization_links
  SELECT
    c.id,
    'empresa'::text AS entity_type,
    c.name,
    c.contact_email AS email,
    c.contact_phone AS phone,
    c.logo_url AS avatar_url,
    c.created_at,
    c.created_at AS updated_at,
    COALESCE(c.is_vip, false) AS is_vip,
    COALESCE(c.is_internal_brand, false) AS is_internal_brand,
    (SELECT COUNT(*) FROM content ct WHERE ct.client_id = c.id)::bigint AS content_count,
    (SELECT COUNT(*) FROM client_packages cp WHERE cp.client_id = c.id)::bigint AS active_projects,
    (SELECT COUNT(*) FROM client_users cu WHERE cu.client_id = c.id)::bigint AS users_count,
    c.username,
    c.notes AS client_notes,
    NULL::text AS company,
    NULL::text AS "position",
    NULL::text AS contact_type,
    NULL::text AS pipeline_stage,
    NULL::numeric AS deal_value,
    NULL::date AS expected_close_date,
    NULL::text AS relationship_strength,
    NULL::text AS contact_notes,
    NULL::text[] AS tags,
    NULL::jsonb AS custom_fields,
    c.brand_id,
    c.lead_source,
    c.community_name,
    c.referred_by
  FROM clients c
  JOIN brand_organization_links bol ON bol.brand_id = c.brand_id
  WHERE bol.organization_id = p_org_id
    AND bol.status = 'active'
    AND c.organization_id IS NULL
    AND c.deleted_at IS NULL

  UNION ALL

  -- Contactos sueltos del CRM: no tienen archivado
  SELECT
    oc.id,
    'contacto'::text AS entity_type,
    oc.full_name AS name,
    oc.email,
    oc.phone,
    oc.avatar_url,
    oc.created_at,
    oc.updated_at,
    false AS is_vip,
    false AS is_internal_brand,
    0::bigint AS content_count,
    0::bigint AS active_projects,
    0::bigint AS users_count,
    NULL::text AS username,
    NULL::text AS client_notes,
    oc.company,
    oc.position,
    oc.contact_type,
    oc.pipeline_stage,
    oc.deal_value,
    oc.expected_close_date,
    oc.relationship_strength,
    oc.notes AS contact_notes,
    oc.tags,
    oc.custom_fields,
    NULL::uuid AS brand_id,
    NULL::text AS lead_source,
    NULL::text AS community_name,
    NULL::text AS referred_by
  FROM org_contacts oc
  WHERE oc.organization_id = p_org_id

  ORDER BY entity_type, name;
END;
$function$;

NOTIFY pgrst, 'reload schema';
