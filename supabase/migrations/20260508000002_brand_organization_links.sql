-- ============================================================================
-- BRAND ORGANIZATION LINKS
-- Permite vincular brands independientes con organizaciones para que aparezcan
-- como una sola entidad en el frontend, con capacidad de desvincular.
-- Soporta múltiples orgs por brand de forma simultánea.
-- ============================================================================

-- 1. Reemplazar índice único global por uno parcial (solo standalone clients)
--    Esto permite que clientes de org también tengan brand_id asignado (escenario fusión)
DROP INDEX IF EXISTS idx_unique_client_per_brand;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_standalone_client_per_brand
ON clients(brand_id)
WHERE brand_id IS NOT NULL AND organization_id IS NULL;

-- 2. Tabla junction brand_organization_links
CREATE TABLE IF NOT EXISTS brand_organization_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  linked_by UUID REFERENCES auth.users(id),
  linked_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(brand_id, organization_id)
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_bol_brand_id ON brand_organization_links(brand_id);
CREATE INDEX IF NOT EXISTS idx_bol_org_id ON brand_organization_links(organization_id)
WHERE status = 'active';

-- 4. RLS
ALTER TABLE brand_organization_links ENABLE ROW LEVEL SECURITY;

-- Cualquier miembro de la org o de la brand puede ver los links
CREATE POLICY "bol_select" ON brand_organization_links
FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  )
  OR brand_id IN (
    SELECT bm.brand_id FROM brand_members bm
    WHERE bm.user_id = auth.uid() AND bm.status = 'active'
  )
);

-- Solo admins/team_leaders de la org pueden crear links
CREATE POLICY "bol_insert" ON brand_organization_links
FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'team_leader')
  )
);

-- Solo admins/team_leaders de la org pueden actualizar
CREATE POLICY "bol_update" ON brand_organization_links
FOR UPDATE TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'team_leader')
  )
);

-- Admins de la org O el owner de la brand pueden eliminar
CREATE POLICY "bol_delete" ON brand_organization_links
FOR DELETE TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'team_leader')
  )
  OR brand_id IN (
    SELECT bm.brand_id FROM brand_members bm
    WHERE bm.user_id = auth.uid() AND bm.status = 'active' AND bm.role = 'owner'
  )
);

-- 5. Función: link_brand_to_org
--    Escenario A (vincular): brand tiene standalone client, se vincula a la org via junction
--    Escenario B (fusionar): org ya tiene client manual, se le asigna brand_id
CREATE OR REPLACE FUNCTION link_brand_to_org(
  p_brand_id UUID,
  p_org_id UUID,
  p_existing_org_client_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_result_id UUID;
BEGIN
  IF p_existing_org_client_id IS NOT NULL THEN
    -- Escenario B (fusionar): asignar brand_id al client existente de la org
    UPDATE clients
    SET brand_id = p_brand_id
    WHERE id = p_existing_org_client_id
      AND organization_id = p_org_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cliente no encontrado en la organización';
    END IF;

    RETURN p_existing_org_client_id;
  ELSE
    -- Escenario A (vincular): crear/reactivar junction
    INSERT INTO brand_organization_links (brand_id, organization_id, linked_by, status)
    VALUES (p_brand_id, p_org_id, auth.uid(), 'active')
    ON CONFLICT (brand_id, organization_id)
    DO UPDATE SET
      status = 'active',
      linked_by = auth.uid(),
      linked_at = now()
    RETURNING id INTO v_result_id;

    RETURN v_result_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Función: unlink_brand_from_org
--    Desactiva el link junction Y limpia brand_id de clientes org (si aplicaba fusión)
CREATE OR REPLACE FUNCTION unlink_brand_from_org(
  p_brand_id UUID,
  p_org_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Desactivar junction link (Escenario A)
  UPDATE brand_organization_links
  SET status = 'inactive'
  WHERE brand_id = p_brand_id AND organization_id = p_org_id;

  -- Limpiar brand_id en clientes de esta org (Escenario B / fusión)
  UPDATE clients
  SET brand_id = NULL
  WHERE brand_id = p_brand_id AND organization_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Grants
GRANT EXECUTE ON FUNCTION link_brand_to_org(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unlink_brand_from_org(UUID, UUID) TO authenticated;

-- 8. Actualizar get_unified_clients para incluir brands vinculadas via junction
--    Se agrega brand_id al return type y un tercer UNION para standalone brand clients
CREATE OR REPLACE FUNCTION get_unified_clients(p_org_id uuid)
RETURNS TABLE (
  id uuid,
  entity_type text,
  name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz,
  is_vip boolean,
  is_internal_brand boolean,
  content_count bigint,
  active_projects bigint,
  users_count bigint,
  username text,
  client_notes text,
  company text,
  "position" text,
  contact_type text,
  pipeline_stage text,
  deal_value numeric,
  expected_close_date date,
  relationship_strength text,
  contact_notes text,
  tags text[],
  custom_fields jsonb,
  brand_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY

  -- Empresas (clientes directos de la org, incluye fusiones con brand_id)
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
    (SELECT COUNT(*) FROM content ct WHERE ct.client_id = c.id
      AND ct.status NOT IN ('approved','paid'))::bigint AS active_projects,
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
    c.brand_id
  FROM clients c
  WHERE c.organization_id = p_org_id

  UNION ALL

  -- Brands vinculadas via brand_organization_links (standalone clients sin org)
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
    (SELECT COUNT(*) FROM content ct WHERE ct.client_id = c.id
      AND ct.status NOT IN ('approved','paid'))::bigint AS active_projects,
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
    c.brand_id
  FROM clients c
  JOIN brand_organization_links bol ON bol.brand_id = c.brand_id
  WHERE bol.organization_id = p_org_id
    AND bol.status = 'active'
    AND c.organization_id IS NULL

  UNION ALL

  -- Contactos (org_contacts, sin cambios)
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
    NULL::uuid AS brand_id
  FROM org_contacts oc
  WHERE oc.organization_id = p_org_id

  ORDER BY entity_type, name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_unified_clients(uuid) TO authenticated;
