-- =====================================================
-- Platform CRM Dashboard RPCs
-- Migration: 20260216500000_platform_crm_dashboard_rpcs
-- =====================================================

-- -------------------------------------------------------
-- get_platform_overview_stats: Counts for the CRM dashboard
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_platform_overview_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    month_start TIMESTAMPTZ := date_trunc('month', NOW());
BEGIN
    SELECT jsonb_build_object(
        'total_leads', (SELECT COUNT(*) FROM platform_leads),
        'total_organizations', (SELECT COUNT(*) FROM organizations),
        'total_creators', (SELECT COUNT(*) FROM creator_profiles),
        'total_users', (SELECT COUNT(*) FROM profiles),
        'new_leads_this_month', (
            SELECT COUNT(*) FROM platform_leads WHERE created_at >= month_start
        ),
        'new_orgs_this_month', (
            SELECT COUNT(*) FROM organizations WHERE created_at >= month_start
        ),
        'new_creators_this_month', (
            SELECT COUNT(*) FROM creator_profiles WHERE created_at >= month_start
        ),
        'new_users_this_month', (
            SELECT COUNT(*) FROM profiles WHERE created_at >= month_start
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- -------------------------------------------------------
-- get_leads_by_month: Leads grouped by month for chart
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_leads_by_month(p_months INTEGER DEFAULT 6)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.month), '[]'::jsonb)
    INTO result
    FROM (
        SELECT
            to_char(date_trunc('month', gs), 'YYYY-MM') AS month,
            to_char(date_trunc('month', gs), 'Mon') AS label,
            COALESCE(cnt.total, 0) AS total,
            COALESCE(cnt.converted, 0) AS converted
        FROM generate_series(
            date_trunc('month', NOW()) - ((p_months - 1) || ' months')::INTERVAL,
            date_trunc('month', NOW()),
            '1 month'::INTERVAL
        ) AS gs
        LEFT JOIN (
            SELECT
                date_trunc('month', created_at) AS m,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE stage = 'converted') AS converted
            FROM platform_leads
            WHERE created_at >= date_trunc('month', NOW()) - ((p_months - 1) || ' months')::INTERVAL
            GROUP BY date_trunc('month', created_at)
        ) cnt ON cnt.m = date_trunc('month', gs)
        ORDER BY gs
    ) t;

    RETURN result;
END;
$$;

-- -------------------------------------------------------
-- get_recent_lead_interactions: Last N interactions with lead info
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_recent_lead_interactions(p_limit INTEGER DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO result
    FROM (
        SELECT
            i.id,
            i.interaction_type,
            i.subject,
            i.content,
            i.created_at,
            l.full_name AS lead_name,
            l.email AS lead_email,
            p.full_name AS performed_by_name
        FROM platform_lead_interactions i
        JOIN platform_leads l ON l.id = i.lead_id
        LEFT JOIN profiles p ON p.id = i.performed_by
        ORDER BY i.created_at DESC
        LIMIT p_limit
    ) t;

    RETURN result;
END;
$$;

-- =====================================================
-- GRANTS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_platform_overview_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_leads_by_month(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_lead_interactions(INTEGER) TO authenticated;
