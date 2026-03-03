-- Desactivar temporalmente el gate de llaves para todos los usuarios
-- Para reactivar: cambiar "enabled": true

UPDATE public.security_settings
SET
  setting_value = '{"enabled": false, "bypass_admins": true}'::jsonb,
  updated_at = NOW()
WHERE setting_key = 'talent_access_gate';
