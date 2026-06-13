-- ============================================================
-- KREOON ACADEMIA · Onboarding + Leads/CRM + Gamificación pro-comunidad
-- ============================================================
-- Cubre:
-- 1. Catálogos faltantes: academy_badges + academy_level_tiers
-- 2. Columnas de onboarding/lead en academy_memberships
-- 3. Tabla academy_space_leads (visitantes pre-registro)
-- 4. Columna attended en academy_event_rsvps
-- 5. award_space_points whitelist con 5 acciones nuevas
-- 6. RPC academy_join_space (join idempotente + referral)
-- 7. Triggers: intro_post, course_completed, referral_badge
-- 8. RPCs: track_share, event_checkin
-- 9. Seed: 6 niveles + 14 badges (9 existentes + 5 nuevos)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 1: Catálogos
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.academy_level_tiers (
  level INT PRIMARY KEY,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL,
  min_xp INT NOT NULL,
  max_xp INT,
  perk_description TEXT
);

CREATE TABLE IF NOT EXISTS public.academy_badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7c3aed',
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  category TEXT NOT NULL DEFAULT 'general',
  xp_reward INT NOT NULL DEFAULT 0
);

ALTER TABLE public.academy_level_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "level_tiers_public_read" ON public.academy_level_tiers;
CREATE POLICY "level_tiers_public_read" ON public.academy_level_tiers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "badges_public_read" ON public.academy_badges;
CREATE POLICY "badges_public_read" ON public.academy_badges FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.academy_level_tiers TO authenticated;
GRANT SELECT ON public.academy_badges TO authenticated;

-- Seed niveles Kreoon
INSERT INTO public.academy_level_tiers (level, title, emoji, min_xp, max_xp, perk_description) VALUES
  (1, 'Aprendiz',  '🌱', 0,    100,   'Acabas de empezar'),
  (2, 'Estudiante','📚', 100,  300,   'Dominas lo básico'),
  (3, 'Creador',   '✨', 300,  700,   'Tu voz se nota'),
  (4, 'Maestro',   '⚔️', 700,  1500,  'Inspiras a otros'),
  (5, 'Mentor',    '🧙', 1500, 3000,  'Guías a la comunidad'),
  (6, 'Leyenda',   '🌟', 3000, NULL,  'Has tocado el techo')
ON CONFLICT (level) DO UPDATE SET
  title = EXCLUDED.title, emoji = EXCLUDED.emoji, min_xp = EXCLUDED.min_xp,
  max_xp = EXCLUDED.max_xp, perk_description = EXCLUDED.perk_description;

