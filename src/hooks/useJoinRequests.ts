import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface JoinRequest {
  id: string;
  organization_id: string;
  user_id: string;
  requested_role: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  source: string | null;
  message: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export function useJoinRequests(organizationId?: string) {
  const { currentOrganizationId } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organizationId || currentOrganizationId;

  // Fetch pending join requests for the organization
  const {
    data: requests = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['join-requests', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('organization_join_requests')
        .select(`
          *,
          user:profiles!organization_join_requests_user_id_fkey (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useJoinRequests] Error fetching requests:', error);
        throw error;
      }

      return (data || []) as JoinRequest[];
    },
    enabled: !!orgId,
  });

  // Approve a join request
  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      // First, get the request details
      const { data: request, error: fetchError } = await supabase
        .from('organization_join_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        throw new Error('Solicitud no encontrada');
      }

      if (request.status !== 'pending') {
        throw new Error('Esta solicitud ya fue procesada');
      }

      // Add user to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: request.organization_id,
          user_id: request.user_id,
          is_owner: false,
        });

      if (memberError && !memberError.message.includes('duplicate')) {
        throw memberError;
      }

      // Assign role
      const { error: roleError } = await supabase
        .from('organization_member_roles')
        .insert({
          organization_id: request.organization_id,
          user_id: request.user_id,
          role: request.requested_role,
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('organization_join_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      // Activate community membership benefits if exists
      const { data: membership } = await supabase
        .from('partner_community_memberships')
        .select('id, metadata')
        .eq('user_id', request.user_id)
        .eq('status', 'pending')
        .single();

      if (membership) {
        const pendingBenefits = (membership.metadata as any)?.pending_benefits;

        await supabase
          .from('partner_community_memberships')
          .update({
            status: 'active',
            free_months_granted: pendingBenefits?.free_months || 0,
            bonus_tokens_granted: pendingBenefits?.bonus_tokens || 0,
            commission_discount_applied: pendingBenefits?.commission_discount || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', membership.id);

        // Add badge to profile
        if (pendingBenefits?.badge_text) {
          await supabase
            .from('profiles')
            .update({
              community_badge_text: pendingBenefits.badge_text,
              community_badge_color: pendingBenefits.badge_color,
              current_organization_id: request.organization_id,
            })
            .eq('id', request.user_id);

          // Also update creator_profiles if exists
          await supabase
            .from('creator_profiles')
            .update({
              community_badge_text: pendingBenefits.badge_text,
              community_badge_color: pendingBenefits.badge_color,
            })
            .eq('user_id', request.user_id);
        }

        // Grant AI tokens if any
        if (pendingBenefits?.bonus_tokens > 0) {
          await supabase.from('ai_usage_logs').insert({
            user_id: request.user_id,
            organization_id: request.organization_id,
            action: 'community_bonus',
            tokens_used: -pendingBenefits.bonus_tokens,
            metadata: {
              reason: 'Bono de bienvenida - Solicitud aprobada',
            },
          });
        }
      }

      return request;
    },
    onSuccess: () => {
      toast.success('Solicitud aprobada', {
        description: 'El usuario ahora es miembro de la organización',
      });
      queryClient.invalidateQueries({ queryKey: ['join-requests', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
    },
    onError: (error: Error) => {
      toast.error('Error al aprobar', {
        description: error.message,
      });
    },
  });

  // Reject a join request
  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const { error } = await supabase
        .from('organization_join_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitud rechazada');
      queryClient.invalidateQueries({ queryKey: ['join-requests', orgId] });
    },
    onError: (error: Error) => {
      toast.error('Error al rechazar', {
        description: error.message,
      });
    },
  });

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return {
    requests,
    pendingRequests,
    processedRequests,
    isLoading,
    error,
    approveRequest: approveMutation.mutate,
    rejectRequest: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
