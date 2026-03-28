/**
 * useLiveStream - Hook para gestionar transmisiones en vivo
 * Conecta con Cloudflare Stream via WHIP (WebRTC)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type {
  LiveStreamStatus,
  CreatorLiveStream,
  StreamCredentials,
  StartStreamParams,
  EndStreamResponse,
  GoLiveFormState,
} from '@/types/live-streaming.types';

interface UseLiveStreamReturn {
  // Estado
  status: LiveStreamStatus;
  streamId: string | null;
  streamInfo: CreatorLiveStream | null;
  isLoading: boolean;
  error: Error | null;

  // Métricas en tiempo real
  viewers: number;
  likes: number;
  comments: number;
  duration: number;

  // Credenciales
  whipUrl: string | null;
  playbackUrl: string | null;

  // Acciones
  prepareForLive: (form: GoLiveFormState) => Promise<StreamCredentials | null>;
  goLive: (stream: MediaStream) => Promise<boolean>;
  endLive: () => Promise<EndStreamResponse | null>;
  updateStreamInfo: (updates: Partial<GoLiveFormState>) => Promise<void>;
}

// WHIP Client para WebRTC
class WHIPClient {
  private peerConnection: RTCPeerConnection | null = null;
  private whipUrl: string;
  private resourceUrl: string | null = null;

  // Promesa para ICE gathering - se configura ANTES de setLocalDescription
  private iceGatheringPromise: Promise<void> | null = null;
  private iceGatheringResolve: (() => void) | null = null;
  private iceCandidateCount = 0;

  constructor(url: string) {
    this.whipUrl = url;
  }

  async connect(stream: MediaStream): Promise<void> {
    logger.debug('WHIP Starting connection', { url: this.whipUrl });

    // Verificar que hay tracks en el stream
    const tracks = stream.getTracks();
    logger.debug('WHIP Stream tracks', { tracks: tracks.map(t => `${t.kind}:${t.readyState}`) });

    if (tracks.length === 0) {
      throw new Error('No hay tracks de audio/video en el stream');
    }

    // Crear peer connection con múltiples ICE servers para mejor conectividad
    // Incluye TURN servers públicos como fallback
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // OpenRelay TURN server (público, gratuito)
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ],
      bundlePolicy: 'max-bundle',
      iceCandidatePoolSize: 10,
      // Forzar recolección de todos los tipos de candidates
      iceTransportPolicy: 'all',
    });

    // IMPORTANTE: Configurar la promesa de ICE gathering ANTES de cualquier otra cosa
    this.setupICEGatheringPromise();

    // Logging detallado de estados
    this.peerConnection.onconnectionstatechange = () => {
      logger.debug('WHIP Connection state', { state: this.peerConnection?.connectionState });
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      logger.debug('WHIP ICE connection state', { state: this.peerConnection?.iceConnectionState });
    };

    this.peerConnection.onicecandidateerror = (event) => {
      logger.warn('WHIP ICE candidate error', { event });
    };

    // Agregar tracks usando addTrack (más compatible que addTransceiver)
    tracks.forEach((track) => {
      logger.debug('WHIP Adding track', { kind: track.kind, label: track.label });
      this.peerConnection!.addTrack(track, stream);
    });

    // Crear offer con opciones específicas
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    logger.debug('WHIP Created offer');

    // Configurar el local description - esto inicia ICE gathering
    // NOTA: Los listeners ya están configurados antes de esto
    await this.peerConnection.setLocalDescription(offer);
    logger.debug('WHIP Local description set, ICE gathering started');
    logger.debug('WHIP Initial gathering state', { state: this.peerConnection.iceGatheringState });

    // Esperar ICE gathering completo (MUY importante para WHIP)
    // La promesa ya fue configurada ANTES de setLocalDescription
    await this.iceGatheringPromise;

    // Obtener el SDP FINAL después de que ICE gathering terminó
    const finalSDP = this.peerConnection.localDescription?.sdp || '';
    const candidateCount = (finalSDP.match(/a=candidate:/g) || []).length;
    logger.debug('WHIP Final SDP ready', { candidatesInSDP: candidateCount });
    logger.debug('WHIP Candidates captured via events', { count: this.iceCandidateCount });

    if (candidateCount === 0) {
      // Cloudflare Stream soporta "trickle ICE" - podemos enviar el SDP sin candidates
      // y el servidor generará candidates del lado del servidor
      logger.warn('WHIP No local candidates (browser privacy mode). Using server-side ICE');
      logger.debug('WHIP This is normal if browser is hiding local IPs with mDNS');
    }

    // Enviar offer al servidor WHIP
    const sdpToSend = this.peerConnection.localDescription?.sdp || '';
    logger.debug('WHIP Sending offer to server');
    logger.debug('WHIP SDP preview', { preview: sdpToSend.substring(0, 200) });

    const response = await fetch(this.whipUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
      },
      body: sdpToSend,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('WHIP Server error', new Error(errorText), { status: response.status });
      throw new Error(`WHIP error: ${response.status} - ${errorText}`);
    }

    logger.debug('WHIP Server responded OK');

    // Guardar resource URL para DELETE después
    this.resourceUrl = response.headers.get('Location') || this.whipUrl;

    // Obtener answer
    const answerSDP = await response.text();
    logger.debug('WHIP Got answer SDP', { length: answerSDP.length });

    // Log de los candidates en el answer
    const answerCandidates = (answerSDP.match(/a=candidate:/g) || []).length;
    logger.debug('WHIP Candidates in answer SDP', { count: answerCandidates });

    await this.peerConnection.setRemoteDescription({
      type: 'answer',
      sdp: answerSDP,
    });

    // Esperar a que la conexión se establezca realmente
    logger.debug('WHIP Waiting for WebRTC connection');
    logger.debug('WHIP Current states', {
      connection: this.peerConnection.connectionState,
      ice: this.peerConnection.iceConnectionState
    });

    await this.waitForConnection();

    logger.debug('WHIP Connected successfully');
  }

  /**
   * Configura la promesa de ICE gathering ANTES de setLocalDescription
   * Esto asegura que capturemos TODOS los ICE candidates
   */
  private setupICEGatheringPromise(): void {
    if (!this.peerConnection) return;

    this.iceCandidateCount = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    let resolved = false;

    this.iceGatheringPromise = new Promise<void>((resolve) => {
      this.iceGatheringResolve = resolve;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
      };

      // Handler para ICE candidates - se registra ANTES de setLocalDescription
      this.peerConnection!.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          this.iceCandidateCount++;
          const c = event.candidate;
          logger.debug(`WHIP ICE candidate #${this.iceCandidateCount}`, {
            type: c.type,
            protocol: c.protocol,
            address: c.address || '(hidden)',
            port: c.port,
            foundation: c.foundation
          });
        } else {
          // null candidate = ICE gathering completó
          logger.debug('WHIP ICE gathering complete (null candidate)', { total: this.iceCandidateCount });
          cleanup();
          resolve();
        }
      };

      // Handler para cambio de estado de gathering
      this.peerConnection!.onicegatheringstatechange = () => {
        const state = this.peerConnection?.iceGatheringState;
        logger.debug('WHIP ICE gathering state changed', { state });

        if (state === 'complete') {
          logger.debug('WHIP ICE gathering state=complete', { candidates: this.iceCandidateCount });
          cleanup();
          resolve();
        }
      };

      // Timeout de 15 segundos
      timeoutId = setTimeout(() => {
        logger.debug('WHIP ICE gathering timeout after 15s', {
          finalState: this.peerConnection?.iceGatheringState,
          candidatesFound: this.iceCandidateCount
        });
        cleanup();
        resolve();
      }, 15000);
    });
  }

  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peerConnection) {
        reject(new Error('No peer connection'));
        return;
      }

      const connState = this.peerConnection.connectionState;
      const iceState = this.peerConnection.iceConnectionState;
      logger.debug('WHIP Initial states', { connection: connState, ice: iceState });

      // Si ya está conectado, resolver inmediatamente
      if (connState === 'connected' || iceState === 'connected') {
        resolve();
        return;
      }

      // Si ya falló, rechazar
      if (connState === 'failed' || iceState === 'failed') {
        reject(new Error(`WebRTC connection failed: conn=${connState}, ice=${iceState}`));
        return;
      }

      const cleanup = () => {
        this.peerConnection?.removeEventListener('connectionstatechange', onConnStateChange);
        this.peerConnection?.removeEventListener('iceconnectionstatechange', onIceStateChange);
        clearTimeout(timeout);
      };

      const checkAndResolve = () => {
        const currentConnState = this.peerConnection?.connectionState;
        const currentIceState = this.peerConnection?.iceConnectionState;

        logger.debug('WHIP State check', { connection: currentConnState, ice: currentIceState });

        // Conectado por cualquier vía
        if (currentConnState === 'connected' || currentIceState === 'connected') {
          cleanup();
          resolve();
          return true;
        }

        // Falló
        if (currentConnState === 'failed' || currentIceState === 'failed') {
          cleanup();
          reject(new Error(`WebRTC failed: conn=${currentConnState}, ice=${currentIceState}`));
          return true;
        }

        return false;
      };

      const onConnStateChange = () => {
        logger.debug('WHIP Connection state changed', { state: this.peerConnection?.connectionState });
        checkAndResolve();
      };

      const onIceStateChange = () => {
        logger.debug('WHIP ICE state changed', { state: this.peerConnection?.iceConnectionState });
        checkAndResolve();
      };

      this.peerConnection.addEventListener('connectionstatechange', onConnStateChange);
      this.peerConnection.addEventListener('iceconnectionstatechange', onIceStateChange);

      // Timeout de 30 segundos (más tiempo para trickle ICE)
      const timeout = setTimeout(() => {
        cleanup();
        const finalConnState = this.peerConnection?.connectionState;
        const finalIceState = this.peerConnection?.iceConnectionState;

        logger.debug('WHIP Timeout - final states', { connection: finalConnState, ice: finalIceState });

        // Aceptar cualquier estado excepto 'failed' o 'closed'
        // Trickle ICE puede tomar tiempo y el stream puede estar funcionando
        // aunque el estado aún no sea 'connected'
        if (finalConnState === 'failed' || finalIceState === 'failed' ||
            finalConnState === 'closed' || finalIceState === 'closed') {
          reject(new Error(`WebRTC failed: conn=${finalConnState}, ice=${finalIceState}`));
        } else {
          logger.debug('WHIP Accepting current state - stream may be working');
          resolve();
        }
      }, 30000);
    });
  }

  async disconnect(): Promise<void> {
    logger.debug('WHIP Disconnecting');

    // Notificar al servidor WHIP
    if (this.resourceUrl) {
      try {
        await fetch(this.resourceUrl, { method: 'DELETE' });
        logger.debug('WHIP Server notified of disconnect');
      } catch (err) {
        logger.warn('WHIP Error notifying server', { error: err });
      }
    }

    // Cerrar peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.resourceUrl = null;
    logger.debug('WHIP Disconnected');
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }
}

