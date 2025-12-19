-- Create trigger for auto-assigning editor when content status changes to 'recorded'
CREATE TRIGGER auto_assign_editor_trigger
BEFORE UPDATE ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_editor_on_recorded();

-- Also create trigger to update editor stats when content is completed
CREATE TRIGGER update_editor_stats_trigger
AFTER UPDATE ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.update_editor_stats_on_completion();