-- Seed badges (9 que ya existen como triggers + 5 nuevos)
INSERT INTO public.academy_badges (id, name, description, emoji, color, rarity, category, xp_reward) VALUES
  ('first_post',    'Primera voz',     'Publicaste tu primer post',                                       '✍️', '#7c3aed', 'common',    'community', 10),
  ('first_lesson',  'Primer paso',     'Completaste tu primera lección',                                  '🎯', '#7c3aed', 'common',    'learning',  10),
  ('quiz_perfect',  'Mente brillante', 'Sacaste 100% en un quiz',                                         '🧠', '#06b6d4', 'rare',      'learning',  30),
  ('quiz_streak_5', 'Imparable',       'Aprobaste 5 quizzes seguidos al primer intento',                  '🔥', '#06b6d4', 'rare',      'learning',  50),
  ('helpful_5',     'Servicial',       'Tus respuestas fueron destacadas 5 veces',                        '💡', '#06b6d4', 'rare',      'community', 50),
  ('socializer',    'Social',          'Comentaste en 25 posts distintos',                                '💬', '#7c3aed', 'epic',      'community', 60),
  ('beloved',       'Querido',         'Acumulaste 100 likes en tus posts',                               '❤️', '#7c3aed', 'epic',      'community', 80),
  ('night_owl',    'Búho nocturno',   'Completaste 10 lecciones entre las 23:00 y 03:00',                '🦉', '#06b6d4', 'rare',      'learning',  40),
  ('early_bird',    'Madrugador',      'Completaste 10 lecciones entre las 04:00 y 07:00',                '🌅', '#06b6d4', 'rare',      'learning',  40),
  ('founder',       'Fundador',        'Estuviste entre los primeros 100 miembros',                       '🏛️', '#db2777', 'legendary', 'meta',      100),
  ('mentor',        'Mentor',          'El owner te reconoció como mentor de la comunidad',               '🧙', '#db2777', 'legendary', 'meta',      120),
  -- nuevos pro-comunidad
  ('welcome',       'Bienvenido',      'Completaste tu presentación. Bienvenido a la comunidad',          '🌟', '#7c3aed', 'common',    'onboarding', 50),
  ('connector_5',   'Conector',        'Invitaste a 5 amigos que se unieron. Eres un imán de comunidad',  '🤝', '#06b6d4', 'rare',      'referral',  100),
  ('regular_10',    'Asiduo',          'Asististe a 10 lives. La comunidad te conoce',                    '🎥', '#06b6d4', 'rare',      'engagement', 80),
  ('graduate',      'Graduado',        'Completaste un curso al 100%. Eres parte del club',               '🎓', '#7c3aed', 'epic',      'learning',  150),
  ('share_starter', 'Voz pública',     'Compartiste 5 posts. Tu voz multiplica el alcance',               '📢', '#7c3aed', 'common',    'engagement', 30)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, emoji = EXCLUDED.emoji,
  color = EXCLUDED.color, rarity = EXCLUDED.rarity, category = EXCLUDED.category,
  xp_reward = EXCLUDED.xp_reward;

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 2: Columnas onboarding/lead en academy_memberships
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.academy_memberships
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS referrer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'member'
    CHECK (lifecycle_stage IN ('visitor','lead','member','student','champion'));

CREATE INDEX IF NOT EXISTS idx_academy_memberships_referrer
  ON public.academy_memberships(referrer_user_id)
  WHERE referrer_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_academy_memberships_consent
  ON public.academy_memberships(space_id)
  WHERE marketing_consent = true;

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 3: Tabla academy_space_leads (visitantes pre-registro)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.academy_space_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  country TEXT,
  source TEXT,
  utm_data JSONB DEFAULT '{}',
  marketing_consent BOOLEAN NOT NULL DEFAULT true,
  converted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, email)
);

CREATE INDEX IF NOT EXISTS idx_academy_leads_space
  ON public.academy_space_leads(space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_academy_leads_email
  ON public.academy_space_leads(lower(email));

ALTER TABLE public.academy_space_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_owner_read" ON public.academy_space_leads;
CREATE POLICY "leads_owner_read" ON public.academy_space_leads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_spaces
      WHERE id = academy_space_leads.space_id AND owner_id = auth.uid()
    )
  );

