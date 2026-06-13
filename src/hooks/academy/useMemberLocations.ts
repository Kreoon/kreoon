import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MemberLocation } from '@/types/academy-community';

export function useMemberLocations(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'locations', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];

      // 1) Lee locations sin embed (academy_member_locations.user_id no tiene FK a profiles)
      const { data: locations, error } = await (supabase as any)
        .from('academy_member_locations')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_public', true);
      if (error) throw error;

      const rows = (locations ?? []) as MemberLocation[];
      if (rows.length === 0) return rows;

      // 2) Lee perfiles asociados y merge client-side
      const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))];
      if (userIds.length === 0) return rows;

      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesById = new Map(
        ((profiles ?? []) as any[]).map((p) => [p.id, p])
      );

      return rows.map((r: any) => ({
        ...r,
        user: profilesById.get(r.user_id) ?? null,
      })) as MemberLocation[];
    },
    enabled: !!spaceId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateMyLocation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      spaceId,
      location,
    }: {
      spaceId: string;
      location: Partial<MemberLocation>;
    }) => {
      if (!user) throw new Error('not_authenticated');
      const { data, error } = await (supabase as any)
        .from('academy_member_locations')
        .upsert(
          {
            space_id: spaceId,
            user_id: user.id,
            ...location,
          },
          { onConflict: 'space_id,user_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as MemberLocation;
    },
    onSuccess: (_, { spaceId }) => {
      qc.invalidateQueries({ queryKey: ['academy', 'locations', spaceId] });
    },
  });
}
