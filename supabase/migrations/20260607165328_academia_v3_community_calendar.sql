-- ============================================================
-- KREOON ACADEMIA v3 — Community Global + Lesson Comments + Calendar
-- ============================================================

-- ──────────────────────────────────────────────
-- Ampliar academy_posts: tipos 'introduction' + 'achievement'
-- ──────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.academy_posts DROP CONSTRAINT IF EXISTS academy_posts_type_check;
  ALTER TABLE public.academy_posts ADD CONSTRAINT academy_posts_type_check
    CHECK (type IN ('post', 'question', 'announcement', 'event', 'poll', 'introduction', 'achievement'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ──────────────────────────────────────────────
-- 1. PRESENCE (online indicator)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_member_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  current_page TEXT,
  UNIQUE(space_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_presence_space ON public.academy_member_presence(space_id, last_seen_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM academy_member_presence WHERE last_seen_at < NOW() - INTERVAL '5 minutes';
END;
$$;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_presence() TO authenticated;

-- ──────────────────────────────────────────────
-- 2. FOLLOWS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_member_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, follower_id, following_id),
  CHECK (follower_id != following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_space ON public.academy_member_follows(space_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.academy_member_follows(follower_id);

-- ──────────────────────────────────────────────
-- 3. SPACE PROFILES (perfil enriquecido por space)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_space_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bio TEXT,
  title TEXT,
  website_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  linkedin_url TEXT,
  intro_post_id UUID REFERENCES public.academy_posts(id) ON DELETE SET NULL,
  intro_completed BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_space_profiles_space ON public.academy_space_profiles(space_id);

-- ──────────────────────────────────────────────
-- 4. NOTIFICATIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'comment_reply','post_reaction','comment_on_my_post',
    'lesson_comment_reply','lesson_comment_featured','new_lesson',
    'event_reminder_24h','event_reminder_1h','event_cancelled',
    'new_member_joined','mention','auto_dm','certificate_earned'
  )),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.academy_notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_space ON public.academy_notifications(space_id);

-- ──────────────────────────────────────────────
-- 5. LESSON COMMENTS (con video timestamp)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_lesson_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.academy_lesson_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  body_html TEXT,
  video_timestamp_seconds INT,
  video_timestamp_label TEXT,
  is_deleted BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  like_count INT DEFAULT 0,
  is_reported BOOLEAN DEFAULT false,
  report_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_lesson ON public.academy_lesson_comments(lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_course ON public.academy_lesson_comments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_parent ON public.academy_lesson_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_timestamp ON public.academy_lesson_comments(lesson_id, video_timestamp_seconds);

-- ──────────────────────────────────────────────
-- 6. LESSON COMMENT LIKES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_lesson_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.academy_lesson_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_comment_likes ON public.academy_lesson_comment_likes(comment_id);

CREATE OR REPLACE FUNCTION public.trg_lesson_comment_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE academy_lesson_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE academy_lesson_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_lesson_comment_likes ON public.academy_lesson_comment_likes;
CREATE TRIGGER trg_lesson_comment_likes
  AFTER INSERT OR DELETE ON public.academy_lesson_comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_lesson_comment_like_count();

-- Notificación de respuesta en comentario de lección
CREATE OR REPLACE FUNCTION public.trg_lesson_comment_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_parent_author_id UUID;
  v_lesson_title TEXT;
  v_space_slug TEXT;
  v_course_slug TEXT;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author_id
    FROM academy_lesson_comments WHERE id = NEW.parent_id;

    IF v_parent_author_id IS NOT NULL AND v_parent_author_id <> NEW.author_id THEN
      SELECT title INTO v_lesson_title FROM academy_lessons WHERE id = NEW.lesson_id;
      SELECT slug INTO v_space_slug FROM academy_spaces WHERE id = NEW.space_id;
      SELECT slug INTO v_course_slug FROM academy_courses WHERE id = NEW.course_id;

      INSERT INTO academy_notifications (
        space_id, recipient_id, sender_id, type,
        title, body, link, reference_id, reference_type
      ) VALUES (
        NEW.space_id, v_parent_author_id, NEW.author_id, 'lesson_comment_reply',
        'Nueva respuesta en tu comentario',
        'Alguien respondió tu comentario en ' || COALESCE(v_lesson_title, 'una lección'),
        '/academia/' || v_space_slug || '/' || v_course_slug || '/learn',
        NEW.id, 'lesson_comment'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lesson_comment_notif ON public.academy_lesson_comments;
CREATE TRIGGER trg_lesson_comment_notif
  AFTER INSERT ON public.academy_lesson_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_lesson_comment_notification();

-- ──────────────────────────────────────────────
-- 7. ALTER academy_space_events — Google Calendar columns
-- ──────────────────────────────────────────────
ALTER TABLE public.academy_space_events
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
  ADD COLUMN IF NOT EXISTS google_meet_link TEXT,
  ADD COLUMN IF NOT EXISTS auto_invite_all_members BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_sent_24h BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_1h BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ──────────────────────────────────────────────
-- 8. EVENT INVITATIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_event_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.academy_space_events(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited','accepted','declined','tentative','no_response')),
  google_calendar_added BOOLEAN DEFAULT false,
  invite_sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_invitations_event ON public.academy_event_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_user ON public.academy_event_invitations(user_id);

-- ──────────────────────────────────────────────
-- 9. GOOGLE CALENDAR TOKENS (owner)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ,
  calendar_id TEXT DEFAULT 'primary',
  calendar_name TEXT DEFAULT 'primary',
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ
);

-- ──────────────────────────────────────────────
-- 10. MEMBER CALENDAR TOKENS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_member_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- ──────────────────────────────────────────────
-- RPC: create_space_event_with_invitations
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_space_event_with_invitations(
  p_space_id UUID,
  p_organizer_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_type TEXT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_timezone TEXT DEFAULT 'America/Bogota',
  p_meeting_url TEXT DEFAULT NULL,
  p_auto_invite_all BOOLEAN DEFAULT TRUE,
  p_max_attendees INT DEFAULT NULL,
  p_cover_image_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_member RECORD;
  v_invite_count INT := 0;
  v_space_slug TEXT;
BEGIN
  -- Solo el owner del space puede crear eventos
  IF NOT EXISTS (SELECT 1 FROM academy_spaces WHERE id = p_space_id AND owner_id = p_organizer_id) THEN
    RAISE EXCEPTION 'Solo el owner del space puede crear eventos';
  END IF;

  INSERT INTO academy_space_events (
    space_id, organizer_id, title, description, type,
    starts_at, ends_at, timezone, meeting_url,
    auto_invite_all_members, max_attendees, cover_image_url, is_published
  ) VALUES (
    p_space_id, p_organizer_id, p_title, p_description, p_type,
    p_starts_at, p_ends_at, p_timezone, p_meeting_url,
    p_auto_invite_all, p_max_attendees, p_cover_image_url, true
  ) RETURNING id INTO v_event_id;

  SELECT slug INTO v_space_slug FROM academy_spaces WHERE id = p_space_id;

  IF p_auto_invite_all THEN
    FOR v_member IN
      SELECT am.user_id, COALESCE(p.email, '') AS email
      FROM academy_memberships am
      LEFT JOIN profiles p ON p.id = am.user_id
      WHERE am.space_id = p_space_id
        AND am.is_active = true
        AND am.user_id <> p_organizer_id
    LOOP
      INSERT INTO academy_event_invitations (event_id, space_id, user_id, email, status)
      VALUES (v_event_id, p_space_id, v_member.user_id, v_member.email, 'invited')
      ON CONFLICT (event_id, user_id) DO NOTHING;

      INSERT INTO academy_notifications (
        space_id, recipient_id, sender_id, type,
        title, body, link, reference_id, reference_type
      ) VALUES (
        p_space_id, v_member.user_id, p_organizer_id, 'event_reminder_24h',
        'Nuevo evento: ' || p_title,
        'Hay un nuevo evento programado para ' ||
          TO_CHAR(p_starts_at AT TIME ZONE p_timezone, 'DD Mon YYYY HH12:MI AM'),
        '/academia/' || v_space_slug || '/calendar',
        v_event_id, 'event'
      );

      v_invite_count := v_invite_count + 1;
    END LOOP;
  END IF;

  UPDATE academy_space_events SET rsvp_count = v_invite_count WHERE id = v_event_id;

  RETURN jsonb_build_object('event_id', v_event_id, 'invite_count', v_invite_count, 'success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_space_event_with_invitations(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN, INT, TEXT) TO authenticated;

-- ──────────────────────────────────────────────
-- RPC: send_event_reminders (cron)
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_event_reminders()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_invitation RECORD;
  v_space_slug TEXT;
  v_count_24h INT := 0;
  v_count_1h INT := 0;
BEGIN
  FOR v_event IN
    SELECT * FROM academy_space_events
    WHERE starts_at BETWEEN NOW() + INTERVAL '23 hours 30 minutes' AND NOW() + INTERVAL '24 hours 30 minutes'
      AND reminder_sent_24h = false AND is_published = true AND cancelled_at IS NULL
  LOOP
    SELECT slug INTO v_space_slug FROM academy_spaces WHERE id = v_event.space_id;
    FOR v_invitation IN
      SELECT * FROM academy_event_invitations WHERE event_id = v_event.id AND status <> 'declined'
    LOOP
      INSERT INTO academy_notifications (space_id, recipient_id, type, title, body, link, reference_id, reference_type)
      VALUES (
        v_event.space_id, v_invitation.user_id, 'event_reminder_24h',
        'Mañana: ' || v_event.title,
        'Tu evento comienza mañana a las ' || TO_CHAR(v_event.starts_at AT TIME ZONE v_event.timezone, 'HH12:MI AM'),
        '/academia/' || v_space_slug || '/calendar',
        v_event.id, 'event'
      );
      v_count_24h := v_count_24h + 1;
    END LOOP;
    UPDATE academy_space_events SET reminder_sent_24h = true WHERE id = v_event.id;
  END LOOP;

  FOR v_event IN
    SELECT * FROM academy_space_events
    WHERE starts_at BETWEEN NOW() + INTERVAL '50 minutes' AND NOW() + INTERVAL '70 minutes'
      AND reminder_sent_1h = false AND is_published = true AND cancelled_at IS NULL
  LOOP
    SELECT slug INTO v_space_slug FROM academy_spaces WHERE id = v_event.space_id;
    FOR v_invitation IN
      SELECT * FROM academy_event_invitations WHERE event_id = v_event.id AND status <> 'declined'
    LOOP
      INSERT INTO academy_notifications (space_id, recipient_id, type, title, body, link, reference_id, reference_type)
      VALUES (
        v_event.space_id, v_invitation.user_id, 'event_reminder_1h',
        'En 1 hora: ' || v_event.title,
        'El evento "' || v_event.title || '" comienza en 1 hora' ||
          CASE WHEN v_event.meeting_url IS NOT NULL THEN '. Link: ' || v_event.meeting_url ELSE '' END,
        '/academia/' || v_space_slug || '/calendar',
        v_event.id, 'event'
      );
      v_count_1h := v_count_1h + 1;
    END LOOP;
    UPDATE academy_space_events SET reminder_sent_1h = true WHERE id = v_event.id;
  END LOOP;

  RETURN jsonb_build_object('reminders_24h', v_count_24h, 'reminders_1h', v_count_1h);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_event_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_event_reminders() TO service_role;

-- ──────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────
ALTER TABLE public.academy_member_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_member_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_space_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_lesson_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_lesson_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_event_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_member_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presence_own" ON public.academy_member_presence FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "presence_members_read" ON public.academy_member_presence FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM academy_memberships WHERE space_id = academy_member_presence.space_id AND user_id = auth.uid() AND is_active = true)
  OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid())
);

CREATE POLICY "follows_own" ON public.academy_member_follows FOR ALL TO authenticated
USING (follower_id = auth.uid()) WITH CHECK (follower_id = auth.uid());
CREATE POLICY "follows_members_read" ON public.academy_member_follows FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM academy_memberships WHERE space_id = academy_member_follows.space_id AND user_id = auth.uid() AND is_active = true)
  OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid())
);

CREATE POLICY "space_profiles_members_read" ON public.academy_space_profiles FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM academy_memberships WHERE space_id = academy_space_profiles.space_id AND user_id = auth.uid() AND is_active = true)
  OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid())
);
CREATE POLICY "space_profiles_own" ON public.academy_space_profiles FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_own" ON public.academy_notifications FOR ALL TO authenticated
USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

