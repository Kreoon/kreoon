import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  CreatorService,
  CreatorServiceInput,
  ServiceDeliverable,
} from '@/types/marketplace';

interface UseCreatorServicesOptions {
  userId?: string;
  activeOnly?: boolean;
}

export function useCreatorServices(options: UseCreatorServicesOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = options.userId || user?.id;

  // Fetch services
  const {
    data: services = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['creator-services', targetUserId, options.activeOnly],
    queryFn: async () => {
      if (!targetUserId) return [];

      let query = (supabase as any)
        .from('creator_services')
        .select('*')
        .eq('user_id', targetUserId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (options.activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((s: any) => ({
        ...s,
        deliverables: s.deliverables || [],
        portfolio_items: s.portfolio_items || [],
      })) as CreatorService[];
    },
    enabled: !!targetUserId,
    staleTime: 1000 * 60 * 5,  // 5 minutos
    gcTime: 1000 * 60 * 30,    // 30 minutos cache
  });

  // Create service (supports admin mode when targetUserId differs from current user)
  const createMutation = useMutation({
    mutationFn: async (input: CreatorServiceInput) => {
      if (!targetUserId) throw new Error('No hay usuario destino');

      const { data, error } = await (supabase as any)
        .from('creator_services')
        .insert({
          user_id: targetUserId,
          ...input,
          deliverables: input.deliverables || [],
          portfolio_items: input.portfolio_items || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data as CreatorService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-services', targetUserId] });
      toast.success('Servicio creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear servicio: ${error.message}`);
    },
  });

  // Update service (supports admin mode - uses service ID directly without user filter)
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreatorServiceInput> & { id: string }) => {
      if (!targetUserId) throw new Error('No hay usuario destino');

      const { data, error } = await (supabase as any)
        .from('creator_services')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CreatorService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-services', targetUserId] });
      toast.success('Servicio actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  // Delete service (supports admin mode - uses service ID directly)
  const deleteMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      if (!targetUserId) throw new Error('No hay usuario destino');

      const { error } = await (supabase as any)
        .from('creator_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-services', targetUserId] });
      toast.success('Servicio eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  // Toggle active status
  const toggleActive = useCallback(async (serviceId: string, isActive: boolean) => {
    await updateMutation.mutateAsync({ id: serviceId, is_active: isActive });
  }, [updateMutation]);

  // Toggle featured status
  const toggleFeatured = useCallback(async (serviceId: string, isFeatured: boolean) => {
    await updateMutation.mutateAsync({ id: serviceId, is_featured: isFeatured });
  }, [updateMutation]);

  // Reorder services (supports admin mode)
  const reorderServices = useCallback(async (orderedIds: string[]) => {
    if (!targetUserId) return;

    const updates = orderedIds.map((id, index) => ({
      id,
      display_order: index,
    }));

    for (const update of updates) {
      await (supabase as any)
        .from('creator_services')
        .update({ display_order: update.display_order })
        .eq('id', update.id);
    }

    queryClient.invalidateQueries({ queryKey: ['creator-services', targetUserId] });
  }, [targetUserId, queryClient]);

  return {
    services,
    isLoading,
    error,
    refetch,
    createService: createMutation.mutateAsync,
    updateService: updateMutation.mutateAsync,
    deleteService: deleteMutation.mutateAsync,
    toggleActive,
    toggleFeatured,
    reorderServices,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook para obtener un servicio específico
export function useCreatorService(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['creator-service', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;

      const { data, error } = await (supabase as any)
        .from('creator_services')
        .select(`
          *,
          user:profiles!user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('id', serviceId)
        .single();

      if (error) throw error;

      return {
        ...data,
        deliverables: data.deliverables || [],
        portfolio_items: data.portfolio_items || [],
      } as CreatorService & {
        user: {
          id: string;
          full_name: string;
          username: string | null;
          avatar_url: string | null;
        };
      };
    },
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 5,  // 5 minutos
    gcTime: 1000 * 60 * 30,    // 30 minutos cache
  });
}
