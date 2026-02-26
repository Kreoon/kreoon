-- Fix: nullify partner_communities.owner_wallet_id before deleting wallets

CREATE OR REPLACE FUNCTION public.admin_delete_user_cascade(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  deleted_tables TEXT[] := '{}';
  wallet_ids UUID[];
BEGIN
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID is required');
  END IF;

  -- Get wallet IDs first
  BEGIN
    SELECT ARRAY_AGG(id) INTO wallet_ids FROM unified_wallets WHERE user_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Partner communities - nullify owner_wallet_id BEFORE deleting wallets
  IF wallet_ids IS NOT NULL THEN
    BEGIN UPDATE partner_communities SET owner_wallet_id = NULL WHERE owner_wallet_id = ANY(wallet_ids); EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  END IF;
  BEGIN DELETE FROM partner_community_memberships WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Organization tables
  BEGIN DELETE FROM organization_member_badges WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM organization_member_roles WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM organization_members WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_roles WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'org');

  -- Client/Notifications/Chat
  BEGIN DELETE FROM client_users WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM notifications WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM chat_participants WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM chat_messages WHERE sender_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM chat_message_reads WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM chat_typing_indicators WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'client_chat');

  -- Content
  BEGIN UPDATE content SET creator_id = NULL WHERE creator_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE content SET editor_id = NULL WHERE editor_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE content SET script_approved_by = NULL WHERE script_approved_by = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE content SET approved_by = NULL WHERE approved_by = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE content SET strategy_rated_by = NULL WHERE strategy_rated_by = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM content_comments WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM content_history WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM content_likes WHERE viewer_id = target_user_id::text; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM content_collaborators WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM content_status_logs WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'content');

  -- Portfolio
  BEGIN DELETE FROM portfolio_posts WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM portfolio_items WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id = target_user_id); EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM portfolio_stories WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM portfolio_post_comments WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM portfolio_moderation_flags WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'portfolio');

  -- Creator/Marketplace
  BEGIN DELETE FROM creator_services WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM saved_creators WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM campaign_applications WHERE creator_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE marketplace_projects SET creator_id = NULL WHERE creator_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE marketplace_projects SET editor_id = NULL WHERE editor_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE project_deliveries SET creator_id = NULL WHERE creator_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE creator_reviews SET reviewer_id = NULL WHERE reviewer_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM creator_profiles WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM creator_availability WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM creator_availability_status WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'creator');

  -- Referrals
  BEGIN DELETE FROM referral_commissions WHERE referrer_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM referrals WHERE referrer_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE referrals SET referred_user_id = NULL WHERE referred_user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM referral_leaderboard WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM referral_payouts WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'referrals');

  -- Finance - clean up FK references to wallets first
  IF wallet_ids IS NOT NULL THEN
    BEGIN DELETE FROM unified_transactions WHERE wallet_id = ANY(wallet_ids); EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
    BEGIN DELETE FROM escrow_holds WHERE from_wallet_id = ANY(wallet_ids) OR to_wallet_id = ANY(wallet_ids); EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
    BEGIN DELETE FROM referral_earnings WHERE referrer_wallet_id = ANY(wallet_ids); EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
    BEGIN DELETE FROM referral_relationships WHERE referrer_wallet_id = ANY(wallet_ids) OR referred_wallet_id = ANY(wallet_ids); EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  END IF;
  BEGIN DELETE FROM unified_wallets WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM ai_token_balances WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM withdrawal_requests WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM referral_codes WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM referral_earnings WHERE referrer_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM referral_relationships WHERE referrer_id = target_user_id OR referred_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM platform_subscriptions WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM payment_methods WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM wallets WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM payments WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM point_transactions WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'finance');

  -- Reputation
  BEGIN DELETE FROM reputation_events WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM user_reputation_totals WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM marketplace_reputation WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM reputation_global WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'reputation');

  -- CRM & Security
  BEGIN UPDATE platform_crm_leads SET converted_user_id = NULL WHERE converted_user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE platform_crm_leads SET assigned_to = NULL WHERE assigned_to = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE platform_crm_activities SET performed_by = NULL WHERE performed_by = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM platform_user_health WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM login_history WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM security_events WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM user_security_status WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM audit_logs WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'crm');

  -- Social & Misc
  BEGIN DELETE FROM user_followers WHERE follower_id = target_user_id OR followed_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM brand_members WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE brands SET owner_id = NULL WHERE owner_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM organization_invitations WHERE invited_by = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM client_invitations WHERE invited_by = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_creadores WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_editores WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_creadores_totals WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_editores_totals WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM user_presence WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM known_devices WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM user_notification_settings WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM user_notifications WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM user_achievements WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM user_points WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM user_feed_events WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM user_interest_profile WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM social_accounts WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM social_account_permissions WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM social_notifications WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM scheduled_posts WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM saved_collections WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM saved_items WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM message_reactions WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM ai_assistant_logs WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM ai_chat_feedback WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM ai_usage_logs WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM ambassador_ai_evaluations WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM talent_ai_recommendations WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM talent_performance_history WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM chronometer_pauses WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_chronometer_pauses WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_events WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_quest_progress WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_season_snapshots WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_user_scores WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_fraud_alerts WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM campaign_redemptions WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM marketing_ad_accounts WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM custom_pricing_agreements WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM project_assignments WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM profile_blocks_config WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM suggested_profiles_cache WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM organization_ambassadors WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM company_profiles WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE clients SET user_id = NULL WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'misc');

  -- KAE Analytics
  BEGIN DELETE FROM kae_visitors WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM kae_sessions WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM kae_conversions WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- Profile
  BEGIN DELETE FROM profiles WHERE id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'profiles');

  -- Auth
  BEGIN DELETE FROM auth.identities WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM auth.sessions WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM auth.refresh_tokens WHERE user_id::uuid = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM auth.mfa_factors WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM auth.one_time_tokens WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  DELETE FROM auth.users WHERE id = target_user_id;
  deleted_tables := array_append(deleted_tables, 'auth.users');

  RETURN jsonb_build_object('success', true, 'deleted_from', deleted_tables, 'user_id', target_user_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE, 'deleted_so_far', deleted_tables);
END;
$$;
