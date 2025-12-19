-- Recreate the auto-assign editor trigger
DROP TRIGGER IF EXISTS auto_assign_editor_trigger ON public.content;
CREATE TRIGGER auto_assign_editor_trigger
BEFORE UPDATE ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_editor_on_recorded();

-- Recreate editor stats trigger
DROP TRIGGER IF EXISTS update_editor_stats_trigger ON public.content;
CREATE TRIGGER update_editor_stats_trigger
AFTER UPDATE ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.update_editor_stats_on_completion();

-- Recreate notification triggers
DROP TRIGGER IF EXISTS notify_assignment_trigger ON public.content;
CREATE TRIGGER notify_assignment_trigger
AFTER UPDATE ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_assignment();

DROP TRIGGER IF EXISTS notify_content_insert_trigger ON public.content;
CREATE TRIGGER notify_content_insert_trigger
AFTER INSERT ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_content_insert();