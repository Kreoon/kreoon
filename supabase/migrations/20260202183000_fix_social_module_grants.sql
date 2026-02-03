-- Fix 403: módulo Red social - permission denied for tables

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_stories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.followers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_notifications TO authenticated;
