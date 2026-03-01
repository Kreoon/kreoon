/**
 * useStreamingOverlays - Overlays y elementos visuales para streaming v2
 * CRUD + activar/desactivar + templates
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type {
  StreamingOverlay,
  CreateOverlayInput,
  UseStreamingOverlaysReturn,
} from '@/types/streaming.types';

const QUERY_KEY = 'streaming-overlays-v2';

export function useStreamingOverlays(): UseStreamingOverlaysReturn {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const organizationId = profile?.current_organization_id;

  // Fetch all overlays for org
  const {
    data: overlays = [],
    isLoading: loading,
  } = useQuery({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('streaming_overlays_v2')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as StreamingOverlay[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // Active overlays
  const activeOverlays = useMemo(() => {
    return overlays.filter((o) => o.is_active);
  }, [overlays]);

  // Templates
  const templates = useMemo(() => {
    return overlays.filter((o) => o.is_template);
  }, [overlays]);

  // Create overlay
  const createMutation = useMutation({
    mutationFn: async (input: CreateOverlayInput): Promise<StreamingOverlay> => {
      if (!organizationId) throw new Error('No organization');

      const { data, error } = await supabase
        .from('streaming_overlays_v2')
        .insert({
          organization_id: organizationId,
          name: input.name,
          overlay_type: input.overlay_type,
          content: input.content,
          width: input.width,
          height: input.height,
          position_x: input.position_x || 0,
          position_y: input.position_y || 0,
          is_template: input.is_template || false,
          enter_animation: input.enter_animation || 'fadeIn',
          exit_animation: input.exit_animation || 'fadeOut',
          auto_hide_seconds: input.auto_hide_seconds,
        })
        .select()
        .single();

      if (error) throw error;
      return data as StreamingOverlay;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast({ title: 'Overlay creado', description: 'El overlay está listo para usar' });
    },
    onError: (error) => {
      console.error('[useStreamingOverlays] Create error:', error);
      toast({ title: 'Error', description: 'No se pudo crear el overlay', variant: 'destructive' });
    },
  });

  // Update overlay
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StreamingOverlay> }) => {
      const { error } = await supabase
        .from('streaming_overlays_v2')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
    onError: (error) => {
      console.error('[useStreamingOverlays] Update error:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar el overlay', variant: 'destructive' });
    },
  });

  // Delete overlay
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('streaming_overlays_v2').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast({ title: 'Eliminado', description: 'Overlay eliminado' });
    },
    onError: (error) => {
      console.error('[useStreamingOverlays] Delete error:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el overlay', variant: 'destructive' });
    },
  });

  // Activate overlay
  const activateOverlay = useCallback(
    async (id: string) => {
      await updateMutation.mutateAsync({ id, updates: { is_active: true } });
      toast({ title: 'Overlay activado', description: 'El overlay se muestra en pantalla' });
    },
    [updateMutation, toast]
  );

  // Deactivate overlay
  const deactivateOverlay = useCallback(
    async (id: string) => {
      await updateMutation.mutateAsync({ id, updates: { is_active: false } });
    },
    [updateMutation]
  );

  // Save as template
  const saveAsTemplate = useCallback(
    async (id: string) => {
      const overlay = overlays.find((o) => o.id === id);
      if (!overlay) return;

      // Create a copy as template
      await createMutation.mutateAsync({
        name: `${overlay.name} (Template)`,
        overlay_type: overlay.overlay_type,
        content: overlay.content,
        width: overlay.width,
        height: overlay.height,
        position_x: overlay.position_x,
        position_y: overlay.position_y,
        is_template: true,
        enter_animation: overlay.enter_animation,
        exit_animation: overlay.exit_animation,
        auto_hide_seconds: overlay.auto_hide_seconds,
      });

      toast({ title: 'Template guardado', description: 'El overlay fue guardado como template' });
    },
    [overlays, createMutation, toast]
  );

  return {
    overlays,
    activeOverlays,
    templates,
    loading,
    createOverlay: createMutation.mutateAsync,
    updateOverlay: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    deleteOverlay: deleteMutation.mutateAsync,
    activateOverlay,
    deactivateOverlay,
    saveAsTemplate,
  };
}

export default useStreamingOverlays;
