-- Create function to notify editor when content becomes recorded
CREATE OR REPLACE FUNCTION public.notify_editor_on_recorded()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger when status changes TO 'recorded' from another status
  IF NEW.status = 'recorded' AND (OLD.status IS NULL OR OLD.status != 'recorded') THEN
    -- If there's an assigned editor, notify them
    IF NEW.editor_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        NEW.editor_id,
        'content_ready',
        'Contenido listo para editar',
        'El contenido "' || NEW.title || '" está grabado y listo para edición.',
        '/board'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to call the function on content update
DROP TRIGGER IF EXISTS notify_editor_on_recorded_trigger ON public.content;
CREATE TRIGGER notify_editor_on_recorded_trigger
  AFTER UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_editor_on_recorded();