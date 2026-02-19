import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MarketingCampaign, AdCampaignStatus, CampaignFormData, AdPlatform } from '../types/marketing.types';

export function useAdCampaigns(filters?: {
  status?: AdCampaignStatus;
  platform?: AdPlatform;
  adAccountId?: string;
}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.current_organization_id;

  const {
    data: campaigns = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['marketing-campaigns', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.platform) query = query.eq('platform', filters.platform);
      if (filters?.adAccountId) query = query.eq('ad_account_id', filters.adAccountId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as MarketingCampaign[];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  const createCampaign = useMutation({
    mutationFn: async (form: CampaignFormData) => {
      const { data, error } = await supabase.functions.invoke('marketing-campaigns/create', {
        body: { ...form, organization_id: orgId },
      });
      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns', orgId] });
    },
  });

  const aiCreateCampaign = useMutation({
    mutationFn: async (params: {
      contentId: string;
      platform: AdPlatform;
      adAccountId: string;
      objective: string;
      budget?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('marketing-campaigns/ai-create', {
        body: { ...params, organization_id: orgId },
      });
      if (error) throw error;
      return data as { campaign: CampaignFormData; reasoning: string };
    },
  });

  const promoteContent = useMutation({
    mutationFn: async (params: {
      contentId: string;
      platform: AdPlatform;
      adAccountId: string;
      dailyBudget: number;
      durationDays: number;
      objective?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('marketing-campaigns/promote-content', {
        body: { ...params, organization_id: orgId },
      });
      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns', orgId] });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MarketingCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns', orgId] });
    },
  });

  const pauseCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('marketing-campaigns/pause', {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns', orgId] });
    },
  });

  const resumeCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('marketing-campaigns/resume', {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns', orgId] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('marketing-campaigns/delete', {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns', orgId] });
    },
  });

  const syncCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('marketing-campaigns/sync', {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns', orgId] });
    },
  });

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.total_spend || 0), 0);

  return {
    campaigns,
    activeCampaigns,
    totalSpend,
    isLoading,
    error: error as Error | null,
    refetch,
    createCampaign,
    aiCreateCampaign,
    promoteContent,
    updateCampaign,
    pauseCampaign,
    resumeCampaign,
    deleteCampaign,
    syncCampaign,
  };
}
