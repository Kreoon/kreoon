-- Hotfix bloqueante: tablas y función referenciadas por 20260608213600 y 20260608213700
-- pero nunca creadas. Sin esta migración, los triggers de badges y los cron jobs de
-- misiones fallan en runtime con relation does not exist.

-- 1) Badges otorgados por miembro/espacio
CREATE TABLE IF NOT EXISTS public.academy_member_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_member_badges_user
  ON public.academy_member_badges(space_id, user_id);
CREATE INDEX IF NOT EXISTS idx_academy_member_badges_badge
  ON public.academy_member_badges(badge_id);

ALTER TABLE public.academy_member_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_badges_space_members_read"
  ON public.academy_member_badges FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_memberships m
      WHERE m.space_id = academy_member_badges.space_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM academy_spaces s
      WHERE s.id = academy_member_badges.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- INSERT/DELETE solo via grant_badge_if_new / grant_mentor_badge (SECURITY DEFINER)
-- No exponemos policies de write a authenticated.

-- 2) Misiones semanales por miembro
CREATE TABLE IF NOT EXISTS public.academy_weekly_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  mission_type TEXT NOT NULL,
  goal INT NOT NULL CHECK (goal > 0),
  progress INT NOT NULL DEFAULT 0,
  xp_reward INT NOT NULL DEFAULT 0,
  energy_reward INT NOT NULL DEFAULT 0,
  emoji TEXT,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, user_id, week_start, mission_type)
);

CREATE INDEX IF NOT EXISTS idx_academy_weekly_missions_user_week
  ON public.academy_weekly_missions(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_academy_weekly_missions_space_week
  ON public.academy_weekly_missions(space_id, week_start);

ALTER TABLE public.academy_weekly_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_missions_own_read"
  ON public.academy_weekly_missions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Solo el sistema (cron via service_role + triggers SECURITY DEFINER) escribe.

-- 3) Función update_member_energy: cap en 100, no permite valores negativos
CREATE OR REPLACE FUNCTION public.update_member_energy(
  p_space_id UUID,
  p_user_id UUID,
  p_delta INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE academy_space_points
  SET
    energy = LEAST(100, GREATEST(0, energy + p_delta)),
    last_active_date = CURRENT_DATE
  WHERE space_id = p_space_id
    AND user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_member_energy(UUID, UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_member_energy(UUID, UUID, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.update_member_energy(UUID, UUID, INT) TO service_role;
