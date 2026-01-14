-- =====================================================
-- UP SYSTEM V2: Funciones y Triggers
-- =====================================================

-- Función para calcular nivel basado en puntos
CREATE OR REPLACE FUNCTION public.calculate_up_level(points INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF points >= 500 THEN RETURN 'diamond';
  ELSIF points >= 250 THEN RETURN 'gold';
  ELSIF points >= 100 THEN RETURN 'silver';
  ELSE RETURN 'bronze';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para actualizar totales de creadores
CREATE OR REPLACE FUNCTION public.update_up_creadores_totals()
RETURNS TRIGGER AS $$
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
    total_deliveries = up_creadores_totals.total_deliveries + CASE WHEN NEW.event_type IN ('delivery_on_time', 'delivery_day3') THEN 1 ELSE 0 END,
    on_time_deliveries = up_creadores_totals.on_time_deliveries + CASE WHEN NEW.event_type = 'delivery_on_time' THEN 1 ELSE 0 END,
    late_deliveries = up_creadores_totals.late_deliveries + CASE WHEN NEW.event_type IN ('late_day4', 'late_day5') THEN 1 ELSE 0 END,
    total_issues = up_creadores_totals.total_issues + CASE WHEN NEW.event_type = 'issue_penalty' THEN 1 ELSE 0 END,
    clean_approvals = up_creadores_totals.clean_approvals + CASE WHEN NEW.event_type = 'clean_approval_bonus' THEN 1 ELSE 0 END,
    reassignments = up_creadores_totals.reassignments + CASE WHEN NEW.event_type = 'reassignment' THEN 1 ELSE 0 END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para actualizar totales de editores
CREATE OR REPLACE FUNCTION public.update_up_editores_totals()
RETURNS TRIGGER AS $$
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
    total_deliveries = up_editores_totals.total_deliveries + CASE WHEN NEW.event_type IN ('delivery_on_time', 'delivery_day2') THEN 1 ELSE 0 END,
    on_time_deliveries = up_editores_totals.on_time_deliveries + CASE WHEN NEW.event_type = 'delivery_on_time' THEN 1 ELSE 0 END,
    late_deliveries = up_editores_totals.late_deliveries + CASE WHEN NEW.event_type IN ('late_day3', 'late_day4') THEN 1 ELSE 0 END,
    total_issues = up_editores_totals.total_issues + CASE WHEN NEW.event_type = 'issue_penalty' THEN 1 ELSE 0 END,
    clean_approvals = up_editores_totals.clean_approvals + CASE WHEN NEW.event_type = 'clean_approval_bonus' THEN 1 ELSE 0 END,
    reassignments = up_editores_totals.reassignments + CASE WHEN NEW.event_type = 'reassignment' THEN 1 ELSE 0 END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers para actualizar totales automáticamente
DROP TRIGGER IF EXISTS trigger_update_up_creadores_totals ON public.up_creadores;
DROP TRIGGER IF EXISTS trigger_update_up_editores_totals ON public.up_editores;

CREATE TRIGGER trigger_update_up_creadores_totals
  AFTER INSERT ON public.up_creadores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_up_creadores_totals();

CREATE TRIGGER trigger_update_up_editores_totals
  AFTER INSERT ON public.up_editores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_up_editores_totals();