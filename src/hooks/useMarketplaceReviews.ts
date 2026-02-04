import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  MarketplaceReview,
  MarketplaceReviewInput,
} from '@/types/marketplace';

interface UseMarketplaceReviewsOptions {
  userId?: string; // Get reviews FOR this user
  reviewerId?: string; // Get reviews BY this user
  limit?: number;
}

export function useMarketplaceReviews(options: UseMarketplaceReviewsOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { userId, reviewerId, limit = 20 } = options;

  // Fetch reviews
  const {
    data: reviews = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['marketplace-reviews', userId, reviewerId, limit],
    queryFn: async () => {
      let query = (supabase as any)
        .from('marketplace_reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id (id, full_name, avatar_url, username)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('reviewed_id', userId);
      }

      if (reviewerId) {
        query = query.eq('reviewer_id', reviewerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as MarketplaceReview[];
    },
    enabled: !!(userId || reviewerId),
  });

  // Create review
  const createMutation = useMutation({
    mutationFn: async (input: MarketplaceReviewInput) => {
      if (!user?.id) throw new Error('No autenticado');

      const { data, error } = await (supabase as any)
        .from('marketplace_reviews')
        .insert({
          reviewer_id: user.id,
          ...input,
        })
        .select(`
          *,
          reviewer:profiles!reviewer_id (id, full_name, avatar_url, username)
        `)
        .single();

      if (error) throw error;

      // Notify the reviewed user
      await (supabase as any)
        .from('marketplace_notifications')
        .insert({
          user_id: input.reviewed_id,
          actor_id: user.id,
          notification_type: 'new_review',
          entity_type: 'review',
          entity_id: data.id,
          message: `Nueva reseña: ${input.overall_rating} estrellas`,
        });

      return data as MarketplaceReview;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-reviews', variables.reviewed_id] });
      queryClient.invalidateQueries({ queryKey: ['creator-profile', variables.reviewed_id] });
      toast.success('Reseña publicada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Respond to review (reviewed user only)
  const respondMutation = useMutation({
    mutationFn: async ({
      reviewId,
      response,
    }: {
      reviewId: string;
      response: string;
    }) => {
      if (!user?.id) throw new Error('No autenticado');

      const { data, error } = await (supabase as any)
        .from('marketplace_reviews')
        .update({
          response_text: response,
          response_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('reviewed_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as MarketplaceReview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-reviews'] });
      toast.success('Respuesta publicada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Flag review
  const flagMutation = useMutation({
    mutationFn: async ({
      reviewId,
      reason,
    }: {
      reviewId: string;
      reason: string;
    }) => {
      if (!user?.id) throw new Error('No autenticado');

      const { error } = await (supabase as any)
        .from('marketplace_reviews')
        .update({
          is_flagged: true,
          flagged_reason: reason,
        })
        .eq('id', reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reseña reportada. La revisaremos pronto.');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Calculate stats
  const getStats = () => {
    if (reviews.length === 0) {
      return {
        average: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        wouldRecommend: 0,
      };
    }

    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    let recommendCount = 0;

    reviews.forEach((r) => {
      sum += r.overall_rating;
      distribution[r.overall_rating]++;
      if (r.would_recommend) recommendCount++;
    });

    return {
      average: Math.round((sum / reviews.length) * 10) / 10,
      total: reviews.length,
      distribution,
      wouldRecommend: Math.round((recommendCount / reviews.length) * 100),
    };
  };

  return {
    reviews,
    isLoading,
    error,
    refetch,
    createReview: createMutation.mutateAsync,
    respondToReview: respondMutation.mutateAsync,
    flagReview: flagMutation.mutateAsync,
    getStats,
    isCreating: createMutation.isPending,
    isResponding: respondMutation.isPending,
  };
}

// Hook to check if user can leave a review
export function useCanLeaveReview(proposalId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-leave-review', proposalId, user?.id],
    queryFn: async () => {
      if (!proposalId || !user?.id) return { canReview: false, reason: 'no_auth' };

      // Check if proposal exists and is completed
      const { data: proposal, error: proposalError } = await (supabase as any)
        .from('marketplace_proposals')
        .select('id, client_id, provider_id, status')
        .eq('id', proposalId)
        .single();

      if (proposalError || !proposal) {
        return { canReview: false, reason: 'proposal_not_found' };
      }

      // Check if user is part of the proposal
      const isClient = proposal.client_id === user.id;
      const isProvider = proposal.provider_id === user.id;

      if (!isClient && !isProvider) {
        return { canReview: false, reason: 'not_participant' };
      }

      // Check if proposal is accepted/completed
      if (proposal.status !== 'accepted') {
        return { canReview: false, reason: 'not_completed' };
      }

      // Check if user already left a review
      const { data: existingReview } = await (supabase as any)
        .from('marketplace_reviews')
        .select('id')
        .eq('proposal_id', proposalId)
        .eq('reviewer_id', user.id)
        .maybeSingle();

      if (existingReview) {
        return { canReview: false, reason: 'already_reviewed' };
      }

      return {
        canReview: true,
        reviewerType: isClient ? 'client' : 'provider',
        reviewedId: isClient ? proposal.provider_id : proposal.client_id,
      };
    },
    enabled: !!proposalId && !!user?.id,
  });
}
