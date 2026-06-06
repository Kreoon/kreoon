-- ============================================================
-- KREOON ACADEMIA - Community Features v2
-- Posts, categorías, reacciones, comentarios, analytics,
-- plugins, leaderboard, eventos, discovery, mapa
-- ============================================================

-- 1. POST CATEGORIES
CREATE TABLE IF NOT EXISTS public.academy_post_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  emoji TEXT DEFAULT '💬',
  description TEXT,
  color TEXT DEFAULT '#8B5CF6',
  sort_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  who_can_post TEXT DEFAULT 'all' CHECK (who_can_post IN ('all', 'instructor', 'moderator')),
  requires_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_post_categories_space ON public.academy_post_categories(space_id);

-- 2. POSTS
CREATE TABLE IF NOT EXISTS public.academy_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.academy_post_categories(id) ON DELETE SET NULL,
  title TEXT,
  body TEXT NOT NULL,
  body_html TEXT,
  media_urls TEXT[] DEFAULT '{}',
  link_preview JSONB,
  type TEXT DEFAULT 'post' CHECK (type IN ('post', 'question', 'announcement', 'event', 'poll')),
  poll_options JSONB DEFAULT '[]',
  poll_ends_at TIMESTAMPTZ,
  poll_allows_multiple BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'pending_approval', 'archived')),
  is_pinned BOOLEAN DEFAULT false,
  is_announcement BOOLEAN DEFAULT false,
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  featured_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_academy_posts_space ON public.academy_posts(space_id);
CREATE INDEX IF NOT EXISTS idx_academy_posts_author ON public.academy_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_academy_posts_category ON public.academy_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_academy_posts_status ON public.academy_posts(status, created_at DESC);

-- 3. POST REACTIONS
CREATE TABLE IF NOT EXISTS public.academy_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.academy_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT DEFAULT 'like' CHECK (reaction IN ('like', 'love', 'fire', 'clap', 'insightful')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.academy_post_reactions(post_id);

-- 4. COMMENTS
CREATE TABLE IF NOT EXISTS public.academy_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.academy_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.academy_post_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  body_html TEXT,
  like_count INT DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_academy_comments_post ON public.academy_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_academy_comments_parent ON public.academy_post_comments(parent_id);

-- 5. COMMENT REACTIONS
CREATE TABLE IF NOT EXISTS public.academy_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.academy_post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT DEFAULT 'like',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- 6. POLL VOTES
CREATE TABLE IF NOT EXISTS public.academy_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.academy_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_ids TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 7. SPACE ANALYTICS
CREATE TABLE IF NOT EXISTS public.academy_space_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  about_page_views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  signups INT DEFAULT 0,
  traffic_sources JSONB DEFAULT '{}',
  new_members INT DEFAULT 0,
  churned_members INT DEFAULT 0,
  active_members INT DEFAULT 0,
  new_mrr_usd NUMERIC(10,2) DEFAULT 0,
  churned_mrr_usd NUMERIC(10,2) DEFAULT 0,
  posts_created INT DEFAULT 0,
  comments_created INT DEFAULT 0,
  reactions_given INT DEFAULT 0,
  lessons_completed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, date)
);
CREATE INDEX IF NOT EXISTS idx_space_analytics_space_date ON public.academy_space_analytics(space_id, date DESC);

