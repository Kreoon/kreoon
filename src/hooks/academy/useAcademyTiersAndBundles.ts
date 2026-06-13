// ============================================================================
// Tiers de membresía y bundles de cursos.
// Tiers: Bronce/Plata/Oro con features distintos por nivel.
// Bundles: paquetes que combinan cursos + opcional membresía temporal.
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AcademyMembershipTier {
  id: string;
  space_id: string;
  tier_slug: string;
  name: string;
  description: string | null;
  monthly_price_usd: number | null;
  yearly_price_usd: number | null;
  features: string[];
  stripe_monthly_price_id: string | null;
  stripe_yearly_price_id: string | null;
  badge_color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface AcademyBundle {
  id: string;
  space_id: string;
  slug: string;
  name: string;
  description: string | null;
  course_ids: string[];
  includes_membership_tier_id: string | null;
  membership_duration_months: number | null;
  price_usd: number;
  compare_at_price_usd: number | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  cover_image_url: string | null;
  features: string[];
  is_active: boolean;
}

export function useAcademyTiers(spaceId: string | undefined) {
  return useQuery<AcademyMembershipTier[]>({
    queryKey: ['academy', 'tiers', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];
      const { data, error } = await (supabase as any)
        .from('academy_membership_tiers')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AcademyMembershipTier[];
    },
    enabled: !!spaceId,
    staleTime: 30_000,
  });
}

export function useCreateTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AcademyMembershipTier> & { space_id: string; tier_slug: string; name: string }) => {
      const { data, error } = await (supabase as any)
        .from('academy_membership_tiers')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['academy', 'tiers', vars.space_id] }),
  });
}

export function useUpdateTier(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AcademyMembershipTier> }) => {
      const { error } = await (supabase as any)
        .from('academy_membership_tiers')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'tiers', spaceId] }),
  });
}

export function useDeleteTier(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('academy_membership_tiers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'tiers', spaceId] }),
  });
}

export function useAcademyBundles(spaceId: string | undefined) {
  return useQuery<AcademyBundle[]>({
    queryKey: ['academy', 'bundles', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];
      const { data, error } = await (supabase as any)
        .from('academy_bundles')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_active', true);
      if (error) throw error;
      return (data ?? []) as AcademyBundle[];
    },
    enabled: !!spaceId,
    staleTime: 30_000,
  });
}

export function useCreateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AcademyBundle> & { space_id: string; slug: string; name: string; price_usd: number; course_ids: string[] }) => {
      const { data, error } = await (supabase as any)
        .from('academy_bundles')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['academy', 'bundles', vars.space_id] }),
  });
}
