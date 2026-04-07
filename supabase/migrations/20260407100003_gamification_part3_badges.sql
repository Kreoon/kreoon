-- Parte 3: Tablas de insignias globales

DO $$ BEGIN
  CREATE TYPE public.badge_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.badge_category AS ENUM ('profile', 'portfolio', 'experience', 'quality', 'speed', 'community', 'veteran', 'special');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.global_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  category badge_category NOT NULL,
  subcategory TEXT,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('threshold', 'milestone', 'streak', 'time_based', 'cumulative', 'compound')),
  condition_config JSONB NOT NULL DEFAULT '{}',
  rarity badge_rarity NOT NULL DEFAULT 'common',
  ranking_points INTEGER NOT NULL DEFAULT 0,
  tier INTEGER DEFAULT 1 CHECK (tier >= 1 AND tier <= 4),
  parent_badge_id UUID REFERENCES public.global_badges(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_secret BOOLEAN DEFAULT false,
  is_seasonal BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_badges_category ON public.global_badges(category, rarity);
CREATE INDEX IF NOT EXISTS idx_global_badges_key ON public.global_badges(key);

ALTER TABLE public.global_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges" ON public.global_badges FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage badges" ON public.global_badges FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));


CREATE TABLE IF NOT EXISTS public.user_global_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.global_badges(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  progress_max INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  progress_updated_at TIMESTAMPTZ DEFAULT now(),
  unlock_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_global_badges_user ON public.user_global_badges(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_user_global_badges_badge ON public.user_global_badges(badge_id);

ALTER TABLE public.user_global_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own badges" ON public.user_global_badges FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Anyone can view completed badges" ON public.user_global_badges FOR SELECT USING (is_completed = true);
CREATE POLICY "System can manage badges" ON public.user_global_badges FOR ALL USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS public.user_global_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_content_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  profile_completeness INTEGER DEFAULT 0,
  has_avatar BOOLEAN DEFAULT false,
  has_banner BOOLEAN DEFAULT false,
  has_bio BOOLEAN DEFAULT false,
  bio_length INTEGER DEFAULT 0,
  social_networks_count INTEGER DEFAULT 0,
  portfolio_posts_count INTEGER DEFAULT 0,
  portfolio_videos_count INTEGER DEFAULT 0,
  portfolio_images_count INTEGER DEFAULT 0,
  portfolio_hd_count INTEGER DEFAULT 0,
  portfolio_views_total BIGINT DEFAULT 0,
  portfolio_likes_total BIGINT DEFAULT 0,
  featured_works_count INTEGER DEFAULT 0,
  total_projects_completed INTEGER DEFAULT 0,
  total_clients_served INTEGER DEFAULT 0,
  unique_clients_count INTEGER DEFAULT 0,
  repeat_clients_count INTEGER DEFAULT 0,
  total_revenue_usd NUMERIC(12,2) DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  ratings_count INTEGER DEFAULT 0,
  five_star_count INTEGER DEFAULT 0,
  revisions_count INTEGER DEFAULT 0,
  no_revision_streak INTEGER DEFAULT 0,
  early_deliveries_count INTEGER DEFAULT 0,
  on_time_deliveries_count INTEGER DEFAULT 0,
  late_deliveries_count INTEGER DEFAULT 0,
  delivery_streak INTEGER DEFAULT 0,
  avg_delivery_hours NUMERIC(10,2) DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  referrals_count INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  collaborations_count INTEGER DEFAULT 0,
  comments_given INTEGER DEFAULT 0,
  likes_given INTEGER DEFAULT 0,
  days_since_signup INTEGER DEFAULT 0,
  consecutive_active_days INTEGER DEFAULT 0,
  total_active_months INTEGER DEFAULT 0,
  seasons_participated INTEGER DEFAULT 0,
  total_badge_points INTEGER DEFAULT 0,
  badges_completed_count INTEGER DEFAULT 0,
  global_rank INTEGER,
  percentile NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_global_stats_rank ON public.user_global_stats(total_badge_points DESC);

ALTER TABLE public.user_global_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view stats" ON public.user_global_stats FOR SELECT USING (true);
CREATE POLICY "System can manage stats" ON public.user_global_stats FOR ALL USING (true) WITH CHECK (true);
