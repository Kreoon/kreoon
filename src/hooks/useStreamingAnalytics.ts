/**
 * useStreamingAnalytics - Analytics en tiempo real para streaming v2
 * Métricas + historial + exportación
 */

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  StreamingAnalyticsPoint,
  SessionAnalyticsSummary,
  LiveShoppingMetrics,
  UseStreamingAnalyticsReturn,
} from '@/types/streaming.types';

const QUERY_KEY = 'streaming-analytics-v2';

interface UseStreamingAnalyticsOptions {
  sessionId: string | null;
  live?: boolean; // If true, refetch every 10 seconds
}

export function useStreamingAnalytics({
  sessionId,
  live = false,
}: UseStreamingAnalyticsOptions): UseStreamingAnalyticsReturn {
  const { toast } = useToast();

  // Fetch analytics points
  const {
    data: analytics = [],
    isLoading: loadingPoints,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: [QUERY_KEY, 'points', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('streaming_analytics_v2')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return (data || []) as StreamingAnalyticsPoint[];
    },
    enabled: !!sessionId,
    staleTime: live ? 0 : 5 * 60 * 1000,
    refetchInterval: live ? 10 * 1000 : false, // 10 seconds if live
  });

  // Fetch summary (using RPC)
  const {
    data: summary = null,
    isLoading: loadingSummary,
  } = useQuery({
    queryKey: [QUERY_KEY, 'summary', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      const { data, error } = await supabase.rpc('get_session_analytics_summary', {
        p_session_id: sessionId,
      });

      if (error) throw error;
      return (data?.[0] || null) as SessionAnalyticsSummary | null;
    },
    enabled: !!sessionId,
    staleTime: live ? 0 : 5 * 60 * 1000,
    refetchInterval: live ? 30 * 1000 : false, // 30 seconds if live
  });

  // Calculate shopping metrics from products
  const {
    data: shoppingMetrics = null,
    isLoading: loadingShoppingMetrics,
  } = useQuery({
    queryKey: [QUERY_KEY, 'shopping', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      const { data: products, error } = await supabase
        .from('streaming_products_v2')
        .select('*')
        .eq('session_id', sessionId);

      if (error) throw error;
      if (!products || products.length === 0) return null;

      const metrics: LiveShoppingMetrics = {
        total_products: products.length,
        featured_count: products.filter((p) => p.is_featured).length,
        total_clicks: products.reduce((sum, p) => sum + (p.clicks || 0), 0),
        total_add_to_cart: products.reduce((sum, p) => sum + (p.add_to_cart_count || 0), 0),
        total_purchases: products.reduce((sum, p) => sum + (p.purchase_count || 0), 0),
        total_revenue_usd: products.reduce((sum, p) => sum + (p.revenue_usd || 0), 0),
        conversion_rate: 0,
        avg_order_value: 0,
        flash_offers_active: products.filter((p) => p.flash_offer_active).length,
      };

      // Calculate conversion rate
      if (metrics.total_clicks > 0) {
        metrics.conversion_rate = metrics.total_purchases / metrics.total_clicks;
      }

      // Calculate average order value
      if (metrics.total_purchases > 0) {
        metrics.avg_order_value = metrics.total_revenue_usd / metrics.total_purchases;
      }

      return metrics;
    },
    enabled: !!sessionId,
    staleTime: live ? 0 : 5 * 60 * 1000,
    refetchInterval: live ? 15 * 1000 : false, // 15 seconds if live
  });

  const loading = loadingPoints || loadingSummary || loadingShoppingMetrics;

  // Refresh all analytics
  const refreshAnalytics = useCallback(async () => {
    await refetchAnalytics();
  }, [refetchAnalytics]);

  // Export report
  const exportReport = useCallback(
    async (format: 'pdf' | 'csv'): Promise<string> => {
      if (!sessionId) throw new Error('No session');

      // Call edge function to generate report
      const { data, error } = await supabase.functions.invoke('streaming-hub', {
        body: {
          action: 'export_analytics',
          session_id: sessionId,
          format,
        },
      });

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo generar el reporte',
          variant: 'destructive',
        });
        throw error;
      }

      toast({
        title: 'Reporte generado',
        description: `Tu reporte ${format.toUpperCase()} está listo`,
      });

      return data.download_url as string;
    },
    [sessionId, toast]
  );

  return {
    analytics,
    summary,
    shoppingMetrics,
    loading,
    refreshAnalytics,
    exportReport,
  };
}

export default useStreamingAnalytics;
