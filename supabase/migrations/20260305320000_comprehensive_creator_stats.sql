-- =====================================================
-- Estadísticas completas del creador para marketplace
-- Migration: 20260305320000_comprehensive_creator_stats
-- Incluye: antigüedad, verificaciones, engagement, experiencia
-- =====================================================

CREATE OR REPLACE FUNCTION get_creator_unified_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    v_creator_profile_id UUID;

    -- Proyectos
    v_marketplace_completed INT := 0;
    v_org_content_completed INT := 0;
    v_total_completed INT := 0;
    v_active_projects INT := 0;
    v_cancelled_projects INT := 0;
    v_total_projects INT := 0;

    -- Ratings
    v_rating_avg NUMERIC := 0;
    v_rating_count INT := 0;

    -- Tiempos
    v_response_time_hours NUMERIC := 24;
    v_on_time_delivery_pct INT := 100;
    v_avg_delivery_days NUMERIC := 0;

    -- Clientes
    v_unique_clients INT := 0;
    v_repeat_clients INT := 0;
    v_repeat_clients_pct INT := 0;

    -- Financiero
    v_total_earned NUMERIC := 0;

    -- Antigüedad
    v_member_since TIMESTAMPTZ;
    v_days_on_platform INT := 0;
    v_last_project_completed TIMESTAMPTZ;
    v_last_delivery_days INT := 0;

    -- Verificaciones
    v_identity_verified BOOLEAN := false;
    v_legal_docs_signed INT := 0;
    v_payment_verified BOOLEAN := false;
    v_email_verified BOOLEAN := false;
    v_onboarding_completed BOOLEAN := false;

    -- Portfolio engagement
    v_portfolio_views INT := 0;
    v_portfolio_likes INT := 0;
    v_portfolio_saves INT := 0;
    v_portfolio_items_count INT := 0;

    -- Experiencia
    v_industries JSONB := '[]'::jsonb;
    v_org_count INT := 0;

    -- Comunicación
    v_invitation_response_rate INT := 0;
    v_invitations_received INT := 0;
    v_invitations_responded INT := 0;

    -- Disputas
    v_disputes_total INT := 0;
    v_disputes_won INT := 0;
