-- Trigger automático: sincroniza profiles → Pancake CRM vía pg_net (asíncrono)
-- Dispara en INSERT (registro nuevo) y en UPDATE de campos relevantes para el CRM.
-- El trigger llama pancake-sync que maneja create vs update internamente.

CREATE OR REPLACE FUNCTION public.trigger_pancake_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa2JxY3J4d3NtdnR4bXFnaXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDQwNTYsImV4cCI6MjA4NTAyMDA1Nn0.BorqcEBToDVeFBDQktZoCjCndYwB0bc6jlKmSJn-Wi8';
BEGIN
  IF (TG_OP = 'INSERT')
     OR (TG_OP = 'UPDATE' AND (
       OLD.full_name        IS DISTINCT FROM NEW.full_name      OR
       OLD.email            IS DISTINCT FROM NEW.email          OR
       OLD.phone            IS DISTINCT FROM NEW.phone          OR
       OLD.whatsapp_phone   IS DISTINCT FROM NEW.whatsapp_phone OR
       OLD.address          IS DISTINCT FROM NEW.address        OR
       OLD.city             IS DISTINCT FROM NEW.city           OR
       OLD.country          IS DISTINCT FROM NEW.country        OR
       OLD.date_of_birth    IS DISTINCT FROM NEW.date_of_birth  OR
       OLD.active_role      IS DISTINCT FROM NEW.active_role    OR
       OLD.bio              IS DISTINCT FROM NEW.bio            OR
       OLD.tagline          IS DISTINCT FROM NEW.tagline
     ))
  THEN
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

DROP TRIGGER IF EXISTS profiles_pancake_sync ON public.profiles;
CREATE TRIGGER profiles_pancake_sync
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_pancake_sync();
