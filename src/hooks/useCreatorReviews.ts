/**
 * Hook para gestionar resenas de creadores
 * - Obtener resenas publicas (aprobadas y verificadas)
 * - Obtener todas las resenas del creador (incluyendo pendientes)
 * - Crear solicitudes de resena
 * - Responder a resenas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface CreatorReview {
  id: string;
  creator_id: string;
  reviewer_name: string;
  reviewer_company?: string;
  reviewer_avatar_url?: string;
  reviewer_role?: string;
  service_type?: string;
  collaboration_date?: string;
  rating: number;
  title?: string;
  content: string;
  rating_communication?: number;
  rating_quality?: number;
  rating_timeliness?: number;
  rating_professionalism?: number;
  is_verified: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  is_featured: boolean;
  creator_response?: string;
  creator_responded_at?: string;
  created_at: string;
}

export interface ReviewRequest {
  id: string;
  creator_id: string;
  recipient_name: string;
  recipient_email?: string;
  recipient_phone?: string;
  token: string;
  status: 'pending' | 'sent' | 'opened' | 'completed' | 'expired';
  sent_via?: string;
  sent_at?: string;
  completed_at?: string;
  review_id?: string;
  expires_at: string;
  created_at: string;
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
  verified_reviews: number;
  recent_reviews: number;
}

export interface CreateReviewRequestInput {
  recipient_name: string;
  recipient_email?: string;
  recipient_phone?: string;
}

export interface SubmitReviewInput {
  token: string;
  reviewer_name: string;
  reviewer_email?: string;
  reviewer_company?: string;
  rating: number;
  title?: string;
  content: string;
}

// Query keys
const REVIEW_KEYS = {
  all: ['creator-reviews'] as const,
  public: (creatorId: string) => [...REVIEW_KEYS.all, 'public', creatorId] as const,
  mine: (creatorId: string) => [...REVIEW_KEYS.all, 'mine', creatorId] as const,
  stats: (creatorId: string) => [...REVIEW_KEYS.all, 'stats', creatorId] as const,
  requests: (creatorId: string) => [...REVIEW_KEYS.all, 'requests', creatorId] as const,
  byToken: (token: string) => [...REVIEW_KEYS.all, 'token', token] as const,
};

/**
 * Obtener resenas publicas (aprobadas y verificadas) de un creador
 */
export function usePublicReviews(creatorId: string | undefined) {
  return useQuery({
    queryKey: REVIEW_KEYS.public(creatorId || ''),
    queryFn: async () => {
      if (!creatorId) return [];

      const { data, error } = await supabase
        .from('creator_reviews')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('status', 'approved')
        .eq('is_verified', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CreatorReview[];
    },
    enabled: !!creatorId,
  });
}

/**
 * Obtener TODAS las resenas del creador (incluyendo pendientes)
 * Solo para el propio creador
 */
export function useMyReviews(creatorId: string | undefined) {
  return useQuery({
    queryKey: REVIEW_KEYS.mine(creatorId || ''),
    queryFn: async () => {
      if (!creatorId) return [];

      const { data, error } = await supabase
        .from('creator_reviews')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CreatorReview[];
    },
    enabled: !!creatorId,
  });
}

/**
 * Obtener estadisticas de resenas de un creador
 */
export function useReviewStats(creatorId: string | undefined) {
  return useQuery({
    queryKey: REVIEW_KEYS.stats(creatorId || ''),
    queryFn: async () => {
      if (!creatorId) return null;

      const { data, error } = await supabase
        .rpc('get_creator_review_stats', { p_creator_id: creatorId });

      if (error) throw error;
      return data?.[0] as ReviewStats | null;
    },
    enabled: !!creatorId,
  });
}

/**
 * Obtener solicitudes de resena del creador
 */
export function useReviewRequests(creatorId: string | undefined) {
  return useQuery({
    queryKey: REVIEW_KEYS.requests(creatorId || ''),
    queryFn: async () => {
      if (!creatorId) return [];

      const { data, error } = await supabase
        .from('review_requests')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReviewRequest[];
    },
    enabled: !!creatorId,
  });
}

/**
 * Obtener solicitud de resena por token (para pagina publica)
 */
export function useReviewRequestByToken(token: string | undefined) {
  return useQuery({
    queryKey: REVIEW_KEYS.byToken(token || ''),
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase
        .from('review_requests')
        .select(`
          *,
          creator:creator_id (
            id,
            display_name,
            avatar_url,
            bio
          )
        `)
        .eq('token', token)
        .single();

      if (error) throw error;

      // Verificar que no haya expirado
      if (data && new Date(data.expires_at) < new Date()) {
        return { ...data, status: 'expired' };
      }

      return data;
    },
    enabled: !!token,
  });
}

/**
 * Hook principal con todas las mutaciones
 */
export function useCreatorReviews(creatorId: string | undefined) {
  const queryClient = useQueryClient();

  // Crear solicitud de resena
  const createRequest = useMutation({
    mutationFn: async (input: CreateReviewRequestInput) => {
      if (!creatorId) throw new Error('Creator ID required');

      const { data, error } = await supabase
        .from('review_requests')
        .insert({
          creator_id: creatorId,
          recipient_name: input.recipient_name,
          recipient_email: input.recipient_email,
          recipient_phone: input.recipient_phone,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ReviewRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.requests(creatorId || '') });
    },
  });

  // Enviar solicitud por email (llama a edge function)
  const sendRequestEmail = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke('send-review-request', {
        body: { requestId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.requests(creatorId || '') });
    },
  });

  // Responder a una resena
  const respondToReview = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      const { data, error } = await supabase
        .from('creator_reviews')
        .update({
          creator_response: response,
          creator_responded_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.mine(creatorId || '') });
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.public(creatorId || '') });
    },
  });

  // Marcar resena como destacada
  const toggleFeatured = useMutation({
    mutationFn: async ({ reviewId, featured }: { reviewId: string; featured: boolean }) => {
      const { data, error } = await supabase
        .from('creator_reviews')
        .update({ is_featured: featured })
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.mine(creatorId || '') });
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.public(creatorId || '') });
    },
  });

  return {
    // Queries
    publicReviews: usePublicReviews(creatorId),
    myReviews: useMyReviews(creatorId),
    stats: useReviewStats(creatorId),
    requests: useReviewRequests(creatorId),
    // Mutations
    createRequest,
    sendRequestEmail,
    respondToReview,
    toggleFeatured,
  };
}

/**
 * Enviar una resena (usado desde pagina publica)
 */
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitReviewInput) => {
      const { data, error } = await supabase.rpc('complete_review_request', {
        p_token: input.token,
        p_reviewer_name: input.reviewer_name,
        p_reviewer_email: input.reviewer_email || null,
        p_reviewer_company: input.reviewer_company || null,
        p_rating: input.rating,
        p_content: input.content,
        p_title: input.title || null,
      });

      if (error) throw error;
      return data as string; // Returns review ID
    },
    onSuccess: () => {
      // Invalidate all review queries
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.all });
    },
  });
}

export default useCreatorReviews;
