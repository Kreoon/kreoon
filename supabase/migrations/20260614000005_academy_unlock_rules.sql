-- ============================================================================
-- Desbloqueo condicional / gamificación para cursos, módulos y lecciones.
-- Reglas combinables (Y/O) evaluadas server-side de forma segura.
-- ============================================================================

-- 1. Lógica de combinación de condiciones por ítem (all = Y, any = O)
ALTER TABLE public.academy_courses
  ADD COLUMN IF NOT EXISTS unlock_logic text NOT NULL DEFAULT 'all'
  CHECK (unlock_logic IN ('all', 'any'));
ALTER TABLE public.academy_modules
  ADD COLUMN IF NOT EXISTS unlock_logic text NOT NULL DEFAULT 'all'
  CHECK (unlock_logic IN ('all', 'any'));
ALTER TABLE public.academy_lessons
  ADD COLUMN IF NOT EXISTS unlock_logic text NOT NULL DEFAULT 'all'
  CHECK (unlock_logic IN ('all', 'any'));

-- 2. Tabla genérica de reglas de desbloqueo
CREATE TABLE IF NOT EXISTS public.academy_unlock_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id    uuid NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('course', 'module', 'lesson')),
  target_id   uuid NOT NULL,
  rule_type   text NOT NULL CHECK (rule_type IN (
    'min_level', 'min_xp', 'course_completed', 'module_completed',
    'lesson_completed', 'quiz_passed', 'badge_earned', 'drip_days', 'platform_role'
  )),
  int_value   int,    -- nivel / xp / días / score% según rule_type
  ref_id      uuid,   -- curso / módulo / lección / quiz requerido
  text_value  text,   -- rol de plataforma KREOON o badge id (TEXT)
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unlock_rules_target
  ON public.academy_unlock_rules (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_unlock_rules_space
  ON public.academy_unlock_rules (space_id);

COMMENT ON TABLE public.academy_unlock_rules IS
  'Reglas de desbloqueo condicional de cursos/módulos/lecciones de Academia.';

-- 3. RLS
ALTER TABLE public.academy_unlock_rules ENABLE ROW LEVEL SECURITY;

-- Lectura: staff del space (owner del space o instructor de un curso del space).
-- Los alumnos NO leen la tabla directo: usan la RPC de evaluación.
DROP POLICY IF EXISTS "unlock_rules_read" ON public.academy_unlock_rules;
CREATE POLICY "unlock_rules_read" ON public.academy_unlock_rules FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM academy_courses c WHERE c.space_id = academy_unlock_rules.space_id AND c.instructor_id = auth.uid())
);

-- Gestión: owner del space o instructor de un curso del space.
DROP POLICY IF EXISTS "unlock_rules_manage" ON public.academy_unlock_rules;
CREATE POLICY "unlock_rules_manage" ON public.academy_unlock_rules FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM academy_courses c WHERE c.space_id = academy_unlock_rules.space_id AND c.instructor_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM academy_courses c WHERE c.space_id = academy_unlock_rules.space_id AND c.instructor_id = auth.uid())
);

-- 4. GRANTS (tablas nuevas requieren grant a service_role — ver patrón del proyecto)
GRANT ALL ON public.academy_unlock_rules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_unlock_rules TO authenticated;

