import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AcademySpace } from '@/types/academy';

export function useMyAcademySpaces() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'spaces', 'mine', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('academy_spaces')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AcademySpace[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicAcademySpaces() {
  return useQuery({
    queryKey: ['academy', 'spaces', 'public'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_spaces')
        .select('*')
        .eq('is_public', true)
        .eq('status', 'active')
        .order('member_count', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AcademySpace[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useAcademySpace(slug: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'space', slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_spaces')
        .select(`*, courses:academy_courses(
          id, title, slug, description, cover_image_url, price_usd, is_free,
          difficulty, enrolled_count, avg_rating, review_count,
          total_duration_minutes, status, sort_order
        )`)
        .eq('slug', slug!)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data as (AcademySpace & { courses: any[] }) | null;
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateAcademySpace() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<AcademySpace>) => {
      if (!user) throw new Error('No user');
      const { data, error } = await (supabase as any)
        .from('academy_spaces')
        .insert({ ...input, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as AcademySpace;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'spaces'] }),
  });
}

export function useUpdateAcademySpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AcademySpace> }) => {
      const { data, error } = await (supabase as any)
        .from('academy_spaces')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AcademySpace;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'spaces'] }),
  });
}
