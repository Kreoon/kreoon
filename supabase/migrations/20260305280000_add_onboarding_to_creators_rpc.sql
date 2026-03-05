-- =====================================================
-- Agregar campos de onboarding a get_platform_creators_with_metrics
-- Migration: 20260305280000_add_onboarding_to_creators_rpc
-- =====================================================

CREATE OR REPLACE FUNCTION get_platform_creators_with_metrics()
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
            cp.id,
            cp.user_id,
            p.full_name,
            p.email,
            p.username,
            p.avatar_url,
            cp.categories,
            cp.content_types,
            cp.platforms,
            cp.marketplace_roles,
            cp.level,
            cp.is_verified,
            cp.is_active,
            cp.is_available,
            cp.rating_avg,
            cp.rating_count,
            cp.completed_projects,
            cp.base_price,
            cp.currency,
            cp.location_city,
            cp.location_country,
            cp.created_at,
            COALESCE(earn.total_earned, 0) AS total_earned,
            -- Campos de onboarding
            COALESCE(p.onboarding_completed, false) AS onboarding_completed,
            COALESCE(consent.consent_count, 0) AS consent_count
        FROM creator_profiles cp
        JOIN profiles p ON p.id = cp.user_id
        LEFT JOIN (
            SELECT
                creator_id,
                COALESCE(SUM(creator_payout), 0) AS total_earned
            FROM marketplace_projects
            WHERE status = 'completed'
            GROUP BY creator_id
        ) earn ON earn.creator_id = cp.user_id
        LEFT JOIN (
            SELECT
                user_id,
                COUNT(*) AS consent_count
            FROM user_legal_consents
            WHERE accepted = true AND is_current = true
            GROUP BY user_id
        ) consent ON consent.user_id = cp.user_id
    ) t;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_creators_with_metrics() TO authenticated;
