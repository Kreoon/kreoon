-- ============================================================================
-- Desacoplar Referidos y Academia del módulo UP (gamificación/reputación)
-- ============================================================================
-- Contexto: el módulo UP va a ser eliminado, incluida la tabla `reputation_events`.
-- Estas 3 funciones pertenecen a sistemas que SE QUEDAN (referidos y Academia)
-- pero escriben en `reputation_events`. Si no se reescriben, al borrar la tabla:
--   - award_referral_coins  → ERROR DURO (no tiene bloque EXCEPTION) → rompe el
--                             flujo de aplicación de código de referido.
--   - award_space_points    → WARNING silencioso permanente en cada acción de
--                             espacio de Academia.
--   - issue_academy_certificate → excepción tragada (EXCEPTION ... NULL) en cada
--                             emisión de certificado.
--
-- Qué se quita de cada una (y SOLO eso — el resto del cuerpo queda línea por línea):
--
-- 1) award_referral_coins(uuid, uuid, integer, text)
--    Se quita el único INSERT INTO reputation_events.
--    ⚠️ ATENCIÓN: ese INSERT era el ÚNICO efecto de la función. NO acredita
--    monedas en ninguna wallet ni tabla de referidos — la acreditación real la
--    hace el edge function `referral-service` por su cuenta (ensureUserWallet,
--    referral_relationships.referred_coins_awarded, campaign_redemptions).
--    La función queda por tanto como NO-OP explícita, en lugar de eliminarse,
--    para no romper los dos `supabase.rpc("award_referral_coins", ...)` vivos en
--    supabase/functions/referral-service/index.ts (líneas ~657 y ~698).
--    Decisión pendiente del lead: borrar la función y sus 2 callers, o mantener
--    el no-op hasta que se limpie el edge function.
--
-- 2) award_space_points(uuid, uuid, text, integer, uuid)
--    Se quita el bloque BEGIN ... INSERT INTO reputation_events ... EXCEPTION ...
--    END completo. Todo lo demás (validación de acción, cap de puntos,
--    academy_space_point_events, academy_space_points, recálculo de level) intacto.
--    No queda ninguna variable huérfana (v_max_points se sigue usando).
--
-- 3) issue_academy_certificate(uuid, uuid)
--    Se quita el bloque BEGIN ... INSERT INTO reputation_events ... EXCEPTION
--    WHEN OTHERS THEN NULL; END. Todo lo demás (validación de caller, chequeo de
--    elegibilidad, idempotencia, INSERT en academy_certificates, UPDATE de
--    academy_enrollments, jsonb de retorno) intacto.
--    No queda ninguna variable huérfana.
--
-- Firma, tipo de retorno, LANGUAGE, SECURITY DEFINER y search_path: sin cambios.
-- ============================================================================


