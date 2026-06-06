import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SpacePlugins } from '@/types/academy-community';

export function useSpacePlugins(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'plugins', spaceId],
    queryFn: async () => {
      if (!spaceId) return null;
      const { data, error } = await (supabase as any)
        .from('academy_space_plugins')
        .select('*')
        .eq('space_id', spaceId)
        .maybeSingle();
      if (error) throw error;
      return data as SpacePlugins | null;
    },
    enabled: !!spaceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSpacePlugins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ spaceId, updates }: { spaceId: string; updates: Partial<SpacePlugins> }) => {
      const { data, error } = await (supabase as any)
        .from('academy_space_plugins')
        .upsert(
          { space_id: spaceId, ...updates, updated_at: new Date().toISOString() },
          { onConflict: 'space_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as SpacePlugins;
    },
    onSuccess: (_, { spaceId }) => {
      qc.invalidateQueries({ queryKey: ['academy', 'plugins', spaceId] });
    },
  });
}
