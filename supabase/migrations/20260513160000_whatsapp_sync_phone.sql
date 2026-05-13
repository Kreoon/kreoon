-- ============================================================
-- Sincronizar campo phone → whatsapp_phone
-- El campo phone ES el número WhatsApp de cada usuario.
-- Mapear datos existentes y habilitar notificaciones donde hay teléfono.
-- ============================================================

-- 1. profiles: copiar phone a whatsapp_phone y activar notificaciones
UPDATE public.profiles
SET
  whatsapp_phone   = phone,
  whatsapp_enabled = true
WHERE phone IS NOT NULL
  AND phone != ''
  AND whatsapp_phone IS NULL;

-- Activar whatsapp_enabled para quien ya tenía whatsapp_phone
UPDATE public.profiles
SET whatsapp_enabled = true
WHERE whatsapp_phone IS NOT NULL
  AND whatsapp_phone != ''
  AND whatsapp_enabled = false;

-- 2. clients: copiar phone/contact_phone a whatsapp_phone
UPDATE public.clients
SET
  whatsapp_phone   = COALESCE(phone, contact_phone),
  whatsapp_enabled = true
WHERE COALESCE(phone, contact_phone) IS NOT NULL
  AND COALESCE(phone, contact_phone) != ''
  AND whatsapp_phone IS NULL;

-- 3. creator_profiles: copiar phone a whatsapp_phone
UPDATE public.creator_profiles
SET
  whatsapp_phone   = phone,
  whatsapp_enabled = true
WHERE phone IS NOT NULL
  AND phone != ''
  AND whatsapp_phone IS NULL;

-- 4. Cambiar default de whatsapp_enabled en profiles a true
--    (nuevos usuarios que registren su teléfono quedan habilitados automáticamente)
ALTER TABLE public.profiles
  ALTER COLUMN whatsapp_enabled SET DEFAULT true;

ALTER TABLE public.creator_profiles
  ALTER COLUMN whatsapp_enabled SET DEFAULT true;
