/**
 * useOBSConnection - Conexión WebSocket a OBS para streaming v2
 * Control remoto de OBS via Edge Function proxy
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  OBSConnectionState,
  OBSScene,
  OBSStats,
  UseOBSConnectionReturn,
} from '@/types/streaming.types';

const INITIAL_STATE: OBSConnectionState = {
  connected: false,
  password_set: false,
  available_scenes: [],
  is_streaming: false,
  is_recording: false,
};

export function useOBSConnection(): UseOBSConnectionReturn {
  const { toast } = useToast();
  const [state, setState] = useState<OBSConnectionState>(INITIAL_STATE);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const websocketUrlRef = useRef<string | null>(null);

  // Poll OBS status when connected
  useEffect(() => {
    if (!state.connected || !websocketUrlRef.current) return;

    const pollStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('streaming-obs-bridge', {
          body: {
            action: 'get_status',
            websocket_url: websocketUrlRef.current,
          },
        });

        if (error) {
          console.error('[useOBSConnection] Poll error:', error);
          return;
        }

        setState((prev) => ({
          ...prev,
          current_scene: data.current_scene,
          is_streaming: data.is_streaming,
          is_recording: data.is_recording,
          stream_timecode: data.stream_timecode,
          record_timecode: data.record_timecode,
          stats: data.stats as OBSStats,
        }));
      } catch (err) {
        console.error('[useOBSConnection] Poll error:', err);
      }
    };

    // Poll every 2 seconds
    pollingRef.current = setInterval(pollStatus, 2000);
    pollStatus(); // Initial poll

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [state.connected]);

  // Connect to OBS
  const connect = useCallback(
    async (websocket_url: string, password?: string) => {
      setConnecting(true);
      setError(null);

      try {
        const { data, error } = await supabase.functions.invoke('streaming-obs-bridge', {
          body: {
            action: 'connect',
            websocket_url,
            password,
          },
        });

        if (error) throw new Error(error.message);

        if (!data.connected) {
          throw new Error(data.error || 'No se pudo conectar a OBS');
        }

        websocketUrlRef.current = websocket_url;

        setState({
          connected: true,
          websocket_url,
          password_set: !!password,
          version: data.version,
          platform: data.platform,
          available_scenes: (data.scenes || []) as OBSScene[],
          current_scene: data.current_scene,
          is_streaming: data.is_streaming,
          is_recording: data.is_recording,
        });

        toast({
          title: 'Conectado a OBS',
          description: `OBS ${data.version} conectado exitosamente`,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        setError(new Error(errorMsg));
        toast({
          title: 'Error de conexión',
          description: errorMsg,
          variant: 'destructive',
        });
      } finally {
        setConnecting(false);
      }
    },
    [toast]
  );

  // Disconnect
  const disconnect = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    websocketUrlRef.current = null;
    setState(INITIAL_STATE);
    toast({ title: 'Desconectado', description: 'OBS desconectado' });
  }, [toast]);

  // Send command helper
  const sendCommand = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      if (!state.connected || !websocketUrlRef.current) {
        throw new Error('OBS no está conectado');
      }

      const { data, error } = await supabase.functions.invoke('streaming-obs-bridge', {
        body: {
          action,
          websocket_url: websocketUrlRef.current,
          ...payload,
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Comando falló');

      return data;
    },
    [state.connected]
  );

  // Set scene
  const setScene = useCallback(
    async (sceneName: string) => {
      await sendCommand('set_scene', { scene_name: sceneName });
      setState((prev) => ({ ...prev, current_scene: sceneName }));
      toast({ title: 'Escena cambiada', description: sceneName });
    },
    [sendCommand, toast]
  );

  // Toggle source visibility
  const toggleSource = useCallback(
    async (sourceName: string, visible: boolean) => {
      await sendCommand('set_source_visibility', {
        source_name: sourceName,
        visible,
      });
    },
    [sendCommand]
  );

  // Start streaming
  const startStreaming = useCallback(async () => {
    await sendCommand('start_streaming');
    setState((prev) => ({ ...prev, is_streaming: true }));
    toast({ title: 'Streaming iniciado', description: 'OBS está transmitiendo' });
  }, [sendCommand, toast]);

  // Stop streaming
  const stopStreaming = useCallback(async () => {
    await sendCommand('stop_streaming');
    setState((prev) => ({ ...prev, is_streaming: false, stream_timecode: undefined }));
    toast({ title: 'Streaming detenido', description: 'OBS dejó de transmitir' });
  }, [sendCommand, toast]);

  // Start recording
  const startRecording = useCallback(async () => {
    await sendCommand('start_recording');
    setState((prev) => ({ ...prev, is_recording: true }));
    toast({ title: 'Grabación iniciada' });
  }, [sendCommand, toast]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    await sendCommand('stop_recording');
    setState((prev) => ({ ...prev, is_recording: false, record_timecode: undefined }));
    toast({ title: 'Grabación detenida' });
  }, [sendCommand, toast]);

  // Refresh browser source
  const refreshBrowserSource = useCallback(
    async (sourceName: string) => {
      await sendCommand('refresh_browser_source', { source_name: sourceName });
      toast({ title: 'Browser source actualizado' });
    },
    [sendCommand, toast]
  );

  return {
    state,
    connecting,
    error,
    connect,
    disconnect,
    setScene,
    toggleSource,
    startStreaming,
    stopStreaming,
    startRecording,
    stopRecording,
    refreshBrowserSource,
  };
}

export default useOBSConnection;
