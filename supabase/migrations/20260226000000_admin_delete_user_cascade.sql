-- =====================================================
-- Function: admin_delete_user_cascade
-- Forcefully deletes a user and all related data
-- Uses SECURITY DEFINER to bypass RLS and FK constraints
-- Handles missing tables gracefully with EXCEPTION blocks
-- =====================================================

CREATE OR REPLACE FUNCTION admin_delete_user_cascade(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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
  deleted_tables := array_append(deleted_tables, 'content');

  -- Portfolio
  BEGIN DELETE FROM portfolio_posts WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM portfolio_items WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id = target_user_id); EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
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
  deleted_tables := array_append(deleted_tables, 'creator');

  -- Referrals
  BEGIN DELETE FROM referral_commissions WHERE referrer_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM referrals WHERE referrer_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE referrals SET referred_user_id = NULL WHERE referred_user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'referrals');

  -- Finance
  IF wallet_ids IS NOT NULL THEN
    BEGIN DELETE FROM unified_transactions WHERE wallet_id = ANY(wallet_ids); EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
    BEGIN DELETE FROM referral_earnings WHERE referrer_wallet_id = ANY(wallet_ids); EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
    BEGIN DELETE FROM referral_relationships WHERE referrer_wallet_id = ANY(wallet_ids) OR referred_wallet_id = ANY(wallet_ids); EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  END IF;
  BEGIN DELETE FROM unified_wallets WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM ai_token_balances WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM withdrawal_requests WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM referral_codes WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM referral_earnings WHERE referrer_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM referral_relationships WHERE referrer_id = target_user_id OR referred_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'finance');

  -- Reputation
  BEGIN DELETE FROM reputation_events WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM user_reputation_totals WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM marketplace_reputation WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'reputation');

  -- CRM
  BEGIN UPDATE platform_crm_leads SET converted_user_id = NULL WHERE converted_user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE platform_crm_leads SET assigned_to = NULL WHERE assigned_to = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE platform_crm_activities SET performed_by = NULL WHERE performed_by = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM platform_user_health WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'crm');

  -- Misc
  BEGIN DELETE FROM user_followers WHERE follower_id = target_user_id OR followed_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM brand_members WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE brands SET owner_id = NULL WHERE owner_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM organization_invitations WHERE invited_by = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM client_invitations WHERE invited_by = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_creadores WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_editores WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_creadores_totals WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM up_editores_totals WHERE user_id = target_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  deleted_tables := array_append(deleted_tables, 'misc');

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

-- Grant execute to service_role only (function is called via edge function)
GRANT EXECUTE ON FUNCTION admin_delete_user_cascade(uuid) TO service_role;