-- Lesson comments: solo inscritos o instructor (lectura), inserción valida membership/enrollment
CREATE POLICY "lesson_comments_read" ON public.academy_lesson_comments FOR SELECT TO authenticated
USING (
  (NOT is_deleted OR author_id = auth.uid())
  AND (
    EXISTS (SELECT 1 FROM academy_enrollments WHERE course_id = academy_lesson_comments.course_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM academy_courses WHERE id = academy_lesson_comments.course_id AND instructor_id = auth.uid())
  )
);
CREATE POLICY "lesson_comments_insert" ON public.academy_lesson_comments FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM academy_enrollments WHERE course_id = academy_lesson_comments.course_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM academy_courses WHERE id = academy_lesson_comments.course_id AND instructor_id = auth.uid())
  )
);
CREATE POLICY "lesson_comments_update_own" ON public.academy_lesson_comments FOR UPDATE TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());
CREATE POLICY "lesson_comments_delete_own_or_instructor" ON public.academy_lesson_comments FOR DELETE TO authenticated
USING (
  author_id = auth.uid()
  OR EXISTS (SELECT 1 FROM academy_courses WHERE id = academy_lesson_comments.course_id AND instructor_id = auth.uid())
);
CREATE POLICY "lesson_comments_instructor_manage" ON public.academy_lesson_comments FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM academy_courses WHERE id = academy_lesson_comments.course_id AND instructor_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM academy_courses WHERE id = academy_lesson_comments.course_id AND instructor_id = auth.uid()));

