import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MemberLocation } from '@/types/academy-community';

export function useMemberLocations(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'locations', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];
      const { data, error } = await (supabase as any)
        .from('academy_member_locations')
        .select(`
          *,
          user:profiles!user_id(full_name, avatar_url)
        `)
        .eq('space_id', spaceId)
        .eq('is_public', true);
      if (error) throw error;
      return (data ?? []) as MemberLocation[];
    },
    enabled: !!spaceId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateMyLocation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      spaceId: string;
      city?: string;
      country?: string;
      countryCode?: string;
      lat?: number;
      lng?: number;
      isPublic?: boolean;
    }) => {
      if (!user) throw new Error('No user');
      const { data, error } = await (supabase as any)
        .from('academy_member_locations')
        .upsert(
          {
            space_id: args.spaceId,
            user_id: user.id,
            city: args.city ?? null,
            country: args.country ?? null,
            country_code: args.countryCode ?? null,
            lat: args.lat ?? null,
            lng: args.lng ?? null,
            is_public: args.isPublic ?? true,
          },
          { onConflict: 'space_id,user_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, args) => {
      qc.invalidateQueries({ queryKey: ['academy', 'locations', args.spaceId] });
    },
  });
}