async function invokeCloudflareService<T>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  logger.debug('LiveStream invokeCloudflareService START', { action });
  const startTime = Date.now();

  // Obtener sesión actual - con retry si no está disponible
  let session = null;
  let retries = 3;

  while (retries > 0 && !session) {
    logger.debug('LiveStream Getting session', { attempt: 4 - retries });
    const { data, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      logger.error('LiveStream Error getting session', sessionError);
      throw new Error('Error al obtener la sesión');
    }

    session = data.session;

    if (!session?.access_token) {
      logger.warn('LiveStream No session yet, retrying', { retriesLeft: retries });
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  if (!session?.access_token) {
    logger.error('LiveStream No access token after retries');
    throw new Error('No hay sesión activa. Inicia sesión para transmitir.');
  }
  logger.debug('LiveStream Session obtained', { timeMs: Date.now() - startTime });

  // Verificar que el token no esté expirado
  const tokenParts = session.access_token.split('.');
  if (tokenParts.length === 3) {
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      const exp = payload.exp * 1000;
      const now = Date.now();
      logger.debug('LiveStream Token expires in', { seconds: Math.round((exp - now) / 1000) });

      if (exp < now) {
        logger.error('LiveStream Token expired, refreshing');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          throw new Error('Sesión expirada. Por favor, recarga la página.');
        }
        session = refreshData.session;
        logger.debug('LiveStream Token refreshed successfully');
      }
    } catch (e) {
      logger.warn('LiveStream Could not parse token expiry', { error: e });
    }
  }

  logger.debug('LiveStream Calling cloudflare-live-service', { action });

  // Usar fetch directamente para evitar problemas con supabase.functions.invoke
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/cloudflare-live-service`;

  logger.debug('LiveStream Fetching', { url: functionUrl });
  const fetchStart = Date.now();

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...params }),
    });

    logger.debug('LiveStream Fetch completed', { timeMs: Date.now() - fetchStart, status: response.status });

    const data = await response.json();

    if (!response.ok) {
      logger.error('LiveStream Edge function error', new Error(data.error), { status: response.status });
      throw new Error(data.error || `Error ${response.status}`);
    }

    // Check if data contains an error from the function itself
    if (data?.error) {
      logger.error('LiveStream Function returned error', new Error(data.error));
      throw new Error(data.error);
    }

    logger.debug('LiveStream Response received', { totalTimeMs: Date.now() - startTime });
    return data as T;
  } catch (fetchError) {
    logger.error('LiveStream Fetch error', fetchError, { timeMs: Date.now() - fetchStart });
    throw fetchError;
  }
}

export function useLiveStream(): UseLiveStreamReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<LiveStreamStatus>('idle');
  const [streamId, setStreamId] = useState<string | null>(null);
  const [whipUrl, setWhipUrl] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [duration, setDuration] = useState(0);

  const whipClientRef = useRef<WHIPClient | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Query para obtener stream activo
  const { data: streamInfo, isLoading } = useQuery({
    queryKey: ['my-active-stream', user?.id],
    queryFn: async () => {
      const result = await invokeCloudflareService<{ stream: CreatorLiveStream | null }>(
        'get-my-active-stream'
      );
      return result.stream;
    },
    enabled: !!user?.id,
    refetchInterval: status === 'live' ? 10000 : false, // Refrescar cada 10s si está en vivo
  });

  // Sincronizar estado con stream activo
  useEffect(() => {
    if (streamInfo) {
      setStreamId(streamInfo.id);
      setStatus(streamInfo.status);
      setWhipUrl(streamInfo.cf_whip_url);
      setPlaybackUrl(streamInfo.cf_playback_url);

      if (streamInfo.status === 'live' && streamInfo.started_at) {
        const startTime = new Date(streamInfo.started_at).getTime();
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }
    }
  }, [streamInfo]);

  // Contador de duración
  useEffect(() => {
    if (status === 'live') {
      durationIntervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [status]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`live-stream-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'creator_live_streams',
          filter: `id=eq.${streamId}`,
        },
        (payload) => {
          const updated = payload.new as CreatorLiveStream;
          queryClient.setQueryData(['my-active-stream', user?.id], updated);

          // Si el estado cambió a 'ended' externamente (webhook)
          if (updated.status === 'ended' && status !== 'ended') {
            setStatus('ended');
            whipClientRef.current?.disconnect();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, status, user?.id, queryClient]);

  // Preparar para ir en vivo
  const prepareForLive = useCallback(
    async (form: GoLiveFormState): Promise<StreamCredentials | null> => {
      try {
        setError(null);
        setStatus('connecting'); // Mostrar estado de preparación
        logger.debug('LiveStream prepareForLive called', { title: form.title });

        const result = await invokeCloudflareService<StreamCredentials>('prepare-for-live', {
          title: form.title,
          description: form.description,
          category: form.category,
          isShoppingEnabled: form.isShoppingEnabled,
        });

        logger.debug('LiveStream prepareForLive result', { hasStreamId: !!result?.streamId });

        if (!result?.streamId || !result?.whipUrl) {
          logger.error('LiveStream Invalid credentials received');
          toast.error('Error: credenciales inválidas del servidor');
          setStatus('idle');
          return null;
        }

        setStreamId(result.streamId);
        setWhipUrl(result.whipUrl);
        setPlaybackUrl(result.playbackUrl);
        setStatus('idle'); // Listo para conectar

        logger.debug('LiveStream Stream prepared successfully', { streamId: result.streamId });

        return result;
      } catch (err) {
        logger.error('LiveStream Error preparing for live', err);
        setError(err instanceof Error ? err : new Error('Failed to prepare stream'));
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        toast.error(`Error al preparar: ${errorMessage}`);
        setStatus('idle'); // Resetear estado en error
        return null;
      }
    },
    []
  );

  // Ir en vivo
  const goLive = useCallback(
    async (stream: MediaStream): Promise<boolean> => {
      if (!streamId || !whipUrl) {
        toast.error('No hay stream preparado');
        return false;
      }

      try {
        setError(null);
        setStatus('connecting');

        // Notificar al servidor que estamos iniciando
        await invokeCloudflareService('start-stream', {
          streamId,
        });

        // Conectar via WHIP
        whipClientRef.current = new WHIPClient(whipUrl);
        await whipClientRef.current.connect(stream);

        // Confirmar que estamos en vivo
        await invokeCloudflareService('confirm-live', { streamId });

        setStatus('live');
        setDuration(0);
        toast.success('¡Estás en vivo!');

        queryClient.invalidateQueries({ queryKey: ['my-active-stream'] });
        queryClient.invalidateQueries({ queryKey: ['active-live-streams'] });

        return true;
      } catch (err) {
        logger.error('Error going live', err);
        setError(err instanceof Error ? err : new Error('Failed to go live'));
        setStatus('idle');
        toast.error('Error al iniciar la transmisión');
        return false;
      }
    },
    [streamId, whipUrl, queryClient]
  );

  // Terminar live
  const endLive = useCallback(async (): Promise<EndStreamResponse | null> => {
    if (!streamId) return null;

    try {
      setStatus('ending');

      // Desconectar WHIP
      if (whipClientRef.current) {
        await whipClientRef.current.disconnect();
        whipClientRef.current = null;
      }

      // Notificar al servidor
      const result = await invokeCloudflareService<EndStreamResponse>('end-stream', {
        streamId,
      });

      setStatus('ended');
      toast.success('Transmisión finalizada');

      queryClient.invalidateQueries({ queryKey: ['my-active-stream'] });
      queryClient.invalidateQueries({ queryKey: ['active-live-streams'] });

      return result;
    } catch (err) {
      logger.error('Error ending live', err);
      setError(err instanceof Error ? err : new Error('Failed to end stream'));
      toast.error('Error al finalizar la transmisión');
      return null;
    }
  }, [streamId, queryClient]);

  // Actualizar info del stream
  const updateStreamInfo = useCallback(
    async (updates: Partial<GoLiveFormState>): Promise<void> => {
      if (!streamId) return;

      try {
        await invokeCloudflareService('update-stream', {
          streamId,
          ...updates,
        });

        queryClient.invalidateQueries({ queryKey: ['my-active-stream'] });
      } catch (err) {
        logger.error('Error updating stream', err);
        toast.error('Error al actualizar la transmisión');
      }
    },
    [streamId, queryClient]
  );

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (whipClientRef.current) {
        whipClientRef.current.disconnect();
      }
    };
  }, []);

  return {
    status,
    streamId,
    streamInfo: streamInfo || null,
    isLoading,
    error,
    viewers: streamInfo?.current_viewers || 0,
    likes: streamInfo?.total_likes || 0,
    comments: streamInfo?.total_comments || 0,
    duration,
    whipUrl,
    playbackUrl,
    prepareForLive,
    goLive,
    endLive,
    updateStreamInfo,
  };
}

// ============================================================================
// HOOK PARA LISTA DE LIVES ACTIVOS (público, no requiere auth)
// ============================================================================

export function useActiveLives(options?: { category?: string; limit?: number }) {
  return useQuery({
    queryKey: ['active-live-streams', options?.category, options?.limit],
    queryFn: async () => {
      // Usar RPC pública directamente (no requiere autenticación)
      const { data, error } = await supabase.rpc('get_active_live_streams', {
        p_limit: options?.limit || 20,
        p_category: options?.category || null,
      });

      if (error) {
        logger.error('Error fetching active streams', error);
        return [];
      }

      return data || [];
    },
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // Refrescar cada minuto
  });
}
