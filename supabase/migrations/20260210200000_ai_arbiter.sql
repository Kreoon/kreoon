-- =============================================================
-- AI ARBITER — Intelligent Gamification Engine
-- Extends: Unified Reputation System + Role Weight Normalization
-- 3 Functions: Wizard (config), Judge (arbitration), Auditor (fraud)
-- =============================================================

-- 1. TABLE: up_chronometer_pauses
-- Tracks when a content delivery timer is paused (e.g., client review delay)
CREATE TABLE IF NOT EXISTS public.up_chronometer_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  role TEXT NOT NULL,
  user_id UUID NOT NULL,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resumed_at TIMESTAMPTZ,
  pause_reason TEXT NOT NULL,
  pause_source TEXT DEFAULT 'auto',
  paused_hours NUMERIC(8,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_chrono_content ON public.up_chronometer_pauses(content_id, role);
CREATE INDEX IF NOT EXISTS idx_chrono_active ON public.up_chronometer_pauses(content_id) WHERE resumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chrono_org ON public.up_chronometer_pauses(organization_id);

ALTER TABLE public.up_chronometer_pauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view chronometer pauses"
  ON public.up_chronometer_pauses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = up_chronometer_pauses.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage chronometer pauses"
  ON public.up_chronometer_pauses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = up_chronometer_pauses.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = up_chronometer_pauses.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.up_chronometer_pauses TO authenticated;


-- 2. TABLE: up_client_trust_scores
CREATE TABLE IF NOT EXISTS public.up_client_trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  total_reviews INTEGER DEFAULT 0,
  avg_review_hours NUMERIC(8,2) DEFAULT 0,
  rejection_rate NUMERIC(5,2) DEFAULT 0,
  revision_rounds_avg NUMERIC(5,2) DEFAULT 0,
  brief_clarity_score NUMERIC(5,2) DEFAULT 0,
  trust_level TEXT DEFAULT 'neutral',
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_trust_org ON public.up_client_trust_scores(organization_id);

ALTER TABLE public.up_client_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view client trust"
  ON public.up_client_trust_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = up_client_trust_scores.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage client trust"
  ON public.up_client_trust_scores FOR ALL
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.up_client_trust_scores TO authenticated;


-- 3. TABLE: up_arbiter_log
CREATE TABLE IF NOT EXISTS public.up_arbiter_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'arbiter',
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'applied',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arbiter_log_org ON public.up_arbiter_log(organization_id, created_at DESC);

ALTER TABLE public.up_arbiter_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view arbiter log"
  ON public.up_arbiter_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = up_arbiter_log.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage arbiter log"
  ON public.up_arbiter_log FOR ALL
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT ON public.up_arbiter_log TO authenticated;


-- 4. ALTER up_ai_config: add arbiter toggles
ALTER TABLE public.up_ai_config
  ADD COLUMN IF NOT EXISTS arbiter_wizard_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS arbiter_judge_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS arbiter_auditor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_pause_review_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS client_trust_enabled BOOLEAN DEFAULT false;


-- 5. DEDUP INDEX on up_events (prevent race-condition duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_up_events_dedup
  ON public.up_events(user_id, content_id, event_type_key)
  WHERE content_id IS NOT NULL;


-- 6. FUNCTION: get_content_paused_hours
-- Returns total paused hours for a content+role combination
CREATE OR REPLACE FUNCTION public.get_content_paused_hours(
  p_content_id UUID,
  p_role TEXT
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN cp.resumed_at IS NOT NULL THEN cp.paused_hours
      ELSE EXTRACT(EPOCH FROM (now() - cp.paused_at)) / 3600.0
    END
  ), 0)::NUMERIC
  FROM up_chronometer_pauses cp
  WHERE cp.content_id = p_content_id
    AND cp.role = p_role;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_paused_hours(UUID, TEXT) TO authenticated;


-- 7. FUNCTION: check_and_pause_chronometer
-- Called when content enters a "waiting for client" state
CREATE OR REPLACE FUNCTION public.check_and_pause_chronometer(
  p_content_id UUID,
  p_organization_id UUID,
  p_role TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'client_review_delay'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_creator_id UUID;
  v_editor_id UUID;
BEGIN
  -- Check if there's already an active pause for this content
  IF EXISTS (
    SELECT 1 FROM up_chronometer_pauses
    WHERE content_id = p_content_id AND resumed_at IS NULL
  ) THEN
    RETURN; -- Already paused
  END IF;

  -- If specific role/user provided, pause just that
  IF p_role IS NOT NULL AND p_user_id IS NOT NULL THEN
    INSERT INTO up_chronometer_pauses (organization_id, content_id, role, user_id, pause_reason)
    VALUES (p_organization_id, p_content_id, p_role, p_user_id, p_reason);
    RETURN;
  END IF;

  -- Otherwise, resolve from content and pause both roles
  SELECT creator_id, editor_id INTO v_creator_id, v_editor_id
  FROM content WHERE id = p_content_id;

  IF v_creator_id IS NOT NULL THEN
    INSERT INTO up_chronometer_pauses (organization_id, content_id, role, user_id, pause_reason)
    VALUES (p_organization_id, p_content_id, 'creator', v_creator_id, p_reason)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_editor_id IS NOT NULL THEN
    INSERT INTO up_chronometer_pauses (organization_id, content_id, role, user_id, pause_reason)
    VALUES (p_organization_id, p_content_id, 'editor', v_editor_id, p_reason)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_pause_chronometer(UUID, UUID, TEXT, UUID, TEXT) TO authenticated;


-- 8. FUNCTION: resume_chronometer
-- Called when client acts (approves/rejects) — resumes all paused timers for content
CREATE OR REPLACE FUNCTION public.resume_chronometer(
  p_content_id UUID,
  p_resume_reason TEXT DEFAULT 'client_action'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE up_chronometer_pauses
  SET
    resumed_at = now(),
    paused_hours = ROUND(EXTRACT(EPOCH FROM (now() - paused_at)) / 3600.0, 2),
    metadata = metadata || jsonb_build_object('resume_reason', p_resume_reason)
  WHERE content_id = p_content_id
    AND resumed_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resume_chronometer(UUID, TEXT) TO authenticated;


-- 9. FUNCTION: refresh_client_trust_score
-- Recalculates a client's trust metrics from content history
CREATE OR REPLACE FUNCTION public.refresh_client_trust_score(
  p_org_id UUID,
  p_client_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_content INTEGER;
  v_approved INTEGER;
  v_rejected INTEGER;
  v_avg_hours NUMERIC;
  v_avg_rounds NUMERIC;
  v_trust TEXT;
BEGIN
  -- Count content items for this client
  SELECT COUNT(*) INTO v_total_content
  FROM content c
  JOIN clients cl ON cl.id = c.client_id
  WHERE cl.id = p_client_id
    AND c.organization_id = p_org_id;

  IF v_total_content = 0 THEN
    RETURN;
  END IF;

  -- Count approved vs rejected
  SELECT
    COUNT(*) FILTER (WHERE c.status = 'approved'),
    COUNT(*) FILTER (WHERE c.status = 'issue')
  INTO v_approved, v_rejected
  FROM content c
  WHERE c.client_id = p_client_id
    AND c.organization_id = p_org_id;

  -- Average review hours: time between delivered_at and approved_at (or issue_at)
  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (
      COALESCE(c.approved_at, c.updated_at) - c.delivered_at
    )) / 3600.0
  ), 0)
  INTO v_avg_hours
  FROM content c
  WHERE c.client_id = p_client_id
    AND c.organization_id = p_org_id
    AND c.delivered_at IS NOT NULL;

  -- Average revision rounds (count issue events per content)
  SELECT COALESCE(AVG(issue_count), 0) INTO v_avg_rounds
  FROM (
    SELECT c.id, COUNT(e.id) AS issue_count
    FROM content c
    LEFT JOIN up_events e ON e.content_id = c.id AND e.event_type_key = 'correction_requested'
    WHERE c.client_id = p_client_id AND c.organization_id = p_org_id
    GROUP BY c.id
  ) sub;

  -- Calculate trust level
  v_trust := CASE
    WHEN v_total_content < 3 THEN 'neutral'
    WHEN (v_rejected::NUMERIC / GREATEST(v_total_content, 1)) > 0.6 THEN 'toxic'
    WHEN (v_rejected::NUMERIC / GREATEST(v_total_content, 1)) > 0.4 THEN 'flagged'
    WHEN v_avg_hours > 72 THEN 'flagged'
    WHEN (v_approved::NUMERIC / GREATEST(v_total_content, 1)) > 0.8 AND v_avg_hours < 24 THEN 'trusted'
    ELSE 'neutral'
  END;

  INSERT INTO up_client_trust_scores (
    organization_id, client_id, total_reviews, avg_review_hours,
    rejection_rate, revision_rounds_avg, trust_level, last_calculated_at
  )
  VALUES (
    p_org_id, p_client_id, v_total_content, ROUND(v_avg_hours, 2),
    ROUND((v_rejected::NUMERIC / GREATEST(v_total_content, 1)) * 100, 2),
    ROUND(v_avg_rounds, 2), v_trust, now()
  )
  ON CONFLICT (organization_id, client_id) DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    avg_review_hours = EXCLUDED.avg_review_hours,
    rejection_rate = EXCLUDED.rejection_rate,
    revision_rounds_avg = EXCLUDED.revision_rounds_avg,
    trust_level = EXCLUDED.trust_level,
    last_calculated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_client_trust_score(UUID, UUID) TO authenticated;


-- 10. FUNCTION: get_arbiter_log
-- Paginated arbiter log for admin dashboard
CREATE OR REPLACE FUNCTION public.get_arbiter_log(
  p_org_id UUID,
  p_action_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  action_type TEXT,
  actor TEXT,
  summary TEXT,
  details JSONB,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT al.id, al.action_type, al.actor, al.summary, al.details, al.status, al.created_at
  FROM up_arbiter_log al
  WHERE al.organization_id = p_org_id
    AND (p_action_type IS NULL OR al.action_type = p_action_type)
  ORDER BY al.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_arbiter_log(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
