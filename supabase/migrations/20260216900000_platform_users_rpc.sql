-- =====================================================
-- Platform Users with Health RPC
-- Migration: 20260216900000_platform_users_rpc
-- =====================================================

CREATE OR REPLACE FUNCTION get_platform_users_with_health()
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
            p.id,
            p.email,
            p.full_name,
            p.avatar_url,
            om.role,
            om.organization_id,
            o.name AS organization_name,
            COALESCE(h.health_score, 50) AS health_score,
            COALESCE(h.health_status, 'healthy') AS health_status,
            COALESCE(h.total_logins, 0) AS total_logins,
            COALESCE(h.days_since_last_activity,
                EXTRACT(DAY FROM NOW() - COALESCE(au.last_sign_in_at, p.created_at))
            )::integer AS days_since_last_activity,
            COALESCE(h.last_login_at, au.last_sign_in_at) AS last_login_at,
            COALESCE(h.total_applications, 0)
                + COALESCE(h.total_completed_projects, 0)
                + COALESCE(h.total_campaigns_created, 0)
                + COALESCE(h.total_content_received, 0) AS total_actions,
            COALESCE(h.needs_attention, FALSE) AS needs_attention,
            p.created_at
        FROM profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        LEFT JOIN LATERAL (
            SELECT om2.role, om2.organization_id
            FROM organization_members om2
            WHERE om2.user_id = p.id
            ORDER BY om2.is_owner DESC, om2.joined_at ASC
            LIMIT 1
        ) om ON TRUE
        LEFT JOIN organizations o ON o.id = om.organization_id
        LEFT JOIN platform_user_health h ON h.user_id = p.id
    ) t;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_users_with_health() TO authenticated;
