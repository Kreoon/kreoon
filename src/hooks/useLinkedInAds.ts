/**
 * ============================================================
 * useLinkedInAds Hook
 * ============================================================
 *
 * Hook para interactuar con la API de LinkedIn Ads
 * a traves de la edge function marketing-linkedin
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  LinkedInAdAccount,
  LinkedInCampaign,
  LinkedInCampaignMetrics,
  LinkedInConversionEvent,
} from '@/components/marketing/types';

// ── Types ──

interface LinkedInApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
}

interface OAuthUrlResponse {
  url: string;
  state: string;
}

interface AccountsResponse {
  accounts: LinkedInAdAccount[];
}

interface MetricsResponse {
  campaign_id: string;
  date_range: { start: string; end: string };
  metrics: LinkedInCampaignMetrics;
  daily_data: Record<string, unknown>[];
}

interface ConnectionTestResponse {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// ── Hook ──

export function useLinkedInAds() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // ── API Call Helper ──

  const callLinkedInApi = useCallback(
    async <T>(action: string, data?: Record<string, unknown>): Promise<T> => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        throw new Error('No hay sesion activa');
      }

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/marketing-linkedin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, data }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || result.message || `Error HTTP ${response.status}`);
      }

      return result as T;
    },
    []
  );

  // ── OAuth Flow ──

  const getOAuthUrl = useCallback(async (redirectUri?: string) => {
    setIsLoading(true);
    try {
      const result = await callLinkedInApi<OAuthUrlResponse>('oauth_url', {
        redirect_uri: redirectUri,
      });
      return result;
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [callLinkedInApi, toast]);

  const handleOAuthCallback = useCallback(
    async (code: string, redirectUri: string) => {
      setIsLoading(true);
      try {
        const result = await callLinkedInApi<LinkedInApiResponse>('oauth_callback', {
          code,
          redirect_uri: redirectUri,
        });

        if (result.success) {
          toast({
            title: 'LinkedIn conectado',
            description: result.message || 'Conexion exitosa',
          });
          queryClient.invalidateQueries({ queryKey: ['linkedin-accounts'] });
        }

        return result;
      } catch (error) {
        toast({
          title: 'Error de conexion',
          description: (error as Error).message,
          variant: 'destructive',
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [callLinkedInApi, toast, queryClient]
  );

  // ── List Ad Accounts ──

  const {
    data: accounts,
    isLoading: loadingAccounts,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ['linkedin-accounts'],
    queryFn: async () => {
      const result = await callLinkedInApi<AccountsResponse>('list_accounts');
      return result.accounts || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: false, // Manual fetch only
  });

  // ── Create Campaign ──

  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: LinkedInCampaign) => {
      return callLinkedInApi<{ campaign_id: string; message: string }>('create_campaign', campaign);
    },
    onSuccess: (data) => {
      toast({
        title: 'Campana creada',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['linkedin-campaigns'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creando campana',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // ── Update Campaign ──

  const updateCampaignMutation = useMutation({
    mutationFn: async (campaign: LinkedInCampaign) => {
      return callLinkedInApi<{ message: string }>('update_campaign', campaign);
    },
    onSuccess: (data) => {
      toast({
        title: 'Campana actualizada',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['linkedin-campaigns'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error actualizando campana',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // ── Get Campaign Metrics ──

  const getCampaignMetrics = useCallback(
    async (campaignId: string, dateRange?: { start: string; end: string }) => {
      setIsLoading(true);
      try {
        const result = await callLinkedInApi<MetricsResponse>('get_metrics', {
          campaign_id: campaignId,
          date_range: dateRange,
        });
        return result;
      } catch (error) {
        toast({
          title: 'Error obteniendo metricas',
          description: (error as Error).message,
          variant: 'destructive',
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [callLinkedInApi, toast]
  );

  // ── Track Conversion ──

  const trackConversionMutation = useMutation({
    mutationFn: async (event: LinkedInConversionEvent) => {
      return callLinkedInApi<{ success: boolean; message: string }>('track_conversion', event);
    },
    onSuccess: () => {
      // Silent success - conversions are tracked in background
    },
    onError: (error: Error) => {
      console.error('[LinkedIn CAPI] Conversion error:', error.message);
    },
  });

  // ── Test Connection ──

  const testConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await callLinkedInApi<ConnectionTestResponse>('test_connection');
      toast({
        title: result.success ? 'Conexion exitosa' : 'Error de conexion',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
      return result;
    } catch (error) {
      toast({
        title: 'Error de conexion',
        description: (error as Error).message,
        variant: 'destructive',
      });
      return { success: false, message: (error as Error).message };
    } finally {
      setIsLoading(false);
    }
  }, [callLinkedInApi, toast]);

  return {
    // State
    isLoading,
    accounts,
    loadingAccounts,

    // OAuth
    getOAuthUrl,
    handleOAuthCallback,

    // Accounts
    refetchAccounts,

    // Campaigns
    createCampaign: createCampaignMutation.mutate,
    createCampaignAsync: createCampaignMutation.mutateAsync,
    isCreatingCampaign: createCampaignMutation.isPending,
    updateCampaign: updateCampaignMutation.mutate,
    updateCampaignAsync: updateCampaignMutation.mutateAsync,
    isUpdatingCampaign: updateCampaignMutation.isPending,

    // Metrics
    getCampaignMetrics,

    // Conversions
    trackConversion: trackConversionMutation.mutate,
    trackConversionAsync: trackConversionMutation.mutateAsync,

    // Connection
    testConnection,
  };
}

export default useLinkedInAds;
