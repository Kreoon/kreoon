import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SpaceAnalyticsSummary, SpaceDailyAnalytics } from '@/types/academy-community';

export function useSpaceAnalytics(spaceId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['academy', 'analytics', spaceId, days],
    queryFn: async (): Promise<SpaceAnalyticsSummary | null> => {
      if (!spaceId) return null;
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().split('T')[0];

      const { data: dailyData, error } = await (supabase as any)
        .from('academy_space_analytics')
        .select('*')
        .eq('space_id', spaceId)
        .gte('date', sinceStr)
        .order('date', { ascending: true });
      if (error) throw error;

      const { data: space } = await (supabase as any)
        .from('academy_spaces')
        .select('member_count, membership_price_usd')
        .eq('id', spaceId)
        .single();

      const daily = (dailyData ?? []) as SpaceDailyAnalytics[];
      const totalVisitors = daily.reduce((s, d) => s + (d.unique_visitors || 0), 0);
      const totalSignups = daily.reduce((s, d) => s + (d.new_members || 0), 0);
      const totalPosts = daily.reduce((s, d) => s + (d.posts_created || 0), 0);
      const totalComments = daily.reduce((s, d) => s + (d.comments_created || 0), 0);

      const sourceTotals: Record<string, number> = {};
      daily.forEach((d) => {
        Object.entries(d.traffic_sources ?? {}).forEach(([src, count]) => {
          sourceTotals[src] = (sourceTotals[src] ?? 0) + (count as number);
        });
      });

      const topSources = Object.entries(sourceTotals)
        .map(([source, count]) => ({
          source,
          count,
          pct: totalVisitors > 0 ? Math.round((count / totalVisitors) * 100 * 10) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Funnel (Fase 8): aproximación basada en datos disponibles
      const activeMembersTotal = daily.reduce((s, d) => s + (d.active_members || 0), 0);
      const lessonsCompleted = daily.reduce((s, d) => s + (d.lessons_completed || 0), 0);
      const funnel = [
        { stage: 'Visitantes', count: totalVisitors, pct: 100 },
        {
          stage: 'Inscripciones',
          count: totalSignups,
          pct: totalVisitors > 0 ? Math.round((totalSignups / totalVisitors) * 1000) / 10 : 0,
        },
        {
          stage: 'Miembros activos',
          count: activeMembersTotal,
          pct: totalVisitors > 0 ? Math.round((activeMembersTotal / totalVisitors) * 1000) / 10 : 0,
        },
        {
          stage: 'Lecciones completadas',
          count: lessonsCompleted,
          pct: totalVisitors > 0 ? Math.round((lessonsCompleted / totalVisitors) * 1000) / 10 : 0,
        },
      ];

      // Heatmap por día de semana / hora (Fase 8): conteo de posts+comments por bucket
      const heatmapBuckets = new Map<string, number>();
      daily.forEach((d) => {
        const day = new Date(d.date).getDay();
        // sin hora exacta en analytics diaria, agregamos en bloques 10/14/18
        const burst = (d.posts_created ?? 0) + (d.comments_created ?? 0);
        if (burst > 0) {
          const key = `${day}:10`;
          heatmapBuckets.set(key, (heatmapBuckets.get(key) ?? 0) + burst);
        }
      });
      const activity_heatmap = Array.from(heatmapBuckets.entries()).map(([k, count]) => {
        const [day, hour] = k.split(':').map(Number);
        return { day, hour, count };
      });

      const summary: SpaceAnalyticsSummary = {
        total_members: space?.member_count ?? 0,
        active_members_pct:
          (space?.member_count ?? 0) > 0 && activeMembersTotal > 0
            ? Math.round((activeMembersTotal / (space.member_count * Math.max(1, daily.length))) * 100)
            : 0,
        mrr_usd: (space?.member_count ?? 0) * (space?.membership_price_usd ?? 0),
        engagement_rate:
          totalVisitors > 0
            ? Math.round(((totalPosts + totalComments) / totalVisitors) * 100)
            : 0,
        retention_rate: 0, // requeriría tabla histórica de cohortes — Fase 8 muestra placeholder
        visitors_30d: totalVisitors,
        signups_30d: totalSignups,
        conversion_rate:
          totalVisitors > 0 ? Math.round((totalSignups / totalVisitors) * 1000) / 10 : 0,
        new_mrr_30d: daily.reduce((s, d) => s + Number(d.new_mrr_usd ?? 0), 0),
        top_sources: topSources,
        daily_data: daily,
        funnel,
        cohort_retention: [], // se llenará cuando exista una tabla de cohortes propia
        activity_heatmap,
      };

      return summary;
    },
    enabled: !!spaceId,
    staleTime: 5 * 60 * 1000,
  });
}