BEGIN
    -- Obtener creator_profile_id y datos básicos
    SELECT
        cp.id,
        cp.is_verified,
        cp.created_at,
        cp.response_time_hours,
        cp.on_time_delivery_pct
    INTO
        v_creator_profile_id,
        v_identity_verified,
        v_member_since,
        v_response_time_hours,
        v_on_time_delivery_pct
    FROM creator_profiles cp
    WHERE cp.user_id = p_user_id
    LIMIT 1;

    -- Calcular días en plataforma
    IF v_member_since IS NOT NULL THEN
        v_days_on_platform := EXTRACT(DAY FROM (NOW() - v_member_since));
    END IF;

    -- =====================================================
    -- PROYECTOS MARKETPLACE
    -- =====================================================
    BEGIN
        SELECT
            COUNT(*) FILTER (WHERE status = 'completed'),
            COUNT(*) FILTER (WHERE status IN ('in_progress', 'pending', 'revision')),
            COUNT(*) FILTER (WHERE status = 'cancelled'),
            COUNT(*),
            COUNT(DISTINCT brand_id) FILTER (WHERE status = 'completed'),
            COALESCE(SUM(creator_payout) FILTER (WHERE status = 'completed'), 0),
            MAX(completed_at) FILTER (WHERE status = 'completed'),
            COALESCE(AVG(EXTRACT(DAY FROM (completed_at - created_at))) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL), 0)
        INTO
            v_marketplace_completed,
            v_active_projects,
            v_cancelled_projects,
            v_total_projects,
            v_unique_clients,
            v_total_earned,
            v_last_project_completed,
            v_avg_delivery_days
        FROM marketplace_projects
        WHERE creator_id = p_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Clientes recurrentes
    BEGIN
        SELECT COUNT(*)
        INTO v_repeat_clients
        FROM (
            SELECT brand_id
            FROM marketplace_projects
            WHERE creator_id = p_user_id AND status = 'completed'
            GROUP BY brand_id
            HAVING COUNT(*) > 1
        ) t;

        IF v_unique_clients > 0 THEN
            v_repeat_clients_pct := ROUND((v_repeat_clients::NUMERIC / v_unique_clients) * 100);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Días desde último proyecto
    IF v_last_project_completed IS NOT NULL THEN
        v_last_delivery_days := EXTRACT(DAY FROM (NOW() - v_last_project_completed));
    END IF;

    -- =====================================================
    -- CONTENIDO EN ORGANIZACIONES
    -- =====================================================
    BEGIN
        SELECT COUNT(*)
        INTO v_org_content_completed
        FROM content
        WHERE creator_id = p_user_id
        AND (status::text IN ('approved', 'delivered', 'paid', 'corrected') OR is_published = true);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Contar organizaciones únicas
    BEGIN
        SELECT COUNT(DISTINCT organization_id)
        INTO v_org_count
        FROM content
        WHERE creator_id = p_user_id
        AND organization_id IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    v_total_completed := COALESCE(v_marketplace_completed, 0) + COALESCE(v_org_content_completed, 0);

    -- =====================================================
    -- RATINGS
    -- =====================================================
    IF v_creator_profile_id IS NOT NULL THEN
        BEGIN
            SELECT COALESCE(AVG(rating), 0), COUNT(*)
            INTO v_rating_avg, v_rating_count
            FROM creator_reviews
            WHERE creator_id = v_creator_profile_id;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- =====================================================
    -- VERIFICACIONES
    -- =====================================================
    BEGIN
        -- Email verificado
        SELECT (email_confirmed_at IS NOT NULL)
        INTO v_email_verified
        FROM auth.users
        WHERE id = p_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        -- Documentos legales firmados
        SELECT COUNT(*), COALESCE(bool_or(true), false)
        INTO v_legal_docs_signed, v_onboarding_completed
        FROM user_legal_consents
        WHERE user_id = p_user_id AND accepted = true AND is_current = true;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        -- Onboarding completo
        SELECT COALESCE(onboarding_completed, false)
        INTO v_onboarding_completed
        FROM profiles
        WHERE id = p_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Payment verified (tiene método de retiro configurado)
    BEGIN
        SELECT EXISTS (
            SELECT 1 FROM user_withdrawal_methods
            WHERE user_id = p_user_id AND is_active = true
        )
        INTO v_payment_verified;
    EXCEPTION WHEN OTHERS THEN v_payment_verified := false;
    END;

    -- =====================================================
    -- PORTFOLIO ENGAGEMENT
    -- =====================================================
    IF v_creator_profile_id IS NOT NULL THEN
        BEGIN
            SELECT
                COALESCE(SUM(views_count), 0),
                COALESCE(SUM(likes_count), 0),
                COUNT(*)
            INTO v_portfolio_views, v_portfolio_likes, v_portfolio_items_count
            FROM portfolio_items
            WHERE creator_id = v_creator_profile_id AND is_public = true;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        -- Guardados (saves) - de saved_creators si existe
        BEGIN
            SELECT COUNT(*)
            INTO v_portfolio_saves
            FROM saved_creators
            WHERE creator_id = v_creator_profile_id;
        EXCEPTION WHEN OTHERS THEN v_portfolio_saves := 0;
        END;
    END IF;

    -- =====================================================
    -- INDUSTRIAS/CATEGORÍAS TRABAJADAS
    -- =====================================================
    IF v_creator_profile_id IS NOT NULL THEN
        BEGIN
            SELECT COALESCE(categories, '[]'::jsonb)
            INTO v_industries
            FROM creator_profiles
            WHERE id = v_creator_profile_id;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- =====================================================
    -- INVITACIONES Y COMUNICACIÓN
    -- =====================================================
    BEGIN
        SELECT
            COUNT(*),
            COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected', 'completed'))
        INTO v_invitations_received, v_invitations_responded
        FROM marketplace_invitations
        WHERE creator_id = p_user_id;

        IF v_invitations_received > 0 THEN
            v_invitation_response_rate := ROUND((v_invitations_responded::NUMERIC / v_invitations_received) * 100);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- =====================================================
    -- CONSTRUIR RESULTADO
    -- =====================================================
    result := jsonb_build_object(
        -- Proyectos
        'completed_projects', COALESCE(v_total_completed, 0),
        'marketplace_projects', COALESCE(v_marketplace_completed, 0),
        'org_projects', COALESCE(v_org_content_completed, 0),
        'active_projects', COALESCE(v_active_projects, 0),
        'cancelled_projects', COALESCE(v_cancelled_projects, 0),
        'cancellation_rate', CASE WHEN v_total_projects > 0
            THEN ROUND((v_cancelled_projects::NUMERIC / v_total_projects) * 100)
            ELSE 0 END,

        -- Ratings
        'rating_avg', COALESCE(ROUND(v_rating_avg::NUMERIC, 1), 0),
        'rating_count', COALESCE(v_rating_count, 0),

        -- Tiempos
        'response_time_hours', COALESCE(v_response_time_hours, 24),
        'on_time_delivery_pct', COALESCE(v_on_time_delivery_pct, 100),
        'avg_delivery_days', COALESCE(ROUND(v_avg_delivery_days::NUMERIC, 1), 0),
        'last_delivery_days', COALESCE(v_last_delivery_days, 0),

        -- Clientes
        'unique_clients', COALESCE(v_unique_clients, 0),
        'repeat_clients', COALESCE(v_repeat_clients, 0),
        'repeat_clients_pct', COALESCE(v_repeat_clients_pct, 0),

        -- Financiero
        'total_earned', COALESCE(v_total_earned, 0),

        -- Antigüedad
        'member_since', v_member_since,
        'days_on_platform', COALESCE(v_days_on_platform, 0),

        -- Verificaciones
        'identity_verified', COALESCE(v_identity_verified, false),
        'email_verified', COALESCE(v_email_verified, false),
        'legal_docs_signed', COALESCE(v_legal_docs_signed, 0),
        'payment_verified', COALESCE(v_payment_verified, false),
        'onboarding_completed', COALESCE(v_onboarding_completed, false),

        -- Portfolio
        'portfolio_views', COALESCE(v_portfolio_views, 0),
        'portfolio_likes', COALESCE(v_portfolio_likes, 0),
        'portfolio_saves', COALESCE(v_portfolio_saves, 0),
        'portfolio_items', COALESCE(v_portfolio_items_count, 0),

        -- Experiencia
        'industries', COALESCE(v_industries, '[]'::jsonb),
        'organizations_worked', COALESCE(v_org_count, 0),

        -- Comunicación
        'invitation_response_rate', COALESCE(v_invitation_response_rate, 0),
        'invitations_received', COALESCE(v_invitations_received, 0)
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_creator_unified_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_creator_unified_stats(UUID) TO anon;
