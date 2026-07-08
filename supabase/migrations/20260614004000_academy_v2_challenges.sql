-- ============================================================
-- CRION Academy v2 — Challenges (S5)
--
-- Challenges nas.io-style: secuencia de checkpoints con submission
-- (texto/foto/video/link/file) + leaderboard. Vive a nivel de space
-- (NO nested en curso) para que el creator pueda lanzar challenges
-- transversales (ej: "7 días de contenido", "Reto de comunidad").
--
-- Dos modos:
--   - fixed_dates: ventana cerrada (start_date - end_date)
--   - always_on:  evergreen, cada participante recorre `duration_days`
--                 desde su join_at.
--
-- Rollback:
--   DROP TABLE academy_challenge_submissions CASCADE;
--   DROP TABLE academy_challenge_participants CASCADE;
--   DROP TABLE academy_challenge_checkpoints CASCADE;
--   DROP TABLE academy_challenges CASCADE;
-- ============================================================

-- ─── academy_challenges ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  cover_url text,
  mode text NOT NULL DEFAULT 'always_on' CHECK (mode IN ('fixed_dates', 'always_on')),
  start_date date,
  end_date date,
  duration_days int,                                    -- only for always_on
  xp_reward int NOT NULL DEFAULT 100,
  badge_id text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, slug),
  CHECK (
    (mode = 'fixed_dates' AND start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
    OR (mode = 'always_on' AND duration_days IS NOT NULL AND duration_days > 0)
  )
);

CREATE INDEX IF NOT EXISTS academy_challenges_space_status_idx
  ON public.academy_challenges (space_id, status);


-- ─── academy_challenge_checkpoints ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_challenge_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.academy_challenges(id) ON DELETE CASCADE,
  sort_order int NOT NULL,                              -- orden secuencial
  title text NOT NULL,
  description text,
  video_url text,
  image_url text,
  submission_type text NOT NULL DEFAULT 'none'
    CHECK (submission_type IN ('none', 'text', 'file', 'video', 'link', 'photo')),
  submission_prompt text,                               -- "Sube tu video de 30 segundos"
  xp_reward int NOT NULL DEFAULT 10,
  is_welcome boolean NOT NULL DEFAULT false,            -- el primero suele ser bienvenida
  requires_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, sort_order)
);

CREATE INDEX IF NOT EXISTS academy_challenge_checkpoints_challenge_idx
  ON public.academy_challenge_checkpoints (challenge_id, sort_order);


-- ─── academy_challenge_participants ────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.academy_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  current_checkpoint_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'dropped')),
  UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS academy_challenge_participants_user_idx
  ON public.academy_challenge_participants (user_id, status);


-- ─── academy_challenge_submissions ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id uuid NOT NULL REFERENCES public.academy_challenge_checkpoints(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.academy_challenge_participants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_text text,
  file_url text,
  link_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checkpoint_id, participant_id)
);

CREATE INDEX IF NOT EXISTS academy_challenge_submissions_user_idx
  ON public.academy_challenge_submissions (user_id, submitted_at DESC);


-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.academy_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_challenge_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_challenge_submissions ENABLE ROW LEVEL SECURITY;

-- challenges: visibles para miembros del space (cuando published);
-- gestionados por owner.
CREATE POLICY "academy_challenges_members_read"
  ON public.academy_challenges FOR SELECT TO authenticated
  USING (
    status = 'published' AND EXISTS (
      SELECT 1 FROM academy_memberships m
      WHERE m.space_id = space_id AND m.user_id = auth.uid() AND m.is_active = true
    )
  );

CREATE POLICY "academy_challenges_owner_all"
  ON public.academy_challenges FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid())
  );

-- checkpoints: heredan permisos del challenge
CREATE POLICY "academy_checkpoints_members_read"
  ON public.academy_challenge_checkpoints FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_challenges ch
      JOIN academy_memberships m ON m.space_id = ch.space_id
      WHERE ch.id = challenge_id AND ch.status = 'published'
        AND m.user_id = auth.uid() AND m.is_active = true
    )
  );

CREATE POLICY "academy_checkpoints_owner_all"
  ON public.academy_challenge_checkpoints FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_challenges ch
      JOIN academy_spaces s ON s.id = ch.space_id
      WHERE ch.id = challenge_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM academy_challenges ch
      JOIN academy_spaces s ON s.id = ch.space_id
      WHERE ch.id = challenge_id AND s.owner_id = auth.uid()
    )
  );

-- participants: el propio user lee/crea su propia participación; owner lee todas
CREATE POLICY "academy_participants_self_all"
  ON public.academy_challenge_participants FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "academy_participants_owner_read"
  ON public.academy_challenge_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_challenges ch
      JOIN academy_spaces s ON s.id = ch.space_id
      WHERE ch.id = challenge_id AND s.owner_id = auth.uid()
    )
  );

