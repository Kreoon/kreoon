-- Tabla de configuración del sistema UP
CREATE TABLE public.up_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  label text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.up_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can read UP settings"
ON public.up_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage UP settings"
ON public.up_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insertar configuración inicial
INSERT INTO public.up_settings (key, value, label, description, category) VALUES
  ('level_thresholds', '{"bronze": 0, "silver": 100, "gold": 250, "diamond": 500}', 'Umbrales de Nivel', 'Puntos necesarios para alcanzar cada nivel', 'levels'),
  ('base_completion_points', '{"value": 10}', 'Puntos Base por Completar', 'Puntos otorgados al completar un contenido', 'points'),
  ('early_delivery_bonus', '{"value": 3}', 'Bono Entrega Anticipada', 'Puntos extra por entregar antes del deadline', 'points'),
  ('late_delivery_penalty', '{"value": -5}', 'Penalización Entrega Tardía', 'Puntos restados por entregar después del deadline', 'points'),
  ('correction_penalty', '{"value": -3}', 'Penalización por Corrección', 'Puntos restados cuando se requiere corrección', 'points'),
  ('perfect_streak_bonus', '{"value": 10, "streak_count": 5}', 'Bono Racha Perfecta', 'Puntos extra por racha de entregas a tiempo', 'points'),
  ('approval_bonus', '{"value": 2}', 'Bono por Aprobación', 'Puntos extra cuando contenido es aprobado sin correcciones', 'points'),
  ('viral_hook_bonus', '{"value": 5, "enabled": false}', 'Bono Hook Viral', 'Puntos extra por hooks virales (requiere habilitación manual)', 'points'),
  ('system_enabled', '{"enabled": true}', 'Sistema Habilitado', 'Activa o desactiva el sistema de puntos', 'general'),
  ('show_leaderboard_public', '{"enabled": true}', 'Leaderboard Público', 'Mostrar leaderboard a todos los usuarios', 'display');

-- Función para actualizar el trigger de cálculo de puntos con valores configurables
CREATE OR REPLACE FUNCTION public.get_up_setting(setting_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.up_settings WHERE key = setting_key LIMIT 1;
$$;

-- Actualizar calculate_up_level para usar configuración
CREATE OR REPLACE FUNCTION public.calculate_up_level(points integer)
RETURNS up_level
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  thresholds jsonb;
BEGIN
  SELECT value INTO thresholds FROM public.up_settings WHERE key = 'level_thresholds';
  
  IF thresholds IS NULL THEN
    thresholds := '{"bronze": 0, "silver": 100, "gold": 250, "diamond": 500}'::jsonb;
  END IF;
  
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
$$;