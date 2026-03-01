// ============================================================================
// KREOON LIVE HOSTING HOOKS
// Hooks React para el sistema de contratación de hosts
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction';
import type {
  LiveHostingRequest,
  LiveHostingRequestWithRelations,
  LiveHostingHost,
  LiveHostingHostWithProfile,
  LiveHostingTemplate,
  HostingChannel,
  HostingRequestStatus,
  CreateHostingRequestPayload,
  UpdateHostingRequestPayload,
  ApplyAsHostPayload,
  InviteHostPayload,
  CounterOfferPayload,
  ReviewHostPayload,
  RespondToInvitationPayload,
  FinalizeNegotiationPayload,
  AssignInternalHostPayload,
  SetClientPricePayload,
  EndLivePayload,
  SubmitHostReviewPayload,
  CompleteHostingPayload,
  ListRequestsFilters,
  CreateRequestResponse,
  ApplyAsHostResponse,
  ReviewHostResponse,
  InviteHostResponse,
  NegotiationResponse,
  CheckoutResponse,
  CalculateOrgMarkupResponse,
} from '@/types/live-hosting.types';

// ─── Helper: invoke live-hosting-service ───
function invokeHostingService<T = unknown>(action: string, body?: Record<string, unknown>) {
  return invokeEdgeFunction<T>('live-hosting-service', action, body);
}

// ============================================================================
// HOOK: useLiveHostingRequests
// CRUD de solicitudes de hosting
// ============================================================================

export function useLiveHostingRequests(
  organizationId?: string,
  filters?: {
    channel?: HostingChannel;
    statuses?: HostingRequestStatus[];
    asHost?: boolean;
  }
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['live-hosting-requests', organizationId, filters];

  // ─── List requests ───
  const {
    data: requests = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<LiveHostingRequest[]> => {
      if (filters?.asHost) {
        // Usar edge function para obtener solicitudes como host
        const result = await invokeHostingService<{ requests: LiveHostingRequest[] }>(
          'list-requests',
          { as_host: true }
        );
        return result.requests || [];
      }

      if (organizationId) {
        // Usar RPC para obtener solicitudes de la org
        const { data, error } = await supabase.rpc('get_live_hosting_requests', {
          p_org_id: organizationId,
          p_channel: filters?.channel || null,
          p_statuses: filters?.statuses || null,
        });

        if (error) {
          console.error('[useLiveHostingRequests] Error:', error);
          return [];
        }
        return data || [];
      }

      return [];
    },
    enabled: !!user?.id && (!!organizationId || !!filters?.asHost),
    staleTime: 2 * 60 * 1000,
  });

  // ─── Get single request with relations ───
  const getRequest = async (requestId: string): Promise<LiveHostingRequestWithRelations | null> => {
    const result = await invokeHostingService<{ request: LiveHostingRequestWithRelations }>(
      'get-request',
      { request_id: requestId }
    );
    return result.request || null;
  };

  // ─── Create request ───
  const createMutation = useMutation({
    mutationFn: (payload: CreateHostingRequestPayload) =>
      invokeHostingService<CreateRequestResponse>('create-request', payload as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Solicitud creada exitosamente');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al crear solicitud');
    },
  });

  // ─── Update request ───
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateHostingRequestPayload) =>
      invokeHostingService<{ success: boolean }>('update-request', payload as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Solicitud actualizada');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar');
    },
  });

  // ─── Cancel request ───
  const cancelMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) =>
      invokeHostingService<{ success: boolean }>('cancel-request', { request_id: requestId, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Solicitud cancelada');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al cancelar');
    },
  });

  // ─── Publish to marketplace (Canal A) ───
  const publishMutation = useMutation({
    mutationFn: (requestId: string) =>
      invokeHostingService<{ success: boolean; campaign_id?: string }>(
        'publish-to-marketplace',
        { request_id: requestId }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Publicado en el marketplace');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al publicar');
    },
  });

  return {
    requests,
    isLoading,
    refetch,
    getRequest,
    createRequest: createMutation.mutateAsync,
    updateRequest: updateMutation.mutateAsync,
    cancelRequest: cancelMutation.mutateAsync,
    publishToMarketplace: publishMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isPublishing: publishMutation.isPending,
  };
}

