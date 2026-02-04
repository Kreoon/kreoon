import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { MarketplaceFavorite } from '@/types/marketplace';

export function useMarketplaceFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all favorites
  const {
    data: favorites = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['marketplace-favorites', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from('marketplace_favorites')
        .select(`
          *,
          creator:profiles!creator_id (
            id,
            full_name,
            avatar_url,
            username,
            bio,
            avg_rating,
            is_available_for_hire
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (MarketplaceFavorite & {
        creator: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          username: string | null;
          bio: string | null;
          avg_rating: number | null;
          is_available_for_hire: boolean;
        };
      })[];
    },
    enabled: !!user?.id,
  });

  // Add to favorites
  const addMutation = useMutation({
    mutationFn: async ({
      creatorId,
      notes,
    }: {
      creatorId: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('No autenticado');

      const { data, error } = await (supabase as any)
        .from('marketplace_favorites')
        .insert({
          user_id: user.id,
          creator_id: creatorId,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya está en tus favoritos');
        }
        throw error;
      }

      return data as MarketplaceFavorite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-favorites', user?.id] });
      toast.success('Agregado a favoritos');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove from favorites
  const removeMutation = useMutation({
    mutationFn: async (creatorId: string) => {
      if (!user?.id) throw new Error('No autenticado');

      const { error } = await (supabase as any)
        .from('marketplace_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('creator_id', creatorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-favorites', user?.id] });
      toast.success('Eliminado de favoritos');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Update notes
  const updateNotesMutation = useMutation({
    mutationFn: async ({
      creatorId,
      notes,
    }: {
      creatorId: string;
      notes: string;
    }) => {
      if (!user?.id) throw new Error('No autenticado');

      const { data, error } = await (supabase as any)
        .from('marketplace_favorites')
        .update({ notes })
        .eq('user_id', user.id)
        .eq('creator_id', creatorId)
        .select()
        .single();

      if (error) throw error;
      return data as MarketplaceFavorite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-favorites', user?.id] });
      toast.success('Notas actualizadas');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Check if creator is in favorites
  const isFavorite = (creatorId: string): boolean => {
    return favorites.some((f) => f.creator_id === creatorId);
  };

  // Toggle favorite
  const toggleFavorite = async (creatorId: string) => {
    if (isFavorite(creatorId)) {
      await removeMutation.mutateAsync(creatorId);
    } else {
      await addMutation.mutateAsync({ creatorId });
    }
  };

  // Get notes for a creator
  const getNotes = (creatorId: string): string | null => {
    const favorite = favorites.find((f) => f.creator_id === creatorId);
    return favorite?.notes || null;
  };

  return {
    favorites,
    isLoading,
    error,
    refetch,
    addToFavorites: addMutation.mutateAsync,
    removeFromFavorites: removeMutation.mutateAsync,
    updateNotes: updateNotesMutation.mutateAsync,
    toggleFavorite,
    isFavorite,
    getNotes,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}

// Hook to check favorite status for a single creator
export function useIsFavorite(creatorId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-favorite', creatorId, user?.id],
    queryFn: async () => {
      if (!creatorId || !user?.id) return false;

      const { data, error } = await (supabase as any)
        .from('marketplace_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('creator_id', creatorId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!creatorId && !!user?.id,
  });
}
