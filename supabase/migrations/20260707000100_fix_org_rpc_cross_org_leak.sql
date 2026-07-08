-- FASE Checklist Seccion 3: cierre de fuga cross-org en 16 RPCs SECURITY DEFINER
--
-- Hallazgo (QA de logica, fork cross-org-isolation): 16 funciones get_org_*/
-- finance, todas SECURITY DEFINER (bypassean RLS por diseno) y GRANTed a
-- authenticated, no validaban en NINGUN lugar del cuerpo que auth.uid()
-- perteneciera a la organizacion pasada como parametro. p_organization_id/
-- p_org_id es un UUID que el caller controla 100% -> cualquier usuario
-- logueado de CUALQUIER org podia leer finanzas/roster/CRM/ranking/redes
-- sociales (incluye OAuth scopes) de OTRA organizacion llamando el RPC
-- directo con supabase.rpc(), sin pasar por ninguna edge function ni RLS.
--
-- get_platform_finance_stats es peor: ni siquiera toma organization_id,
-- devuelve MRR/ARR/revenue de TODA la plataforma a cualquier authenticated.
--
-- get_creator_finance_stats expone wallet/earnings personales de un
-- creador por p_creator_id sin validar que el caller sea ese creador.
--
-- Fix (aditivo): helper assert_org_member() + una linea de guard agregada
-- al inicio de cada funcion. Ninguna logica de negocio existente se toca.

