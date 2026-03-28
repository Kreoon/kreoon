import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  MatchingCriteria,
  CreatorMatch,
  AIMatchingResponse,
  SavedSearch,
  IndustryId,
} from '@/types/ai-matching';

/**
 * Hook principal para búsqueda y matching de creadores con IA
 */
export function useCreatorMatching() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSearching, setIsSearching] = useState(false);

  // Búsqueda de creadores con IA
  const searchCreators = useCallback(async (
    criteria: MatchingCriteria
  ): Promise<AIMatchingResponse> => {
    setIsSearching(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-creator-matching', {
        body: {
          ...criteria,
          company_id: user?.id,
          use_ai_ranking: true,
        },
      });

      if (error) throw error;
      return data as AIMatchingResponse;
    } finally {
      setIsSearching(false);
    }
  }, [user?.id]);

  // Query con criteria fijos (para página de explorar)
  const useSearchResults = (criteria: MatchingCriteria, enabled = true) => {
    return useQuery({
      queryKey: ['creator-matching', criteria],
      queryFn: () => searchCreators(criteria),
      enabled: enabled && !!criteria,
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  // Registrar click en un match (feedback para mejorar IA)
  const recordMatchClick = useCallback(async (matchId: string, creatorId: string) => {
    if (!user?.id) return;

    await supabase
      .from('ai_match_history')
      .update({ was_clicked: true })
      .eq('searcher_id', user.id)
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(1);
  }, [user?.id]);

  // Registrar contacto (feedback)
  const recordMatchContact = useCallback(async (creatorId: string) => {
    if (!user?.id) return;

    await supabase
      .from('ai_match_history')
      .update({ was_contacted: true })
      .eq('searcher_id', user.id)
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(1);
  }, [user?.id]);

  // Registrar contratación (feedback)
  const recordMatchHire = useCallback(async (creatorId: string, rating?: number) => {
    if (!user?.id) return;

    await supabase
      .from('ai_match_history')
      .update({
        was_hired: true,
        final_rating: rating || null,
      })
      .eq('searcher_id', user.id)
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(1);
  }, [user?.id]);

  return {
    searchCreators,
    useSearchResults,
    recordMatchClick,
    recordMatchContact,
    recordMatchHire,
    isSearching,
  };
}

/**
 * Hook para búsquedas guardadas
 */
export function useSavedSearches() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener búsquedas guardadas
  const { data: savedSearches = [], isLoading, refetch } = useQuery({
    queryKey: ['saved-searches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SavedSearch[];
    },
    enabled: !!user?.id,
  });

  // Guardar búsqueda
  const saveMutation = useMutation({
    mutationFn: async (search: Omit<SavedSearch, 'id' | 'user_id' | 'created_at' | 'last_notified_at'>) => {
      if (!user?.id) throw new Error('No autenticado');

      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          ...search,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', user?.id] });
      toast.success('Búsqueda guardada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Eliminar búsqueda
  const deleteMutation = useMutation({
    mutationFn: async (searchId: string) => {
      if (!user?.id) throw new Error('No autenticado');

      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', user?.id] });
      toast.success('Búsqueda eliminada');
    },
  });

  // Toggle notificaciones
  const toggleNotifications = useMutation({
    mutationFn: async ({ searchId, enabled }: { searchId: string; enabled: boolean }) => {
      if (!user?.id) throw new Error('No autenticado');

      const { error } = await supabase
        .from('saved_searches')
        .update({ notify_new_matches: enabled })
        .eq('id', searchId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', user?.id] });
    },
  });

  return {
    savedSearches,
    isLoading,
    refetch,
    saveSearch: saveMutation.mutateAsync,
    deleteSearch: deleteMutation.mutateAsync,
    toggleNotifications: toggleNotifications.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}

/**
 * Hook para obtener industrias
 */
export function useIndustries() {
  return useQuery({
    queryKey: ['marketplace-industries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_industries')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Array<{
        id: IndustryId;
        name_es: string;
        name_en: string;
        icon: string;
        keywords: string[];
        parent_id: string | null;
      }>;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook para recomendaciones rápidas (widget)
 */
export function useQuickRecommendations(industry?: IndustryId, limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['quick-recommendations', industry, limit, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-creator-matching', {
        body: {
          industry,
          limit,
          company_id: user?.id,
          use_ai_ranking: false, // Más rápido
        },
      });

      if (error) throw error;
      return (data as AIMatchingResponse).matches;
    },
    enabled: !!industry,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