-- submissions: user crea/edita las suyas; owner las revisa
CREATE POLICY "academy_submissions_self_insert"
  ON public.academy_challenge_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "academy_submissions_self_read"
  ON public.academy_challenge_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "academy_submissions_owner_all"
  ON public.academy_challenge_submissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_challenge_checkpoints cp
      JOIN academy_challenges ch ON ch.id = cp.challenge_id
      JOIN academy_spaces s ON s.id = ch.space_id
      WHERE cp.id = checkpoint_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM academy_challenge_checkpoints cp
      JOIN academy_challenges ch ON ch.id = cp.challenge_id
      JOIN academy_spaces s ON s.id = ch.space_id
      WHERE cp.id = checkpoint_id AND s.owner_id = auth.uid()
    )
  );

GRANT ALL ON public.academy_challenges TO service_role, authenticated;
GRANT ALL ON public.academy_challenge_checkpoints TO service_role, authenticated;
GRANT ALL ON public.academy_challenge_participants TO service_role, authenticated;
GRANT ALL ON public.academy_challenge_submissions TO service_role, authenticated;


-- ─── Triggers bus ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_academy_v2_bus_checkpoint_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id uuid;
  v_space_slug text;
  v_challenge_title text;
  v_checkpoint_title text;
  v_xp int;
  v_requires_review boolean;
BEGIN
  SELECT ch.space_id, sp.slug, ch.title, cp.title, cp.xp_reward, cp.requires_review
    INTO v_space_id, v_space_slug, v_challenge_title, v_checkpoint_title, v_xp, v_requires_review
  FROM academy_challenge_checkpoints cp
  JOIN academy_challenges ch ON ch.id = cp.challenge_id
  JOIN academy_spaces sp ON sp.id = ch.space_id
  WHERE cp.id = NEW.checkpoint_id;

  -- Si no requiere review, marcar como auto_approved + award XP
  IF NOT v_requires_review AND NEW.status = 'pending' THEN
    UPDATE academy_challenge_submissions
      SET status = 'auto_approved', reviewed_at = now()
      WHERE id = NEW.id;
    NEW.status := 'auto_approved';

    -- XP via award_space_points (whitelist limita el monto)
    PERFORM award_space_points(v_space_id, NEW.user_id, 'lesson_completed', v_xp);
  END IF;

  PERFORM academy_emit_event_safe(
    p_type     := 'checkpoint_submitted',
    p_space_id := v_space_id,
    p_user_id  := NEW.user_id,
    p_payload  := jsonb_build_object(
      'title',          'Subiste tu checkpoint',
      'body',           v_checkpoint_title || ' (' || v_challenge_title || ')',
      'link',           '/academia/' || v_space_slug || '/retos',
      'reference_id',   NEW.checkpoint_id,
      'reference_type', 'checkpoint'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_v2_bus_checkpoint_submitted_t ON public.academy_challenge_submissions;
CREATE TRIGGER trg_academy_v2_bus_checkpoint_submitted_t
  AFTER INSERT ON public.academy_challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_v2_bus_checkpoint_submitted();


CREATE OR REPLACE FUNCTION public.trg_academy_v2_bus_checkpoint_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id uuid;
  v_space_slug text;
  v_xp int;
BEGIN
  IF NEW.status NOT IN ('approved') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT ch.space_id, sp.slug, cp.xp_reward
    INTO v_space_id, v_space_slug, v_xp
  FROM academy_challenge_checkpoints cp
  JOIN academy_challenges ch ON ch.id = cp.challenge_id
  JOIN academy_spaces sp ON sp.id = ch.space_id
  WHERE cp.id = NEW.checkpoint_id;

  PERFORM award_space_points(v_space_id, NEW.user_id, 'lesson_completed', v_xp);

  PERFORM academy_emit_event_safe(
    p_type     := 'checkpoint_approved',
    p_space_id := v_space_id,
    p_user_id  := NEW.user_id,
    p_payload  := jsonb_build_object(
      'title',          'Tu checkpoint fue aprobado',
      'body',           'Has ganado ' || v_xp::text || ' XP',
      'link',           '/academia/' || v_space_slug || '/retos',
      'reference_id',   NEW.checkpoint_id,
      'reference_type', 'checkpoint'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_v2_bus_checkpoint_approved_t ON public.academy_challenge_submissions;
CREATE TRIGGER trg_academy_v2_bus_checkpoint_approved_t
  AFTER UPDATE OF status ON public.academy_challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_v2_bus_checkpoint_approved();
