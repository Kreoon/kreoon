-- Create user_feed_events table for tracking interactions
CREATE TABLE IF NOT EXISTS public.user_feed_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id TEXT, -- for anonymous users (fingerprint/session)
  item_type TEXT NOT NULL, -- 'content', 'post', 'story', 'profile'
  item_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'view_start', 'view_end', 'like', 'save', 'comment', 'share', 'follow'
  duration_ms INTEGER, -- watch time for videos
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_interest_profile table for AI ranking
CREATE TABLE IF NOT EXISTS public.user_interest_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id TEXT, -- for anonymous users
  top_tags JSONB DEFAULT '[]',
  top_categories JSONB DEFAULT '[]',
  top_creators JSONB DEFAULT '[]',
  engagement_stats JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_interest UNIQUE (user_id),
  CONSTRAINT unique_viewer_interest UNIQUE (viewer_id)
);

-- Create story_views table for tracking who viewed stories
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.portfolio_stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_story_view UNIQUE (story_id, viewer_id)
);

-- Create suggested_profiles_cache for recommendations
CREATE TABLE IF NOT EXISTS public.suggested_profiles_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  suggested_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 day'),
  CONSTRAINT unique_suggestion UNIQUE (user_id, suggested_user_id)
);

-- Enable RLS
ALTER TABLE public.user_feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interest_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_profiles_cache ENABLE ROW LEVEL SECURITY;

-- RLS for user_feed_events (users can insert their own events, admins can read all)
CREATE POLICY "Users can insert own feed events" ON public.user_feed_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own feed events" ON public.user_feed_events
  FOR SELECT USING (auth.uid() = user_id);

-- RLS for user_interest_profile
CREATE POLICY "Users can manage own interest profile" ON public.user_interest_profile
  FOR ALL USING (auth.uid() = user_id);

-- RLS for story_views
CREATE POLICY "Users can insert own story views" ON public.story_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Story owners can see who viewed" ON public.story_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_stories ps 
      WHERE ps.id = story_id AND ps.user_id = auth.uid()
    )
  );

CREATE POLICY "Viewers can see own views" ON public.story_views
  FOR SELECT USING (auth.uid() = viewer_id);

-- RLS for suggested_profiles_cache
CREATE POLICY "Users can view own suggestions" ON public.suggested_profiles_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage suggestions" ON public.suggested_profiles_cache
  FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feed_events_user ON public.user_feed_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_item ON public.user_feed_events(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_created ON public.user_feed_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_suggested_profiles_user ON public.suggested_profiles_cache(user_id);

-- Add realtime for story_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views;