-- 8. SPACE PLUGINS
CREATE TABLE IF NOT EXISTS public.academy_space_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE UNIQUE,
  meta_pixel_enabled BOOLEAN DEFAULT false,
  meta_pixel_id TEXT,
  google_ads_enabled BOOLEAN DEFAULT false,
  google_ads_tag TEXT,
  google_ads_conversion_label TEXT,
  auto_dm_enabled BOOLEAN DEFAULT false,
  auto_dm_message TEXT,
  membership_questions_enabled BOOLEAN DEFAULT false,
  membership_questions JSONB DEFAULT '[]',
  zapier_enabled BOOLEAN DEFAULT false,
  zapier_webhook_url TEXT,
  onboarding_video_enabled BOOLEAN DEFAULT false,
  onboarding_video_url TEXT,
  cancellation_video_enabled BOOLEAN DEFAULT false,
  cancellation_video_url TEXT,
  instant_approval_enabled BOOLEAN DEFAULT false,
  unlock_chat_level INT DEFAULT 0,
  unlock_posting_level INT DEFAULT 0,
  sidebar_links JSONB DEFAULT '[]',
  hyros_enabled BOOLEAN DEFAULT false,
  hyros_api_key TEXT,
  kreoon_webhook_enabled BOOLEAN DEFAULT false,
  kreoon_webhook_url TEXT,
  kreoon_webhook_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. MEMBERSHIP ANSWERS
CREATE TABLE IF NOT EXISTS public.academy_membership_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, user_id)
);

-- 10. DISCOVERY
CREATE TABLE IF NOT EXISTS public.academy_space_discovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE UNIQUE,
  is_discoverable BOOLEAN DEFAULT true,
  category TEXT DEFAULT 'general',
  subcategory TEXT,
  language TEXT DEFAULT 'es',
  keywords TEXT[] DEFAULT '{}',
  discovery_rank INT,
  discovery_views INT DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. MEMBER LOCATIONS
CREATE TABLE IF NOT EXISTS public.academy_member_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city TEXT,
  country TEXT,
  country_code TEXT,
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, user_id)
);

-- 12. NOTIFICATION SETTINGS
CREATE TABLE IF NOT EXISTS public.academy_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_membership_request BOOLEAN DEFAULT true,
  notify_new_post BOOLEAN DEFAULT true,
  notify_new_customer_email BOOLEAN DEFAULT true,
  notify_reported_content BOOLEAN DEFAULT true,
  notify_new_comment_on_my_post BOOLEAN DEFAULT true,
  notify_reply_to_my_comment BOOLEAN DEFAULT true,
  notify_reaction_on_my_post BOOLEAN DEFAULT false,
  notify_new_post_in_category BOOLEAN DEFAULT true,
  notify_new_lesson BOOLEAN DEFAULT true,
  notify_event_reminder BOOLEAN DEFAULT true,
  weekly_digest BOOLEAN DEFAULT true,
  daily_notifications BOOLEAN DEFAULT false,
  admin_broadcast BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, user_id)
);

