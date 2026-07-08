import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// ─── Admin course query ────────────────────────────────────────────────────────

export const COURSE_ADMIN_SELECT = `
  id, title, slug, description, cover_image_url, price_usd, is_free,
  difficulty, language, status, instructor_id, space_id, sort_order,
  certificate_enabled, total_duration_minutes,
  space:academy_spaces(id, name, slug, accent_color, owner_id),
  modules:academy_modules(
    id, title, sort_order,
    lessons:academy_lessons(
      id, title, type, video_source, video_url, video_bunny_id,
      video_duration_seconds, video_thumbnail_url, is_free_preview,
      is_required, sort_order, content, description, resources,
      has_midlesson_quiz, drip_days_after_enroll, module_id, course_id
    )
  )
`;

export function useAdminCourse(spaceSlug?: string, courseSlug?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'course', 'admin', spaceSlug, courseSlug],
    queryFn: async () => {
      // Fix 1b: capturar error de la query a academy_spaces
      const { data: space, error: spaceError } = await (supabase as any)
        .from('academy_spaces')
        .select('id')
        .eq('slug', spaceSlug!)
        .single();
      if (spaceError || !space) throw spaceError ?? new Error('Space not found');
      const { data, error } = await (supabase as any)
        .from('academy_courses')
        .select(COURSE_ADMIN_SELECT)
        .eq('slug', courseSlug!)
        .eq('space_id', space.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!spaceSlug && !!courseSlug && !!user,
    staleTime: 30_000,
  });
}