// ============================================================================
// HOOK: useLiveHostingHosts
// Gestión de hosts para una solicitud
// ============================================================================

export function useLiveHostingHosts(requestId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['live-hosting-hosts', requestId];

  // ─── Get hosts for request ───
  const {
    data: hosts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<LiveHostingHostWithProfile[]> => {
      if (!requestId) return [];

      const { data, error } = await supabase.rpc('get_hosting_hosts', {
        p_request_id: requestId,
      });

      if (error) {
        console.error('[useLiveHostingHosts] Error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id && !!requestId,
    staleTime: 1 * 60 * 1000,
  });

  // ─── Apply as host (Canal A) ───
  const applyMutation = useMutation({
    mutationFn: (payload: ApplyAsHostPayload) =>
      invokeHostingService<ApplyAsHostResponse>('apply-as-host', payload as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Aplicación enviada');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al aplicar');
    },
  });

  // ─── Invite host (Canal B) ───
  const inviteMutation = useMutation({
    mutationFn: (payload: InviteHostPayload) =>
      invokeHostingService<InviteHostResponse>('invite-host', payload as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Invitación enviada');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al invitar');
    },
  });

  // ─── Respond to invitation (Canal B) ───
  const respondMutation = useMutation({
    mutationFn: (payload: RespondToInvitationPayload) =>
      invokeHostingService<NegotiationResponse>('respond-to-invitation', payload as Record<string, unknown>),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(data.accepted ? 'Invitación aceptada' : 'Invitación rechazada');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al responder');
    },
  });

  // ─── Send counter offer ───
  const counterOfferMutation = useMutation({
    mutationFn: (payload: CounterOfferPayload) =>
      invokeHostingService<NegotiationResponse>('send-counter-offer', payload as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Contraoferta enviada');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al enviar contraoferta');
    },
  });

  // ─── Review host (shortlist/select/reject) ───
  const reviewMutation = useMutation({
    mutationFn: (payload: ReviewHostPayload) =>
      invokeHostingService<ReviewHostResponse>('review-host', payload as Record<string, unknown>),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      const messages = {
        shortlisted: 'Host preseleccionado',
        selected: 'Host seleccionado',
        rejected: 'Host rechazado',
      };
      toast.success(messages[data.new_status as keyof typeof messages] || 'Host actualizado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al revisar');
    },
  });

  // ─── Finalize negotiation ───
  const finalizeMutation = useMutation({
    mutationFn: (payload: FinalizeNegotiationPayload) =>
      invokeHostingService<NegotiationResponse>('finalize-negotiation', payload as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Negociación finalizada');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al finalizar');
    },
  });

  // ─── Assign internal host (Canal C) ───
  const assignMutation = useMutation({
    mutationFn: (payload: AssignInternalHostPayload) =>
      invokeHostingService<NegotiationResponse>('assign-internal-host', payload as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Host asignado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al asignar');
    },
  });

  // Helper: get confirmed host
  const confirmedHost = hosts.find((h) => h.status === 'confirmed');

  return {
    hosts,
    confirmedHost,
    isLoading,
    refetch,
    applyAsHost: applyMutation.mutateAsync,
    inviteHost: inviteMutation.mutateAsync,
    respondToInvitation: respondMutation.mutateAsync,
    sendCounterOffer: counterOfferMutation.mutateAsync,
    reviewHost: reviewMutation.mutateAsync,
    finalizeNegotiation: finalizeMutation.mutateAsync,
    assignInternalHost: assignMutation.mutateAsync,
    isApplying: applyMutation.isPending,
    isInviting: inviteMutation.isPending,
    isResponding: respondMutation.isPending,
    isReviewing: reviewMutation.isPending,
    isFinalizing: finalizeMutation.isPending,
    isAssigning: assignMutation.isPending,
  };
}

