-- =====================================================
-- TALENT SYSTEM: Database Schema Extensions
-- =====================================================

-- 1. Extend profiles with performance & AI metadata
-- =====================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS quality_score_avg NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reliability_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS velocity_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_recommended_level TEXT DEFAULT 'junior' CHECK (ai_recommended_level IN ('junior', 'pro', 'elite')),
ADD COLUMN IF NOT EXISTS ai_risk_flag TEXT DEFAULT 'none' CHECK (ai_risk_flag IN ('none', 'warning', 'high'));

-- 2. Extend organization_members with ambassador_level & visibility
-- =====================================================
ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS ambassador_level TEXT DEFAULT 'none' CHECK (ambassador_level IN ('none', 'bronze', 'silver', 'gold')),
ADD COLUMN IF NOT EXISTS visibility_scope TEXT DEFAULT 'org_only' CHECK (visibility_scope IN ('public', 'org_only', 'private'));

-- 3. Extend content with AI tracking fields
-- =====================================================
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS ai_assignment_reason TEXT,
ADD COLUMN IF NOT EXISTS ai_quality_score NUMERIC,
ADD COLUMN IF NOT EXISTS ai_delay_risk TEXT DEFAULT 'none' CHECK (ai_delay_risk IN ('none', 'low', 'medium', 'high'));

-- 4. Create talent_performance_history table for tracking over time
-- =====================================================
CREATE TABLE IF NOT EXISTS public.talent_performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quality_score NUMERIC,
  reliability_score NUMERIC,
  velocity_score NUMERIC,
  active_tasks_count INTEGER DEFAULT 0,
  completed_tasks_count INTEGER DEFAULT 0,
  on_time_count INTEGER DEFAULT 0,
  ai_level TEXT,
  ai_risk_flag TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on talent_performance_history
ALTER TABLE public.talent_performance_history ENABLE ROW LEVEL SECURITY;

-- Policies for talent_performance_history
CREATE POLICY "Org members can view their org's talent history"
  ON public.talent_performance_history
  FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage talent history"
  ON public.talent_performance_history
  FOR ALL
  USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- 5. Create talent_ai_recommendations table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.talent_ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('level_up', 'level_down', 'pause_assignments', 'make_ambassador', 'increase_load', 'reduce_load')),
  reason TEXT NOT NULL,
  confidence NUMERIC,
  ai_model TEXT,
  is_actioned BOOLEAN DEFAULT false,
  actioned_by UUID,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- Enable RLS on talent_ai_recommendations
ALTER TABLE public.talent_ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies for talent_ai_recommendations
CREATE POLICY "Org members can view their org's recommendations"
  ON public.talent_ai_recommendations
  FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage recommendations"
  ON public.talent_ai_recommendations
  FOR ALL
  USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- 6. Create improved get_best_available_editor function with AI context
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_best_available_editor_v2(
  p_organization_id UUID,
  p_content_type TEXT DEFAULT NULL,
  p_deadline TIMESTAMPTZ DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS TABLE (
  editor_id UUID,
  full_name TEXT,
  quality_score NUMERIC,
  reliability_score NUMERIC,
  active_tasks INTEGER,
  recommendation_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as editor_id,
    p.full_name,
    COALESCE(p.quality_score_avg, 5.0) as quality_score,
    COALESCE(p.reliability_score, 
      CASE 
        WHEN COALESCE(p.editor_completed_count, 0) = 0 THEN 0.5
        ELSE COALESCE(p.editor_on_time_count, 0)::numeric / NULLIF(p.editor_completed_count, 0)
      END
    ) as reliability_score,
    (
      SELECT COUNT(*)::INTEGER
      FROM content c 
      WHERE c.editor_id = p.id 
      AND c.organization_id = p_organization_id
      AND c.status IN ('recorded', 'editing', 'review', 'issue')
    ) as active_tasks,
    -- Composite score calculation
    (
      COALESCE(p.quality_score_avg, 5.0) * 0.3 +
      COALESCE(p.reliability_score, 0.5) * 10 * 0.3 +
      COALESCE(p.velocity_score, 5.0) * 0.2 +
      (10 - LEAST((
        SELECT COUNT(*)
        FROM content c 
        WHERE c.editor_id = p.id 
        AND c.organization_id = p_organization_id
        AND c.status IN ('recorded', 'editing', 'review', 'issue')
      ), 10)) * 0.2
    ) as recommendation_score
  FROM profiles p
  INNER JOIN organization_members om ON p.id = om.user_id
  INNER JOIN organization_member_roles omr ON p.id = omr.user_id AND omr.organization_id = p_organization_id
  WHERE om.organization_id = p_organization_id
  AND omr.role = 'editor'
  AND COALESCE(p.is_active, true) = true
  AND COALESCE(p.ai_risk_flag, 'none') != 'high'
  ORDER BY recommendation_score DESC
  LIMIT 10;
END;
$$;

-- 7. Function to update talent performance scores
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_talent_performance_scores(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_completed INTEGER;
  v_on_time INTEGER;
  v_avg_quality NUMERIC;
  v_velocity NUMERIC;
BEGIN
  -- Get editor stats
  SELECT 
    COALESCE(editor_completed_count, 0),
    COALESCE(editor_on_time_count, 0)
  INTO v_total_completed, v_on_time
  FROM profiles
  WHERE id = p_user_id;
  
  -- Calculate reliability (on-time ratio * 10)
  -- Calculate avg quality from up_quality_scores
  SELECT AVG(score) INTO v_avg_quality
  FROM up_quality_scores uqs
  INNER JOIN content c ON uqs.content_id = c.id
  WHERE (c.creator_id = p_user_id OR c.editor_id = p_user_id)
  AND c.organization_id = p_organization_id
  AND uqs.evaluated_at > now() - interval '90 days';
  
  -- Update profile
  UPDATE profiles
  SET 
    quality_score_avg = COALESCE(v_avg_quality, quality_score_avg, 0),
    reliability_score = CASE 
      WHEN v_total_completed = 0 THEN 0
      ELSE (v_on_time::NUMERIC / v_total_completed) * 10
    END,
    updated_at = now()
  WHERE id = p_user_id;
  
  -- Log to history
  INSERT INTO talent_performance_history (
    user_id, organization_id, quality_score, reliability_score,
    completed_tasks_count, on_time_count
  )
  VALUES (
    p_user_id, p_organization_id, v_avg_quality,
    CASE WHEN v_total_completed = 0 THEN 0 ELSE (v_on_time::NUMERIC / v_total_completed) * 10 END,
    v_total_completed, v_on_time
  );
END;
$$;

-- 8. Add indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_talent_performance_history_user_org 
  ON public.talent_performance_history(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_talent_performance_history_recorded 
  ON public.talent_performance_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_talent_ai_recommendations_user_org 
  ON public.talent_ai_recommendations(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_talent_ai_recommendations_type 
  ON public.talent_ai_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_profiles_ai_level 
  ON public.profiles(ai_recommended_level);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active 
  ON public.profiles(is_active);

-- Enable realtime for talent tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.talent_ai_recommendations;