-- ============================================================================
-- 5. RPC de evaluación: devuelve si el target está desbloqueado + requisitos.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.academy_evaluate_unlock(
  p_target_type text,
  p_target_id   uuid,
  p_user_id     uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_uid       uuid := COALESCE(p_user_id, auth.uid());
  v_space_id  uuid;
  v_course_id uuid;
  v_logic     text := 'all';
  v_rule      record;
  v_reqs      jsonb := '[]'::jsonb;
  v_met       boolean;
  v_any_met   boolean := false;
  v_all_met   boolean := true;
  v_has_rules boolean := false;
  v_bypass    boolean := false;
  v_label     text;
  v_detail    text;
  v_level     int;
  v_xp        int;
  v_enrolled_at timestamptz;
  v_tmp       int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('unlocked', false, 'logic', 'all', 'bypass', false, 'requirements', '[]'::jsonb);
  END IF;

  -- Resolver space + curso + lógica según el tipo de target
  IF p_target_type = 'course' THEN
    SELECT space_id, id, unlock_logic INTO v_space_id, v_course_id, v_logic
      FROM academy_courses WHERE id = p_target_id;
  ELSIF p_target_type = 'module' THEN
    SELECT c.space_id, c.id, m.unlock_logic INTO v_space_id, v_course_id, v_logic
      FROM academy_modules m JOIN academy_courses c ON c.id = m.course_id WHERE m.id = p_target_id;
  ELSIF p_target_type = 'lesson' THEN
    SELECT c.space_id, c.id, l.unlock_logic INTO v_space_id, v_course_id, v_logic
      FROM academy_lessons l JOIN academy_courses c ON c.id = l.course_id WHERE l.id = p_target_id;
  END IF;

  IF v_space_id IS NULL THEN
    RETURN jsonb_build_object('unlocked', true, 'logic', COALESCE(v_logic,'all'), 'bypass', false, 'requirements', '[]'::jsonb);
  END IF;

  -- Bypass: staff (owner/instructor/moderador) o admin de plataforma nunca se bloquean
  SELECT
       EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = v_space_id AND s.owner_id = v_uid)
    OR EXISTS (SELECT 1 FROM academy_courses c WHERE c.id = v_course_id AND c.instructor_id = v_uid)
    OR EXISTS (SELECT 1 FROM academy_memberships m WHERE m.space_id = v_space_id AND m.user_id = v_uid
                 AND m.is_active AND m.role IN ('owner','instructor','moderator'))
    OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = v_uid AND ur.role = 'admin')
  INTO v_bypass;

  IF v_bypass THEN
    RETURN jsonb_build_object('unlocked', true, 'logic', v_logic, 'bypass', true, 'requirements', '[]'::jsonb);
  END IF;

  -- Gamificación del usuario en este space
  SELECT level, total_points INTO v_level, v_xp
    FROM academy_space_points WHERE space_id = v_space_id AND user_id = v_uid;
  v_level := COALESCE(v_level, 1);
  v_xp := COALESCE(v_xp, 0);

  -- Inscripción al curso del target (para drip)
  SELECT enrolled_at INTO v_enrolled_at
    FROM academy_enrollments WHERE course_id = v_course_id AND user_id = v_uid;

  FOR v_rule IN
    SELECT * FROM academy_unlock_rules
     WHERE target_type = p_target_type AND target_id = p_target_id
     ORDER BY created_at
  LOOP
    v_has_rules := true;
    v_met := false;
    v_label := NULL;
    v_detail := NULL;

    IF v_rule.rule_type = 'min_level' THEN
      v_met := v_level >= COALESCE(v_rule.int_value, 0);
      v_label := 'Alcanzar nivel ' || COALESCE(v_rule.int_value, 0);
      v_detail := 'Tu nivel actual: ' || v_level;

    ELSIF v_rule.rule_type = 'min_xp' THEN
      v_met := v_xp >= COALESCE(v_rule.int_value, 0);
      v_label := 'Acumular ' || COALESCE(v_rule.int_value, 0) || ' puntos';
      v_detail := 'Tus puntos: ' || v_xp;

    ELSIF v_rule.rule_type = 'course_completed' THEN
      SELECT (completed_at IS NOT NULL OR completion_pct >= 100) INTO v_met
        FROM academy_enrollments WHERE course_id = v_rule.ref_id AND user_id = v_uid;
      v_met := COALESCE(v_met, false);
      SELECT 'Completar: ' || title INTO v_label FROM academy_courses WHERE id = v_rule.ref_id;

    ELSIF v_rule.rule_type = 'module_completed' THEN
      SELECT NOT EXISTS (
        SELECT 1 FROM academy_lessons l
         WHERE l.module_id = v_rule.ref_id AND l.is_required = true
           AND NOT EXISTS (SELECT 1 FROM academy_lesson_progress p
                            WHERE p.lesson_id = l.id AND p.user_id = v_uid AND p.status = 'completed')
      ) INTO v_met;
      SELECT 'Completar módulo: ' || title INTO v_label FROM academy_modules WHERE id = v_rule.ref_id;

    ELSIF v_rule.rule_type = 'lesson_completed' THEN
      SELECT EXISTS (SELECT 1 FROM academy_lesson_progress
                      WHERE lesson_id = v_rule.ref_id AND user_id = v_uid AND status = 'completed') INTO v_met;
      SELECT 'Completar lección: ' || title INTO v_label FROM academy_lessons WHERE id = v_rule.ref_id;

    ELSIF v_rule.rule_type = 'quiz_passed' THEN
      SELECT EXISTS (
        SELECT 1 FROM academy_quiz_attempts
         WHERE quiz_id = v_rule.ref_id AND user_id = v_uid
           AND score_pct >= COALESCE(v_rule.int_value, 0)
           AND status IN ('passed', 'completed')
      ) INTO v_met;
      SELECT 'Aprobar quiz (' || COALESCE(v_rule.int_value, 0) || '%): ' || title
        INTO v_label FROM academy_quizzes WHERE id = v_rule.ref_id;
      IF v_label IS NULL THEN v_label := 'Aprobar quiz con ' || COALESCE(v_rule.int_value, 0) || '%'; END IF;

    ELSIF v_rule.rule_type = 'badge_earned' THEN
      SELECT EXISTS (SELECT 1 FROM academy_member_badges
                      WHERE badge_id = v_rule.text_value AND user_id = v_uid AND space_id = v_space_id) INTO v_met;
      SELECT 'Obtener insignia: ' || name INTO v_label FROM academy_badges WHERE id = v_rule.text_value;
      IF v_label IS NULL THEN v_label := 'Obtener una insignia'; END IF;

    ELSIF v_rule.rule_type = 'drip_days' THEN
      IF COALESCE(v_rule.int_value, 0) = 0 THEN
        v_met := true;
      ELSIF v_enrolled_at IS NULL THEN
        v_met := false;
      ELSE
        v_met := (v_enrolled_at + (v_rule.int_value || ' days')::interval) <= NOW();
      END IF;
      v_label := 'Disponible ' || COALESCE(v_rule.int_value, 0) || ' días tras inscribirte';
      IF v_enrolled_at IS NOT NULL AND NOT v_met THEN
        v_detail := 'Faltan ' ||
          GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((v_enrolled_at + (v_rule.int_value || ' days')::interval) - NOW())) / 86400)::int)
          || ' días';
      END IF;

    ELSIF v_rule.rule_type = 'platform_role' THEN
      -- role es un enum: castear a text para comparar con el valor configurado
      SELECT (
           EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = v_uid AND om.role::text = v_rule.text_value)
        OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = v_uid AND ur.role::text = v_rule.text_value)
      ) INTO v_met;
      v_label := 'Tener el rol requerido';
      v_detail := v_rule.text_value;
    END IF;

    v_reqs := v_reqs || jsonb_build_object(
      'rule_type',  v_rule.rule_type,
      'met',        COALESCE(v_met, false),
      'target',     COALESCE(v_rule.int_value, 0),
      'ref_id',     v_rule.ref_id,
      'text_value', v_rule.text_value,
      'label',      v_label,
      'detail',     v_detail
    );

    IF COALESCE(v_met, false) THEN v_any_met := true; ELSE v_all_met := false; END IF;
  END LOOP;

  -- Compatibilidad: honra el drip legacy (unlock_after_days) en lecciones
  IF p_target_type = 'lesson' THEN
    SELECT unlock_after_days INTO v_tmp FROM academy_lessons WHERE id = p_target_id;
    IF COALESCE(v_tmp, 0) > 0
       AND NOT EXISTS (SELECT 1 FROM academy_unlock_rules
                        WHERE target_type = 'lesson' AND target_id = p_target_id AND rule_type = 'drip_days') THEN
      v_has_rules := true;
      IF v_enrolled_at IS NULL THEN v_met := false;
      ELSE v_met := (v_enrolled_at + (v_tmp || ' days')::interval) <= NOW(); END IF;
      v_reqs := v_reqs || jsonb_build_object(
        'rule_type', 'drip_days', 'met', v_met, 'target', v_tmp,
        'label', 'Disponible ' || v_tmp || ' días tras inscribirte', 'detail', NULL);
      IF v_met THEN v_any_met := true; ELSE v_all_met := false; END IF;
    END IF;
  END IF;

  IF NOT v_has_rules THEN
    RETURN jsonb_build_object('unlocked', true, 'logic', v_logic, 'bypass', false, 'requirements', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'unlocked',     CASE WHEN v_logic = 'any' THEN v_any_met ELSE v_all_met END,
    'logic',        v_logic,
    'bypass',       false,
    'requirements', v_reqs
  );
END; $func$;

GRANT EXECUTE ON FUNCTION public.academy_evaluate_unlock(text, uuid, uuid) TO authenticated;

-- ============================================================================
-- 6. RPC batch: evalúa varios targets de una sola vez (currículo / grilla).
-- Devuelve { "<target_id>": <evaluation>, ... }
-- ============================================================================
CREATE OR REPLACE FUNCTION public.academy_evaluate_unlock_batch(p_targets jsonb)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_item   jsonb;
  v_result jsonb := '{}'::jsonb;
BEGIN
  IF p_targets IS NULL THEN RETURN '{}'::jsonb; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_targets)
  LOOP
    v_result := v_result || jsonb_build_object(
      (v_item->>'target_id'),
      public.academy_evaluate_unlock(v_item->>'target_type', (v_item->>'target_id')::uuid, NULL)
    );
  END LOOP;
  RETURN v_result;
END; $func$;

GRANT EXECUTE ON FUNCTION public.academy_evaluate_unlock_batch(jsonb) TO authenticated;
