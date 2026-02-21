-- ============================================================================
-- Enhanced RPC: get_content_context_for_ai
-- Now includes 3 comprehensive context layers:
--   1. Client/Brand DNA (product_dna) - from social account's client or content's client
--   2. Product DNA - ALL JSONB fields from products table
--   3. Role info - ALL role guidelines from content table
-- ============================================================================

-- Drop old single-param version
DROP FUNCTION IF EXISTS get_content_context_for_ai(UUID);

CREATE OR REPLACE FUNCTION get_content_context_for_ai(
  p_content_id UUID,
  p_account_client_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    -- ── CONTEXT 1: Client/Brand DNA ──────────────────────────────────
    'client', CASE WHEN cl.id IS NOT NULL THEN jsonb_build_object(
      'name', cl.name,
      'bio', cl.bio,
      'category', cl.category,
      'instagram', cl.instagram,
      'tiktok', cl.tiktok,
      'facebook', cl.facebook,
      'linkedin', cl.linkedin,
      'website', cl.website
    ) ELSE NULL END,

    'client_dna', (
      SELECT jsonb_build_object(
        -- Rich JSONB data from product_dna
        'wizard_responses', pd.wizard_responses,
        'content_brief', pd.content_brief,
        'strategy_recommendations', pd.strategy_recommendations,
        'market_research', pd.market_research,
        'competitor_analysis', pd.competitor_analysis
      )
      FROM product_dna pd
      WHERE pd.client_id = COALESCE(p_account_client_id, c.client_id)
      ORDER BY pd.created_at DESC
      LIMIT 1
    ),

    -- ── CONTEXT 2: Product DNA ───────────────────────────────────────
    'product', CASE WHEN p.id IS NOT NULL THEN jsonb_build_object(
      'name', p.name,
      'description', p.description,
      'strategy', p.strategy,
      'ideal_avatar', p.ideal_avatar,
      'sales_angles', p.sales_angles,
      'market_research', p.market_research,
      -- Rich JSONB data
      'brief_data', p.brief_data,
      'content_strategy', p.content_strategy,
      'avatar_profiles', p.avatar_profiles,
      'sales_angles_data', p.sales_angles_data,
      'competitor_analysis', p.competitor_analysis,
      'launch_strategy', p.launch_strategy,
      'content_calendar', p.content_calendar
    ) ELSE NULL END,

    -- ── CONTEXT 3: Content + Role Guidelines ─────────────────────────
    'content', jsonb_build_object(
      -- Core content info
      'title', c.title,
      'description', c.description,
      'content_type', c.content_type,
      'sphere_phase', c.sphere_phase,
      'funnel_stage', c.funnel_stage,
      'target_platform', c.target_platform,
      'content_objective', c.content_objective,
      'target_country', c.target_country,
      'video_duration', c.video_duration,
      -- Creative elements
      'script', c.script,
      'hook', c.hook,
      'cta', c.cta,
      'caption', c.caption,
      'sales_angle', c.sales_angle,
      'selected_pain', c.selected_pain,
      'selected_desire', c.selected_desire,
      'selected_objection', c.selected_objection,
      'ideal_avatar', c.ideal_avatar,
      'suggested_hooks', c.suggested_hooks,
      'narrative_structure', c.narrative_structure,
      -- Role-specific guidelines
      'strategist_guidelines', c.strategist_guidelines,
      'trafficker_guidelines', c.trafficker_guidelines,
      'editor_guidelines', c.editor_guidelines,
      'designer_guidelines', c.designer_guidelines,
      'admin_guidelines', c.admin_guidelines,
      -- AI analysis
      'ai_analysis_data', c.ai_analysis_data,
      'sequence_number', c.sequence_number
    ),

    -- ── Campaign context ─────────────────────────────────────────────
    'campaign', CASE WHEN mc.id IS NOT NULL THEN jsonb_build_object(
      'name', mc.name,
      'objective', mc.objective,
      'performance_goal', mc.performance_goal,
      'targeting', mc.targeting,
      'creative', mc.creative,
      'ai_suggestions', mc.ai_suggestions
    ) ELSE NULL END
  )
  FROM content c
  LEFT JOIN clients cl ON cl.id = COALESCE(p_account_client_id, c.client_id)
  LEFT JOIN products p ON p.id = c.product_id
  LEFT JOIN marketing_campaigns mc ON mc.id = c.marketing_campaign_id
  WHERE c.id = p_content_id;
$$;

GRANT EXECUTE ON FUNCTION get_content_context_for_ai(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_content_context_for_ai(UUID, UUID) TO service_role;
