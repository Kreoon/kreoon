import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardMetricsSummary, MarketingAIInsight, AdPlatform } from '../types/marketing.types';

export function useAdMetrics(dateRange?: { from: string; to: string }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.current_organization_id;

  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const defaultTo = new Date().toISOString().split('T')[0];
  const from = dateRange?.from || defaultFrom;
  const to = dateRange?.to || defaultTo;

  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['marketing-dashboard', orgId, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_marketing_dashboard_metrics', {
          p_org_id: orgId!,
          p_from: from,
          p_to: to,
        });

      if (error) throw error;
      return data as unknown as DashboardMetricsSummary;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: insights = [],
    isLoading: isInsightsLoading,
    refetch: refetchInsights,
  } = useQuery({
    queryKey: ['marketing-insights', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_ai_insights')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as unknown as MarketingAIInsight[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const syncAllMetrics = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('marketing-metrics/sync-all', {
        body: { organization_id: orgId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-dashboard', orgId] });
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns', orgId] });
    },
  });

  const syncCampaignMetrics = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('marketing-metrics/sync-campaign', {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-dashboard', orgId] });
    },
  });

  const generateInsights = useMutation({
    mutationFn: async (campaignId?: string) => {
      const { data, error } = await supabase.functions.invoke('marketing-metrics/ai-insights', {
        body: { organization_id: orgId, campaign_id: campaignId },
      });
      if (error) throw error;
      return data as MarketingAIInsight[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-insights', orgId] });
    },
  });

  const markInsightRead = useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('marketing_ai_insights')
        .update({ is_read: true } as any)
        .eq('id', insightId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-insights', orgId] });
    },
  });

  const unreadInsightsCount = insights.filter(i => !i.is_read).length;

  return {
    dashboard,
    insights,
    unreadInsightsCount,
    isDashboardLoading,
    isInsightsLoading,
    dashboardError: dashboardError as Error | null,
    refetchDashboard,
    refetchInsights,
    syncAllMetrics,
    syncCampaignMetrics,
    generateInsights,
    markInsightRead,
  };
}
