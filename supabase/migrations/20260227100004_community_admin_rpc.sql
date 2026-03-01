-- ============================================================================
-- RPC functions para CRM de comunidades (bypasea RLS para admins)
-- ============================================================================

-- Función para obtener todas las comunidades con métricas
CREATE OR REPLACE FUNCTION get_all_communities_with_metrics()
RETURNS TABLE (
    id UUID,
    slug TEXT,
    name TEXT,
    description TEXT,
    logo_url TEXT,
    free_months INTEGER,
    commission_discount_points INTEGER,
    bonus_ai_tokens INTEGER,
    custom_badge_text TEXT,
    custom_badge_color TEXT,
    target_types TEXT[],
    max_redemptions INTEGER,
    current_redemptions INTEGER,
    is_active BOOLEAN,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    partner_contact_email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    owner_user_id UUID,
    owner_commission_rate NUMERIC,
    owner_subscription_rate NUMERIC,
    metadata JSONB,
    member_count BIGINT,
    active_member_count BIGINT
) AS $$
BEGIN
    -- Verificar que el usuario sea admin de plataforma
    IF NOT public.is_platform_root(auth.uid()) THEN
        RAISE EXCEPTION 'No tienes permisos para ver todas las comunidades';
    END IF;

    RETURN QUERY
    SELECT
        pc.id,
        pc.slug,
        pc.name,
        pc.description,
        pc.logo_url,
        pc.free_months,
        pc.commission_discount_points,
        pc.bonus_ai_tokens,
        pc.custom_badge_text,
        pc.custom_badge_color,
        pc.target_types,
        pc.max_redemptions,
        pc.current_redemptions,
        pc.is_active,
        pc.start_date,
        pc.end_date,
        pc.partner_contact_email,
        pc.notes,
        pc.created_at,
        pc.updated_at,
        pc.owner_user_id,
        pc.owner_commission_rate,
        pc.owner_subscription_rate,
        pc.metadata,
        COUNT(pcm.id)::BIGINT AS member_count,
        COUNT(pcm.id) FILTER (WHERE pcm.status = 'active')::BIGINT AS active_member_count
    FROM partner_communities pc
    LEFT JOIN partner_community_memberships pcm ON pcm.community_id = pc.id
    GROUP BY pc.id
    ORDER BY pc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener miembros de una comunidad
CREATE OR REPLACE FUNCTION get_community_members(p_community_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    brand_id UUID,
    status TEXT,
    applied_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    free_months_granted INTEGER,
    commission_discount_applied INTEGER,
    bonus_tokens_granted INTEGER,
    total_transactions NUMERIC,
    total_owner_earnings NUMERIC,
    user_email TEXT,
    user_name TEXT,
    brand_name TEXT
) AS $$
BEGIN
    -- Verificar permisos: admin de plataforma o owner de la comunidad
    IF NOT public.is_platform_root(auth.uid())
       AND NOT EXISTS (SELECT 1 FROM partner_communities WHERE id = p_community_id AND owner_user_id = auth.uid())
    THEN
        RAISE EXCEPTION 'No tienes permisos para ver los miembros de esta comunidad';
    END IF;

    RETURN QUERY
    SELECT
        pcm.id,
        pcm.user_id,
        pcm.brand_id,
        pcm.status,
        pcm.applied_at,
        pcm.expires_at,
        pcm.free_months_granted,
        pcm.commission_discount_applied,
        pcm.bonus_tokens_granted,
        pcm.total_transactions,
        pcm.total_owner_earnings,
        p.email AS user_email,
        p.full_name AS user_name,
        b.name AS brand_name
    FROM partner_community_memberships pcm
    LEFT JOIN profiles p ON p.id = pcm.user_id
    LEFT JOIN brands b ON b.id = pcm.brand_id
    WHERE pcm.community_id = p_community_id
    ORDER BY pcm.applied_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener ganancias de una comunidad
CREATE OR REPLACE FUNCTION get_community_earnings(p_community_id UUID)
RETURNS TABLE (
    id UUID,
    transaction_amount NUMERIC,
    earnings_amount NUMERIC,
    commission_rate NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    description TEXT
) AS $$
BEGIN
    -- Verificar permisos
    IF NOT public.is_platform_root(auth.uid())
       AND NOT EXISTS (SELECT 1 FROM partner_communities WHERE id = p_community_id AND owner_user_id = auth.uid())
    THEN
        RAISE EXCEPTION 'No tienes permisos para ver las ganancias de esta comunidad';
    END IF;

    RETURN QUERY
    SELECT
        pce.id,
        pce.transaction_amount,
        pce.earnings_amount,
        pce.commission_rate,
        pce.status,
        pce.created_at,
        pce.paid_at,
        pce.description
    FROM partner_community_earnings pce
    WHERE pce.community_id = p_community_id
    ORDER BY pce.created_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener totales de una comunidad
CREATE OR REPLACE FUNCTION get_community_totals(p_community_id UUID)
RETURNS TABLE (
    total_transactions NUMERIC,
    total_owner_earnings NUMERIC,
    pending_earnings NUMERIC,
    paid_earnings NUMERIC
) AS $$
BEGIN
    -- Verificar permisos
    IF NOT public.is_platform_root(auth.uid())
       AND NOT EXISTS (SELECT 1 FROM partner_communities WHERE id = p_community_id AND owner_user_id = auth.uid())
    THEN
        RAISE EXCEPTION 'No tienes permisos para ver los totales de esta comunidad';
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(SUM(pcm.total_transactions), 0) AS total_transactions,
        COALESCE(SUM(pcm.total_owner_earnings), 0) AS total_owner_earnings,
        COALESCE((SELECT SUM(pce.earnings_amount) FROM partner_community_earnings pce WHERE pce.community_id = p_community_id AND pce.status = 'pending'), 0) AS pending_earnings,
        COALESCE((SELECT SUM(pce.earnings_amount) FROM partner_community_earnings pce WHERE pce.community_id = p_community_id AND pce.status = 'paid'), 0) AS paid_earnings
    FROM partner_community_memberships pcm
    WHERE pcm.community_id = p_community_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GRANTs
GRANT EXECUTE ON FUNCTION get_all_communities_with_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_earnings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_totals(UUID) TO authenticated;

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
