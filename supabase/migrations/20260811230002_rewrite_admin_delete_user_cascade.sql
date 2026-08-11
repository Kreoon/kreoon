-- =====================================================================
-- Reescritura de public.admin_delete_user_cascade(uuid)
-- Fecha: 2026-08-11
--
-- POR QUÉ:
-- Se dropean 5 módulos completos (live/streaming, booking, campañas,
-- UP/gamificación y feed social). Esta función es la ÚNICA vía segura de
-- borrar un usuario sin dejar registros zombis (la invoca la edge function
-- `admin-users`), y contiene DELETEs contra tablas que dejarán de existir.
-- Aunque cada sentencia va envuelta en BEGIN ... EXCEPTION WHEN OTHERS THEN
-- NULL (por lo que un "relation does not exist" no rompería el borrado),
-- mantener referencias muertas oculta fallos reales y confunde auditorías.
--
-- QUÉ CAMBIA:
-- Se eliminan 20 sentencias DELETE que apuntan a tablas de los módulos
-- dropeados. TODO lo demás se conserva EXACTAMENTE en el mismo orden
-- (el orden importa: respeta dependencias de FK), incluidas las sentencias
-- UPDATE ... SET NULL, la recolección previa de wallet_ids, las etiquetas
-- acumuladas en `deleted_tables`, el bloque de auth.* y el manejo de
-- excepciones final.
--
-- NOTA (bloque 5): los DELETE de portfolio_posts / portfolio_post_comments /
-- portfolio_stories se conservan a propósito: esas tablas siguen vivas hasta
-- el bloque 5. Quitarlos es el último paso de ese bloque. Si se quitaran
-- ahora, borrar un usuario en los próximos días dejaría filas huérfanas en
-- tablas todavía en uso — exactamente lo que esta función existe para evitar.
-- (portfolio_posts podría incluso conservarse como archivo histórico por
-- decisión de negocio, en cuyo caso su DELETE se queda de forma permanente.)
--
-- DELETE eliminados (20):
--   feed/social : social_notifications
--   campañas    : campaign_applications
--   booking     : creator_availability
--   UP/gamific. : point_transactions, reputation_events, user_reputation_totals,
--                 reputation_global, up_creadores, up_editores,
--                 up_creadores_totals, up_editores_totals, user_achievements,
--                 user_points, chronometer_pauses, up_chronometer_pauses,
--                 up_events, up_quest_progress, up_season_snapshots,
--                 up_user_scores, up_fraud_alerts
--
-- Se CONSERVAN a propósito (suenan parecido pero NO se dropean):
--   content_likes, saved_items, saved_collections, saved_creators,
--   saved_searches, profile_views, suggested_profiles_cache, user_feed_events,
--   user_interest_profile, post_metrics, followers, marketplace_favorites,
--   promotional_campaigns, campaign_redemptions, campaign_mappings,
--   marketplace_projects, portfolio_items, marketplace_reputation,
--   portfolio_moderation_flags, user_followers, message_reactions
--   y todo el core (profiles, content, payments, clients, wallets,
--   organization_members, auth.*).
--
-- FIRMA / CONTRATO: sin cambios.
--   admin_delete_user_cascade(target_user_id uuid) RETURNS jsonb
--   LANGUAGE plpgsql · SECURITY DEFINER · SET search_path = 'public','auth'
--   Retorno: {success, deleted_from[], user_id} / {success:false, error,
--   detail, deleted_so_far}. Las etiquetas de `deleted_from` se mantienen
--   idénticas ('org','chat','content','portfolio','creator','referrals',
--   'finance','reputation','crm','misc','profiles','auth.users'): todas
--   siguen teniendo al menos una sentencia viva detrás, así que el JSON de
--   salida no cambia de forma.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.admin_delete_user_cascade(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  deleted_tables TEXT[] := '{}';
  wallet_ids UUID[];
BEGIN
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID is required');
  END IF;

  -- Get all wallet IDs for this user FIRST
  BEGIN SELECT ARRAY_AGG(id) INTO wallet_ids FROM unified_wallets WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Partner communities - nullify ALL FK columns before deleting
  IF wallet_ids IS NOT NULL THEN
    BEGIN UPDATE partner_communities SET owner_wallet_id = NULL WHERE owner_wallet_id = ANY(wallet_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  BEGIN UPDATE partner_communities SET owner_user_id = NULL WHERE owner_user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE partner_communities SET created_by = NULL WHERE created_by = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM partner_community_memberships WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN DELETE FROM organization_member_badges WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM organization_member_roles WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM organization_members WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM user_roles WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'org');

  BEGIN DELETE FROM client_users WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM notifications WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM chat_participants WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM chat_messages WHERE sender_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM chat_message_reads WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM chat_typing_indicators WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'chat');

  BEGIN UPDATE content SET creator_id = NULL WHERE creator_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE content SET editor_id = NULL WHERE editor_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE content SET script_approved_by = NULL WHERE script_approved_by = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE content SET approved_by = NULL WHERE approved_by = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE content SET strategy_rated_by = NULL WHERE strategy_rated_by = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM content_comments WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM content_history WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM content_likes WHERE viewer_id = target_user_id::text; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM content_collaborators WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM content_status_logs WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'content');

  -- [BLOQUE 5] portfolio_posts / portfolio_stories / portfolio_post_comments siguen vivas: NO quitar todavía
  BEGIN DELETE FROM portfolio_posts WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM portfolio_items WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id = target_user_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM portfolio_stories WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM portfolio_post_comments WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM portfolio_moderation_flags WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'portfolio');

  BEGIN DELETE FROM creator_services WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM saved_creators WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  -- [DROP MÓDULO CAMPAÑAS] eliminado: campaign_applications
  BEGIN UPDATE marketplace_projects SET creator_id = NULL WHERE creator_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE marketplace_projects SET editor_id = NULL WHERE editor_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE project_deliveries SET creator_id = NULL WHERE creator_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE creator_reviews SET reviewer_id = NULL WHERE reviewer_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM creator_profiles WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  -- [DROP MÓDULO BOOKING] eliminado: creator_availability
  deleted_tables := array_append(deleted_tables, 'creator');

  BEGIN DELETE FROM referral_commissions WHERE referrer_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM referrals WHERE referrer_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE referrals SET referred_user_id = NULL WHERE referred_user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM referral_leaderboard WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM referral_payouts WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'referrals');

  -- AI Token transactions - nullify or delete
  BEGIN UPDATE ai_token_transactions SET executed_by = NULL WHERE executed_by = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM ai_token_transactions WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- UNIFIED WALLETS - Delete ALL referencing tables FIRST
  IF wallet_ids IS NOT NULL AND array_length(wallet_ids, 1) > 0 THEN
    BEGIN DELETE FROM unified_transactions WHERE wallet_id = ANY(wallet_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM escrow_holds WHERE from_wallet_id = ANY(wallet_ids) OR to_wallet_id = ANY(wallet_ids) OR client_wallet_id = ANY(wallet_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM platform_subscriptions WHERE wallet_id = ANY(wallet_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM withdrawal_requests WHERE wallet_id = ANY(wallet_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM referral_earnings WHERE referrer_wallet_id = ANY(wallet_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM referral_relationships WHERE referrer_wallet_id = ANY(wallet_ids) OR referred_wallet_id = ANY(wallet_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  -- Now safe to delete wallets
  BEGIN DELETE FROM unified_wallets WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Other finance tables (by user_id)
  BEGIN DELETE FROM ai_token_balances WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM withdrawal_requests WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM referral_codes WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM referral_earnings WHERE referrer_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM referral_relationships WHERE referrer_id = target_user_id OR referred_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM platform_subscriptions WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM payment_methods WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM wallets WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM payments WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  -- [DROP MÓDULO UP] eliminado: point_transactions
  -- Old AI tokens table
  BEGIN DELETE FROM organization_ai_tokens WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'finance');

  -- [DROP MÓDULO UP] eliminados: reputation_events, user_reputation_totals, reputation_global
  BEGIN DELETE FROM marketplace_reputation WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'reputation');

  BEGIN UPDATE platform_crm_leads SET converted_user_id = NULL WHERE converted_user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE platform_crm_leads SET assigned_to = NULL WHERE assigned_to = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE platform_crm_activities SET performed_by = NULL WHERE performed_by = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM platform_user_health WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM login_history WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM security_events WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM user_security_status WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM audit_logs WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'crm');

  BEGIN DELETE FROM user_followers WHERE follower_id = target_user_id OR followed_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM brand_members WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE brands SET owner_id = NULL WHERE owner_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM organization_invitations WHERE invited_by = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM client_invitations WHERE invited_by = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  -- [DROP MÓDULO UP] eliminados: up_creadores, up_editores, up_creadores_totals, up_editores_totals
  BEGIN DELETE FROM user_presence WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM known_devices WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM user_notification_settings WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM user_notifications WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  -- [DROP MÓDULO UP] eliminados: user_achievements, user_points
  BEGIN DELETE FROM user_feed_events WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM user_interest_profile WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM social_accounts WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM social_account_permissions WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  -- [DROP MÓDULO FEED] eliminado: social_notifications
  BEGIN DELETE FROM scheduled_posts WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM saved_collections WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM saved_items WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM message_reactions WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM ai_assistant_logs WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM ai_chat_feedback WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM ai_usage_logs WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM ambassador_ai_evaluations WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM talent_ai_recommendations WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM talent_performance_history WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  -- [DROP MÓDULO UP] eliminados: chronometer_pauses, up_chronometer_pauses, up_events,
  --                              up_quest_progress, up_season_snapshots, up_user_scores, up_fraud_alerts
  BEGIN DELETE FROM campaign_redemptions WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM marketing_ad_accounts WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM custom_pricing_agreements WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM project_assignments WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM profile_blocks_config WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM suggested_profiles_cache WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM company_profiles WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE clients SET user_id = NULL WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'misc');

  BEGIN DELETE FROM kae_visitors WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM kae_sessions WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM kae_conversions WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN DELETE FROM profiles WHERE id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'profiles');

  BEGIN DELETE FROM auth.identities WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM auth.sessions WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM auth.refresh_tokens WHERE user_id::uuid = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM auth.mfa_factors WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM auth.one_time_tokens WHERE user_id = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  DELETE FROM auth.users WHERE id = target_user_id;
  deleted_tables := array_append(deleted_tables, 'auth.users');

  RETURN jsonb_build_object('success', true, 'deleted_from', deleted_tables, 'user_id', target_user_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE, 'deleted_so_far', deleted_tables);
END;
$function$;
