-- Fix RLS permissions for user_feed_events table
-- Error: permission denied for table user_feed_events (403)

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT ON public.user_feed_events TO authenticated;
GRANT SELECT, INSERT ON public.user_feed_events TO anon;

-- Grant permissions on user_interest_profile
GRANT SELECT, INSERT, UPDATE ON public.user_interest_profile TO authenticated;

-- Grant permissions on story_views
GRANT SELECT, INSERT ON public.story_views TO authenticated;

-- Grant permissions on suggested_profiles_cache
GRANT SELECT ON public.suggested_profiles_cache TO authenticated;

-- Ensure RLS policies exist (recreate if needed)
DROP POLICY IF EXISTS "Users can insert own feed events" ON public.user_feed_events;
DROP POLICY IF EXISTS "Users can view own feed events" ON public.user_feed_events;
DROP POLICY IF EXISTS "Anon can insert feed events" ON public.user_feed_events;

-- RLS for user_feed_events - allow authenticated users to insert their own events
CREATE POLICY "Users can insert own feed events" ON public.user_feed_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow anonymous users to insert events (for tracking before login)
CREATE POLICY "Anon can insert feed events" ON public.user_feed_events
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Users can view their own events
CREATE POLICY "Users can view own feed events" ON public.user_feed_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role can do everything (for edge functions)
DROP POLICY IF EXISTS "Service role full access" ON public.user_feed_events;
CREATE POLICY "Service role full access" ON public.user_feed_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