-- 13. EVENTS
CREATE TABLE IF NOT EXISTS public.academy_space_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'live_call' CHECK (type IN ('live_call', 'workshop', 'webinar', 'challenge', 'other')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/Bogota',
  meeting_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  rsvp_count INT DEFAULT 0,
  max_attendees INT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_space_events_space ON public.academy_space_events(space_id, starts_at);

-- 14. RSVPs
CREATE TABLE IF NOT EXISTS public.academy_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.academy_space_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- 15. LEADERBOARD POINTS
CREATE TABLE IF NOT EXISTS public.academy_space_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INT DEFAULT 0,
  points_from_posts INT DEFAULT 0,
  points_from_comments INT DEFAULT 0,
  points_from_lessons INT DEFAULT 0,
  points_from_courses INT DEFAULT 0,
  points_from_reactions_received INT DEFAULT 0,
  current_week_points INT DEFAULT 0,
  current_month_points INT DEFAULT 0,
  level INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_space_points_leaderboard ON public.academy_space_points(space_id, total_points DESC);

-- 16. POINT EVENTS LOG
CREATE TABLE IF NOT EXISTS public.academy_space_point_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  points INT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- RPC: award_space_points
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_space_points(
  p_space_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_points INT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO academy_space_point_events (space_id, user_id, action, points, reference_id)
  VALUES (p_space_id, p_user_id, p_action, p_points, p_reference_id);

  INSERT INTO academy_space_points (space_id, user_id, total_points, current_week_points, current_month_points)
  VALUES (p_space_id, p_user_id, p_points, p_points, p_points)
  ON CONFLICT (space_id, user_id) DO UPDATE SET
    total_points = academy_space_points.total_points + p_points,
    current_week_points = academy_space_points.current_week_points + p_points,
    current_month_points = academy_space_points.current_month_points + p_points,
    updated_at = NOW();

  UPDATE academy_space_points
  SET level = LEAST(10, GREATEST(1, (total_points / 100) + 1))
  WHERE space_id = p_space_id AND user_id = p_user_id;

  -- v8: También integrar con sistema UP global de Kreoon (silent fail si schema no matchea)
  BEGIN
    INSERT INTO reputation_events (user_id, event_type, event_subtype, base_points, final_points, event_date)
    VALUES (
      p_user_id,
      'academy_community_action',
      p_action,
      CASE WHEN p_points > 0 THEN LEAST(p_points, 10) ELSE 0 END,
      CASE WHEN p_points > 0 THEN LEAST(p_points, 10) ELSE 0 END,
      CURRENT_DATE
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_space_points(UUID, UUID, TEXT, INT, UUID) TO authenticated;

-- ──────────────────────────────────────────────
-- TRIGGERS
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_award_post_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'published' THEN
    PERFORM award_space_points(NEW.space_id, NEW.author_id, 'post_created', 5, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_post_points ON public.academy_posts;
CREATE TRIGGER trg_academy_post_points
  AFTER INSERT ON public.academy_posts
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_post_points();

CREATE OR REPLACE FUNCTION public.trg_award_comment_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_space_id UUID;
BEGIN
  SELECT space_id INTO v_space_id FROM academy_posts WHERE id = NEW.post_id;
  IF v_space_id IS NOT NULL THEN
    PERFORM award_space_points(v_space_id, NEW.author_id, 'comment_created', 2, NEW.id);
    UPDATE academy_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_comment_points ON public.academy_post_comments;
CREATE TRIGGER trg_academy_comment_points
  AFTER INSERT ON public.academy_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_comment_points();

CREATE OR REPLACE FUNCTION public.trg_award_reaction_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_space_id UUID; v_author_id UUID;
BEGIN
  SELECT space_id, author_id INTO v_space_id, v_author_id FROM academy_posts WHERE id = NEW.post_id;
  IF v_space_id IS NOT NULL AND v_author_id IS NOT NULL AND v_author_id != NEW.user_id THEN
    PERFORM award_space_points(v_space_id, v_author_id, 'reaction_received', 1, NEW.post_id);
  END IF;
  UPDATE academy_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_reaction_points ON public.academy_post_reactions;
CREATE TRIGGER trg_academy_reaction_points
  AFTER INSERT ON public.academy_post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_reaction_points();

-- Auto-decrement on reaction delete
CREATE OR REPLACE FUNCTION public.trg_decrement_reaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE academy_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_reaction_decrement ON public.academy_post_reactions;
CREATE TRIGGER trg_academy_reaction_decrement
  AFTER DELETE ON public.academy_post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_decrement_reaction();

-- ──────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────
ALTER TABLE public.academy_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_space_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_space_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_membership_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_space_discovery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_member_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_space_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_space_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_space_point_events ENABLE ROW LEVEL SECURITY;

-- Categorías
CREATE POLICY "categories_members_read" ON public.academy_post_categories FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM academy_memberships WHERE space_id = academy_post_categories.space_id AND user_id = auth.uid() AND is_active = true)
  OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND is_public = true));
CREATE POLICY "categories_owner_all" ON public.academy_post_categories FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()));

-- Posts
CREATE POLICY "posts_members_read" ON public.academy_posts FOR SELECT TO authenticated
USING (
  status = 'published' AND (
    EXISTS (SELECT 1 FROM academy_memberships WHERE space_id = academy_posts.space_id AND user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid())
  )
);
CREATE POLICY "posts_own_manage" ON public.academy_posts FOR ALL TO authenticated
USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts_owner_all" ON public.academy_posts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()));

