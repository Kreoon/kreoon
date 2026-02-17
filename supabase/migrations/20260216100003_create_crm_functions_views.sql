-- =====================================================
-- CRM FUNCTIONS & VIEWS
-- Migration: 20260216100003_create_crm_functions_views
-- =====================================================

-- =====================================================
-- 1. FUNCTIONS
-- =====================================================

-- -------------------------------------------------------
-- get_lead_stats: Estadísticas de leads de plataforma
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_lead_stats(days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    cutoff TIMESTAMPTZ := NOW() - (days || ' days')::INTERVAL;
BEGIN
    SELECT jsonb_build_object(
        'by_stage', (
            SELECT COALESCE(jsonb_object_agg(stage, cnt), '{}'::jsonb)
            FROM (
                SELECT stage, COUNT(*) AS cnt
                FROM platform_leads
                GROUP BY stage
            ) s
        ),
        'by_source', (
            SELECT COALESCE(jsonb_object_agg(COALESCE(lead_source, 'unknown'), cnt), '{}'::jsonb)
            FROM (
                SELECT lead_source, COUNT(*) AS cnt
                FROM platform_leads
                GROUP BY lead_source
            ) s
        ),
        'conversion_rate', (
            SELECT CASE
                WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND(COUNT(*) FILTER (WHERE stage = 'converted')::NUMERIC / COUNT(*) * 100, 2)
            END
            FROM platform_leads
        ),
        'leads_in_period', (
            SELECT COUNT(*)
            FROM platform_leads
            WHERE created_at >= cutoff
        ),
        'total_leads', (
            SELECT COUNT(*) FROM platform_leads
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- -------------------------------------------------------
-- get_org_creator_stats: Stats de relación org-creadores
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_org_creator_stats(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_favorites', (
            SELECT COUNT(*)
            FROM org_creator_relationships
            WHERE organization_id = p_org_id AND relationship_type = 'favorite'
        ),
        'total_blocked', (
            SELECT COUNT(*)
            FROM org_creator_relationships
            WHERE organization_id = p_org_id AND relationship_type = 'blocked'
        ),
        'total_spent', (
            SELECT COALESCE(SUM(total_paid), 0)
            FROM org_creator_relationships
            WHERE organization_id = p_org_id
        ),
        'top_collaborators', (
            SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
            FROM (
                SELECT
                    r.creator_id,
                    p.full_name,
                    p.avatar_url,
                    r.times_worked_together,
                    r.total_paid,
                    r.average_rating_given
                FROM org_creator_relationships r
                JOIN profiles p ON p.id = r.creator_id
                WHERE r.organization_id = p_org_id
                    AND r.relationship_type = 'worked_with'
                ORDER BY r.times_worked_together DESC
                LIMIT 10
            ) t
        ),
        'by_list', (
            SELECT COALESCE(jsonb_object_agg(COALESCE(list_name, 'sin_lista'), cnt), '{}'::jsonb)
            FROM (
                SELECT list_name, COUNT(*) AS cnt
                FROM org_creator_relationships
                WHERE organization_id = p_org_id
                GROUP BY list_name
            ) s
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- -------------------------------------------------------
-- update_user_health_score: Recalcula health score
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION update_user_health_score(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_days_inactive INTEGER;
    v_completed INTEGER;
    v_rating DECIMAL;
    v_logins INTEGER;
    v_score INTEGER := 50;
    v_status TEXT;
BEGIN
    -- Obtener métricas actuales
    SELECT
        days_since_last_activity,
        total_completed_projects,
        average_rating,
        total_logins
    INTO v_days_inactive, v_completed, v_rating, v_logins
    FROM platform_user_health
    WHERE user_id = p_user_id;

    -- Si no existe el registro, no hacer nada
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Calcular score base (0-100)
    v_score := 50;

    -- Factor actividad: -2 puntos por día inactivo (max -30)
    IF v_days_inactive IS NOT NULL THEN
        v_score := v_score - LEAST(v_days_inactive * 2, 30);
    END IF;

    -- Factor proyectos: +3 puntos por proyecto completado (max +15)
    IF v_completed IS NOT NULL THEN
        v_score := v_score + LEAST(v_completed * 3, 15);
    END IF;

    -- Factor rating: +5 por rating >= 4.5, +3 por >= 4.0, -5 por < 3.0
    IF v_rating IS NOT NULL THEN
        IF v_rating >= 4.5 THEN v_score := v_score + 5;
        ELSIF v_rating >= 4.0 THEN v_score := v_score + 3;
        ELSIF v_rating < 3.0 THEN v_score := v_score - 5;
        END IF;
    END IF;

    -- Factor logins: +2 por cada 10 logins (max +10)
    IF v_logins IS NOT NULL THEN
        v_score := v_score + LEAST((v_logins / 10) * 2, 10);
    END IF;

    -- Clamp entre 0 y 100
    v_score := GREATEST(0, LEAST(100, v_score));

    -- Determinar status
    IF v_score > 70 THEN
        v_status := 'healthy';
    ELSIF v_score >= 40 THEN
        v_status := 'at_risk';
    ELSE
        v_status := 'churning';
    END IF;

    -- Actualizar
    UPDATE platform_user_health
    SET
        health_score = v_score,
        health_status = v_status,
        needs_attention = (v_score < 50)
    WHERE user_id = p_user_id;
END;
$$;

-- -------------------------------------------------------
-- convert_lead_to_user: Marca lead como convertido
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION convert_lead_to_user(p_lead_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Actualizar lead
    UPDATE platform_leads
    SET
        stage = 'converted',
        converted_at = NOW(),
        converted_user_id = p_user_id
    WHERE id = p_lead_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead % not found', p_lead_id;
    END IF;

    -- Crear registro de health si no existe
    INSERT INTO platform_user_health (user_id, health_score, health_status)
    VALUES (p_user_id, 50, 'healthy')
    ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- =====================================================
-- 2. VIEWS
-- =====================================================

-- -------------------------------------------------------
-- v_platform_leads_summary: Leads con stats de interacciones
-- -------------------------------------------------------
CREATE OR REPLACE VIEW v_platform_leads_summary AS
SELECT
    l.*,
    COALESCE(i.interaction_count, 0) AS interaction_count,
    i.last_interaction_at,
    i.last_interaction_type,
    a.full_name AS assigned_to_name
FROM platform_leads l
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS interaction_count,
        MAX(created_at) AS last_interaction_at,
        (
            SELECT interaction_type
            FROM platform_lead_interactions
            WHERE lead_id = l.id
            ORDER BY created_at DESC
            LIMIT 1
        ) AS last_interaction_type
    FROM platform_lead_interactions
    WHERE lead_id = l.id
) i ON TRUE
LEFT JOIN profiles a ON a.id = l.assigned_to;

-- -------------------------------------------------------
-- v_org_creators_with_stats: Creadores por org con datos
-- -------------------------------------------------------
CREATE OR REPLACE VIEW v_org_creators_with_stats AS
SELECT
    r.id,
    r.organization_id,
    r.creator_id,
    r.relationship_type,
    r.times_worked_together,
    r.total_paid,
    r.average_rating_given,
    r.last_collaboration_at,
    r.internal_notes,
    r.internal_tags,
    r.list_name,
    r.created_at,
    r.updated_at,
    p.full_name AS creator_name,
    p.email AS creator_email,
    p.avatar_url AS creator_avatar,
    p.bio AS creator_bio,
    cp.categories,
    cp.content_types,
    cp.platforms AS creator_platforms
FROM org_creator_relationships r
JOIN profiles p ON p.id = r.creator_id
LEFT JOIN creator_profiles cp ON cp.user_id = r.creator_id;

-- -------------------------------------------------------
-- v_users_needing_attention: Usuarios que necesitan seguimiento
-- -------------------------------------------------------
CREATE OR REPLACE VIEW v_users_needing_attention AS
SELECT
    h.*,
    p.full_name,
    p.email,
    p.avatar_url
FROM platform_user_health h
JOIN profiles p ON p.id = h.user_id
WHERE h.health_score < 50
   OR h.days_since_last_activity > 14
   OR h.needs_attention = TRUE
ORDER BY h.health_score ASC;

-- =====================================================
-- 3. GRANTS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_lead_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_creator_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_health_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION convert_lead_to_user(UUID, UUID) TO authenticated;

GRANT SELECT ON v_platform_leads_summary TO authenticated;
GRANT SELECT ON v_org_creators_with_stats TO authenticated;
GRANT SELECT ON v_users_needing_attention TO authenticated;
