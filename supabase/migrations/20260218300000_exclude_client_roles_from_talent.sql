-- =====================================================
-- Fix: Exclude client-category roles from talent page
--
-- brand_manager, marketing_director, client belong to the
-- "client" category and should NOT appear in /talent.
-- They should only appear in the Clients section.
--
-- If a user has BOTH brand_manager + creator, only the
-- creator role will show in talent (correct behavior).
-- If a user ONLY has brand_manager, they won't show in
-- talent at all (they have no team role).
-- =====================================================

CREATE OR REPLACE FUNCTION get_unified_talent(p_org_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  bio text,
  source text,
  org_role text,
  all_roles text[],
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
  relationship_id uuid,
  relationship_type text,
  times_worked_together integer,
  total_paid numeric,
  average_rating_given numeric,
  last_collaboration_at timestamptz,
  internal_notes text,
  internal_tags text[],
  list_name text,
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
  -- Client-category roles to exclude from talent view
  -- These users belong in Clients, not Talent
  client_roles AS (
    SELECT unnest(ARRAY['client', 'brand_manager', 'marketing_director']) AS role_name
  ),
  -- ALL internal org members, excluding client-category roles
  internal_members AS (
    SELECT
      om.user_id,
      om.is_owner,
      ARRAY_AGG(omr.role::text ORDER BY
        CASE omr.role::text
          WHEN 'admin' THEN 1
          WHEN 'team_leader' THEN 2
          WHEN 'strategist' THEN 3
          WHEN 'trafficker' THEN 4
          WHEN 'creator' THEN 5
          WHEN 'editor' THEN 6
          ELSE 8
        END
      ) FILTER (WHERE omr.role IS NOT NULL
        AND omr.role::text NOT IN (SELECT role_name FROM client_roles)
      ) AS roles,
      MIN(CASE omr.role::text
        WHEN 'admin' THEN 1
        WHEN 'team_leader' THEN 2
        WHEN 'strategist' THEN 3
        WHEN 'trafficker' THEN 4
        WHEN 'creator' THEN 5
        WHEN 'editor' THEN 6
        ELSE NULL
      END) FILTER (WHERE omr.role::text NOT IN (SELECT role_name FROM client_roles)
      ) AS role_priority
    FROM organization_members om
    LEFT JOIN organization_member_roles omr
      ON omr.organization_id = om.organization_id
      AND omr.user_id = om.user_id
    WHERE om.organization_id = p_org_id
    GROUP BY om.user_id, om.is_owner
    -- Keep: owners (always), users with at least one non-client role, or users with NO roles (leads)
    HAVING om.is_owner = true
       OR COUNT(*) FILTER (WHERE omr.role IS NOT NULL AND omr.role::text NOT IN (SELECT role_name FROM client_roles)) > 0
       OR COUNT(*) FILTER (WHERE omr.role IS NOT NULL) = 0
  ),
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
        ELSE NULL
      END AS primary_role
    FROM internal_members im
  ),
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
  all_users AS (
    SELECT iwr.user_id FROM internal_with_role iwr
    UNION
    SELECT er.creator_id FROM external_rels er
  ),
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
  up_data AS (
    SELECT user_id, SUM(total_points) AS total_points, MAX(current_level) AS current_level
    FROM up_user_scores
    WHERE organization_id = p_org_id
    GROUP BY user_id
  ),
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
    CASE
      WHEN iwr.user_id IS NOT NULL AND er.creator_id IS NOT NULL THEN 'both'
      WHEN iwr.user_id IS NOT NULL THEN 'internal'
      ELSE 'external'
    END AS source,
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
    er.rel_id AS relationship_id,
    er.relationship_type,
    COALESCE(er.times_worked_together, 0) AS times_worked_together,
    COALESCE(er.total_paid, 0) AS total_paid,
    er.average_rating_given,
    er.last_collaboration_at,
    er.internal_notes,
    er.internal_tags,
    er.list_name,
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
