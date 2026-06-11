import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MyMembership {
  id: string;
  space_id: string;
  role: 'owner' | 'instructor' | 'moderator' | 'student';
  is_active: boolean;
  marketing_consent: boolean;
  onboarding_completed_at: string | null;
  joined_at: string;
}

/** Membresía del user actual en un space dado. null = no es member. */
export function useMyMembership(spaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'my-membership', spaceId, user?.id],
    queryFn: async (): Promise<MyMembership | null> => {
      if (!spaceId || !user) return null;
      const { data, error } = await (supabase as any)
        .from('academy_memberships')
        .select('id, space_id, role, is_active, marketing_consent, onboarding_completed_at, joined_at')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as MyMembership) ?? null;
    },
    enabled: !!spaceId && !!user,
    staleTime: 30_000,
  });
}

interface JoinSpaceInput {
  spaceSlug: string;
  consent: boolean;
  country?: string | null;
  referrerId?: string | null;
  source?: string | null;
}

interface JoinSpaceResult {
  status: 'joined' | 'reactivated' | 'already_member';
  membership_id: string;
  space_id: string;
}

export function useJoinSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: JoinSpaceInput): Promise<JoinSpaceResult> => {
      const { data, error } = await (supabase as any).rpc('academy_join_space', {
        p_space_slug: input.spaceSlug,
        p_consent: input.consent,
        p_country: input.country ?? null,
        p_referrer_id: input.referrerId ?? null,
        p_source: input.source ?? null,
      });
      if (error) throw error;
      return data as JoinSpaceResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'my-membership'] });
      qc.invalidateQueries({ queryKey: ['academy', 'space'] });
      qc.invalidateQueries({ queryKey: ['academy', 'members'] });
    },
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (spaceId: string) => {
      const { error } = await (supabase as any).rpc('academy_complete_onboarding', {
        p_space_id: spaceId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'my-membership'] });
    },
  });
}

/** Tracking de share (+5 XP). */
export function useTrackShare() {
  return useMutation({
    mutationFn: async ({ postId, sharedTo }: { postId: string; sharedTo?: string }) => {
      const { data, error } = await (supabase as any).rpc('academy_track_share', {
        p_post_id: postId,
        p_shared_to: sharedTo ?? null,
      });
      if (error) throw error;
      return data;
    },
  });
}

/** Check-in en evento (+20 XP). */
export function useEventCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await (supabase as any).rpc('academy_event_checkin', {
        p_event_id: eventId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'events'] });
      qc.invalidateQueries({ queryKey: ['academy', 'my-gamification'] });
    },
  });
}
