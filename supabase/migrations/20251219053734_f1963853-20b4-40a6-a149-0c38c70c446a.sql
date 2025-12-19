-- Function to notify when editor or creator is assigned
CREATE OR REPLACE FUNCTION public.notify_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify editor when assigned
  IF NEW.editor_id IS NOT NULL AND (OLD.editor_id IS NULL OR OLD.editor_id != NEW.editor_id) THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.editor_id,
      'assignment',
      'Nuevo proyecto asignado',
      'Se te ha asignado un nuevo proyecto de edición: ' || NEW.title,
      '/board'
    );
  END IF;

  -- Notify creator when assigned
  IF NEW.creator_id IS NOT NULL AND (OLD.creator_id IS NULL OR OLD.creator_id != NEW.creator_id) THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.creator_id,
      'assignment',
      'Nuevo proyecto asignado',
      'Se te ha asignado un nuevo proyecto de creación: ' || NEW.title,
      '/board'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for assignments
CREATE TRIGGER notify_assignment_trigger
AFTER UPDATE ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_assignment();

-- Also notify on insert when creator/editor is assigned from the start
CREATE OR REPLACE FUNCTION public.notify_on_content_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify editor if assigned on creation
  IF NEW.editor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.editor_id,
      'assignment',
      'Nuevo proyecto asignado',
      'Se te ha asignado un nuevo proyecto de edición: ' || NEW.title,
      '/board'
    );
  END IF;

  -- Notify creator if assigned on creation
  IF NEW.creator_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.creator_id,
      'assignment',
      'Nuevo proyecto asignado',
      'Se te ha asignado un nuevo proyecto de creación: ' || NEW.title,
      '/board'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_content_insert_trigger
AFTER INSERT ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_content_insert();