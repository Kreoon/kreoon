import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const AUTO_GRADED_TYPES = new Set([
  'single_choice',
  'multiple_choice',
  'true_false',
  'ordering',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── Autenticación: extraer y validar JWT del caller ──
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    }
    const callerId = userData.user.id;

    const { attempt_id, quiz_id } = await req.json();
    if (!attempt_id || !quiz_id) {
      return corsJsonResponse(req, { error: 'attempt_id y quiz_id requeridos' }, 400);
    }

    // 1) Cargar quiz con preguntas/opciones
    const { data: quiz, error: quizErr } = await supabase
      .from('academy_quizzes')
      .select(`
        id, course_id, scope, passing_score_pct,
        questions:academy_questions(
          id, type, points,
          options:academy_question_options(id, is_correct, sort_order)
        )
      `)
      .eq('id', quiz_id)
      .single();
    if (quizErr) throw quizErr;
    if (!quiz) {
      return corsJsonResponse(req, { error: 'quiz no encontrado' }, 404);
    }

    // 2) Cargar attempt y validar propiedad — protege IDOR
    const { data: attempt, error: attemptErr } = await supabase
      .from('academy_quiz_attempts')
      .select('id, user_id, enrollment_id, quiz_id, status')
      .eq('id', attempt_id)
      .single();
    if (attemptErr) throw attemptErr;
    if (!attempt) {
      return corsJsonResponse(req, { error: 'attempt no encontrado' }, 404);
    }
    if (attempt.user_id !== callerId) {
      return corsJsonResponse(req, { error: 'forbidden' }, 403);
    }
    if (attempt.quiz_id !== quiz_id) {
      return corsJsonResponse(req, { error: 'attempt no pertenece a este quiz' }, 400);
    }
    // Evitar re-grading de intentos ya cerrados
    if (attempt.status !== 'in_progress') {
      return corsJsonResponse(req, { error: 'attempt ya fue calificado', status: attempt.status }, 409);
    }

    // 3) Cargar respuestas del intento
    const { data: answers, error: ansErr } = await supabase
      .from('academy_attempt_answers')
      .select('*')
      .eq('attempt_id', attempt_id);
    if (ansErr) throw ansErr;

    let totalPoints = 0;
    let earnedPoints = 0;
    let autoTotalPoints = 0;
    let hasPendingManual = false;

    const questions = (quiz as any).questions ?? [];

    for (const question of questions) {
      totalPoints += question.points;
      const answer = (answers ?? []).find((a: any) => a.question_id === question.id);

      if (!AUTO_GRADED_TYPES.has(question.type)) {
        // Manual graded → encolar revisión
        hasPendingManual = true;
        if (answer) {
          await supabase
            .from('academy_attempt_answers')
            .update({ is_correct: null, points_awarded: 0 })
            .eq('id', answer.id);

          await supabase.from('academy_manual_reviews').insert({
            attempt_id,
            answer_id: answer.id,
            question_id: question.id,
            course_id: (quiz as any).course_id,
            student_id: attempt.user_id,
            max_score: question.points,
            status: 'pending',
          });
        }
        continue;
      }

      autoTotalPoints += question.points;

      if (!answer) {
        await maybeMarkUnansweredAutoQuestion(supabase, attempt_id, question.id);
        continue;
      }

      const correctOptionIds = (question.options ?? [])
        .filter((o: any) => o.is_correct)
        .map((o: any) => o.id)
        .sort();

      const selectedSorted = [...(answer.selected_option_ids ?? [])].sort();
      let isCorrect = false;

      if (question.type === 'single_choice' || question.type === 'true_false') {
        isCorrect =
          selectedSorted.length === 1 && correctOptionIds.includes(selectedSorted[0]);
      } else if (question.type === 'multiple_choice') {
        isCorrect =
          selectedSorted.length === correctOptionIds.length &&
          selectedSorted.every((id, i) => id === correctOptionIds[i]);
      } else if (question.type === 'ordering') {
        const expected = (question.options ?? [])
          .slice()
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((o: any) => o.id);
        const got = answer.ordering_sequence ?? [];
        isCorrect = expected.length === got.length && expected.every((id: string, i: number) => id === got[i]);
      }

      const pts = isCorrect ? question.points : 0;
      earnedPoints += pts;

      await supabase
        .from('academy_attempt_answers')
        .update({
          is_correct: isCorrect,
          points_awarded: pts,
          graded_at: new Date().toISOString(),
        })
        .eq('id', answer.id);
    }

    // A-07 fix: si el quiz solo tiene preguntas manuales (auto_total_points = 0),
    // queda pending_review en lugar de marcarlo como failed con score 0%.
    // Si tiene mezcla auto+manual, calculamos score sobre las auto.
    let scorePct: number | null = null;
    let status: 'passed' | 'failed' | 'pending_review';
    let passed = false;

    if (autoTotalPoints === 0) {
      // Todo el quiz es manual → siempre pending_review hasta calificación humana
      status = 'pending_review';
      scorePct = null;
    } else {
      scorePct = Math.round((earnedPoints / autoTotalPoints) * 10000) / 100;
      passed = !hasPendingManual && scorePct >= (quiz as any).passing_score_pct;
      status = hasPendingManual ? 'pending_review' : passed ? 'passed' : 'failed';
    }

    await supabase
      .from('academy_quiz_attempts')
      .update({
        status,
        score_pct: scorePct,
        total_points_possible: totalPoints,
        points_earned: earnedPoints,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', attempt_id);

    // 5) Si pasó examen final → intentar emitir certificado
    if (passed && (quiz as any).scope === 'final') {
      try {
        await supabase.rpc('issue_academy_certificate', {
          p_course_id: (quiz as any).course_id,
          p_user_id: attempt.user_id,
        });
      } catch (_e) {
        // El certificado puede no emitirse si faltan otros requisitos
      }
    }

    return corsJsonResponse(req, {
      success: true,
      status,
      score_pct: roundedScore,
      passed,
      has_pending_manual: hasPendingManual,
      earned_points: earnedPoints,
      total_points: totalPoints,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Error desconocido' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }
});

async function maybeMarkUnansweredAutoQuestion(
  supabase: ReturnType<typeof createClient>,
  attemptId: string,
  questionId: string
) {
  // Crear respuesta vacía no-correcta para que el conteo sea consistente
  await supabase.from('academy_attempt_answers').insert({
    attempt_id: attemptId,
    question_id: questionId,
    selected_option_ids: [],
    is_correct: false,
    points_awarded: 0,
    graded_at: new Date().toISOString(),
  });
}
