import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  AcademyCourse,
  AcademyModule,
  AcademyLesson,
  LessonStatus,
} from '@/types/academy';

const COURSE_SELECT_FOR_STUDENT = `
  *,
  space:academy_spaces(id, name, slug, logo_url, accent_color, owner_id),
  instructor:profiles!instructor_id(full_name, avatar_url),
  modules:academy_modules(
    id, title, description, sort_order, is_free_preview,
    lessons:academy_lessons_gated(
      id, title, type, video_source, video_url, video_bunny_id,
      video_duration_seconds, video_thumbnail_url, is_free_preview,
      is_required, sort_order, has_midlesson_quiz,
      midlesson_quiz_timestamp_seconds, end_lesson_quiz_id, drip_days_after_enroll,
      content, module_id, course_id,
      progress:academy_lesson_progress(
        id, status, video_watch_pct, last_position_seconds, completed_at
      )
    )
  ),
  enrollment:academy_enrollments(
    id, completion_pct, completed_at, certificate_issued_at, enrolled_at
  ),
  cert_requirements:academy_certificate_requirements(*)
`;

export function useAcademyCourse(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'course', courseId, user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_courses')
        .select(COURSE_SELECT_FOR_STUDENT)
        .eq('id', courseId!)
        .maybeSingle();
      if (error) throw error;
      return data as AcademyCourse | null;
    },
    enabled: !!courseId && !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAcademyCourseBySlug(spaceSlug: string | undefined, courseSlug: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'course', 'slug', spaceSlug, courseSlug, user?.id],
    queryFn: async () => {
      const { data: spaceRow, error: spaceErr } = await (supabase as any)
        .from('academy_spaces')
        .select('id')
        .eq('slug', spaceSlug!)
        .maybeSingle();
      if (spaceErr) throw spaceErr;
      if (!spaceRow) return null;

      const { data, error } = await (supabase as any)
        .from('academy_courses')
        .select(COURSE_SELECT_FOR_STUDENT)
        .eq('space_id', spaceRow.id)
        .eq('slug', courseSlug!)
        .maybeSingle();
      if (error) throw error;
      return data as AcademyCourse | null;
    },
    enabled: !!spaceSlug && !!courseSlug,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCourseForInstructor(courseId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'course', 'instructor', courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_courses')
        .select(`
          *,
          space:academy_spaces(id, name, slug, logo_url, accent_color),
          modules:academy_modules(
            *, lessons:academy_lessons(*)
          ),
          quizzes:academy_quizzes(
            *, questions:academy_questions(*, options:academy_question_options(*))
          ),
          cert_requirements:academy_certificate_requirements(*),
          enrollments:academy_enrollments(id)
        `)
        .eq('id', courseId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<AcademyCourse>) => {
      if (!user) throw new Error('No user');
      const { data, error } = await (supabase as any)
        .from('academy_courses')
        .insert({ ...input, instructor_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as AcademyCourse;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy'] }),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AcademyCourse> }) => {
      // is_free es columna GENERATED (price_usd = 0). PostgREST devuelve 400 si se intenta UPDATE.
      const { is_free: _drop, ...safeUpdates } = updates as any;
      const { data, error } = await (supabase as any)
        .from('academy_courses')
        .update({ ...safeUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AcademyCourse;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy'] }),
  });
}

// ── MODULES ──
export function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AcademyModule> & { course_id: string; title: string }) => {
      const { data, error } = await (supabase as any)
        .from('academy_modules')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as AcademyModule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'course'] }),
  });
}

export function useUpdateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AcademyModule> }) => {
      const { data, error } = await (supabase as any)
        .from('academy_modules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AcademyModule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'course'] }),
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('academy_modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'course'] }),
  });
}

// ── LESSONS ──
export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AcademyLesson> & { module_id: string; course_id: string; title: string }) => {
      const { data, error } = await (supabase as any)
        .from('academy_lessons')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as AcademyLesson;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'course'] }),
  });
}

export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, updates }: { lessonId: string; updates: Partial<AcademyLesson> }) => {
      const { data, error } = await (supabase as any)
        .from('academy_lessons')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', lessonId)
        .select()
        .single();
      if (error) throw error;
      return data as AcademyLesson;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'course'] }),
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('academy_lessons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'course'] }),
  });
}

// ── PROGRESS ──
export function useMarkLessonProgress() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      lessonId: string;
      enrollmentId: string;
      status: LessonStatus;
      videoPct?: number;
      lastPosition?: number;
    }) => {
      if (!user) throw new Error('No user');
      // Vía RPC server-side: valida enrollment real y recalcula
      // completion_pct por trigger (nunca confía en un valor del cliente).
      const { data, error } = await (supabase as any).rpc('record_lesson_progress', {
        p_lesson_id: args.lessonId,
        p_status: args.status,
        p_video_watch_pct: args.videoPct ?? 0,
        p_last_position_seconds: args.lastPosition ?? 0,
      });
      if (error) throw error;

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy'] }),
  });
}