-- ============================================================
-- Helper de membresia (reutilizable)
-- ============================================================
CREATE OR REPLACE FUNCTION public.assert_org_member(p_organization_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden: authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of organization %', p_organization_id;
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_org_member(uuid) TO authenticated;

-- ============================================================
-- Funciones plpgsql (8): agregar PERFORM public.assert_org_member(...)
-- justo despues de BEGIN
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_creator_finance_stats(p_creator_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_creator_id AND NOT public.is_platform_admin(auth.uid()) THEN
      RAISE EXCEPTION 'forbidden: not this creator';
    END IF;

    SELECT json_build_object(
        'wallet', (
            SELECT json_build_object(
                'available_balance', available_balance,
                'pending_balance', pending_balance,
                'total_earned', total_earned,
                'total_withdrawn', total_withdrawn,
                'minimum_payout', minimum_payout,
                'payment_info_verified', payment_info_verified
            )
            FROM creator_wallets
            WHERE creator_id = p_creator_id
        ),
        'earnings_this_month', COALESCE((
            SELECT SUM(amount)
            FROM creator_wallet_transactions
            WHERE creator_id = p_creator_id
            AND transaction_type IN ('earning', 'bonus', 'referral_bonus')
            AND created_at >= DATE_TRUNC('month', NOW())
        ), 0),
        'earnings_last_month', COALESCE((
            SELECT SUM(amount)
            FROM creator_wallet_transactions
            WHERE creator_id = p_creator_id
            AND transaction_type IN ('earning', 'bonus', 'referral_bonus')
            AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
            AND created_at < DATE_TRUNC('month', NOW())
        ), 0),
        'total_payouts', (
            SELECT COUNT(*)
            FROM platform_payouts
            WHERE creator_id = p_creator_id
            AND status = 'completed'
        ),
        'last_payout', (
            SELECT json_build_object(
                'amount', net_amount,
                'completed_at', completed_at,
                'payment_method', payment_method
            )
            FROM platform_payouts
            WHERE creator_id = p_creator_id
            AND status = 'completed'
            ORDER BY completed_at DESC
            LIMIT 1
        ),
        'pending_payout', (
            SELECT json_build_object(
                'id', id,
                'amount', net_amount,
                'status', status,
                'requested_at', requested_at
            )
            FROM platform_payouts
            WHERE creator_id = p_creator_id
            AND status IN ('pending', 'approved', 'processing')
            LIMIT 1
        ),
        'earnings_by_type', (
            SELECT COALESCE(json_agg(json_build_object('type', transaction_type, 'total', total)), '[]'::json)
            FROM (
                SELECT transaction_type, SUM(amount) as total
                FROM creator_wallet_transactions
                WHERE creator_id = p_creator_id
                AND amount > 0
                GROUP BY transaction_type
            ) t
        )
    ) INTO result;

    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_platform_finance_stats(p_days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result JSON;
    start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
    prev_start_date TIMESTAMPTZ := NOW() - (p_days * 2 || ' days')::INTERVAL;
BEGIN
    IF NOT public.is_platform_admin(auth.uid()) THEN
      RAISE EXCEPTION 'forbidden: platform admin only';
    END IF;

    SELECT json_build_object(
        'mrr', COALESCE((
            SELECT SUM(amount_monthly)
            FROM platform_subscriptions
            WHERE status = 'active'
        ), 0),
        'arr', COALESCE((
            SELECT SUM(amount_monthly) * 12
            FROM platform_subscriptions
            WHERE status = 'active'
        ), 0),
        'revenue_period', COALESCE((
            SELECT SUM(amount)
            FROM platform_transactions
            WHERE transaction_type IN ('subscription_payment', 'campaign_payment', 'platform_fee')
            AND status = 'completed'
            AND created_at >= start_date
        ), 0),
        'revenue_previous', COALESCE((
            SELECT SUM(amount)
            FROM platform_transactions
            WHERE transaction_type IN ('subscription_payment', 'campaign_payment', 'platform_fee')
            AND status = 'completed'
            AND created_at >= prev_start_date
            AND created_at < start_date
        ), 0),
        'payouts_period', COALESCE((
            SELECT SUM(net_amount)
            FROM platform_payouts
            WHERE status = 'completed'
            AND completed_at >= start_date
        ), 0),
        'payouts_pending', COALESCE((
            SELECT SUM(net_amount)
            FROM platform_payouts
            WHERE status IN ('pending', 'approved', 'processing')
        ), 0),
        'invoices_pending_amount', COALESCE((
            SELECT SUM(total)
            FROM platform_invoices
            WHERE status IN ('sent', 'overdue')
        ), 0),
        'invoices_pending_count', (
            SELECT COUNT(*)
            FROM platform_invoices
            WHERE status IN ('sent', 'overdue')
        ),
        'invoices_overdue_amount', COALESCE((
            SELECT SUM(total)
            FROM platform_invoices
            WHERE status = 'overdue'
        ), 0),
        'invoices_overdue_count', (
            SELECT COUNT(*)
            FROM platform_invoices
            WHERE status = 'overdue'
        ),
        'subscriptions_by_plan', (
            SELECT COALESCE(json_agg(json_build_object('plan', plan, 'count', count, 'mrr', mrr)), '[]'::json)
            FROM (
                SELECT plan, COUNT(*) as count, SUM(amount_monthly) as mrr
                FROM platform_subscriptions
                WHERE status = 'active'
                GROUP BY plan
            ) s
        ),
        'transactions_count', (
            SELECT COUNT(*)
            FROM platform_transactions
            WHERE created_at >= start_date
        ),
        'fees_earned', COALESCE((
            SELECT SUM(fee_amount)
            FROM platform_transactions
            WHERE status = 'completed'
            AND created_at >= start_date
        ), 0)
    ) INTO result;

    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_org_creator_full_detail(p_org_id uuid, p_creator_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  PERFORM public.assert_org_member(p_org_id);

  SELECT jsonb_build_object(
    'relationship_id', r.id,
    'relationship_type', r.relationship_type,
    'times_worked_together', r.times_worked_together,
    'total_paid', r.total_paid,
    'average_rating_given', r.average_rating_given,
    'last_collaboration_at', r.last_collaboration_at,
    'internal_notes', r.internal_notes,
    'internal_tags', r.internal_tags,
    'list_name', r.list_name,
    'custom_fields', COALESCE(r.custom_fields, '{}'::jsonb),
    'relationship_created_at', r.created_at,
    'id', p.id,
    'email', p.email,
    'full_name', p.full_name,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'phone', p.phone,
    'bio', p.bio,
    'tagline', p.tagline,
    'cover_url', p.cover_url,
    'city', p.city,
    'country', p.country,
    'instagram', p.instagram,
    'tiktok', p.tiktok,
    'facebook', p.facebook,
    'social_linkedin', p.social_linkedin,
    'social_twitter', p.social_twitter,
    'social_youtube', p.social_youtube,
    'portfolio_url', p.portfolio_url,
    'experience_level', p.experience_level,
    'content_categories', COALESCE(p.content_categories, ARRAY[]::TEXT[]),
    'specialties_tags', COALESCE(p.specialties_tags, ARRAY[]::TEXT[]),
    'languages', COALESCE(p.languages, ARRAY[]::TEXT[]),
    'creator_profile_id', cp.id,
    'slug', cp.slug,
    'display_name', cp.display_name,
    'bio_full', cp.bio_full,
    'banner_url', cp.banner_url,
    'location_city', cp.location_city,
    'location_country', cp.location_country,
    'country_flag', cp.country_flag,
    'creator_social_links', cp.social_links,
    'level', cp.level,
    'is_verified', COALESCE(cp.is_verified, false),
    'is_available', COALESCE(cp.is_available, false),
    'is_active', COALESCE(cp.is_active, true),
    'rating_avg', COALESCE(cp.rating_avg, 0),
    'rating_count', COALESCE(cp.rating_count, 0),
    'completed_projects', COALESCE(cp.completed_projects, 0),
    'base_price', cp.base_price,
    'currency', COALESCE(cp.currency, 'USD'),
    'categories', COALESCE(cp.categories, ARRAY[]::TEXT[]),
    'content_types', COALESCE(cp.content_types, ARRAY[]::TEXT[]),
    'platforms', COALESCE(cp.platforms, ARRAY[]::TEXT[]),
    'marketplace_roles', COALESCE(cp.marketplace_roles, ARRAY[]::TEXT[]),
    'accepts_product_exchange', COALESCE(cp.accepts_product_exchange, false),
    'response_time_hours', cp.response_time_hours,
    'on_time_delivery_pct', cp.on_time_delivery_pct,
    'repeat_clients_pct', cp.repeat_clients_pct,
    'showreel_video_id', cp.showreel_video_id,
    'showreel_url', cp.showreel_url,
    'showreel_thumbnail', cp.showreel_thumbnail,
    'created_at', cp.created_at,
    'portfolio', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pi.id,
        'title', pi.title,
        'media_type', pi.media_type,
        'media_url', pi.media_url,
        'thumbnail_url', pi.thumbnail_url,
        'bunny_video_id', pi.bunny_video_id,
        'category', pi.category,
        'is_featured', pi.is_featured
      ) ORDER BY pi.is_featured DESC, pi.display_order ASC)
      FROM portfolio_items pi
      WHERE pi.creator_id = cp.id AND pi.is_public = true
      LIMIT 12
    ), '[]'::jsonb),
    'services', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', cs.id,
        'title', cs.title,
        'service_type', cs.service_type,
        'price_type', cs.price_type,
        'price_amount', cs.price_amount,
        'price_currency', cs.price_currency,
        'delivery_days', cs.delivery_days,
        'is_featured', cs.is_featured
      ) ORDER BY cs.is_featured DESC, cs.display_order ASC)
      FROM creator_services cs
      WHERE cs.user_id = cp.user_id AND cs.is_active = true
    ), '[]'::jsonb)
  ) INTO result
  FROM org_creator_relationships r
  JOIN profiles p ON p.id = r.creator_id
  LEFT JOIN creator_profiles cp ON cp.user_id = r.creator_id
  WHERE r.organization_id = p_org_id AND r.creator_id = p_creator_id
  ORDER BY r.created_at DESC
  LIMIT 1;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_org_creator_stats(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
BEGIN
    PERFORM public.assert_org_member(p_org_id);

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
$function$;

CREATE OR REPLACE FUNCTION public.get_org_crm_overview(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
    month_start TIMESTAMPTZ := date_trunc('month', NOW());
BEGIN
    PERFORM public.assert_org_member(p_org_id);

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
$function$;

CREATE OR REPLACE FUNCTION public.get_org_finance_stats(p_org_id uuid, p_days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result JSON;
    start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
    PERFORM public.assert_org_member(p_org_id);

    SELECT json_build_object(
        'total_spent', COALESCE((
            SELECT SUM(amount)
            FROM platform_transactions
            WHERE organization_id = p_org_id
            AND transaction_type IN ('campaign_payment', 'subscription_payment')
            AND status = 'completed'
        ), 0),
        'spent_period', COALESCE((
            SELECT SUM(amount)
            FROM platform_transactions
            WHERE organization_id = p_org_id
            AND transaction_type IN ('campaign_payment', 'subscription_payment')
            AND status = 'completed'
            AND created_at >= start_date
        ), 0),
        'total_paid_creators', COALESCE((
            SELECT SUM(total_paid)
            FROM org_creator_relationships
            WHERE organization_id = p_org_id
        ), 0),
        'subscription', (
            SELECT json_build_object(
                'plan', plan,
                'status', status,
                'amount_monthly', amount_monthly,
                'current_period_end', current_period_end,
                'days_until_renewal', EXTRACT(DAY FROM current_period_end - NOW())
            )
            FROM platform_subscriptions
            WHERE organization_id = p_org_id
            LIMIT 1
        ),
        'invoices_pending', COALESCE((
            SELECT SUM(total)
            FROM platform_invoices
            WHERE organization_id = p_org_id
            AND status IN ('sent', 'overdue')
        ), 0),
        'invoices_pending_count', (
            SELECT COUNT(*)
            FROM platform_invoices
            WHERE organization_id = p_org_id
            AND status IN ('sent', 'overdue')
        ),
        'last_payment', (
            SELECT json_build_object(
                'amount', total,
                'paid_at', paid_at
            )
            FROM platform_invoices
            WHERE organization_id = p_org_id
            AND status = 'paid'
            ORDER BY paid_at DESC
            LIMIT 1
        ),
        'transactions_count_period', (
            SELECT COUNT(*)
            FROM platform_transactions
            WHERE organization_id = p_org_id
            AND created_at >= start_date
        ),
        'campaigns_paid_count', (
            SELECT COUNT(DISTINCT campaign_id)
            FROM platform_transactions
            WHERE organization_id = p_org_id
            AND transaction_type = 'campaign_payment'
            AND status = 'completed'
        )
    ) INTO result;

    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_org_pipeline_summary(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
    v_pipeline RECORD;
BEGIN
    PERFORM public.assert_org_member(p_org_id);

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
$function$;

CREATE OR REPLACE FUNCTION public.get_org_recent_activity(p_org_id uuid, p_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
BEGIN
    PERFORM public.assert_org_member(p_org_id);

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
$function$;

CREATE OR REPLACE FUNCTION public.get_org_streaming_sessions(p_organization_id uuid)
RETURNS TABLE(id uuid, title text, session_type streaming_session_type, status streaming_session_status, scheduled_at timestamp with time zone, started_at timestamp with time zone, ended_at timestamp with time zone, peak_viewers integer, total_revenue_usd numeric, is_shopping_enabled boolean, host_name text, channels_count bigint, products_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.assert_org_member(p_organization_id);

  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.session_type,
    s.status,
    s.scheduled_at,
    s.started_at,
    s.ended_at,
    s.peak_viewers,
    s.total_revenue_usd,
    s.is_shopping_enabled,
    p.full_name as host_name,
    (SELECT COUNT(*) FROM streaming_session_channels_v2 sc WHERE sc.session_id = s.id) as channels_count,
    (SELECT COUNT(*) FROM streaming_products_v2 sp WHERE sp.session_id = s.id) as products_count
  FROM streaming_sessions_v2 s
  LEFT JOIN profiles p ON p.id = s.host_user_id
  WHERE s.organization_id = p_organization_id
  ORDER BY
    CASE WHEN s.status = 'live' THEN 0
         WHEN s.status = 'scheduled' THEN 1
         ELSE 2 END,
    COALESCE(s.scheduled_at, s.created_at) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_org_upcoming_actions(p_org_id uuid, p_limit integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
BEGIN
    PERFORM public.assert_org_member(p_org_id);

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
$function$;

-- ============================================================
-- Funciones sql (6): prepender SELECT public.assert_org_member(...)
-- como sentencia adicional antes del SELECT original (los cuerpos
-- LANGUAGE sql soportan multiples sentencias; solo la ultima se retorna)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_org_client_packages(p_organization_id uuid)
RETURNS SETOF client_packages
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.assert_org_member(p_organization_id);
  SELECT cp.*
  FROM client_packages cp
  JOIN clients c ON c.id = cp.client_id
  WHERE c.organization_id = p_organization_id
  AND cp.is_active = true;
$function$;

CREATE OR REPLACE FUNCTION public.get_org_products(p_organization_id uuid)
RETURNS TABLE(id uuid, name text, client_id uuid, client_name text, product_code integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.assert_org_member(p_organization_id);
  SELECT p.id, p.name::text, p.client_id, c.name::text AS client_name, p.product_code FROM products p JOIN clients c ON c.id = p.client_id WHERE c.organization_id = p_organization_id ORDER BY p.product_code ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_org_ranking(p_org_id uuid, p_role text DEFAULT NULL::text, p_archetype text DEFAULT NULL::text, p_sort_by text DEFAULT 'lifetime'::text, p_limit integer DEFAULT 50)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, role_key character varying, lifetime_points integer, season_points integer, normalized_score numeric, current_level character varying, current_level_progress numeric, on_time_rate numeric, lifetime_tasks integer, current_streak_days integer, archetype character varying, base_weight numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.assert_org_member(p_org_id);
  SELECT t.user_id, p.full_name, p.avatar_url, t.role_key,
    t.lifetime_points, t.season_points, t.normalized_score,
    t.current_level, t.current_level_progress, t.on_time_rate,
    t.lifetime_tasks, t.current_streak_days,
    COALESCE(ra.archetype, 'balanced')::VARCHAR AS archetype,
    COALESCE(ra.base_weight, 1.0) AS base_weight
  FROM user_reputation_totals t
  JOIN profiles p ON p.id = t.user_id
  LEFT JOIN LATERAL (
    SELECT ra2.archetype, ra2.base_weight FROM role_archetypes ra2
    WHERE ra2.role_key = t.role_key AND ra2.is_active = true
      AND (ra2.organization_id = p_org_id OR ra2.organization_id IS NULL)
    ORDER BY ra2.organization_id NULLS LAST LIMIT 1
  ) ra ON true
  WHERE t.organization_id = p_org_id
    AND (p_role IS NULL OR t.role_key = p_role)
    AND (p_archetype IS NULL OR COALESCE(ra.archetype, 'balanced') = p_archetype)
  ORDER BY CASE p_sort_by
    WHEN 'normalized' THEN t.normalized_score
    WHEN 'season' THEN t.season_points::DECIMAL
    ELSE t.lifetime_points::DECIMAL END DESC
  LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.get_org_ranking_normalized(p_org_id uuid, p_role text DEFAULT NULL::text, p_archetype text DEFAULT NULL::text, p_sort_by text DEFAULT 'normalized'::text)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, role text, marketplace_role text, total_points integer, normalized_score numeric, current_level text, on_time_deliveries integer, late_deliveries integer, clean_approvals integer, total_issues integer, archetype text, base_weight numeric, complexity_multiplier numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.assert_org_member(p_org_id);
  SELECT
    s.user_id, p.full_name, p.avatar_url, s.role,
    s.marketplace_role,
    s.total_points, s.normalized_score, s.current_level,
    s.on_time_deliveries, s.late_deliveries, s.clean_approvals, s.total_issues,
    COALESCE(rwc.archetype::TEXT, 'medium_volume') AS archetype,
    COALESCE(rwc.base_weight, 1.0) AS base_weight,
    COALESCE(rwc.complexity_multiplier, 1.0) AS complexity_multiplier
  FROM up_user_scores s
  JOIN profiles p ON p.id = s.user_id
  LEFT JOIN LATERAL (
    SELECT rwc2.archetype, rwc2.base_weight, rwc2.complexity_multiplier
    FROM role_weight_config rwc2
    WHERE rwc2.role_key = COALESCE(s.marketplace_role, s.role)
      AND rwc2.is_active = true
      AND (rwc2.organization_id = p_org_id OR rwc2.organization_id IS NULL)
    ORDER BY rwc2.organization_id NULLS LAST
    LIMIT 1
  ) rwc ON true
  WHERE s.organization_id = p_org_id
    AND (p_role IS NULL OR s.role = p_role OR s.marketplace_role = p_role)
    AND (p_archetype IS NULL OR COALESCE(rwc.archetype::TEXT, 'medium_volume') = p_archetype)
    AND s.season_id IS NULL
  ORDER BY
    CASE WHEN p_sort_by = 'normalized' THEN s.normalized_score ELSE s.total_points::NUMERIC END DESC
  LIMIT 100;
$function$;

CREATE OR REPLACE FUNCTION public.get_org_social_accounts(p_org_id uuid)
RETURNS TABLE(id uuid, user_id uuid, organization_id uuid, platform text, platform_user_id text, platform_username text, platform_display_name text, platform_avatar_url text, platform_page_id text, platform_page_name text, is_active boolean, scopes text[], token_expires_at timestamp with time zone, connected_at timestamp with time zone, last_synced_at timestamp with time zone, last_error text, metadata jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, owner_type text, brand_id uuid, client_id uuid, account_type text, settings jsonb, platform_metadata jsonb, connection_method text, client_name text, client_logo_url text, groups jsonb, permissions jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.assert_org_member(p_org_id);
  SELECT
    sa.id,
    sa.user_id,
    sa.organization_id,
    sa.platform,
    sa.platform_user_id,
    sa.platform_username,
    sa.platform_display_name,
    sa.platform_avatar_url,
    sa.platform_page_id,
    sa.platform_page_name,
    sa.is_active,
    sa.scopes,
    sa.token_expires_at,
    sa.connected_at,
    sa.last_synced_at,
    sa.last_error,
    sa.metadata,
    sa.created_at,
    sa.updated_at,
    sa.owner_type::TEXT,
    sa.brand_id,
    sa.client_id,
    sa.account_type::TEXT,
    sa.settings,
    sa.platform_metadata,
    sa.connection_method,
    c.name AS client_name,
    c.logo_url AS client_logo_url,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'group_id', sag.group_id,
        'group_name', g.name,
        'group_color', g.color
      ))
      FROM social_account_group_members sag
      JOIN social_account_groups g ON g.id = sag.group_id
      WHERE sag.account_id = sa.id),
      '[]'::JSONB
    ) AS groups,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'user_id', sap.user_id,
        'can_view', sap.can_view,
        'can_post', sap.can_post,
        'can_schedule', sap.can_schedule,
        'can_analytics', sap.can_analytics,
        'can_manage', sap.can_manage
      ))
      FROM social_account_permissions sap
      WHERE sap.account_id = sa.id),
      '[]'::JSONB
    ) AS permissions
  FROM social_accounts sa
  LEFT JOIN clients c ON c.id = sa.client_id
  WHERE sa.organization_id = p_org_id
    AND sa.is_active = true
  ORDER BY sa.platform, sa.connected_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_org_talent_roster(p_organization_id uuid)
RETURNS TABLE(id uuid, full_name text, email text, avatar_url text, phone text, bio text, role text, content_count bigint, is_ambassador boolean, quality_score_avg numeric, reliability_score numeric, velocity_score numeric, ai_recommended_level text, ai_risk_flag text, ambassador_level text, editor_rating numeric, editor_completed_count integer, editor_on_time_count integer, active_tasks bigint, up_points numeric, up_level text, avg_creator_rating numeric, avg_editor_rating numeric, avg_strategy_rating numeric, avg_star_rating numeric, rated_content_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.assert_org_member(p_organization_id);
  WITH members AS (
    SELECT DISTINCT ON (omr.user_id)
      omr.user_id,
      omr.role AS canonical_role
    FROM organization_member_roles omr
    WHERE omr.organization_id = p_organization_id
      AND omr.role IN ('content_creator','editor','digital_strategist','creative_strategist','community_manager')
    ORDER BY omr.user_id,
      CASE omr.role
        WHEN 'editor' THEN 1
        WHEN 'content_creator' THEN 2
        WHEN 'digital_strategist' THEN 3
        WHEN 'creative_strategist' THEN 4
        WHEN 'community_manager' THEN 5
      END
  ),
  ambassador_roles AS (
    SELECT DISTINCT omr.user_id
    FROM organization_member_roles omr
    WHERE omr.organization_id = p_organization_id AND omr.role = 'ambassador'
  ),
  member_data AS (
    SELECT om.user_id, om.ambassador_level
    FROM organization_members om
    WHERE om.organization_id = p_organization_id
  ),
  content_counts AS (
    SELECT creator_id AS user_id, count(*) AS cnt
    FROM content WHERE organization_id = p_organization_id AND creator_id IS NOT NULL
    GROUP BY creator_id
    UNION ALL
    SELECT editor_id AS user_id, count(*) AS cnt
    FROM content WHERE organization_id = p_organization_id AND editor_id IS NOT NULL
    GROUP BY editor_id
  ),
  content_count_totals AS (
    SELECT user_id, sum(cnt) AS content_count FROM content_counts GROUP BY user_id
  ),
  active_tasks_creator AS (
    SELECT creator_id AS user_id, count(*) AS cnt
    FROM content
    WHERE organization_id = p_organization_id AND creator_id IS NOT NULL
      AND status IN ('assigned','recording','recorded','editing','review','issue')
    GROUP BY creator_id
  ),
  active_tasks_editor AS (
    SELECT editor_id AS user_id, count(*) AS cnt
    FROM content
    WHERE organization_id = p_organization_id AND editor_id IS NOT NULL
      AND status IN ('assigned','recording','recorded','editing','review','issue')
    GROUP BY editor_id
  ),
  active_tasks_totals AS (
    SELECT user_id, sum(cnt) AS active_tasks FROM (
      SELECT * FROM active_tasks_creator UNION ALL SELECT * FROM active_tasks_editor
    ) t GROUP BY user_id
  ),
  creator_up AS (
    SELECT DISTINCT ON (user_id) user_id, total_points, current_level
    FROM up_creadores_totals
    WHERE organization_id = p_organization_id
    ORDER BY user_id, updated_at DESC
  ),
  editor_up AS (
    SELECT DISTINCT ON (user_id) user_id, total_points, current_level
    FROM up_editores_totals
    WHERE organization_id = p_organization_id
    ORDER BY user_id, updated_at DESC
  ),
  creator_ratings AS (
    SELECT creator_id AS user_id, avg(creator_rating) AS avg_rating, count(*) AS rated_count
    FROM content
    WHERE organization_id = p_organization_id AND creator_id IS NOT NULL AND creator_rating IS NOT NULL
    GROUP BY creator_id
  ),
  editor_ratings AS (
    SELECT editor_id AS user_id, avg(editor_rating) AS avg_rating, count(*) AS rated_count
    FROM content
    WHERE organization_id = p_organization_id AND editor_id IS NOT NULL AND editor_rating IS NOT NULL
    GROUP BY editor_id
  ),
  strategy_ratings AS (
    SELECT strategist_id AS user_id, avg(strategy_rating) AS avg_rating, count(*) AS rated_count
    FROM content
    WHERE organization_id = p_organization_id AND strategist_id IS NOT NULL AND strategy_rating IS NOT NULL
    GROUP BY strategist_id
  )
  SELECT
    m.user_id AS id,
    COALESCE(p.full_name, p.email, 'Usuario eliminado') AS full_name,
    COALESCE(p.email, '') AS email,
    p.avatar_url,
    p.phone,
    p.bio,
    CASE
      WHEN m.canonical_role = 'editor' THEN 'editor'
      WHEN m.canonical_role = 'content_creator' THEN 'creator'
      ELSE 'strategist'
    END AS role,
    COALESCE(cct.content_count, 0) AS content_count,
    (ar.user_id IS NOT NULL OR COALESCE(p.is_ambassador, false)) AS is_ambassador,
    p.quality_score_avg,
    p.reliability_score,
    p.velocity_score,
    p.ai_recommended_level,
    p.ai_risk_flag,
    COALESCE(md.ambassador_level, 'none') AS ambassador_level,
    p.editor_rating,
    p.editor_completed_count,
    p.editor_on_time_count,
    COALESCE(att.active_tasks, 0) AS active_tasks,
    COALESCE(
      CASE WHEN m.canonical_role = 'editor' THEN eu.total_points ELSE cu.total_points END,
      0
    ) AS up_points,
    COALESCE(
      CASE WHEN m.canonical_role = 'editor' THEN eu.current_level ELSE cu.current_level END,
      'bronze'
    ) AS up_level,
    cr.avg_rating AS avg_creator_rating,
    er.avg_rating AS avg_editor_rating,
    sr.avg_rating AS avg_strategy_rating,
    COALESCE(
      CASE
        WHEN m.canonical_role = 'editor' THEN er.avg_rating
        WHEN m.canonical_role = 'content_creator' THEN cr.avg_rating
        ELSE sr.avg_rating
      END,
      0
    ) AS avg_star_rating,
    COALESCE(
      CASE
        WHEN m.canonical_role = 'editor' THEN er.rated_count
        WHEN m.canonical_role = 'content_creator' THEN cr.rated_count
        ELSE sr.rated_count
      END,
      0
    ) AS rated_content_count
  FROM members m
  LEFT JOIN profiles p ON p.id = m.user_id
  LEFT JOIN ambassador_roles ar ON ar.user_id = m.user_id
  LEFT JOIN member_data md ON md.user_id = m.user_id
  LEFT JOIN content_count_totals cct ON cct.user_id = m.user_id
  LEFT JOIN active_tasks_totals att ON att.user_id = m.user_id
  LEFT JOIN creator_up cu ON cu.user_id = m.user_id
  LEFT JOIN editor_up eu ON eu.user_id = m.user_id
  LEFT JOIN creator_ratings cr ON cr.user_id = m.user_id
  LEFT JOIN editor_ratings er ON er.user_id = m.user_id
  LEFT JOIN strategy_ratings sr ON sr.user_id = m.user_id;
$function$;

NOTIFY pgrst, 'reload schema';
