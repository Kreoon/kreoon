import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RestreamChannel {
  id: string;
  displayName: string;
  platform: string;
  enabled: boolean;
}

interface RestreamEvent {
  id: string;
  title: string;
  scheduledFor: string;
  status: string;
}

interface StreamStatus {
  isLive: boolean;
  viewerCount: number;
  bitrate: number;
  duration: number;
}

export function useRestreamApi(organizationId?: string) {
  const { toast } = useToast();

  const callApi = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const { data, error } = await supabase.functions.invoke('restream-api', {
      body: { action, organization_id: organizationId, ...params },
    });

    if (error) {
      console.error('[useRestreamApi] Error:', error);
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }, [organizationId]);

  // Check if organization is connected to Restream
  const checkConnection = useCallback(async () => {
    try {
      const data = await callApi('check_connection');
      return data;
    } catch (error) {
      console.error('Error checking Restream connection:', error);
      return { connected: false };
    }
  }, [callApi]);

  // Get OAuth authorization URL
  const getAuthUrl = useCallback(async (redirectUri: string) => {
    try {
      const data = await callApi('get_auth_url', { redirect_uri: redirectUri });
      return data.auth_url;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      toast({
        title: 'Error',
        description: 'No se pudo obtener la URL de autorización',
        variant: 'destructive',
      });
      return null;
    }
  }, [callApi, toast]);

  // Exchange authorization code for tokens
  const exchangeCode = useCallback(async (code: string, redirectUri: string) => {
    try {
      await callApi('exchange_code', { code, redirect_uri: redirectUri });
      toast({ title: 'Éxito', description: 'Restream conectado correctamente' });
      return true;
    } catch (error) {
      console.error('Error exchanging code:', error);
      toast({
        title: 'Error',
        description: 'No se pudo conectar con Restream',
        variant: 'destructive',
      });
      return false;
    }
  }, [callApi, toast]);

  // Disconnect from Restream
  const disconnect = useCallback(async () => {
    try {
      await callApi('disconnect');
      toast({ title: 'Desconectado', description: 'Restream desconectado correctamente' });
      return true;
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Error',
        description: 'No se pudo desconectar de Restream',
        variant: 'destructive',
      });
      return false;
    }
  }, [callApi, toast]);

  // Get available channels
  const getChannels = useCallback(async (): Promise<RestreamChannel[]> => {
    try {
      const data = await callApi('get_channels');
      return data.channels || [];
    } catch (error) {
      console.error('Error fetching channels:', error);
      return [];
    }
  }, [callApi]);

  // Get stream key and RTMP URL
  const getStreamKey = useCallback(async () => {
    try {
      const data = await callApi('get_stream_key');
      return {
        streamKey: data.stream_key,
        rtmpUrl: data.rtmp_url,
      };
    } catch (error) {
      console.error('Error fetching stream key:', error);
      toast({
        title: 'Error',
        description: 'No se pudo obtener la clave de streaming',
        variant: 'destructive',
      });
      return null;
    }
  }, [callApi, toast]);

  // Create a streaming event
  const createEvent = useCallback(async (
    title: string,
    scheduledAt: string,
    destinations?: string[]
  ): Promise<RestreamEvent | null> => {
    try {
      const data = await callApi('create_event', {
        title,
        scheduled_at: scheduledAt,
        destinations,
      });
      toast({ title: 'Éxito', description: 'Evento creado en Restream' });
      return data.event;
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el evento en Restream',
        variant: 'destructive',
      });
      return null;
    }
  }, [callApi, toast]);

  // Get stream status
  const getStreamStatus = useCallback(async (): Promise<StreamStatus | null> => {
    try {
      const data = await callApi('get_stream_status');
      return data.status;
    } catch (error) {
      console.error('Error fetching stream status:', error);
      return null;
    }
  }, [callApi]);

  // Start stream
  const startStream = useCallback(async (eventId: string) => {
    try {
      await callApi('start_stream', { event_id: eventId });
      toast({ title: 'En vivo', description: 'Transmisión iniciada' });
      return true;
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la transmisión',
        variant: 'destructive',
      });
      return false;
    }
  }, [callApi, toast]);

  // Stop stream
  const stopStream = useCallback(async (eventId: string) => {
    try {
      await callApi('stop_stream', { event_id: eventId });
      toast({ title: 'Finalizado', description: 'Transmisión finalizada' });
      return true;
    } catch (error) {
      console.error('Error stopping stream:', error);
      toast({
        title: 'Error',
        description: 'No se pudo finalizar la transmisión',
        variant: 'destructive',
      });
      return false;
    }
  }, [callApi, toast]);

  // Get analytics
  const getAnalytics = useCallback(async (eventId: string) => {
    try {
      const data = await callApi('get_analytics', { event_id: eventId });
      return data.analytics;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }, [callApi]);

  return {
    checkConnection,
    getAuthUrl,
    exchangeCode,
    disconnect,
    getChannels,
    getStreamKey,
    createEvent,
    getStreamStatus,
    startStream,
    stopStream,
    getAnalytics,
  };
}
