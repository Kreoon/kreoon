import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SpaceDiscovery } from '@/types/academy-community';

export function useSpaceDiscovery(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'discovery', spaceId],
    queryFn: async () => {
      if (!spaceId) return null;
      const { data, error } = await (supabase as any)
        .from('academy_space_discovery')
        .select('*')
        .eq('space_id', spaceId)
        .maybeSingle();
      if (error) throw error;
      return data as SpaceDiscovery | null;
    },
    enabled: !!spaceId,
  });
}

export function useUpdateDiscovery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ spaceId, updates }: { spaceId: string; updates: Partial<SpaceDiscovery> }) => {
      const { data, error } = await (supabase as any)
        .from('academy_space_discovery')
        .upsert(
          { space_id: spaceId, ...updates, updated_at: new Date().toISOString() },
          { onConflict: 'space_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as SpaceDiscovery;
    },
    onSuccess: (_, { spaceId }) => {
      qc.invalidateQueries({ queryKey: ['academy', 'discovery', spaceId] });
    },
  });
}

// ── BÚSQUEDA EN DISCOVERY ──
export function useDiscoverySearch(args: {
  query?: string;
  category?: string;
  language?: string;
}) {
  return useQuery({
    queryKey: ['academy', 'discovery-search', args],
    queryFn: async () => {
      let q = (supabase as any)
        .from('academy_space_discovery')
        .select(`
          *,
          space:academy_spaces!space_id(
            id, name, slug, description, cover_image_url, logo_url, accent_color,
            member_count, membership_price_usd, plan_slug
          )
        `)
        .eq('is_discoverable', true)
        .order('discovery_rank', { ascending: true, nullsFirst: false });

      if (args.category) q = q.eq('category', args.category);
      if (args.language) q = q.eq('language', args.language);
      if (args.query) q = q.contains('keywords', [args.query.toLowerCase()]);

      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}