// ============================================================================
// HOOK: useLiveHostingFinancials
// Checkout, escrow, pagos
// ============================================================================

export function useLiveHostingFinancials() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ─── Create checkout ───
  const checkoutMutation = useMutation({
    mutationFn: (requestId: string) =>
      invokeHostingService<CheckoutResponse>('create-hosting-checkout', { request_id: requestId }),
    onError: (err: Error) => {
      toast.error(err.message || 'Error al crear checkout');
    },
  });

  // ─── Confirm payment ───
  const confirmPaymentMutation = useMutation({
    mutationFn: ({ requestId, escrowId }: { requestId: string; escrowId: string }) =>
      invokeHostingService<{ success: boolean }>('confirm-payment', {
        request_id: requestId,
        escrow_id: escrowId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-hosting-requests'] });
      toast.success('Pago confirmado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al confirmar pago');
    },
  });

  // ─── Calculate org markup (Canal C) ───
  const calculateMarkup = async (
    hostRateUsd: number,
    orgMarkupRate: number
  ): Promise<CalculateOrgMarkupResponse['breakdown']> => {
    const result = await invokeHostingService<CalculateOrgMarkupResponse>('calculate-org-markup', {
      host_rate_usd: hostRateUsd,
      org_markup_rate: orgMarkupRate,
    });
    return result.breakdown;
  };

  // ─── Set client price (Canal C) ───
  const setClientPriceMutation = useMutation({
    mutationFn: (payload: SetClientPricePayload) =>
      invokeHostingService<{ success: boolean }>('set-client-price', payload as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-hosting-requests'] });
      toast.success('Precio establecido');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al establecer precio');
    },
  });

  return {
    createCheckout: checkoutMutation.mutateAsync,
    confirmPayment: confirmPaymentMutation.mutateAsync,
    calculateMarkup,
    setClientPrice: setClientPriceMutation.mutateAsync,
    isCreatingCheckout: checkoutMutation.isPending,
    isConfirmingPayment: confirmPaymentMutation.isPending,
    isSettingPrice: setClientPriceMutation.isPending,
    checkoutData: checkoutMutation.data,
  };
}

// ============================================================================
// HOOK: useLiveHostingTemplates
// Gestión de templates reutilizables
// ============================================================================

