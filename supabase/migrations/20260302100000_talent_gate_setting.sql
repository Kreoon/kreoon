-- Agregar configuracion para activar/desactivar el gate de llaves para talentos

-- Insertar el setting si no existe
INSERT INTO public.security_settings (setting_key, setting_value, description)
VALUES (
  'talent_access_gate',
  '{"enabled": true, "bypass_admins": true}'::jsonb,
  'Controla si los talentos requieren desbloquear acceso con llaves (referidos) para acceder al marketplace y funciones publicas'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Crear funcion RPC para leer el setting sin autenticacion (necesario para el gate)
CREATE OR REPLACE FUNCTION public.get_talent_gate_config()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT setting_value FROM public.security_settings WHERE setting_key = 'talent_access_gate'),
    '{"enabled": true, "bypass_admins": true}'::jsonb
  );
$$;

-- Permitir que cualquier usuario (incluyendo anon) pueda leer el config del gate
GRANT EXECUTE ON FUNCTION public.get_talent_gate_config() TO anon;
GRANT EXECUTE ON FUNCTION public.get_talent_gate_config() TO authenticated;
