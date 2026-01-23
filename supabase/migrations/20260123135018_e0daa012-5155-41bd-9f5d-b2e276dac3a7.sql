-- Fix trigger functions to use correct event types and remove conflicting trigger

-- First, drop the problematic trigger function that calls a non-existent overload
DROP FUNCTION IF EXISTS public.trigger_update_up_creadores_totals() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_update_up_editores_totals() CASCADE;

-- Recreate the update_up_creadores_totals function with correct event types
CREATE OR REPLACE FUNCTION public.update_up_creadores_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_points INTEGER;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO v_total_points
  FROM public.up_creadores
  WHERE user_id = NEW.user_id;

  INSERT INTO public.up_creadores_totals (user_id, organization_id, total_points, current_level, updated_at)
  VALUES (
    NEW.user_id,
    NEW.organization_id,
    v_total_points,
    public.calculate_up_level(v_total_points),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = v_total_points,
    current_level = public.calculate_up_level(v_total_points),
    total_deliveries = up_creadores_totals.total_deliveries + CASE WHEN NEW.event_type IN ('early_delivery', 'on_time_delivery', 'slight_delay') THEN 1 ELSE 0 END,
    on_time_deliveries = up_creadores_totals.on_time_deliveries + CASE WHEN NEW.event_type IN ('early_delivery', 'on_time_delivery') THEN 1 ELSE 0 END,
    late_deliveries = up_creadores_totals.late_deliveries + CASE WHEN NEW.event_type = 'late_delivery' THEN 1 ELSE 0 END,
    total_issues = up_creadores_totals.total_issues + CASE WHEN NEW.event_type = 'issue_penalty' THEN 1 ELSE 0 END,
    clean_approvals = up_creadores_totals.clean_approvals + CASE WHEN NEW.event_type = 'clean_approval_bonus' THEN 1 ELSE 0 END,
    reassignments = up_creadores_totals.reassignments + CASE WHEN NEW.event_type = 'reassignment' THEN 1 ELSE 0 END,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- Recreate the update_up_editores_totals function with correct event types
CREATE OR REPLACE FUNCTION public.update_up_editores_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_points INTEGER;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO v_total_points
  FROM public.up_editores
  WHERE user_id = NEW.user_id;

  INSERT INTO public.up_editores_totals (user_id, organization_id, total_points, current_level, updated_at)
  VALUES (
    NEW.user_id,
    NEW.organization_id,
    v_total_points,
    public.calculate_up_level(v_total_points),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = v_total_points,
    current_level = public.calculate_up_level(v_total_points),
    total_deliveries = up_editores_totals.total_deliveries + CASE WHEN NEW.event_type IN ('early_delivery', 'on_time_delivery', 'slight_delay') THEN 1 ELSE 0 END,
    on_time_deliveries = up_editores_totals.on_time_deliveries + CASE WHEN NEW.event_type IN ('early_delivery', 'on_time_delivery') THEN 1 ELSE 0 END,
    late_deliveries = up_editores_totals.late_deliveries + CASE WHEN NEW.event_type = 'late_delivery' THEN 1 ELSE 0 END,
    total_issues = up_editores_totals.total_issues + CASE WHEN NEW.event_type = 'issue_penalty' THEN 1 ELSE 0 END,
    clean_approvals = up_editores_totals.clean_approvals + CASE WHEN NEW.event_type = 'clean_approval_bonus' THEN 1 ELSE 0 END,
    reassignments = up_editores_totals.reassignments + CASE WHEN NEW.event_type = 'reassignment' THEN 1 ELSE 0 END,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_up_creadores_totals_trigger ON public.up_creadores;
DROP TRIGGER IF EXISTS update_up_editores_totals_trigger ON public.up_editores;

-- Create triggers to call the functions on INSERT
CREATE TRIGGER update_up_creadores_totals_trigger
  AFTER INSERT ON public.up_creadores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_up_creadores_totals();

CREATE TRIGGER update_up_editores_totals_trigger
  AFTER INSERT ON public.up_editores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_up_editores_totals();