-- =====================================================
-- FIX: Estadísticas unificadas del creador
-- Migration: 20260305300000_fix_unified_creator_stats
-- =====================================================

-- Recrear la función con sintaxis correcta (sin DECLARE anidados)
CREATE OR REPLACE FUNCTION get_creator_unified_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    v_marketplace_completed INT := 0;
    v_org_content_completed INT := 0;
    v_total_completed INT := 0;
    v_rating_avg NUMERIC := 0;
    v_rating_count INT := 0;
    v_response_time_hours NUMERIC := 24;
    v_on_time_delivery_pct INT := 100;
    v_repeat_clients_pct INT := 0;
    v_total_earned NUMERIC := 0;
    v_creator_profile_id UUID;
    v_on_time_count INT := 0;
    v_deadline_projects INT := 0;
    v_unique_clients INT := 0;
    v_repeat_count INT := 0;
BEGIN
    -- Obtener creator_profile_id
    SELECT id INTO v_creator_profile_id
    FROM creator_profiles
    WHERE user_id = p_user_id
    LIMIT 1;

    -- 1. Contar proyectos completados del MARKETPLACE
    BEGIN
        SELECT COUNT(*)
        INTO v_marketplace_completed
        FROM marketplace_projects
        WHERE creator_id = p_user_id
        AND status = 'completed';
    EXCEPTION WHEN OTHERS THEN
        v_marketplace_completed := 0;
    END;

    -- 2. Contar contenido completado en ORGANIZACIONES
    BEGIN
        SELECT COUNT(*)
        INTO v_org_content_completed
        FROM content
        WHERE creator_id = p_user_id
        AND (
            status IN ('published', 'approved', 'delivered')
            OR is_published = true
        );
    EXCEPTION WHEN OTHERS THEN
        v_org_content_completed := 0;
    END;

    -- Total de proyectos
    v_total_completed := COALESCE(v_marketplace_completed, 0) + COALESCE(v_org_content_completed, 0);

    -- 3. Calcular rating promedio (de creator_reviews)
    IF v_creator_profile_id IS NOT NULL THEN
        BEGIN
            SELECT
                COALESCE(AVG(rating), 0),
                COUNT(*)
            INTO v_rating_avg, v_rating_count
            FROM creator_reviews
            WHERE creator_id = v_creator_profile_id;
        EXCEPTION WHEN OTHERS THEN
            v_rating_avg := 0;
            v_rating_count := 0;
        END;
    END IF;

    -- 4. Obtener métricas adicionales del perfil del creador
    BEGIN
        SELECT
            COALESCE(response_time_hours, 24),
            COALESCE(on_time_delivery_pct, 100),
            COALESCE(repeat_clients_pct, 0)
        INTO v_response_time_hours, v_on_time_delivery_pct, v_repeat_clients_pct
        FROM creator_profiles
        WHERE user_id = p_user_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 5. Calcular total ganado (del marketplace)
    BEGIN
        SELECT COALESCE(SUM(creator_payout), 0)
        INTO v_total_earned
        FROM marketplace_projects
        WHERE creator_id = p_user_id
        AND status = 'completed';
    EXCEPTION WHEN OTHERS THEN
        v_total_earned := 0;
    END;

    -- 6. Calcular porcentaje de entrega a tiempo
    BEGIN
        SELECT
            COUNT(*) FILTER (WHERE completed_at <= deadline),
            COUNT(*)
        INTO v_on_time_count, v_deadline_projects
        FROM marketplace_projects
        WHERE creator_id = p_user_id
        AND status = 'completed'
        AND deadline IS NOT NULL;

        IF v_deadline_projects > 0 THEN
            v_on_time_delivery_pct := ROUND((v_on_time_count::NUMERIC / v_deadline_projects) * 100);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 7. Calcular clientes recurrentes
    BEGIN
        SELECT COUNT(DISTINCT brand_id)
        INTO v_unique_clients
        FROM marketplace_projects
        WHERE creator_id = p_user_id
        AND status = 'completed';

        SELECT COUNT(*)
        INTO v_repeat_count
        FROM (
            SELECT brand_id
            FROM marketplace_projects
            WHERE creator_id = p_user_id
            AND status = 'completed'
            GROUP BY brand_id
            HAVING COUNT(*) > 1
        ) repeat_brands;

        IF v_unique_clients > 0 THEN
            v_repeat_clients_pct := ROUND((v_repeat_count::NUMERIC / v_unique_clients) * 100);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Construir resultado
    result := jsonb_build_object(
        'completed_projects', COALESCE(v_total_completed, 0),
        'marketplace_projects', COALESCE(v_marketplace_completed, 0),
        'org_projects', COALESCE(v_org_content_completed, 0),
        'rating_avg', COALESCE(ROUND(v_rating_avg::NUMERIC, 1), 0),
        'rating_count', COALESCE(v_rating_count, 0),
        'response_time_hours', COALESCE(v_response_time_hours, 24),
        'on_time_delivery_pct', COALESCE(v_on_time_delivery_pct, 100),
        'repeat_clients_pct', COALESCE(v_repeat_clients_pct, 0),
        'total_earned', COALESCE(v_total_earned, 0)
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_creator_unified_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_creator_unified_stats(UUID) TO anon;
