import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  AcademyQuiz,
  QuizAttempt,
  NewAttemptAnswer,
  GradingResult,
} from '@/types/academy';

export function useQuizWithQuestions(quizId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'quiz', quizId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_quizzes')
        .select(`
          *,
          questions:academy_questions(
            *, options:academy_question_options(
              id, option_text, sort_order, media_url
            )
          )
        `)
        .eq('id', quizId!)
        .maybeSingle();
      if (error) throw error;
      return data as AcademyQuiz | null;
    },
    enabled: !!quizId,
  });
}

export function useMyQuizAttempts(quizId: string | undefined, enrollmentId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'attempts', quizId, user?.id, enrollmentId],
    queryFn: async () => {
      if (!user || !quizId || !enrollmentId) return [];
      const { data, error } = await (supabase as any)
        .from('academy_quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('user_id', user.id)
        .eq('enrollment_id', enrollmentId)
        .order('attempt_number', { ascending: false });
      if (error) throw error;
      return (data ?? []) as QuizAttempt[];
    },
    enabled: !!quizId && !!user && !!enrollmentId,
  });
}

export function useStartQuizAttempt() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      quizId: string;
      enrollmentId: string;
      attemptNumber: number;
    }) => {
      if (!user) throw new Error('No user');
      const { data, error } = await (supabase as any)
        .from('academy_quiz_attempts')
        .insert({
          quiz_id: args.quizId,
          user_id: user.id,
          enrollment_id: args.enrollmentId,
          attempt_number: args.attemptNumber,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as QuizAttempt;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['academy', 'attempts', vars.quizId] }),
  });
}

export function useSubmitQuizAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      attemptId: string;
      quizId: string;
      answers: NewAttemptAnswer[];
      timeSpentSeconds?: number;
    }): Promise<GradingResult> => {
      // A-04 fix: persistencia atómica via RPC. Si falla, no quedan respuestas huérfanas.
      const { error: rpcErr } = await (supabase as any).rpc('submit_quiz_attempt_atomic', {
        p_attempt_id: args.attemptId,
        p_quiz_id: args.quizId,
        p_answers: args.answers,
        p_time_spent_seconds: args.timeSpentSeconds ?? 0,
      });
      if (rpcErr) throw rpcErr;

      // Disparar grading engine (auto + cola manual)
      const { data, error } = await (supabase.functions as any).invoke('academy-grade-attempt', {
        body: { attempt_id: args.attemptId, quiz_id: args.quizId },
      });
      if (error) throw error;
      return data as GradingResult;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy'] }),
  });
}

// ── Para instructores: CRUD de quizzes/preguntas/opciones ──
export function useCreateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AcademyQuiz> & { course_id: string; title: string; scope: AcademyQuiz['scope'] }) => {
      const { data, error } = await (supabase as any)
        .from('academy_quizzes')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as AcademyQuiz;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy'] }),
  });
}

export function useUpdateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AcademyQuiz> }) => {
      const { data, error } = await (supabase as any)
        .from('academy_quizzes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AcademyQuiz;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy'] }),
  });
}
