-- Function to notify client users when a script is ready for review
CREATE OR REPLACE FUNCTION public.notify_client_on_script_ready()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  client_user_record RECORD;
BEGIN
  -- Only trigger when status changes TO 'script_pending' and there's a script
  IF NEW.status = 'script_pending' AND (OLD.status IS NULL OR OLD.status != 'script_pending') AND NEW.script IS NOT NULL AND NEW.client_id IS NOT NULL THEN
    -- Notify all users associated with this client
    FOR client_user_record IN 
      SELECT cu.user_id 
      FROM public.client_users cu
      WHERE cu.client_id = NEW.client_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        client_user_record.user_id,
        'script_ready',
        'Guión listo para revisar',
        'El guión de "' || NEW.title || '" está listo para tu aprobación.',
        '/dashboard'
      );
    END LOOP;
    
    -- Also notify the legacy user_id if exists on the client
    IF EXISTS (SELECT 1 FROM public.clients WHERE id = NEW.client_id AND user_id IS NOT NULL) THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      SELECT 
        c.user_id,
        'script_ready',
        'Guión listo para revisar',
        'El guión de "' || NEW.title || '" está listo para tu aprobación.',
        '/dashboard'
      FROM public.clients c
      WHERE c.id = NEW.client_id AND c.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.client_users cu 
        WHERE cu.client_id = NEW.client_id AND cu.user_id = c.user_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for script ready notification
DROP TRIGGER IF EXISTS notify_client_script_ready ON public.content;
CREATE TRIGGER notify_client_script_ready
  AFTER INSERT OR UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_script_ready();