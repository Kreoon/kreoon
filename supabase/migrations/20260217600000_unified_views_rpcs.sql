-- =====================================================
-- get_unified_talent: Single RPC merging ALL org members + external CRM talent
-- Returns every person in the organization (any role) + external CRM relationships
-- =====================================================

CREATE OR REPLACE FUNCTION get_unified_talent(p_org_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  bio text,
  source text,              -- 'internal' | 'external' | 'both'
  -- Internal fields
  org_role text,            -- primary role (highest priority) or null
  all_roles text[],         -- all roles for this member
  is_owner boolean,
  content_count bigint,
  is_ambassador boolean,
  ambassador_level text,
  quality_score_avg numeric,
  reliability_score numeric,
  velocity_score numeric,
  ai_recommended_level text,
  ai_risk_flag text,
  active_tasks bigint,
  up_points numeric,
  up_level text,
  avg_star_rating numeric,
  rated_content_count bigint,
  -- External CRM fields
  relationship_id uuid,
  relationship_type text,
  times_worked_together integer,
  total_paid numeric,
  average_rating_given numeric,
  last_collaboration_at timestamptz,
  internal_notes text,
  internal_tags text[],
  list_name text,
  -- Marketplace fields
  creator_profile_id uuid,
  categories text[],
  content_types text[],
  platforms text[],
  slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- ALL internal org members (every role, including admin/team_leader/trafficker)
  internal_members AS (
    SELECT
      om.user_id,
      om.is_owner,
      -- Aggregate all roles for this user (cast enum to text)
      ARRAY_AGG(omr.role::text ORDER BY
        CASE omr.role::text
          WHEN 'admin' THEN 1
          WHEN 'team_leader' THEN 2
          WHEN 'strategist' THEN 3
          WHEN 'trafficker' THEN 4
          WHEN 'creator' THEN 5
          WHEN 'editor' THEN 6
          WHEN 'client' THEN 7
          ELSE 8
        END
      ) FILTER (WHERE omr.role IS NOT NULL) AS roles,
      -- Primary role = highest priority
      MIN(CASE omr.role::text
        WHEN 'admin' THEN 1
        WHEN 'team_leader' THEN 2
        WHEN 'strategist' THEN 3
        WHEN 'trafficker' THEN 4
        WHEN 'creator' THEN 5
        WHEN 'editor' THEN 6
        WHEN 'client' THEN 7
        ELSE 8
      END) AS role_priority
    FROM organization_members om
    LEFT JOIN organization_member_roles omr
      ON omr.organization_id = om.organization_id
      AND omr.user_id = om.user_id
    WHERE om.organization_id = p_org_id
    GROUP BY om.user_id, om.is_owner
  ),
  -- Compute primary role from priority
  internal_with_role AS (
    SELECT
      im.user_id,
      im.is_owner,
      im.roles,
      CASE im.role_priority
        WHEN 1 THEN 'admin'
        WHEN 2 THEN 'team_leader'
        WHEN 3 THEN 'strategist'
        WHEN 4 THEN 'trafficker'
        WHEN 5 THEN 'creator'
        WHEN 6 THEN 'editor'
        WHEN 7 THEN 'client'
        ELSE NULL
      END AS primary_role
    FROM internal_members im
  ),
  -- External CRM relationships
  external_rels AS (
    SELECT
      r.id AS rel_id,
      r.creator_id,
      r.relationship_type,
      r.times_worked_together,
      r.total_paid,
      r.average_rating_given,
      r.last_collaboration_at,
      r.internal_notes,
      r.internal_tags,
      r.list_name
    FROM org_creator_relationships r
    WHERE r.organization_id = p_org_id
  ),
  -- All unique user IDs from both sources
  all_users AS (
    SELECT iwr.user_id FROM internal_with_role iwr
    UNION
    SELECT er.creator_id FROM external_rels er
  ),
  -- Ambassador info
  ambassador_info AS (
    SELECT
      om.user_id,
      om.ambassador_level,
      EXISTS (
        SELECT 1 FROM organization_member_roles omr2
        WHERE omr2.organization_id = p_org_id
          AND omr2.user_id = om.user_id
          AND omr2.role = 'ambassador'
      ) AS is_amb_role
    FROM organization_members om
    WHERE om.organization_id = p_org_id
  ),
  -- Content counts per user (creator + editor roles)
  content_counts AS (
    SELECT user_id, SUM(cnt) AS total
    FROM (
      SELECT creator_id AS user_id, COUNT(*) AS cnt
      FROM content
      WHERE organization_id = p_org_id AND creator_id IS NOT NULL
      GROUP BY creator_id
      UNION ALL
      SELECT editor_id AS user_id, COUNT(*) AS cnt
      FROM content
      WHERE organization_id = p_org_id AND editor_id IS NOT NULL
      GROUP BY editor_id
      UNION ALL
      SELECT strategist_id AS user_id, COUNT(*) AS cnt
      FROM content
      WHERE organization_id = p_org_id AND strategist_id IS NOT NULL
      GROUP BY strategist_id
    ) sub
    GROUP BY user_id
  ),
  -- Active tasks per user
  active_tasks_counts AS (
    SELECT user_id, SUM(cnt) AS total
    FROM (
      SELECT creator_id AS user_id, COUNT(*) AS cnt
      FROM content
      WHERE organization_id = p_org_id
        AND status IN ('assigned','recording','recorded','editing','review','issue')
        AND creator_id IS NOT NULL
      GROUP BY creator_id
      UNION ALL
      SELECT editor_id AS user_id, COUNT(*) AS cnt
      FROM content
      WHERE organization_id = p_org_id
        AND status IN ('assigned','recording','recorded','editing','review','issue')
        AND editor_id IS NOT NULL
      GROUP BY editor_id
    ) sub
    GROUP BY user_id
  ),
  -- UP points (aggregate across roles per user)
  up_data AS (
    SELECT user_id, SUM(total_points) AS total_points, MAX(current_level) AS current_level
    FROM up_user_scores
    WHERE organization_id = p_org_id
    GROUP BY user_id
  ),
  -- Star ratings
  star_ratings AS (
    SELECT user_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
    FROM (
      SELECT creator_id AS user_id, creator_rating AS rating
      FROM content
      WHERE organization_id = p_org_id AND creator_rating IS NOT NULL
      UNION ALL
      SELECT editor_id AS user_id, editor_rating AS rating
      FROM content
      WHERE organization_id = p_org_id AND editor_rating IS NOT NULL
      UNION ALL
      SELECT strategist_id AS user_id, strategy_rating AS rating
      FROM content
      WHERE organization_id = p_org_id AND strategy_rating IS NOT NULL
    ) sub
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  )
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.phone,
    p.bio,
    -- Source determination
    CASE
      WHEN iwr.user_id IS NOT NULL AND er.creator_id IS NOT NULL THEN 'both'
      WHEN iwr.user_id IS NOT NULL THEN 'internal'
      ELSE 'external'
    END AS source,
    -- Internal fields
    iwr.primary_role AS org_role,
    iwr.roles AS all_roles,
    COALESCE(iwr.is_owner, false) AS is_owner,
    COALESCE(cc.total, 0)::bigint AS content_count,
    COALESCE(ai.is_amb_role, p.is_ambassador, false) AS is_ambassador,
    ai.ambassador_level,
    p.quality_score_avg,
    p.reliability_score,
    p.velocity_score,
    p.ai_recommended_level,
    p.ai_risk_flag,
    COALESCE(at.total, 0)::bigint AS active_tasks,
    COALESCE(ud.total_points, 0)::numeric AS up_points,
    ud.current_level AS up_level,
    sr.avg_rating AS avg_star_rating,
    COALESCE(sr.rating_count, 0)::bigint AS rated_content_count,
    -- External CRM fields
    er.rel_id AS relationship_id,
    er.relationship_type,
    COALESCE(er.times_worked_together, 0) AS times_worked_together,
    COALESCE(er.total_paid, 0) AS total_paid,
    er.average_rating_given,
    er.last_collaboration_at,
    er.internal_notes,
    er.internal_tags,
    er.list_name,
    -- Marketplace fields
    cp.id AS creator_profile_id,
    cp.categories,
    cp.content_types,
    cp.platforms,
    cp.slug
  FROM all_users au
  JOIN profiles p ON p.id = au.user_id
  LEFT JOIN internal_with_role iwr ON iwr.user_id = au.user_id
  LEFT JOIN external_rels er ON er.creator_id = au.user_id
  LEFT JOIN ambassador_info ai ON ai.user_id = au.user_id
  LEFT JOIN content_counts cc ON cc.user_id = au.user_id
  LEFT JOIN active_tasks_counts at ON at.user_id = au.user_id
  LEFT JOIN up_data ud ON ud.user_id = au.user_id
  LEFT JOIN star_ratings sr ON sr.user_id = au.user_id
  LEFT JOIN creator_profiles cp ON cp.user_id = au.user_id
  ORDER BY
    CASE
      WHEN iwr.user_id IS NOT NULL AND er.creator_id IS NOT NULL THEN 0
      WHEN iwr.user_id IS NOT NULL THEN 1
      ELSE 2
    END,
    p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_unified_talent(uuid) TO authenticated;

-- =====================================================
-- get_unified_clients: Single RPC merging empresas + contactos
-- =====================================================

CREATE OR REPLACE FUNCTION get_unified_clients(p_org_id uuid)
RETURNS TABLE (
  id uuid,
  entity_type text,           -- 'empresa' | 'contacto'
  name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz,
  -- Empresa fields (null for contactos)
  is_vip boolean,
  is_internal_brand boolean,
  content_count bigint,
  active_projects bigint,
  users_count bigint,
  username text,
  client_notes text,
  -- Contacto fields (null for empresas)
  company text,
  "position" text,
  contact_type text,
  pipeline_stage text,
  deal_value numeric,
  expected_close_date date,
  relationship_strength text,
  contact_notes text,
  tags text[],
  custom_fields jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Empresas (clients)
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
    -- Contacto fields = null
    NULL::text AS company,
    NULL::text AS "position",
    NULL::text AS contact_type,
    NULL::text AS pipeline_stage,
    NULL::numeric AS deal_value,
    NULL::date AS expected_close_date,
    NULL::text AS relationship_strength,
    NULL::text AS contact_notes,
    NULL::text[] AS tags,
    NULL::jsonb AS custom_fields
  FROM clients c
  WHERE c.organization_id = p_org_id

  UNION ALL

  -- Contactos (org_contacts)
  SELECT
    oc.id,
    'contacto'::text AS entity_type,
    oc.full_name AS name,
    oc.email,
    oc.phone,
    oc.avatar_url,
    oc.created_at,
    oc.updated_at,
    -- Empresa fields = null/defaults
    false AS is_vip,
    false AS is_internal_brand,
    0::bigint AS content_count,
    0::bigint AS active_projects,
    0::bigint AS users_count,
    NULL::text AS username,
    NULL::text AS client_notes,
    -- Contacto fields
    oc.company,
    oc.position,
    oc.contact_type,
    oc.pipeline_stage,
    oc.deal_value,
    oc.expected_close_date,
    oc.relationship_strength,
    oc.notes AS contact_notes,
    oc.tags,
    oc.custom_fields
  FROM org_contacts oc
  WHERE oc.organization_id = p_org_id

  ORDER BY entity_type, name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_unified_clients(uuid) TO authenticated;
