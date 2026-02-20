-- ============================================================================
-- RPC: get_content_context_for_ai
-- Gathers all contextual data for a content item to feed AI caption generation
-- Joins: content + clients + products + marketing_campaigns + product_dna
-- ============================================================================

CREATE OR REPLACE FUNCTION get_content_context_for_ai(p_content_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'content', jsonb_build_object(
      'title', c.title,
      'description', c.description,
      'script', c.script,
      'hook', c.hook,
      'cta', c.cta,
      'sphere_phase', c.sphere_phase,
      'target_platform', c.target_platform,
      'content_objective', c.content_objective,
      'selected_pain', c.selected_pain,
      'selected_desire', c.selected_desire,
      'selected_objection', c.selected_objection,
      'ideal_avatar', c.ideal_avatar,
      'suggested_hooks', c.suggested_hooks,
      'narrative_structure', c.narrative_structure,
      'strategist_guidelines', c.strategist_guidelines,
      'sequence_number', c.sequence_number
    ),
    'client', CASE WHEN cl.id IS NOT NULL THEN jsonb_build_object(
      'name', cl.name,
      'bio', cl.bio,
      'category', cl.category,
      'instagram', cl.instagram,
      'tiktok', cl.tiktok,
      'facebook', cl.facebook,
      'website', cl.website
    ) ELSE NULL END,
    'product', CASE WHEN p.id IS NOT NULL THEN jsonb_build_object(
      'name', p.name,
      'description', p.description,
      'strategy', p.strategy,
      'ideal_avatar', p.ideal_avatar,
      'sales_angles', p.sales_angles,
      'brief_data', p.brief_data,
      'content_strategy', p.content_strategy
    ) ELSE NULL END,
    'campaign', CASE WHEN mc.id IS NOT NULL THEN jsonb_build_object(
      'name', mc.name,
      'objective', mc.objective,
      'performance_goal', mc.performance_goal,
      'targeting', mc.targeting,
      'creative', mc.creative,
      'ai_suggestions', mc.ai_suggestions
    ) ELSE NULL END,
    'product_dna', (
      SELECT jsonb_build_object(
        'wizard_responses', pd.wizard_responses,
        'market_research', pd.market_research,
        'content_brief', pd.content_brief,
        'strategy_recommendations', pd.strategy_recommendations
      )
      FROM product_dna pd
      WHERE pd.client_id = c.client_id
      ORDER BY pd.created_at DESC
      LIMIT 1
    )
  )
  FROM content c
  LEFT JOIN clients cl ON cl.id = c.client_id
  LEFT JOIN products p ON p.id = c.product_id
  LEFT JOIN marketing_campaigns mc ON mc.id = c.marketing_campaign_id
  WHERE c.id = p_content_id;
$$;

GRANT EXECUTE ON FUNCTION get_content_context_for_ai(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_content_context_for_ai(UUID) TO service_role;
