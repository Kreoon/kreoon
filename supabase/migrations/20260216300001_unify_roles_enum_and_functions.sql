-- ============================================================
-- Migration: Unify Marketplace Roles into app_role enum
-- Adds 36 marketplace role values + permission group function
-- ============================================================

-- 1. Extend app_role enum with marketplace roles
-- Content Creation (12)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ugc_creator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lifestyle_creator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'micro_influencer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nano_influencer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'macro_influencer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'brand_ambassador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'live_streamer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'podcast_host';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'photographer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'copywriter';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'graphic_designer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'voice_artist';
-- Post-Production (7)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'video_editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'motion_graphics';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sound_designer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'colorist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'director';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'producer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'animator_2d3d';
-- Strategy & Marketing (10)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_strategist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'social_media_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'community_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'digital_strategist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seo_specialist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'email_marketer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'growth_hacker';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'crm_specialist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'conversion_optimizer';
-- Technology (3)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'web_developer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'app_developer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ai_specialist';
-- Education (2)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'online_instructor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'workshop_facilitator';
-- Client (2)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'brand_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing_director';

-- NOTE: 'trafficker' already exists as legacy role (added in 20260102190854).
-- It now maps to strategy_marketing group alongside the new strategist roles.

-- ============================================================
-- 2. Create get_permission_group(text) function
-- Maps any role (legacy or marketplace) to one of 6 permission groups:
--   admin, team_leader, creator, editor, strategist, client
-- IMMUTABLE for use in indexes and RLS policies
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_permission_group(p_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    -- System roles
    WHEN p_role = 'admin' THEN 'admin'
    WHEN p_role = 'team_leader' THEN 'team_leader'

    -- Legacy roles (backward compat)
    WHEN p_role = 'creator' THEN 'creator'
    WHEN p_role = 'editor' THEN 'editor'
    WHEN p_role = 'strategist' THEN 'strategist'
    WHEN p_role = 'client' THEN 'client'
    WHEN p_role = 'ambassador' THEN 'creator'
    WHEN p_role = 'trafficker' THEN 'strategist'

    -- Content Creation → creator
    WHEN p_role IN (
      'ugc_creator', 'lifestyle_creator', 'micro_influencer', 'nano_influencer',
      'macro_influencer', 'brand_ambassador', 'live_streamer', 'podcast_host',
      'photographer', 'copywriter', 'graphic_designer', 'voice_artist'
    ) THEN 'creator'

    -- Post-Production → editor
    WHEN p_role IN (
      'video_editor', 'motion_graphics', 'sound_designer', 'colorist',
      'director', 'producer', 'animator_2d3d'
    ) THEN 'editor'

    -- Strategy & Marketing → strategist
    WHEN p_role IN (
      'content_strategist', 'social_media_manager', 'community_manager',
      'digital_strategist', 'seo_specialist', 'email_marketer',
      'growth_hacker', 'crm_specialist', 'conversion_optimizer'
    ) THEN 'strategist'

    -- Technology → creator
    WHEN p_role IN ('web_developer', 'app_developer', 'ai_specialist') THEN 'creator'

    -- Education → creator
    WHEN p_role IN ('online_instructor', 'workshop_facilitator') THEN 'creator'

    -- Client marketplace roles → client
    WHEN p_role IN ('brand_manager', 'marketing_director') THEN 'client'

    -- Unknown → creator (safe default)
    ELSE 'creator'
  END;
$$;

COMMENT ON FUNCTION public.get_permission_group(text) IS
  'Maps any app_role (legacy or marketplace) to a permission group: admin, team_leader, creator, editor, strategist, client';

-- ============================================================
-- 3. Update is_org_configurer to use get_permission_group
-- Configurers = admin group OR team_leader group OR strategist group OR org owner
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_org_configurer(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.has_role(_user_id, 'admin'::app_role)
    OR public.is_org_owner(_user_id, _org_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = _user_id AND om.organization_id = _org_id
      AND public.get_permission_group(om.role::text) IN ('admin', 'strategist', 'team_leader')
    )
    OR EXISTS (
      SELECT 1 FROM public.organization_member_roles omr
      WHERE omr.user_id = _user_id AND omr.organization_id = _org_id
      AND public.get_permission_group(omr.role::text) IN ('admin', 'strategist', 'team_leader')
    )
  );
$$;

-- ============================================================
-- 4. Update get_org_content role-based filtering
-- Now uses permission groups instead of hardcoded role names
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_org_content(
  p_organization_id uuid,
  p_role text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_creator_id uuid DEFAULT NULL,
  p_editor_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 500
)
RETURNS SETOF content
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_member boolean := false;
  v_group text;
BEGIN
  -- Check org membership (roles table)
  SELECT EXISTS(
    SELECT 1 FROM organization_member_roles
    WHERE organization_id = p_organization_id AND user_id = v_uid
  ) INTO v_is_member;

  -- Check client_users junction (client access)
  IF NOT v_is_member THEN
    SELECT EXISTS(
      SELECT 1 FROM client_users cu
      JOIN clients c ON c.id = cu.client_id
      WHERE c.organization_id = p_organization_id AND cu.user_id = v_uid
    ) INTO v_is_member;
  END IF;

  -- Platform root fallback
  IF NOT v_is_member THEN
    SELECT EXISTS(
      SELECT 1 FROM auth.users
      WHERE id = v_uid AND email IN ('alexander@kreoon.com', 'admin@kreoon.com')
    ) INTO v_is_member;
  END IF;

  IF NOT v_is_member THEN
    RETURN;
  END IF;

  -- Resolve role to permission group for filtering
  v_group := public.get_permission_group(COALESCE(p_role, ''));

  RETURN QUERY
    SELECT * FROM content c
    WHERE c.organization_id = p_organization_id
      AND (p_client_id IS NULL OR c.client_id = p_client_id)
      AND (p_creator_id IS NULL OR c.creator_id = p_creator_id)
      AND (p_editor_id IS NULL OR c.editor_id = p_editor_id)
      -- Role-based filtering via permission group
      AND (
        p_role IS NULL
        OR v_group NOT IN ('creator', 'editor', 'client')
        OR (v_group = 'creator' AND c.creator_id = p_user_id)
        OR (v_group = 'editor' AND c.editor_id = p_user_id)
        OR (v_group = 'client' AND c.client_id IN (
          SELECT cu.client_id FROM client_users cu WHERE cu.user_id = p_user_id
        ))
      )
    ORDER BY c.created_at DESC
    LIMIT p_limit;
END;
$function$;

-- ============================================================
-- 5. Update chat visibility functions to use permission groups
-- ============================================================

-- can_see_user_in_list: determines if source can see target in chat list
CREATE OR REPLACE FUNCTION public.can_see_user_in_list(
  p_source_user_id uuid,
  p_target_user_id uuid,
  p_org_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_role text;
  v_target_role text;
  v_source_group text;
  v_target_group text;
BEGIN
  -- Get source user role (prefer organization_member_roles, fallback to organization_members)
  SELECT omr.role::text INTO v_source_role
  FROM organization_member_roles omr
  WHERE omr.user_id = p_source_user_id AND omr.organization_id = p_org_id
  LIMIT 1;

  IF v_source_role IS NULL THEN
    SELECT om.role::text INTO v_source_role
    FROM organization_members om
    WHERE om.user_id = p_source_user_id AND om.organization_id = p_org_id;
  END IF;

  -- Get target user role
  SELECT omr.role::text INTO v_target_role
  FROM organization_member_roles omr
  WHERE omr.user_id = p_target_user_id AND omr.organization_id = p_org_id
  LIMIT 1;

  IF v_target_role IS NULL THEN
    SELECT om.role::text INTO v_target_role
    FROM organization_members om
    WHERE om.user_id = p_target_user_id AND om.organization_id = p_org_id;
  END IF;

  IF v_source_role IS NULL OR v_target_role IS NULL THEN
    RETURN false;
  END IF;

  v_source_group := public.get_permission_group(v_source_role);
  v_target_group := public.get_permission_group(v_target_role);

  -- Check RBAC rules first (if they exist)
  IF EXISTS (
    SELECT 1 FROM chat_rbac_rules
    WHERE organization_id = p_org_id
    AND source_role = v_source_role
    AND target_role = v_target_role
    AND can_see_in_list = true
  ) THEN
    RETURN true;
  END IF;

  -- Also check by permission group (broader match for new marketplace roles)
  IF EXISTS (
    SELECT 1 FROM chat_rbac_rules
    WHERE organization_id = p_org_id
    AND public.get_permission_group(source_role) = v_source_group
    AND public.get_permission_group(target_role) = v_target_group
    AND can_see_in_list = true
  ) THEN
    RETURN true;
  END IF;

  -- Default rules by permission group
  -- Admin and team_leader can see everyone
  IF v_source_group IN ('admin', 'team_leader') THEN
    RETURN true;
  END IF;

  -- Strategist can see everyone
  IF v_source_group = 'strategist' THEN
    RETURN true;
  END IF;

  -- Client can only see admin and strategist
  IF v_source_group = 'client' THEN
    RETURN v_target_group IN ('admin', 'strategist', 'team_leader');
  END IF;

  -- Creator/editor cannot see clients
  IF v_source_group IN ('creator', 'editor') AND v_target_group = 'client' THEN
    RETURN false;
  END IF;

  -- Everyone else can see non-client members
  RETURN true;
END;
$$;

-- ============================================================
-- Done. The migration:
-- 1. Extends app_role enum with 36 marketplace values
-- 2. Creates get_permission_group() IMMUTABLE function
-- 3. Updates is_org_configurer to use permission groups
-- 4. Updates get_org_content to use permission groups
-- 5. Updates can_see_user_in_list to use permission groups
-- ============================================================
