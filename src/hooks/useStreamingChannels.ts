/**
 * useStreamingChannels - Gestión de canales destino para streaming v2
 * CRUD de canales + test de conexión + OAuth
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type {
  StreamingChannel,
  CreateChannelInput,
  UseStreamingChannelsReturn,
  StreamingPlatformType,
} from '@/types/streaming.types';

const QUERY_KEY = 'streaming-channels-v2';

export function useStreamingChannels(): UseStreamingChannelsReturn {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const organizationId = profile?.current_organization_id;

  // Fetch all channels for org
  const {
    data: channels = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('streaming_channels_v2')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as StreamingChannel[];
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 min
  });

  // Create channel mutation
  const createMutation = useMutation({
    mutationFn: async (input: CreateChannelInput): Promise<StreamingChannel> => {
      if (!organizationId || !profile?.id) {
        throw new Error('No organization or user');
      }

      const { data, error } = await supabase
        .from('streaming_channels_v2')
        .insert({
          organization_id: organizationId,
          created_by: profile.id,
          platform: input.platform,
          platform_display_name: input.platform_display_name,
          rtmp_url: input.rtmp_url,
          rtmp_key_encrypted: input.rtmp_key, // TODO: encrypt in edge function
          is_primary: input.is_primary || false,
          max_resolution: input.max_resolution || '1080p',
          max_bitrate: input.max_bitrate || 6000,
        })
        .select()
        .single();

      if (error) throw error;
      return data as StreamingChannel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast({ title: 'Canal creado', description: 'El canal fue configurado exitosamente' });
    },
    onError: (error) => {
      console.error('[useStreamingChannels] Create error:', error);
      toast({ title: 'Error', description: 'No se pudo crear el canal', variant: 'destructive' });
    },
  });

  // Update channel mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StreamingChannel> }) => {
      const { error } = await supabase
        .from('streaming_channels_v2')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast({ title: 'Actualizado', description: 'Canal actualizado' });
    },
    onError: (error) => {
      console.error('[useStreamingChannels] Update error:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar el canal', variant: 'destructive' });
    },
  });

  // Delete (soft delete - set is_active = false)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('streaming_channels_v2')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast({ title: 'Eliminado', description: 'Canal eliminado' });
    },
    onError: (error) => {
      console.error('[useStreamingChannels] Delete error:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el canal', variant: 'destructive' });
    },
  });

  // Test channel connection
  const testChannel = useCallback(
    async (id: string): Promise<{ success: boolean; latency_ms?: number; error?: string }> => {
      try {
        const channel = channels.find((c) => c.id === id);
        if (!channel) {
          return { success: false, error: 'Canal no encontrado' };
        }

        // Call edge function to test RTMP connection
        const { data, error } = await supabase.functions.invoke('streaming-hub', {
          body: {
            action: 'test_channel',
            channel_id: id,
            organization_id: organizationId,
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        return data as { success: boolean; latency_ms?: number; error?: string };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
    [channels, organizationId]
  );

  // Set primary channel
  const setPrimaryChannel = useCallback(
    async (id: string) => {
      // First, unset all as primary
      await supabase
        .from('streaming_channels_v2')
        .update({ is_primary: false })
        .eq('organization_id', organizationId);

      // Then set the selected one as primary
      await updateMutation.mutateAsync({ id, updates: { is_primary: true } });
    },
    [organizationId, updateMutation]
  );

  // Connect OAuth (for platforms that support it)
  const connectOAuth = useCallback(
    async (platform: StreamingPlatformType): Promise<{ auth_url: string }> => {
      const { data, error } = await supabase.functions.invoke('streaming-hub', {
        body: {
          action: 'get_oauth_url',
          platform,
          organization_id: organizationId,
          redirect_uri: `${window.location.origin}/settings/streaming/callback`,
        },
      });

      if (error) throw error;
      return data as { auth_url: string };
    },
    [organizationId]
  );

  return {
    channels,
    loading,
    error: error as Error | null,
    createChannel: createMutation.mutateAsync,
    updateChannel: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    deleteChannel: deleteMutation.mutateAsync,
    testChannel,
    setPrimaryChannel,
    connectOAuth,
  };
}

export default useStreamingChannels;