CREATE POLICY "lesson_comment_likes_own" ON public.academy_lesson_comment_likes FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "lesson_comment_likes_read" ON public.academy_lesson_comment_likes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "event_invitations_read" ON public.academy_event_invitations FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid())
);
CREATE POLICY "event_invitations_respond" ON public.academy_event_invitations FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Calendar tokens: NUNCA legibles por el cliente (los maneja la edge function con service_role)
-- Mantenemos RLS habilitada y no creamos políticas de SELECT para authenticated
CREATE POLICY "gcal_tokens_owner_insert" ON public.academy_google_calendar_tokens FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()));
CREATE POLICY "gcal_tokens_owner_status_read" ON public.academy_google_calendar_tokens FOR SELECT TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "member_cal_tokens_own_insert" ON public.academy_member_calendar_tokens FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "member_cal_tokens_status_read" ON public.academy_member_calendar_tokens FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ──────────────────────────────────────────────
-- GRANTS
-- ──────────────────────────────────────────────
DO $grants$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'academy_member_presence','academy_member_follows','academy_space_profiles',
    'academy_notifications','academy_lesson_comments','academy_lesson_comment_likes',
    'academy_event_invitations','academy_google_calendar_tokens','academy_member_calendar_tokens'
  ]) LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $grants$;

NOTIFY pgrst, 'reload schema';
