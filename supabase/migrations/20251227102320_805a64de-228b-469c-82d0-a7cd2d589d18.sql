-- First add unique constraint for prompts
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_ai_prompts_unique 
ON public.organization_ai_prompts (organization_id, module_key, version);

-- Create function to get module prompt
CREATE OR REPLACE FUNCTION public.get_ai_module_prompt(_org_id uuid, _module_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT prompt_config
  FROM public.organization_ai_prompts
  WHERE organization_id = _org_id 
    AND module_key = _module_key 
    AND is_active = true
  ORDER BY version DESC
  LIMIT 1;
$$;

-- Function to initialize default prompts for an organization
CREATE OR REPLACE FUNCTION public.init_ai_prompts_for_org(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- BOARD MODULES
  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'board.cards.ai', 
  '{"role": "board_ai_card_analyst", "task": "Analyze a board card and recommend next actions.", "input": {"card": {}, "current_state": "", "assigned_roles": [], "timestamps": {}, "comments": []}, "output_format": {"risk_level": "low | medium | high", "delay_probability": 0, "recommended_next_state": "", "recommended_actions": [], "reasoning": [], "confidence": 0}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'board.states.ai',
  '{"role": "board_ai_state_optimizer", "task": "Analyze board states and detect inefficiencies.", "input": {"states": [], "cards_per_state": {}, "avg_time_per_state": {}}, "output_format": {"problematic_states": [], "recommendations": [], "impact_estimation": "", "confidence": 0}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'board.flows.ai',
  '{"role": "board_ai_flow_strategist", "task": "Analyze the full board flow and suggest optimizations.", "input": {"states_order": [], "transitions": [], "bottlenecks": []}, "output_format": {"flow_issues": [], "automation_suggestions": [], "expected_improvement": "", "confidence": 0}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;

  -- CONTENT MODULES
  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'content.script.ai',
  '{"role": "ugc_script_strategist", "task": "Generate or analyze a video script based on structured inputs.", "input": {"product": {}, "avatar": {}, "hooks_count": 0, "objective": "", "angle": "", "stage": ""}, "output_format": {"creator_block": {}, "editor_block": {}, "strategist_block": {}, "trafficker_block": {}, "designer_block": {}, "admin_block": {}}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'content.editor.ai',
  '{"role": "ugc_video_editor_ai", "task": "Optimize editing structure and storytelling rhythm.", "input": {"script": {}, "platform": "", "duration": ""}, "output_format": {"editing_notes": [], "scene_breakdown": [], "subtitle_style": "", "confidence": 0}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'content.strategist.ai',
  '{"role": "ugc_content_strategist", "task": "Analyze funnel position and conversion hypothesis.", "input": {"product": {}, "funnel_stage": "", "target_audience": {}, "previous_content_performance": []}, "output_format": {"funnel_analysis": {}, "conversion_hypothesis": [], "recommended_angles": [], "kpi_predictions": {}, "confidence": 0}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'content.designer.ai',
  '{"role": "ugc_visual_designer_ai", "task": "Generate visual guidelines and thumbnail concepts.", "input": {"script": {}, "brand_guidelines": {}, "platform": "", "content_type": ""}, "output_format": {"color_palette": [], "typography_suggestions": [], "thumbnail_concepts": [], "visual_style": "", "confidence": 0}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'content.trafficker.ai',
  '{"role": "ugc_trafficker_ai", "task": "Generate ad copies, targeting suggestions, and KPI predictions.", "input": {"script": {}, "product": {}, "platform": "", "budget": 0, "objective": ""}, "output_format": {"primary_text_variations": [], "headlines": [], "targeting_suggestions": {}, "expected_kpis": {}, "confidence": 0}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'content.admin.ai',
  '{"role": "ugc_project_manager_ai", "task": "Operational management, timeline tracking, and resource allocation.", "input": {"content": {}, "team": [], "deadlines": {}, "blockers": []}, "output_format": {"timeline_status": "", "risk_alerts": [], "resource_suggestions": [], "next_actions": [], "confidence": 0}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;

  -- UP MODULES
  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'up.events.ai',
  '{"role": "gamification_event_detector", "task": "Detect events that should trigger point awards.", "input": {"content": {}, "user_actions": [], "timestamps": {}}, "output_format": {"detected_events": [], "point_recommendations": [], "confidence": 0}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'up.quality.ai',
  '{"role": "gamification_quality_ai", "task": "Evaluate content quality for gamification scoring.", "input": {"content": {}, "history": {}, "corrections": 0}, "output_format": {"quality_score": 0, "strengths": [], "improvements": [], "recommended_bonus": 0}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'up.recommendations.ai',
  '{"role": "gamification_quest_generator", "task": "Generate personalized quests and challenges for users.", "input": {"user_stats": {}, "role": "", "current_level": "", "completed_quests": []}, "output_format": {"suggested_quests": [], "difficulty_rating": "", "expected_engagement": 0, "confidence": 0}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organization_ai_prompts (organization_id, module_key, prompt_config, is_active, version)
  VALUES (_org_id, 'up.antifraud.ai',
  '{"role": "gamification_antifraud_ai", "task": "Detect suspicious patterns and potential abuse in gamification.", "input": {"user_activity": [], "point_history": [], "login_patterns": []}, "output_format": {"risk_score": 0, "suspicious_patterns": [], "recommended_actions": [], "confidence": 0}}'::jsonb, true, 1)
  ON CONFLICT DO NOTHING;
END;
$$;