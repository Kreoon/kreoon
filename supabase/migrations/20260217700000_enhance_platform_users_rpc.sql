-- =====================================================
-- Enhanced Platform Users with Health RPC
-- Migration: 20260217700000_enhance_platform_users_rpc
-- Changes: Start from auth.users (catches users without profiles),
--          add email_confirmed_at, is_banned, has_profile, is_platform_admin
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
            au.id,
            COALESCE(p.email, au.email) AS email,
            COALESCE(p.full_name, au.raw_user_meta_data->>'full_name', 'Sin nombre') AS full_name,
            p.avatar_url,
            COALESCE(om.role::text, p.active_role) AS role,
            om.organization_id,
            o.name AS organization_name,
            COALESCE(h.health_score, 50) AS health_score,
            COALESCE(h.health_status, 'healthy') AS health_status,
            COALESCE(h.total_logins, 0) AS total_logins,
            COALESCE(h.days_since_last_activity,
                EXTRACT(DAY FROM NOW() - COALESCE(au.last_sign_in_at, au.created_at))
            )::integer AS days_since_last_activity,
            COALESCE(h.last_login_at, au.last_sign_in_at) AS last_login_at,
            COALESCE(h.total_applications, 0)
                + COALESCE(h.total_completed_projects, 0)
                + COALESCE(h.total_campaigns_created, 0)
                + COALESCE(h.total_content_received, 0) AS total_actions,
            COALESCE(h.needs_attention, FALSE) AS needs_attention,
            COALESCE(p.created_at, au.created_at) AS created_at,
            -- New auth-level fields
            au.email_confirmed_at,
            CASE WHEN au.banned_until IS NOT NULL AND au.banned_until > NOW() THEN TRUE ELSE FALSE END AS is_banned,
            (p.id IS NOT NULL) AS has_profile,
            EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = au.id AND ur.role = 'admin') AS is_platform_admin
        FROM auth.users au
        LEFT JOIN profiles p ON p.id = au.id
        LEFT JOIN LATERAL (
            SELECT om2.role, om2.organization_id
            FROM organization_members om2
            WHERE om2.user_id = au.id
            ORDER BY om2.is_owner DESC, om2.joined_at ASC
            LIMIT 1
        ) om ON TRUE
        LEFT JOIN organizations o ON o.id = om.organization_id
        LEFT JOIN platform_user_health h ON h.user_id = au.id
    ) t;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_users_with_health() TO authenticated;
