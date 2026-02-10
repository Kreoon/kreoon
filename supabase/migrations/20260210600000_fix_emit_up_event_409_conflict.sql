-- Fix: 409 Conflict error when changing content status
-- Root cause: Two triggers (trigger_up_event_on_status, trigger_up_events_on_content)
-- both fire on content UPDATE and call emit_up_event() with overlapping event types
-- (content_delivered, content_approved, correction_requested).
-- Both INSERTs hit the dedup unique index:
--   idx_up_events_dedup ON up_events (user_id, content_id, event_type_key) WHERE content_id IS NOT NULL
-- Second INSERT fails with 409 (unique constraint violation).
--
-- Fix: Add ON CONFLICT DO NOTHING to both emit_up_event overloads.
-- Duplicate events are silently skipped, no points double-counted.

-- Overload 1: 8-param version (called by emit_up_event_on_status_change trigger)
CREATE OR REPLACE FUNCTION public.emit_up_event(
  _org_id uuid,
  _user_id uuid,
  _event_type_key text,
  _content_id uuid DEFAULT NULL::uuid,
  _event_data jsonb DEFAULT '{}'::jsonb,
  _ai_inferred boolean DEFAULT false,
  _ai_confidence numeric DEFAULT NULL::numeric,
  _ai_evidence jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_id uuid;
  rule_rec RECORD;
  total_points integer := 0;
  can_apply boolean;
  events_today integer;
  events_week integer;
  events_content integer;
BEGIN
  -- Insert the event (skip if duplicate per dedup index)
  INSERT INTO public.up_events (
    organization_id, user_id, content_id, event_type_key,
    event_data, ai_inferred, ai_confidence, ai_evidence
  )
  VALUES (
    _org_id, _user_id, _content_id, _event_type_key,
    _event_data, _ai_inferred, _ai_confidence, _ai_evidence
  )
  ON CONFLICT (user_id, content_id, event_type_key) WHERE content_id IS NOT NULL DO NOTHING
  RETURNING id INTO event_id;

  -- If event was a duplicate, skip processing
  IF event_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Find matching rules and calculate points
  FOR rule_rec IN
    SELECT * FROM public.up_rules
    WHERE organization_id = _org_id
      AND event_type_key = _event_type_key
      AND is_active = true
    ORDER BY priority DESC
  LOOP
    can_apply := true;

    -- Check daily limit
    IF rule_rec.max_per_day IS NOT NULL THEN
      SELECT COUNT(*) INTO events_today
      FROM public.up_events
      WHERE user_id = _user_id
        AND rule_id = rule_rec.id
        AND created_at > now() - interval '1 day';

      IF events_today >= rule_rec.max_per_day THEN
        can_apply := false;
      END IF;
    END IF;

    -- Check weekly limit
    IF can_apply AND rule_rec.max_per_week IS NOT NULL THEN
      SELECT COUNT(*) INTO events_week
      FROM public.up_events
      WHERE user_id = _user_id
        AND rule_id = rule_rec.id
        AND created_at > now() - interval '7 days';

      IF events_week >= rule_rec.max_per_week THEN
        can_apply := false;
      END IF;
    END IF;

    -- Check per-content limit
    IF can_apply AND rule_rec.max_per_content IS NOT NULL AND _content_id IS NOT NULL THEN
      SELECT COUNT(*) INTO events_content
      FROM public.up_events
      WHERE user_id = _user_id
        AND content_id = _content_id
        AND rule_id = rule_rec.id;

      IF events_content >= rule_rec.max_per_content THEN
        can_apply := false;
      END IF;
    END IF;

    -- Apply rule if all checks pass
    IF can_apply THEN
      total_points := total_points + rule_rec.points;

      -- Update event with rule info
      UPDATE public.up_events
      SET rule_id = rule_rec.id, points_awarded = rule_rec.points, processed_at = now()
      WHERE id = event_id;

      -- Add to point_transactions for backward compatibility
      INSERT INTO public.point_transactions (user_id, content_id, transaction_type, points, description)
      VALUES (
        _user_id,
        _content_id,
        CASE WHEN rule_rec.points >= 0 THEN 'base_completion' ELSE 'correction_needed' END,
        rule_rec.points,
        rule_rec.name || ' (' || _event_type_key || ')'
      );

      -- Update user_points
      UPDATE public.user_points
      SET
        total_points = GREATEST(0, user_points.total_points + rule_rec.points),
        updated_at = now()
      WHERE user_points.user_id = _user_id;

      EXIT; -- Apply only first matching rule (highest priority)
    END IF;
  END LOOP;

  RETURN event_id;
END;
$function$;

-- Overload 2: 4-param version (called by trigger_emit_up_event_on_status trigger)
CREATE OR REPLACE FUNCTION public.emit_up_event(
  _event_type_key text,
  _user_id uuid,
  _content_id uuid DEFAULT NULL::uuid,
  _event_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_id uuid;
  org_id uuid;
  matched_rule RECORD;
  total_points integer := 0;
  rule_applied_id uuid;
  today_count integer;
  week_count integer;
  content_count integer;
BEGIN
  -- Get organization_id from content or user's current org
  IF _content_id IS NOT NULL THEN
    SELECT organization_id INTO org_id FROM public.content WHERE id = _content_id;
  END IF;

  IF org_id IS NULL THEN
    SELECT om.organization_id INTO org_id
    FROM public.organization_members om
    WHERE om.user_id = _user_id
    LIMIT 1;
  END IF;

  IF org_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Find matching rules for this event type
  FOR matched_rule IN
    SELECT * FROM public.up_rules
    WHERE organization_id = org_id
      AND event_type_key = _event_type_key
      AND is_active = true
    ORDER BY priority DESC
  LOOP
    -- Check daily limit
    IF matched_rule.max_per_day IS NOT NULL AND matched_rule.max_per_day > 0 THEN
      SELECT COUNT(*) INTO today_count
      FROM public.up_events
      WHERE user_id = _user_id
        AND rule_id = matched_rule.id
        AND created_at >= CURRENT_DATE;

      IF today_count >= matched_rule.max_per_day THEN
        CONTINUE;
      END IF;
    END IF;

    -- Check weekly limit
    IF matched_rule.max_per_week IS NOT NULL AND matched_rule.max_per_week > 0 THEN
      SELECT COUNT(*) INTO week_count
      FROM public.up_events
      WHERE user_id = _user_id
        AND rule_id = matched_rule.id
        AND created_at >= date_trunc('week', CURRENT_DATE);

      IF week_count >= matched_rule.max_per_week THEN
        CONTINUE;
      END IF;
    END IF;

    -- Check per-content limit
    IF _content_id IS NOT NULL AND matched_rule.max_per_content IS NOT NULL AND matched_rule.max_per_content > 0 THEN
      SELECT COUNT(*) INTO content_count
      FROM public.up_events
      WHERE user_id = _user_id
        AND rule_id = matched_rule.id
        AND content_id = _content_id;

      IF content_count >= matched_rule.max_per_content THEN
        CONTINUE;
      END IF;
    END IF;

    -- Apply points (negative for penalties)
    total_points := CASE WHEN matched_rule.is_penalty THEN -matched_rule.points ELSE matched_rule.points END;
    rule_applied_id := matched_rule.id;
    EXIT; -- Use first matching rule only
  END LOOP;

  -- Insert the event (skip if duplicate per dedup index)
  INSERT INTO public.up_events (
    organization_id,
    user_id,
    content_id,
    event_type_key,
    event_data,
    points_awarded,
    rule_id,
    ai_inferred,
    ai_confidence
  ) VALUES (
    org_id,
    _user_id,
    _content_id,
    _event_type_key,
    _event_data,
    COALESCE(total_points, 0),
    rule_applied_id,
    false,
    NULL
  )
  ON CONFLICT (user_id, content_id, event_type_key) WHERE content_id IS NOT NULL DO NOTHING
  RETURNING id INTO event_id;

  -- If event was a duplicate, skip point updates
  IF event_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Update user points if points were awarded
  IF total_points != 0 THEN
    INSERT INTO public.point_transactions (user_id, content_id, transaction_type, points, description)
    VALUES (_user_id, _content_id, 'manual_adjustment'::point_transaction_type, total_points, 'UP Engine: ' || _event_type_key);

    UPDATE public.user_points
    SET
      total_points = GREATEST(0, total_points + total_points),
      current_level = public.calculate_up_level(GREATEST(0, user_points.total_points + total_points)),
      updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  RETURN event_id;
END;
$function$;
