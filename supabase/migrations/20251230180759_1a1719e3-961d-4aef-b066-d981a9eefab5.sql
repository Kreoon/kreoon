-- Drop the function to recreate it correctly
DROP FUNCTION IF EXISTS public.consume_live_hours(UUID);

-- Function to consume live hours after an event ends (fixed)
CREATE OR REPLACE FUNCTION public.consume_live_hours(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_wallet RECORD;
  v_duration_minutes NUMERIC;
  v_hours_to_consume NUMERIC;
  v_assignment_id UUID;
BEGIN
  -- Get event details
  SELECT * INTO v_event
  FROM streaming_events
  WHERE id = p_event_id;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  IF v_event.started_at IS NULL OR v_event.ended_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event must have start and end times');
  END IF;

  -- Calculate duration in hours (minimum 0.5 hours)
  v_duration_minutes := EXTRACT(EPOCH FROM (v_event.ended_at - v_event.started_at)) / 60;
  v_hours_to_consume := GREATEST(0.5, CEIL(v_duration_minutes / 30) * 0.5);

  -- Get client wallet
  SELECT * INTO v_wallet
  FROM live_hour_wallets
  WHERE owner_type = 'client' AND owner_id = v_event.client_id::TEXT;

  IF v_wallet IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client wallet not found');
  END IF;

  -- Update wallet - consume hours
  UPDATE live_hour_wallets
  SET 
    used_hours = used_hours + v_hours_to_consume,
    available_hours = GREATEST(0, available_hours - v_hours_to_consume),
    reserved_hours = GREATEST(0, reserved_hours - v_hours_to_consume),
    updated_at = NOW()
  WHERE id = v_wallet.id;

  -- Log the usage
  INSERT INTO live_usage_logs (
    event_id,
    wallet_id,
    client_id,
    hours_consumed,
    started_at,
    ended_at,
    duration_minutes,
    logged_by
  ) VALUES (
    p_event_id,
    v_wallet.id,
    v_event.client_id,
    v_hours_to_consume,
    v_event.started_at,
    v_event.ended_at,
    v_duration_minutes,
    auth.uid()
  );

  -- Find the oldest assignment with remaining hours
  SELECT id INTO v_assignment_id
  FROM live_hour_assignments
  WHERE client_id = v_event.client_id
    AND hours_remaining > 0
  ORDER BY expires_at NULLS LAST, assigned_at
  LIMIT 1;

  -- Update that specific assignment
  IF v_assignment_id IS NOT NULL THEN
    UPDATE live_hour_assignments
    SET hours_remaining = GREATEST(0, hours_remaining - v_hours_to_consume)
    WHERE id = v_assignment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'hours_consumed', v_hours_to_consume,
    'duration_minutes', v_duration_minutes,
    'remaining_hours', (SELECT available_hours FROM live_hour_wallets WHERE id = v_wallet.id)
  );
END;
$$;

-- Insert platform feature flag if not exists
INSERT INTO live_feature_flags (flag_type, flag_id, is_enabled, enabled_at)
VALUES ('platform', 'platform', true, NOW())
ON CONFLICT (flag_type, flag_id) DO NOTHING;