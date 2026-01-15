-- Actualizar la función calculate_up_level para usar los umbrales correctos de up_settings
CREATE OR REPLACE FUNCTION public.calculate_up_level(points INTEGER)
RETURNS TEXT AS $$
DECLARE
  thresholds JSONB;
BEGIN
  -- Obtener umbrales de la tabla up_settings
  SELECT value INTO thresholds FROM public.up_settings WHERE key = 'level_thresholds';
  
  -- Usar valores por defecto si no existen
  IF thresholds IS NULL THEN
    thresholds := '{"bronze": 0, "silver": 500, "gold": 800, "diamond": 1200}'::jsonb;
  END IF;
  
  -- Calcular nivel basado en los umbrales
  IF points >= (thresholds->>'diamond')::integer THEN
    RETURN 'diamond';
  ELSIF points >= (thresholds->>'gold')::integer THEN
    RETURN 'gold';
  ELSIF points >= (thresholds->>'silver')::integer THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Recalcular todos los niveles de creadores basándose en los puntos actuales
UPDATE public.up_creadores_totals
SET current_level = public.calculate_up_level(total_points),
    updated_at = now();

-- Recalcular todos los niveles de editores basándose en los puntos actuales
UPDATE public.up_editores_totals
SET current_level = public.calculate_up_level(total_points),
    updated_at = now();