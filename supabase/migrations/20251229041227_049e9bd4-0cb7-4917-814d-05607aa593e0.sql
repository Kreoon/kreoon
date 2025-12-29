-- Add trial fields to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS trial_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_end_date timestamp with time zone DEFAULT (now() + interval '30 days'),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS selected_plan text DEFAULT 'starter';

-- Add billing control setting (allows admin to enable/disable billing globally)
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'billing_enabled',
  'false',
  'Controla si el sistema de cobros está activo. En false, todas las organizaciones tienen acceso completo sin restricciones de trial.'
)
ON CONFLICT (key) DO NOTHING;

-- Add trial warning thresholds setting
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'trial_warning_days',
  '7,3',
  'Días antes del fin del trial para mostrar advertencias (separados por coma)'
)
ON CONFLICT (key) DO NOTHING;

-- Comment for clarity
COMMENT ON COLUMN public.organizations.trial_active IS 'Indica si el trial está activo para esta organización';
COMMENT ON COLUMN public.organizations.trial_started_at IS 'Fecha de inicio del periodo de prueba';
COMMENT ON COLUMN public.organizations.trial_end_date IS 'Fecha de fin del periodo de prueba (30 días después del inicio)';
COMMENT ON COLUMN public.organizations.subscription_status IS 'Estado: trial, active, expired, cancelled';
COMMENT ON COLUMN public.organizations.selected_plan IS 'Plan seleccionado: starter, growth, scale, enterprise';