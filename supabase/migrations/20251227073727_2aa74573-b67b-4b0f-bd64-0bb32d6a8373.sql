-- Complete emit_up_event function for UP Engine 2.0
CREATE OR REPLACE FUNCTION public.emit_up_event(
  _event_type_key text,
  _user_id uuid,
  _content_id uuid DEFAULT NULL,
  _event_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    RAISE EXCEPTION 'No organization found for user';
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

  -- Insert the event
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
  ) RETURNING id INTO event_id;

  -- Update user points if points were awarded
  IF total_points != 0 THEN
    -- Also update the legacy point_transactions for backward compatibility
    INSERT INTO public.point_transactions (user_id, content_id, transaction_type, points, description)
    VALUES (_user_id, _content_id, 'manual_adjustment'::point_transaction_type, total_points, 'UP Engine: ' || _event_type_key);
    
    -- Update user_points totals
    UPDATE public.user_points
    SET 
      total_points = GREATEST(0, total_points + total_points),
      current_level = public.calculate_up_level(GREATEST(0, user_points.total_points + total_points)),
      updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  RETURN event_id;
END;
$$;

-- Trigger function to emit UP events on content status changes
CREATE OR REPLACE FUNCTION public.trigger_emit_up_event_on_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_data jsonb;
BEGIN
  -- Only trigger on actual status changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status AND 
     OLD.custom_status_id IS NOT DISTINCT FROM NEW.custom_status_id THEN
    RETURN NEW;
  END IF;

  event_data := jsonb_build_object(
    'old_status', OLD.status,
    'new_status', NEW.status,
    'old_custom_status_id', OLD.custom_status_id,
    'new_custom_status_id', NEW.custom_status_id,
    'title', NEW.title,
    'client_id', NEW.client_id
  );

  -- Emit event for creator on recording completion
  IF NEW.status = 'recorded' AND OLD.status != 'recorded' AND NEW.creator_id IS NOT NULL THEN
    PERFORM public.emit_up_event('content_recorded', NEW.creator_id, NEW.id, event_data);
  END IF;

  -- Emit event for editor on editing completion
  IF NEW.status = 'review' AND OLD.status = 'editing' AND NEW.editor_id IS NOT NULL THEN
    PERFORM public.emit_up_event('content_edited', NEW.editor_id, NEW.id, event_data);
  END IF;

  -- Emit event for delivery
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    IF NEW.editor_id IS NOT NULL THEN
      PERFORM public.emit_up_event('content_delivered', NEW.editor_id, NEW.id, event_data);
    END IF;
  END IF;

  -- Emit event for approval
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NEW.editor_id IS NOT NULL THEN
      PERFORM public.emit_up_event('content_approved', NEW.editor_id, NEW.id, event_data);
    END IF;
    IF NEW.creator_id IS NOT NULL THEN
      PERFORM public.emit_up_event('content_approved', NEW.creator_id, NEW.id, event_data);
    END IF;
  END IF;

  -- Emit event for corrections (issue status)
  IF NEW.status = 'issue' AND OLD.status = 'review' THEN
    IF NEW.editor_id IS NOT NULL THEN
      PERFORM public.emit_up_event('correction_requested', NEW.editor_id, NEW.id, event_data);
    END IF;
  END IF;

  -- Emit deadline missed event
  IF NEW.deadline IS NOT NULL AND NEW.deadline < now() AND 
     (OLD.deadline IS NULL OR OLD.deadline >= now()) THEN
    IF NEW.editor_id IS NOT NULL AND NEW.status NOT IN ('delivered', 'approved', 'published', 'paid') THEN
      PERFORM public.emit_up_event('deadline_missed', NEW.editor_id, NEW.id, event_data);
    END IF;
    IF NEW.creator_id IS NOT NULL AND NEW.status NOT IN ('recorded', 'editing', 'review', 'delivered', 'approved', 'published', 'paid') THEN
      PERFORM public.emit_up_event('deadline_missed', NEW.creator_id, NEW.id, event_data);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on content table
DROP TRIGGER IF EXISTS trigger_up_events_on_content ON public.content;
CREATE TRIGGER trigger_up_events_on_content
  AFTER UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_emit_up_event_on_status();

-- Create default event types for organizations
CREATE OR REPLACE FUNCTION public.create_default_up_event_types(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.up_event_types (organization_id, key, label, description, default_points, is_penalty, is_system)
  VALUES 
    (_org_id, 'content_recorded', 'Video Grabado', 'Creador completó grabación', 10, false, true),
    (_org_id, 'content_edited', 'Video Editado', 'Editor completó edición', 10, false, true),
    (_org_id, 'content_delivered', 'Contenido Entregado', 'Contenido entregado al cliente', 5, false, true),
    (_org_id, 'content_approved', 'Contenido Aprobado', 'Cliente aprobó el contenido', 5, false, true),
    (_org_id, 'correction_requested', 'Corrección Solicitada', 'Se requieren cambios', 3, true, true),
    (_org_id, 'deadline_missed', 'Deadline Vencido', 'No se cumplió el deadline', 5, true, true),
    (_org_id, 'early_delivery', 'Entrega Anticipada', 'Entrega antes del deadline', 3, false, true),
    (_org_id, 'perfect_streak', 'Racha Perfecta', 'Múltiples entregas a tiempo', 10, false, true),
    (_org_id, 'quality_bonus', 'Bonus por Calidad', 'Quality Score alto', 5, false, true),
    (_org_id, 'quest_completed', 'Misión Completada', 'Completó una misión/reto', 15, false, true)
  ON CONFLICT (organization_id, key) DO NOTHING;
END;
$$;

-- Create default rules for organizations  
CREATE OR REPLACE FUNCTION public.create_default_up_rules(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.up_rules (organization_id, name, event_type_key, points, is_penalty, applies_to_roles, max_per_content, priority, is_active)
  VALUES 
    (_org_id, 'Grabación Completada', 'content_recorded', 10, false, ARRAY['creator'], 1, 100, true),
    (_org_id, 'Edición Completada', 'content_edited', 10, false, ARRAY['editor'], 1, 100, true),
    (_org_id, 'Entrega Realizada', 'content_delivered', 5, false, ARRAY['editor'], 1, 90, true),
    (_org_id, 'Contenido Aprobado', 'content_approved', 5, false, ARRAY['creator', 'editor'], 1, 90, true),
    (_org_id, 'Corrección Requerida', 'correction_requested', 3, true, ARRAY['editor'], 3, 80, true),
    (_org_id, 'Deadline Vencido', 'deadline_missed', 5, true, ARRAY['creator', 'editor'], 1, 95, true)
  ON CONFLICT DO NOTHING;
END;
$$;