GRANT INSERT, SELECT, UPDATE ON public.academy_space_leads TO service_role;
GRANT SELECT ON public.academy_space_leads TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 4: attended en academy_event_rsvps
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.academy_event_rsvps
  ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_rsvps_attended
  ON public.academy_event_rsvps(event_id)
  WHERE attended = true;

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 5: award_space_points whitelist actualizada
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.award_space_points(
  p_space_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_points INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_points INT;
  v_capped INT;
BEGIN
  -- Whitelist con tope por acción (defensa en profundidad)
  v_max_points := CASE p_action
    WHEN 'post_created'         THEN 5
    WHEN 'comment_created'      THEN 2
    WHEN 'reaction_received'    THEN 1
    WHEN 'lesson_completed'     THEN 10
    WHEN 'quiz_passed'          THEN 15
    WHEN 'streak_milestone'     THEN 25
    WHEN 'badge_earned'         THEN 30
    -- Nuevos pro-comunidad:
    WHEN 'intro_post'           THEN 50
    WHEN 'referral'             THEN 100
    WHEN 'share'                THEN 10
    WHEN 'live_attended'        THEN 20
    WHEN 'course_completed'     THEN 50
    ELSE 0
  END;

  IF v_max_points = 0 THEN
    RETURN;
  END IF;

  v_capped := LEAST(GREATEST(p_points, 0), v_max_points);
  IF v_capped = 0 THEN RETURN; END IF;

  INSERT INTO academy_space_points (
    space_id, user_id, total_points, current_week_points, current_month_points
  )
  VALUES (p_space_id, p_user_id, v_capped, v_capped, v_capped)
  ON CONFLICT (space_id, user_id) DO UPDATE SET
    total_points = academy_space_points.total_points + EXCLUDED.total_points,
    current_week_points = academy_space_points.current_week_points + EXCLUDED.current_week_points,
    current_month_points = academy_space_points.current_month_points + EXCLUDED.current_month_points,
    updated_at = NOW();

  -- Log del evento
  INSERT INTO academy_space_point_events (space_id, user_id, action, points)
  VALUES (p_space_id, p_user_id, p_action, v_capped);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_space_points(UUID, UUID, TEXT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_space_points(UUID, UUID, TEXT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.award_space_points(UUID, UUID, TEXT, INT) TO service_role;

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 6: RPC academy_join_space (idempotente + referral)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.academy_join_space(
  p_space_slug TEXT,
  p_consent BOOLEAN DEFAULT false,
  p_country TEXT DEFAULT NULL,
  p_referrer_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id UUID;
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_existing_active BOOLEAN;
  v_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT id INTO v_space_id
  FROM academy_spaces
  WHERE slug = p_space_slug AND is_public = true;

  IF v_space_id IS NULL THEN
    RAISE EXCEPTION 'space_not_found_or_not_public';
  END IF;

  SELECT id, is_active INTO v_existing_id, v_existing_active
  FROM academy_memberships
  WHERE space_id = v_space_id AND user_id = v_user_id;

  IF v_existing_id IS NOT NULL AND v_existing_active THEN
    RETURN jsonb_build_object(
      'status', 'already_member',
      'membership_id', v_existing_id,
      'space_id', v_space_id
    );
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE academy_memberships
    SET is_active = true,
        marketing_consent = COALESCE(p_consent, marketing_consent),
        country = COALESCE(p_country, country),
        referrer_user_id = COALESCE(referrer_user_id, p_referrer_id)
    WHERE id = v_existing_id;
    v_status := 'reactivated';
  ELSE
    INSERT INTO academy_memberships (
      space_id, user_id, role, is_active,
      marketing_consent, country, lead_source, referrer_user_id, lifecycle_stage
    )
    VALUES (
      v_space_id, v_user_id, 'student', true,
      COALESCE(p_consent, false), p_country, p_source,
      CASE WHEN p_referrer_id = v_user_id THEN NULL ELSE p_referrer_id END,
      'member'
    )
    RETURNING id INTO v_existing_id;
    v_status := 'joined';

    -- Bonus referrer: +100 XP en el space al que invitó
    IF p_referrer_id IS NOT NULL AND p_referrer_id <> v_user_id THEN
      PERFORM award_space_points(v_space_id, p_referrer_id, 'referral', 100);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', v_status,
    'membership_id', v_existing_id,
    'space_id', v_space_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.academy_join_space(TEXT, BOOLEAN, TEXT, UUID, TEXT) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 7: Trigger intro_post (+50 XP + badge welcome)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_academy_intro_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat_slug TEXT;
  v_already_done INT;
BEGIN
  IF NEW.category_id IS NULL THEN RETURN NEW; END IF;

  SELECT slug INTO v_cat_slug
  FROM academy_post_categories
  WHERE id = NEW.category_id;

  IF v_cat_slug NOT IN ('intro', 'presentacion', 'presentate', 'welcome', 'bienvenida') THEN
    RETURN NEW;
  END IF;

  -- Solo una vez por space+user
  SELECT COUNT(*) INTO v_already_done
  FROM academy_posts p
  JOIN academy_post_categories c ON c.id = p.category_id
  WHERE p.space_id = NEW.space_id
    AND p.author_id = NEW.author_id
    AND c.slug IN ('intro', 'presentacion', 'presentate', 'welcome', 'bienvenida')
    AND p.id <> NEW.id;

  IF v_already_done > 0 THEN RETURN NEW; END IF;

  PERFORM award_space_points(NEW.space_id, NEW.author_id, 'intro_post', 50);
  PERFORM grant_badge_if_new(NEW.space_id, NEW.author_id, 'welcome');

  -- Marca onboarding como completado
  UPDATE academy_memberships
  SET onboarding_completed_at = NOW()
  WHERE space_id = NEW.space_id AND user_id = NEW.author_id
    AND onboarding_completed_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_intro_post_t ON public.academy_posts;
CREATE TRIGGER trg_academy_intro_post_t
  AFTER INSERT ON public.academy_posts
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_intro_post();

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 8: Trigger course_completed (+50 XP + badge graduate)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_academy_course_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id UUID;
BEGIN
  IF NEW.completion_pct >= 100
     AND (OLD IS NULL OR OLD.completion_pct < 100) THEN
    SELECT space_id INTO v_space_id
    FROM academy_courses
    WHERE id = NEW.course_id;

    IF v_space_id IS NOT NULL THEN
      PERFORM award_space_points(v_space_id, NEW.user_id, 'course_completed', 50);
      PERFORM grant_badge_if_new(v_space_id, NEW.user_id, 'graduate');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_course_completed_t ON public.academy_enrollments;
CREATE TRIGGER trg_academy_course_completed_t
  AFTER UPDATE OF completion_pct ON public.academy_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_course_completed();

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 9: Trigger referral badge (5 referrals → connector_5)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_academy_referral_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF NEW.referrer_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_count
  FROM academy_memberships
  WHERE space_id = NEW.space_id
    AND referrer_user_id = NEW.referrer_user_id
    AND is_active = true;

  IF v_count >= 5 THEN
    PERFORM grant_badge_if_new(NEW.space_id, NEW.referrer_user_id, 'connector_5');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_referral_badge_t ON public.academy_memberships;
CREATE TRIGGER trg_academy_referral_badge_t
  AFTER INSERT ON public.academy_memberships
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_referral_badge();

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 10: RPC academy_track_share (+5 XP + badge share_starter a 5)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.academy_post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.academy_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id, shared_to)
);

CREATE INDEX IF NOT EXISTS idx_post_shares_user ON public.academy_post_shares(user_id);

ALTER TABLE public.academy_post_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shares_own_read" ON public.academy_post_shares;
CREATE POLICY "shares_own_read" ON public.academy_post_shares FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.academy_track_share(
  p_post_id UUID,
  p_shared_to TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id UUID;
  v_user_id UUID := auth.uid();
  v_inserted BOOLEAN := false;
  v_total_shares INT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT space_id INTO v_space_id
  FROM academy_posts WHERE id = p_post_id;
  IF v_space_id IS NULL THEN RAISE EXCEPTION 'post_not_found'; END IF;

  INSERT INTO academy_post_shares (post_id, user_id, shared_to)
  VALUES (p_post_id, v_user_id, COALESCE(p_shared_to, 'unknown'))
  ON CONFLICT DO NOTHING
  RETURNING true INTO v_inserted;

  IF NOT COALESCE(v_inserted, false) THEN
    RETURN jsonb_build_object('status', 'already_shared');
  END IF;

  PERFORM award_space_points(v_space_id, v_user_id, 'share', 5);

  -- Badge share_starter al llegar a 5
  SELECT COUNT(DISTINCT post_id) INTO v_total_shares
  FROM academy_post_shares WHERE user_id = v_user_id;

  IF v_total_shares >= 5 THEN
    PERFORM grant_badge_if_new(v_space_id, v_user_id, 'share_starter');
  END IF;

  RETURN jsonb_build_object('status', 'tracked', 'total_shares', v_total_shares);
END;
$$;

GRANT EXECUTE ON FUNCTION public.academy_track_share(UUID, TEXT) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 11: RPC academy_event_checkin (+20 XP + badge regular_10)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.academy_event_checkin(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id UUID;
  v_user_id UUID := auth.uid();
  v_was_attended BOOLEAN := false;
  v_total_attended INT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT space_id INTO v_space_id
  FROM academy_space_events WHERE id = p_event_id;
  IF v_space_id IS NULL THEN RAISE EXCEPTION 'event_not_found'; END IF;

  -- Marca asistencia. Si ya estaba marcado, no duplica puntos.
  WITH upd AS (
    UPDATE academy_event_rsvps
    SET attended = true, attended_at = NOW(), status = 'going'
    WHERE event_id = p_event_id AND user_id = v_user_id AND attended = false
    RETURNING id
  )
  SELECT EXISTS(SELECT 1 FROM upd) INTO v_was_attended;

  IF NOT v_was_attended THEN
    -- Crea RSVP marcado attended si no existe
    INSERT INTO academy_event_rsvps (event_id, user_id, status, attended, attended_at)
    VALUES (p_event_id, v_user_id, 'going', true, NOW())
    ON CONFLICT (event_id, user_id) DO UPDATE
      SET attended = true, attended_at = COALESCE(academy_event_rsvps.attended_at, NOW())
    RETURNING true INTO v_was_attended;
  END IF;

  IF NOT v_was_attended THEN
    RETURN jsonb_build_object('status', 'already_checked_in');
  END IF;

  PERFORM award_space_points(v_space_id, v_user_id, 'live_attended', 20);

  -- Badge regular_10 al asistir a 10 lives del mismo space
  SELECT COUNT(*) INTO v_total_attended
  FROM academy_event_rsvps r
  JOIN academy_space_events e ON e.id = r.event_id
  WHERE r.user_id = v_user_id AND r.attended = true AND e.space_id = v_space_id;

  IF v_total_attended >= 10 THEN
    PERFORM grant_badge_if_new(v_space_id, v_user_id, 'regular_10');
  END IF;

  RETURN jsonb_build_object('status', 'checked_in', 'total_attended', v_total_attended);
END;
$$;

GRANT EXECUTE ON FUNCTION public.academy_event_checkin(UUID) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 12: RPC academy_complete_onboarding (marcador)
-- ──────────────────────────────────────────────────────────────
-- Lo dispara el frontend cuando el wizard de 4 pasos termina.

CREATE OR REPLACE FUNCTION public.academy_complete_onboarding(p_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  UPDATE academy_memberships
  SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
  WHERE space_id = p_space_id AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.academy_complete_onboarding(UUID) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- SECCIÓN 13: Seed automático de categorías por defecto en spaces nuevos
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.seed_default_post_categories(p_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO academy_post_categories (space_id, name, slug, emoji, sort_order, is_default, who_can_post)
  VALUES
    (p_space_id, 'Presentación',   'intro',      '👋', 0, true, 'all'),
    (p_space_id, 'Discusión',      'general',    '💬', 1, true, 'all'),
    (p_space_id, 'Preguntas',      'questions',  '❓', 2, true, 'all'),
    (p_space_id, 'Recursos',       'resources',  '📚', 3, true, 'all'),
    (p_space_id, 'Logros',         'wins',       '🏆', 4, true, 'all'),
    (p_space_id, 'Anuncios',       'announcements', '📣', 5, true, 'instructor')
  ON CONFLICT (space_id, slug) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_post_categories(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_seed_categories_on_space_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM seed_default_post_categories(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_seed_categories ON public.academy_spaces;
CREATE TRIGGER trg_academy_seed_categories
  AFTER INSERT ON public.academy_spaces
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_categories_on_space_create();

-- Backfill: spaces existentes sin categoría intro
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM academy_spaces s
    WHERE NOT EXISTS (
      SELECT 1 FROM academy_post_categories c
      WHERE c.space_id = s.id AND c.slug = 'intro'
    )
  LOOP
    PERFORM seed_default_post_categories(r.id);
  END LOOP;
END $$;