export function useLiveHostingTemplates(organizationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['live-hosting-templates', organizationId];

  // ─── List templates ───
  const {
    data: templates = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<LiveHostingTemplate[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('live_hosting_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('times_used', { ascending: false });

      if (error) {
        console.error('[useLiveHostingTemplates] Error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Create template ───
  const createMutation = useMutation({
    mutationFn: async (template: Omit<LiveHostingTemplate, 'id' | 'created_at' | 'updated_at' | 'times_used'>) => {
      const { data, error } = await supabase
        .from('live_hosting_templates')
        .insert({ ...template, created_by: user!.id })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Template creado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al crear template');
    },
  });

  // ─── Update template ───
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LiveHostingTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('live_hosting_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Template actualizado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar');
    },
  });

  // ─── Delete (soft) template ───
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('live_hosting_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Template eliminado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al eliminar');
    },
  });

  // ─── Increment usage count ───
  const incrementUsage = async (templateId: string) => {
    await supabase.rpc('increment', { row_id: templateId, table_name: 'live_hosting_templates', column_name: 'times_used' });
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    templates,
    isLoading,
    refetch,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
    incrementUsage,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================================================
// HOOK: useOrgLiveManagement
// Gestión de lives para organizaciones (Canal C)
// ============================================================================

export function useOrgLiveManagement(organizationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ─── Get org members available for hosting ───
  const {
    data: availableHosts = [],
    isLoading: hostsLoading,
  } = useQuery({
    queryKey: ['org-available-hosts', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Get org members who are creators
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          ),
          creator_profiles:user_id (
            id,
            slug,
            bio,
            rating_avg
          )
        `)
        .eq('organization_id', organizationId)
        .in('role', ['creator', 'admin', 'team_leader']);

      if (error) {
        console.error('[useOrgLiveManagement] Error:', error);
        return [];
      }

      return (data || []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        full_name: m.profiles?.full_name,
        avatar_url: m.profiles?.avatar_url,
        creator_profile_id: m.creator_profiles?.id,
        slug: m.creator_profiles?.slug,
        bio: m.creator_profiles?.bio,
        rating: m.creator_profiles?.rating_avg,
      }));
    },
    enabled: !!user?.id && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Get clients for org ───
  const {
    data: clients = [],
    isLoading: clientsLoading,
  } = useQuery({
    queryKey: ['org-clients-for-hosting', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) {
        console.error('[useOrgLiveManagement] Clients error:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Get org-managed requests ───
  const {
    data: orgRequests = [],
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ['org-managed-requests', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase.rpc('get_live_hosting_requests', {
        p_org_id: organizationId,
        p_channel: 'org_managed',
        p_statuses: null,
      });

      if (error) {
        console.error('[useOrgLiveManagement] Requests error:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id && !!organizationId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    availableHosts,
    clients,
    orgRequests,
    isLoading: hostsLoading || clientsLoading || requestsLoading,
    refetchRequests,
  };
}

// ============================================================================
// HOOK: useLiveHostingLifecycle
// Control del ciclo de vida del live (start, end, complete)
// ============================================================================

export function useLiveHostingLifecycle() {
  const queryClient = useQueryClient();

  // ─── Start live ───
  const startLiveMutation = useMutation({
    mutationFn: (requestId: string) =>
      invokeHostingService<{ success: boolean }>('start-live', { request_id: requestId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-hosting-requests'] });
      toast.success('Live iniciado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al iniciar live');
    },
  });

  // ─── End live ───
  const endLiveMutation = useMutation({
    mutationFn: (payload: EndLivePayload) =>
      invokeHostingService<{ success: boolean }>('end-live', payload as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-hosting-requests'] });
      toast.success('Live finalizado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al finalizar live');
    },
  });

  // ─── Submit host review ───
  const submitReviewMutation = useMutation({
    mutationFn: (payload: SubmitHostReviewPayload) =>
      invokeHostingService<{ success: boolean }>('submit-host-review', payload as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Reseña enviada');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al enviar reseña');
    },
  });

  // ─── Complete hosting ───
  const completeMutation = useMutation({
    mutationFn: (payload: CompleteHostingPayload) =>
      invokeHostingService<{ success: boolean }>('complete-hosting', payload as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-hosting-requests'] });
      toast.success('Hosting completado - pago en proceso');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al completar');
    },
  });

  return {
    startLive: startLiveMutation.mutateAsync,
    endLive: endLiveMutation.mutateAsync,
    submitHostReview: submitReviewMutation.mutateAsync,
    completeHosting: completeMutation.mutateAsync,
    isStartingLive: startLiveMutation.isPending,
    isEndingLive: endLiveMutation.isPending,
    isSubmittingReview: submitReviewMutation.isPending,
    isCompleting: completeMutation.isPending,
  };
}

// ============================================================================
// HOOK: useMarketplaceHostingFeed
// Feed de solicitudes abiertas para hosts (Canal A)
// ============================================================================

export function useMarketplaceHostingFeed(filters?: {
  niches?: string[];
  minBudget?: number;
  maxBudget?: number;
  limit?: number;
  offset?: number;
}) {
  const { user } = useAuth();
  const queryKey = ['marketplace-hosting-feed', filters];

  const {
    data: openRequests = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<LiveHostingRequest[]> => {
      const { data, error } = await supabase.rpc('get_marketplace_hosting_requests', {
        p_niches: filters?.niches || null,
        p_min_budget: filters?.minBudget || null,
        p_max_budget: filters?.maxBudget || null,
        p_limit: filters?.limit || 20,
        p_offset: filters?.offset || 0,
      });

      if (error) {
        console.error('[useMarketplaceHostingFeed] Error:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  return {
    openRequests,
    isLoading,
    refetch,
  };
}