-- Reactions
CREATE POLICY "reactions_read" ON public.academy_post_reactions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM academy_posts p WHERE p.id = post_id AND (
  EXISTS (SELECT 1 FROM academy_memberships m WHERE m.space_id = p.space_id AND m.user_id = auth.uid() AND m.is_active = true)
  OR EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = p.space_id AND s.owner_id = auth.uid())
)));
CREATE POLICY "reactions_own" ON public.academy_post_reactions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Comments
CREATE POLICY "comments_members_read" ON public.academy_post_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM academy_posts p WHERE p.id = post_id AND (
  EXISTS (SELECT 1 FROM academy_memberships m WHERE m.space_id = p.space_id AND m.user_id = auth.uid() AND m.is_active = true)
  OR EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = p.space_id AND s.owner_id = auth.uid())
)));
CREATE POLICY "comments_own" ON public.academy_post_comments FOR ALL TO authenticated
USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

-- Comment reactions
CREATE POLICY "comment_reactions_own" ON public.academy_comment_reactions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Poll votes
CREATE POLICY "poll_votes_own" ON public.academy_poll_votes FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Analytics: solo owner
CREATE POLICY "analytics_owner" ON public.academy_space_analytics FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()));

-- Plugins: solo owner
CREATE POLICY "plugins_owner" ON public.academy_space_plugins FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()));

-- Membership answers
CREATE POLICY "membership_answers_own" ON public.academy_membership_answers FOR ALL TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()))
WITH CHECK (user_id = auth.uid());

-- Discovery: público para lectura
CREATE POLICY "discovery_public_read" ON public.academy_space_discovery FOR SELECT TO authenticated
USING (is_discoverable = true);
CREATE POLICY "discovery_anon_read" ON public.academy_space_discovery FOR SELECT TO anon
USING (is_discoverable = true);
CREATE POLICY "discovery_owner_manage" ON public.academy_space_discovery FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()));

-- Member locations
CREATE POLICY "locations_public_read" ON public.academy_member_locations FOR SELECT TO authenticated
USING (is_public = true AND EXISTS (
  SELECT 1 FROM academy_memberships WHERE space_id = academy_member_locations.space_id AND user_id = auth.uid() AND is_active = true
));
CREATE POLICY "locations_own" ON public.academy_member_locations FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Notification settings
CREATE POLICY "notif_settings_own" ON public.academy_notification_settings FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Events
CREATE POLICY "events_members_read" ON public.academy_space_events FOR SELECT TO authenticated
USING (is_published = true AND (
  EXISTS (SELECT 1 FROM academy_memberships WHERE space_id = academy_space_events.space_id AND user_id = auth.uid() AND is_active = true)
  OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid())
));
CREATE POLICY "events_owner_manage" ON public.academy_space_events FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()));

-- RSVPs
CREATE POLICY "rsvps_own" ON public.academy_event_rsvps FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Points
CREATE POLICY "points_space_members_read" ON public.academy_space_points FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM academy_memberships WHERE space_id = academy_space_points.space_id AND user_id = auth.uid() AND is_active = true)
  OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid())
);

-- Point events (log): solo dueño y owner del space
CREATE POLICY "point_events_read" ON public.academy_space_point_events FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid())
);

-- ──────────────────────────────────────────────
-- GRANTS
-- ──────────────────────────────────────────────
DO $grants$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'academy_post_categories', 'academy_posts', 'academy_post_reactions',
    'academy_post_comments', 'academy_comment_reactions', 'academy_poll_votes',
    'academy_space_analytics', 'academy_space_plugins', 'academy_membership_answers',
    'academy_space_discovery', 'academy_member_locations', 'academy_notification_settings',
    'academy_space_events', 'academy_event_rsvps', 'academy_space_points',
    'academy_space_point_events'
  ]) LOOP
    EXECUTE format('GRANT ALL ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $grants$;

GRANT SELECT ON public.academy_space_discovery TO anon;

NOTIFY pgrst, 'reload schema';
