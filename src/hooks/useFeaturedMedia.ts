import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SetFeaturedMediaParams {
  creatorProfileId: string;
  mediaId: string | null;
}

interface FeaturedMediaResult {
  success: boolean;
  error?: string;
  message?: string;
  featured_media_id?: string;
  featured_media_url?: string;
  featured_media_type?: 'image' | 'video';
}

export function useFeaturedMedia() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ creatorProfileId, mediaId }: SetFeaturedMediaParams): Promise<FeaturedMediaResult> => {
      const { data, error } = await supabase.rpc('set_featured_media', {
        p_creator_profile_id: creatorProfileId,
        p_media_id: mediaId,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as FeaturedMediaResult;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast({
          title: variables.mediaId ? 'Imagen destacada actualizada' : 'Imagen destacada eliminada',
          description: variables.mediaId
            ? 'Esta imagen se mostrara en tu tarjeta del marketplace'
            : 'Se usara el primer item del portafolio',
        });

        const profileId = variables.creatorProfileId;

        // Invalidar TODAS las queries relacionadas para actualización inmediata
        // Profile Builder - invalidar y refetch inmediato
        queryClient.invalidateQueries({ queryKey: ['profile-builder'] });
        queryClient.invalidateQueries({ queryKey: ['profile-builder', 'data', profileId] });
        queryClient.refetchQueries({ queryKey: ['profile-builder', 'data', profileId] });

        // Marketplace - forzar refetch inmediato
        queryClient.invalidateQueries({ queryKey: ['marketplace-creators'] });
        queryClient.refetchQueries({ queryKey: ['marketplace-creators'] });

        // Perfiles públicos - invalidar y refetch
        queryClient.invalidateQueries({ queryKey: ['creator-profile'] });
        queryClient.invalidateQueries({ queryKey: ['public-creator-profile'] });
        queryClient.invalidateQueries({ queryKey: ['published-profile-blocks', profileId] });
        queryClient.refetchQueries({ queryKey: ['published-profile-blocks', profileId] });

        // Datos del creador
        queryClient.invalidateQueries({ queryKey: ['creator-public-profile', profileId] });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo actualizar la imagen destacada',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
