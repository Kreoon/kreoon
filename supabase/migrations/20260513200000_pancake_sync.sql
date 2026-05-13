-- ============================================================
-- Pancake CRM sync — columna + índice + trigger en profiles
-- ============================================================
-- Agrega pancake_contact_id para tracking de duplicados y
-- un trigger que dispara la Edge Function pancake-sync via pg_net
-- cada vez que un perfil se inserta o cambian campos clave.
--
-- Requiere: extensión pg_net disponible en el proyecto Supabase
-- Edge Function: pancake-sync (verify_jwt = false)
-- ============================================================

-- 1. Columna para guardar el UUID del contacto en Pancake CRM
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pancake_contact_id UUID;

-- Índice parcial: solo indexa filas ya sincronizadas (evita overhead en filas nuevas)
CREATE INDEX IF NOT EXISTS idx_profiles_pancake_contact_id
  ON public.profiles(pancake_contact_id)
  WHERE pancake_contact_id IS NOT NULL;

-- 2. Trigger function que invoca la Edge Function pancake-sync via pg_net
--    Usa la ANON KEY (pública) porque pancake-sync tiene verify_jwt = false.
--    El edge function lee SUPABASE_SERVICE_ROLE_KEY del entorno de forma segura.
CREATE OR REPLACE FUNCTION public.trigger_pancake_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa2JxY3J4d3NtdnR4bXFnaXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDQwNTYsImV4cCI6MjA4NTAyMDA1Nn0.BorqcEBToDVeFBDQktZoCjCndYwB0bc6jlKmSJn-Wi8';
BEGIN
  -- Solo disparar en INSERT o en UPDATE de campos relevantes para el CRM
  IF (TG_OP = 'INSERT')
     OR (TG_OP = 'UPDATE' AND (
       OLD.full_name       IS DISTINCT FROM NEW.full_name       OR
       OLD.email           IS DISTINCT FROM NEW.email           OR
       OLD.phone           IS DISTINCT FROM NEW.phone           OR
       OLD.whatsapp_phone  IS DISTINCT FROM NEW.whatsapp_phone
     ))
  THEN
    -- pg_net envía la petición de forma asíncrona; no bloquea el INSERT/UPDATE
    PERFORM net.http_post(
      url     := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/pancake-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body    := jsonb_build_object('user_id', NEW.id::text)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Crear trigger (solo si pg_net está disponible)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    -- Eliminar trigger anterior si existe (idempotente)
    DROP TRIGGER IF EXISTS profiles_pancake_sync ON public.profiles;

    CREATE TRIGGER profiles_pancake_sync
      AFTER INSERT OR UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.trigger_pancake_sync();

    RAISE NOTICE 'Trigger profiles_pancake_sync creado correctamente (pg_net disponible)';
  ELSE
    RAISE WARNING 'pg_net no está instalado — trigger profiles_pancake_sync NO creado. Instala pg_net desde Dashboard → Database → Extensions.';
  END IF;
END;
$$;

-- ============================================================
-- Verificación post-migración
-- ============================================================
-- Ejecutar para confirmar:
--
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name   = 'profiles'
--     AND column_name  = 'pancake_contact_id';
--
--   SELECT tgname, tgenabled
--   FROM pg_trigger
--   WHERE tgrelid = 'public.profiles'::regclass
--     AND tgname  = 'profiles_pancake_sync';
-- ============================================================