-- ─── 1. Referidos ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_referral_coins(
  p_user_id uuid,
  p_org_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'referral_bonus'::text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- NO-OP desde la eliminación del módulo UP.
  -- Su único efecto era INSERT INTO reputation_events; la acreditación real de
  -- monedas/comisiones de referido vive en el edge function referral-service.
  -- Se conserva la firma para no romper los rpc() existentes.
  RETURN;
END;
$function$;


-- ─── 2. Academia · puntos de espacios ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_space_points(
  p_space_id uuid,
  p_user_id uuid,
  p_action text,
  p_points integer,
  p_reference_id uuid DEFAULT NULL::uuid
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_points INT;
BEGIN
  v_max_points := CASE p_action
    WHEN 'post_created'        THEN 5
    WHEN 'comment_created'     THEN 2
    WHEN 'reaction_received'   THEN 1
    WHEN 'lesson_completed'    THEN 10
    WHEN 'course_completed'    THEN 50
    WHEN 'streak_milestone'    THEN 25
    WHEN 'badge_earned'        THEN 30
    WHEN 'quiz_passed'         THEN 15
    WHEN 'intro_post'          THEN 50
    WHEN 'referral'            THEN 100
    WHEN 'share'               THEN 10
    WHEN 'live_attended'       THEN 20
    ELSE -1
  END;

  IF v_max_points = -1 THEN
    RAISE EXCEPTION 'invalid_action: %', p_action;
  END IF;

  p_points := LEAST(GREATEST(p_points, 0), v_max_points);

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

  -- [UP eliminado] Se retiró el bloque que insertaba en reputation_events
  -- ('academy_community_action'). Estaba envuelto en EXCEPTION WHEN OTHERS →
  -- habría degradado a WARNING permanente en cada acción de espacio.
END;
$function$;


-- ─── 3. Academia · certificados ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.issue_academy_certificate(
  p_course_id uuid,
  p_user_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_check JSONB;
  v_cert RECORD;
  v_course RECORD;
  v_student_name TEXT;
  v_instructor_name TEXT;
  v_final_score NUMERIC(5,2);
BEGIN
  -- C-02 fix: validar caller (excepción: service_role para invocaciones desde edge function)
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden: only the user can issue their own certificate';
  END IF;

  -- Reusamos eligibility internamente, llamándola con security definer context bypassed
  -- via SQL directo en lugar de la RPC pública
  DECLARE
    v_req RECORD;
    v_enrollment RECORD;
  BEGIN
    SELECT * INTO v_req FROM academy_certificate_requirements WHERE course_id = p_course_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'no_requirements_configured');
    END IF;
    SELECT * INTO v_enrollment FROM academy_enrollments WHERE course_id = p_course_id AND user_id = p_user_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'not_enrolled');
    END IF;
    IF v_enrollment.completion_pct < v_req.min_lessons_completed_pct THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'not_complete');
    END IF;
    IF v_req.require_final_exam AND NOT EXISTS (
      SELECT 1 FROM academy_quiz_attempts qa
      JOIN academy_quizzes q ON q.id = qa.quiz_id
      WHERE q.course_id = p_course_id AND q.scope = 'final'
        AND qa.user_id = p_user_id AND qa.status = 'passed'
        AND qa.score_pct >= v_req.min_final_exam_score
    ) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'final_exam_pending');
    END IF;
  END;

  IF EXISTS (SELECT 1 FROM academy_certificates WHERE course_id = p_course_id AND user_id = p_user_id) THEN
    SELECT * INTO v_cert FROM academy_certificates WHERE course_id = p_course_id AND user_id = p_user_id;
    RETURN jsonb_build_object('eligible', true, 'already_issued', true, 'cert_code', v_cert.cert_code);
  END IF;

  SELECT c.title, c.instructor_id, ac.name AS space_name INTO v_course
  FROM academy_courses c
  JOIN academy_spaces ac ON ac.id = c.space_id
  WHERE c.id = p_course_id;

  SELECT COALESCE(full_name, 'Estudiante') INTO v_student_name FROM profiles WHERE id = p_user_id;
  SELECT COALESCE(full_name, 'Instructor') INTO v_instructor_name FROM profiles WHERE id = v_course.instructor_id;

  SELECT score_pct INTO v_final_score
  FROM academy_quiz_attempts qa
  JOIN academy_quizzes q ON q.id = qa.quiz_id
  WHERE q.course_id = p_course_id AND q.scope = 'final'
    AND qa.user_id = p_user_id AND qa.status = 'passed'
  ORDER BY qa.submitted_at DESC LIMIT 1;

  INSERT INTO academy_certificates (
    course_id, user_id, enrollment_id,
    student_name, course_title, instructor_name, space_name, final_score_pct
  )
  SELECT
    p_course_id, p_user_id, ae.id,
    COALESCE(v_student_name, 'Estudiante'),
    v_course.title,
    COALESCE(v_instructor_name, 'Instructor'),
    v_course.space_name,
    v_final_score
  FROM academy_enrollments ae
  WHERE ae.course_id = p_course_id AND ae.user_id = p_user_id
  RETURNING * INTO v_cert;

  UPDATE academy_enrollments SET certificate_issued_at = NOW()
  WHERE course_id = p_course_id AND user_id = p_user_id;

  -- [UP eliminado] Se retiró el bloque que insertaba en reputation_events
  -- ('academy_certificate_earned', 500 pts), envuelto en EXCEPTION ... NULL.

  RETURN jsonb_build_object(
    'eligible', true, 'issued', true,
    'cert_code', v_cert.cert_code,
    'verification_url', v_cert.verification_url
  );
END;
$function$;


-- ============================================================================
-- 🔴 PENDIENTE FUERA DE ESTE ALCANCE — fn_feed_reaction_activity()
-- ============================================================================
-- Trigger VIVO `trg_feed_reaction_activity` sobre `feed_reactions` (el Feed SE
-- QUEDA — Fase 3.7 shipped 2026-07-10). Hace SELECT e INSERT sobre
-- `reputation_events` SIN bloque EXCEPTION → al borrar la tabla, TODA reacción
-- del feed fallará con error duro. Mismo patrón exacto que award_referral_coins.
--
-- No se reescribe aquí porque no estaba en el encargo. Reescritura propuesta
-- (descomentar tras confirmación del lead): quitar el SELECT de conteo diario,
-- la variable v_today_count, el INSERT a reputation_events y el lookup de
-- v_org_id que solo servía para ese INSERT — conservando fn_bump_user_streak y
-- fn_match_daily_missions, que son de otros sistemas.
--
-- CREATE OR REPLACE FUNCTION public.fn_feed_reaction_activity()
--  RETURNS trigger
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- begin
--   perform public.fn_bump_user_streak(new.user_id);
--
--   begin
--     perform public.fn_match_daily_missions(new.user_id, 'feed_reaction_given');
--   exception when others then null;
--   end;
--
--   return new;
-- end;
-- $function$;
--
-- LANGUAGE plpgsql / SECURITY DEFINER / search_path=public verificados contra
-- pg_proc — la firma propuesta arriba coincide con la actual en producción.
-- ============================================================================
