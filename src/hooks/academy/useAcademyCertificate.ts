import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AcademyCertificate, CertEligibilityResult } from '@/types/academy';

export function useCertEligibility(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'cert', 'eligibility', courseId, user?.id],
    queryFn: async () => {
      if (!user || !courseId) return null;
      const { data, error } = await (supabase as any).rpc('check_certificate_eligibility', {
        p_course_id: courseId,
        p_user_id: user.id,
      });
      if (error) throw error;
      return data as CertEligibilityResult;
    },
    enabled: !!courseId && !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyCertificates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'certificates', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('academy_certificates')
        .select(`
          *,
          course:academy_courses(
            title, cover_image_url,
            space:academy_spaces(name, slug, logo_url)
          )
        `)
        .eq('user_id', user.id)
        .eq('is_valid', true)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AcademyCertificate[];
    },
    enabled: !!user,
  });
}

export function useIssueCertificate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('No user');
      const { data, error } = await (supabase as any).rpc('issue_academy_certificate', {
        p_course_id: courseId,
        p_user_id: user.id,
      });
      if (error) throw error;
      return data as CertEligibilityResult;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'cert'] }),
  });
}

export function useVerifyCertificate(certCode: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'cert', 'verify', certCode],
    queryFn: async () => {
      if (!certCode) return null;
      const { data, error } = await (supabase as any)
        .from('academy_certificates')
        .select(`
          *,
          course:academy_courses(
            title, cover_image_url,
            space:academy_spaces(name, slug, logo_url, accent_color)
          )
        `)
        .eq('cert_code', certCode)
        .maybeSingle();
      if (error) throw error;
      return data as AcademyCertificate | null;
    },
    enabled: !!certCode,
    staleTime: 30 * 60 * 1000,
  });
}

// ── Para instructores: configurar requisitos ──
export function useUpdateCertRequirements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, updates }: { courseId: string; updates: Record<string, unknown> }) => {
      const { data, error } = await (supabase as any)
        .from('academy_certificate_requirements')
        .upsert(
          { course_id: courseId, ...updates, updated_at: new Date().toISOString() },
          { onConflict: 'course_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy'] }),
  });
}
