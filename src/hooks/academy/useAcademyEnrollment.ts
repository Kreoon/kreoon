import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AcademyEnrollment } from '@/types/academy';

export function useMyEnrollments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'enrollments', 'mine', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('academy_enrollments')
        .select(`
          *,
          course:academy_courses(
            id, title, slug, cover_image_url, total_duration_minutes,
            space:academy_spaces(id, name, slug, logo_url)
          )
        `)
        .eq('user_id', user.id)
        .order('last_accessed_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Array<AcademyEnrollment & { course: any }>;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyEnrollment(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'enrollment', courseId, user?.id],
    queryFn: async () => {
      if (!user || !courseId) return null;
      const { data, error } = await (supabase as any)
        .from('academy_enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as AcademyEnrollment | null;
    },
    enabled: !!user && !!courseId,
    staleTime: 1 * 60 * 1000,
  });
}

export function useEnrollInCourse() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ courseId }: { courseId: string }) => {
      if (!user) throw new Error('No user');

      // Cargar curso para saber si es gratis o de pago
      const { data: course, error: courseErr } = await (supabase as any)
        .from('academy_courses')
        .select('id, price_usd, is_free, stripe_price_id, title')
        .eq('id', courseId)
        .single();
      if (courseErr) throw courseErr;

      if (course.is_free) {
        // Inscripción vía RPC server-side: valida gratuidad/pago antes de insertar.
        const { data, error } = await (supabase as any).rpc('enroll_in_course', {
          p_course_id: courseId,
        });
        if (error) throw error;
        return { type: 'enrolled' as const, enrollment: data as AcademyEnrollment };
      }

      // Curso de pago: redirigir a Stripe checkout vía edge function
      const { data: checkout, error: checkoutErr } = await (supabase.functions as any).invoke(
        'academy-course-checkout',
        { body: { course_id: courseId } }
      );
      if (checkoutErr) throw checkoutErr;
      return { type: 'checkout' as const, url: checkout?.url as string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'enrollment'] }),
  });
}
