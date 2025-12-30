-- Drop previously created policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Org users can manage their org assignments" ON public.live_hour_assignments;
  DROP POLICY IF EXISTS "Users can view relevant flags" ON public.live_feature_flags;
  DROP POLICY IF EXISTS "Org managers can manage org flags" ON public.live_feature_flags;
  DROP POLICY IF EXISTS "Org users can view their packages" ON public.live_packages;
  DROP POLICY IF EXISTS "Org managers can manage packages" ON public.live_packages;
  DROP POLICY IF EXISTS "Org users can view their logs" ON public.live_usage_logs;
END $$;

CREATE POLICY "Org users can manage their org assignments" ON public.live_hour_assignments
FOR ALL USING (
  organization_id IN (
    SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view relevant flags" ON public.live_feature_flags
FOR SELECT USING (
  flag_type = 'platform' OR
  (flag_type = 'organization' AND flag_id::uuid IN (
    SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
  )) OR
  (flag_type = 'client' AND flag_id::uuid IN (
    SELECT cu.client_id FROM client_users cu WHERE cu.user_id = auth.uid()
  ))
);

-- Use text cast to avoid enum comparison issues
CREATE POLICY "Org managers can manage org flags" ON public.live_feature_flags
FOR ALL USING (
  flag_type = 'organization' AND flag_id::uuid IN (
    SELECT om.organization_id FROM organization_members om 
    WHERE om.user_id = auth.uid() AND om.role::text IN ('admin', 'strategist')
  )
);

CREATE POLICY "Org users can view their packages" ON public.live_packages
FOR SELECT USING (
  organization_id IN (
    SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Org managers can manage packages" ON public.live_packages
FOR ALL USING (
  organization_id IN (
    SELECT om.organization_id FROM organization_members om 
    WHERE om.user_id = auth.uid() AND om.role::text IN ('admin', 'strategist')
  )
);

CREATE POLICY "Org users can view their logs" ON public.live_usage_logs
FOR SELECT USING (
  organization_id IN (
    SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
  )
);

-- Fix consume_live_hours function
CREATE OR REPLACE FUNCTION public.consume_live_hours(
  p_event_id UUID,
  p_client_id UUID,
  p_hours_used NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_available NUMERIC;
  v_assignment_id UUID;
  v_org_id UUID;
BEGIN
  SELECT id, available_hours INTO v_wallet_id, v_available
  FROM live_hour_wallets
  WHERE owner_type = 'client' AND owner_id = p_client_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Client wallet not found';
  END IF;

  IF v_available < p_hours_used THEN
    RAISE EXCEPTION 'Insufficient hours available';
  END IF;

  UPDATE live_hour_wallets
  SET 
    available_hours = available_hours - p_hours_used,
    used_hours = used_hours + p_hours_used,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  SELECT id, organization_id INTO v_assignment_id, v_org_id
  FROM live_hour_assignments
  WHERE client_id = p_client_id AND hours_remaining > 0
  ORDER BY expires_at ASC NULLS LAST, created_at ASC
  LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    UPDATE live_hour_assignments
    SET hours_remaining = GREATEST(0, hours_remaining - p_hours_used)
    WHERE id = v_assignment_id;
  END IF;

  INSERT INTO live_usage_logs (
    event_id, client_id, organization_id, hours_consumed, action
  ) VALUES (
    p_event_id, p_client_id, v_org_id, p_hours_used, 'consume'
  );

  RETURN TRUE;
END;
$$;