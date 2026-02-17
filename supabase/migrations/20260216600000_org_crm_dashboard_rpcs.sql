-- =====================================================
-- Org CRM Dashboard RPCs
-- Migration: 20260216600000_org_crm_dashboard_rpcs
-- =====================================================

-- -------------------------------------------------------
-- get_org_crm_overview: KPIs for org CRM dashboard
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_org_crm_overview(p_org_id UUID)
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
        'total_contacts', (
            SELECT COUNT(*) FROM org_contacts WHERE organization_id = p_org_id
        ),
        'new_contacts_this_month', (
            SELECT COUNT(*) FROM org_contacts
            WHERE organization_id = p_org_id AND created_at >= month_start
        ),
        'hot_leads', (
            SELECT COUNT(*) FROM org_contacts
            WHERE organization_id = p_org_id AND relationship_strength = 'hot'
        ),
        'warm_leads', (
            SELECT COUNT(*) FROM org_contacts
            WHERE organization_id = p_org_id AND relationship_strength = 'warm'
        ),
        'total_creators', (
            SELECT COUNT(DISTINCT creator_id) FROM org_creator_relationships
            WHERE organization_id = p_org_id
        ),
        'favorite_creators', (
            SELECT COUNT(*) FROM org_creator_relationships
            WHERE organization_id = p_org_id AND relationship_type = 'favorite'
        ),
        'worked_with_creators', (
            SELECT COUNT(*) FROM org_creator_relationships
            WHERE organization_id = p_org_id AND relationship_type = 'worked_with'
        ),
        'total_pipelines', (
            SELECT COUNT(*) FROM org_pipelines WHERE organization_id = p_org_id
        ),
        'contacts_in_pipeline', (
            SELECT COUNT(*) FROM org_contacts
            WHERE organization_id = p_org_id AND pipeline_stage IS NOT NULL
        ),
        'total_deal_value', (
            SELECT COALESCE(SUM(deal_value), 0) FROM org_contacts
            WHERE organization_id = p_org_id
        ),
        'total_paid_to_creators', (
            SELECT COALESCE(SUM(total_paid), 0) FROM org_creator_relationships
            WHERE organization_id = p_org_id
        ),
        'total_collaborations', (
            SELECT COALESCE(SUM(times_worked_together), 0) FROM org_creator_relationships
            WHERE organization_id = p_org_id
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- -------------------------------------------------------
-- get_org_upcoming_actions: Next actions from interactions
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_org_upcoming_actions(p_org_id UUID, p_limit INTEGER DEFAULT 5)
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
            i.next_action,
            i.next_action_date,
            i.interaction_type,
            c.id AS contact_id,
            c.full_name AS contact_name,
            c.company AS contact_company,
            p.full_name AS assigned_to_name
        FROM org_contact_interactions i
        JOIN org_contacts c ON c.id = i.contact_id
        LEFT JOIN profiles p ON p.id = i.performed_by
        WHERE i.organization_id = p_org_id
            AND i.next_action IS NOT NULL
            AND i.next_action_date IS NOT NULL
            AND i.next_action_date >= NOW()
        ORDER BY i.next_action_date ASC
        LIMIT p_limit
    ) t;

    RETURN result;
END;
$$;

-- -------------------------------------------------------
-- get_org_recent_activity: Last N interactions for org
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_org_recent_activity(p_org_id UUID, p_limit INTEGER DEFAULT 10)
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
            i.outcome,
            i.created_at,
            c.full_name AS contact_name,
            c.company AS contact_company,
            p.full_name AS performed_by_name
        FROM org_contact_interactions i
        JOIN org_contacts c ON c.id = i.contact_id
        LEFT JOIN profiles p ON p.id = i.performed_by
        WHERE i.organization_id = p_org_id
        ORDER BY i.created_at DESC
        LIMIT p_limit
    ) t;

    RETURN result;
END;
$$;

-- -------------------------------------------------------
-- get_org_pipeline_summary: Contacts per stage of default pipeline
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_org_pipeline_summary(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    v_pipeline RECORD;
BEGIN
    -- Get the default pipeline (or first one)
    SELECT id, name, stages
    INTO v_pipeline
    FROM org_pipelines
    WHERE organization_id = p_org_id
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('pipeline_name', null, 'stages', '[]'::jsonb);
    END IF;

    SELECT jsonb_build_object(
        'pipeline_id', v_pipeline.id,
        'pipeline_name', v_pipeline.name,
        'stages', (
            SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.stage_order), '[]'::jsonb)
            FROM (
                SELECT
                    s.elem->>'name' AS stage_name,
                    (s.elem->>'order')::int AS stage_order,
                    s.elem->>'color' AS stage_color,
                    COALESCE(cnt.total, 0) AS contact_count,
                    COALESCE(cnt.deal_sum, 0) AS deal_value
                FROM jsonb_array_elements(v_pipeline.stages::jsonb) WITH ORDINALITY AS s(elem, idx)
                LEFT JOIN (
                    SELECT
                        pipeline_stage,
                        COUNT(*) AS total,
                        COALESCE(SUM(deal_value), 0) AS deal_sum
                    FROM org_contacts
                    WHERE organization_id = p_org_id
                        AND pipeline_stage IS NOT NULL
                    GROUP BY pipeline_stage
                ) cnt ON cnt.pipeline_stage = s.elem->>'name'
            ) t
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- =====================================================
-- GRANTS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_org_crm_overview(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_upcoming_actions(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_recent_activity(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_pipeline_summary(UUID) TO authenticated;
