/**
 * ============================================================
 * useContentAnalytics Hook
 * ============================================================
 *
 * Hook para obtener métricas de analytics de contenido
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  ContentAnalyticsMetrics,
  ContentDailyTrend,
  ContentTypeDistribution,
  TopPerformingContent,
} from '@/components/marketing/types';

// ── Types ──

type DateRange = '7d' | '14d' | '30d' | '90d';

interface ContentDataRow {
  id: string;
  title: string | null;
  views_count: number | null;
  likes_count: number | null;
  status: string | null;
  content_type: string | null;
  created_at: string;
  approved_at: string | null;
  thumbnail_url: string | null;
  creator?: { full_name?: string };
  client?: { name?: string };
}

interface UseContentAnalyticsReturn {
  metrics: ContentAnalyticsMetrics;
  topPerformers: TopPerformingContent[];
  typeDistribution: ContentTypeDistribution[];
  dailyTrends: ContentDailyTrend[];
  isLoading: boolean;
  refetch: () => void;
}

// ── Hook ──

export function useContentAnalytics(dateRange: DateRange = '30d'): UseContentAnalyticsReturn {
  const { organizationId } = useAuth();

  const daysBack = parseInt(dateRange.replace('d', ''));
  const startDate = startOfDay(subDays(new Date(), daysBack));
  const endDate = endOfDay(new Date());

  // ── Fetch Content Data ──

  const { data: contentData, isLoading, refetch } = useQuery({
    queryKey: ['content-analytics-data', organizationId, dateRange],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('content')
        .select(`
          id,
          title,
          views_count,
          likes_count,
          status,
          content_type,
          created_at,
          approved_at,
          thumbnail_url,
          creator:profiles!content_creator_id_fkey(full_name),
          client:clients!content_client_id_fkey(name)
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .is('deleted_at', null)
        .order('views_count', { ascending: false });

      if (error) {
        console.error('[useContentAnalytics] Error:', error);
        return [];
      }

      return (data || []) as ContentDataRow[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // ── Computed Metrics ──

  const computedData = useMemo(() => {
    const emptyResult: UseContentAnalyticsReturn = {
      metrics: {
        total_views: 0,
        total_likes: 0,
        total_content: 0,
        avg_engagement: 0,
        views_growth: 0,
        content_growth: 0,
      },
      topPerformers: [],
      typeDistribution: [],
      dailyTrends: [],
      isLoading,
      refetch,
    };

    if (!contentData?.length) {
      return emptyResult;
    }

    const totalViews = contentData.reduce((sum, c) => sum + (c.views_count || 0), 0);
    const totalLikes = contentData.reduce((sum, c) => sum + (c.likes_count || 0), 0);
    const avgEngagement = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;

    // Top performers
    const topPerformers: TopPerformingContent[] = contentData
      .filter((c) => (c.views_count || 0) > 0)
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        title: c.title || 'Sin titulo',
        views: c.views_count || 0,
        likes: c.likes_count || 0,
        engagement_rate: (c.views_count || 0) > 0 ? ((c.likes_count || 0) / (c.views_count || 0)) * 100 : 0,
        thumbnail_url: c.thumbnail_url,
        content_type: c.content_type || 'other',
        created_at: c.created_at,
      }));

    // Type distribution
    const typeMap = new Map<string, { count: number; views: number; likes: number }>();
    contentData.forEach((c) => {
      const type = c.content_type || 'other';
      const existing = typeMap.get(type) || { count: 0, views: 0, likes: 0 };
      typeMap.set(type, {
        count: existing.count + 1,
        views: existing.views + (c.views_count || 0),
        likes: existing.likes + (c.likes_count || 0),
      });
    });

    const typeDistribution: ContentTypeDistribution[] = Array.from(typeMap.entries()).map(
      ([type, data]) => ({
        type,
        count: data.count,
        views: data.views,
        engagement_rate: data.views > 0 ? (data.likes / data.views) * 100 : 0,
      })
    );

    // Daily trends
    const dailyMap = new Map<string, { views: number; likes: number; created: number }>();
    for (let i = 0; i < daysBack; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyMap.set(date, { views: 0, likes: 0, created: 0 });
    }

    contentData.forEach((c) => {
      const date = format(new Date(c.created_at), 'yyyy-MM-dd');
      const existing = dailyMap.get(date);
      if (existing) {
        dailyMap.set(date, {
          views: existing.views + (c.views_count || 0),
          likes: existing.likes + (c.likes_count || 0),
          created: existing.created + 1,
        });
      }
    });

    const dailyTrends: ContentDailyTrend[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        views: data.views,
        likes: data.likes,
        content_created: data.created,
      }))
      .reverse();

    // Growth calculations
    const midpoint = Math.floor(dailyTrends.length / 2);
    const firstHalfViews = dailyTrends.slice(0, midpoint).reduce((s, d) => s + d.views, 0);
    const secondHalfViews = dailyTrends.slice(midpoint).reduce((s, d) => s + d.views, 0);
    const viewsGrowth = firstHalfViews > 0 ? ((secondHalfViews - firstHalfViews) / firstHalfViews) * 100 : 0;

    const firstHalfContent = dailyTrends.slice(0, midpoint).reduce((s, d) => s + d.content_created, 0);
    const secondHalfContent = dailyTrends.slice(midpoint).reduce((s, d) => s + d.content_created, 0);
    const contentGrowth = firstHalfContent > 0 ? ((secondHalfContent - firstHalfContent) / firstHalfContent) * 100 : 0;

    return {
      metrics: {
        total_views: totalViews,
        total_likes: totalLikes,
        total_content: contentData.length,
        avg_engagement: avgEngagement,
        views_growth: viewsGrowth,
        content_growth: contentGrowth,
      },
      topPerformers,
      typeDistribution,
      dailyTrends,
      isLoading,
      refetch,
    };
  }, [contentData, daysBack, isLoading, refetch]);

  return computedData;
}

export default useContentAnalytics;
