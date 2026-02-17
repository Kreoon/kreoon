-- =====================================================
-- Platform Organizations with Metrics RPC
-- Migration: 20260216700000_platform_organizations_rpc
-- =====================================================

CREATE OR REPLACE FUNCTION get_platform_organizations_with_metrics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
    INTO result
    FROM (
        SELECT
            o.id,
            o.name,
            o.slug,
            o.logo_url,
            o.created_at,
            o.settings,
            COALESCE(mem.member_count, 0) AS member_count,
            COALESCE(cr.creator_count, 0) AS creator_count,
            COALESCE(cr.total_spent, 0) AS total_spent,
            COALESCE(cnt.content_count, 0) AS content_count,
            COALESCE(cnt.last_content_at, ci.last_interaction_at, o.created_at) AS last_activity_at
        FROM organizations o
        LEFT JOIN (
            SELECT
                organization_id,
                COUNT(*) AS member_count
            FROM organization_members
            GROUP BY organization_id
        ) mem ON mem.organization_id = o.id
        LEFT JOIN (
            SELECT
                organization_id,
                COUNT(DISTINCT creator_id) AS creator_count,
                COALESCE(SUM(total_paid), 0) AS total_spent
            FROM org_creator_relationships
            GROUP BY organization_id
        ) cr ON cr.organization_id = o.id
        LEFT JOIN (
            SELECT
                organization_id,
                COUNT(*) AS content_count,
                MAX(created_at) AS last_content_at
            FROM content
            GROUP BY organization_id
        ) cnt ON cnt.organization_id = o.id
        LEFT JOIN (
            SELECT
                organization_id,
                MAX(created_at) AS last_interaction_at
            FROM org_contact_interactions
            GROUP BY organization_id
        ) ci ON ci.organization_id = o.id
    ) t;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_organizations_with_metrics() TO authenticated;
