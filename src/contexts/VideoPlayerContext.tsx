import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface VideoPlayerContextType {
  currentPlayingId: string | null;
  playVideo: (id: string) => void;
  stopVideo: (id: string) => void;
  stopAll: () => void;
  // Global mute state
  isGlobalMuted: boolean;
  setGlobalMuted: (muted: boolean) => void;
  toggleGlobalMute: () => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

// Fase 3.7 Paso 3: mute persistente entre sesiones (antes se reseteaba a muted=true en cada
// carga de pagina). Default true SOLO en la primera visita (autoplay iOS exige muted=true al
// arrancar); si ya hay preferencia guardada, se respeta desde el primer render.
const FEED_MUTE_STORAGE_KEY = 'kreoon_feed_muted';

function getInitialMuted(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(FEED_MUTE_STORAGE_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

function persistMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(FEED_MUTE_STORAGE_KEY, String(muted));
  } catch {
    // localStorage no disponible (modo privado, quota) — persistencia se pierde, no rompe la sesion
  }
}

export function VideoPlayerProvider({ children }: { children: ReactNode }) {
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [isGlobalMuted, setIsGlobalMuted] = useState(getInitialMuted);

  const playVideo = useCallback((id: string) => {
    setCurrentPlayingId(id);
  }, []);

  const stopVideo = useCallback((id: string) => {
    setCurrentPlayingId(prev => prev === id ? null : prev);
  }, []);

  const stopAll = useCallback(() => {
    setCurrentPlayingId(null);
  }, []);

  const setGlobalMuted = useCallback((muted: boolean) => {
    setIsGlobalMuted(muted);
    persistMuted(muted);
  }, []);

  const toggleGlobalMute = useCallback(() => {
    setIsGlobalMuted(prev => {
      const next = !prev;
      persistMuted(next);
      return next;
    });
  }, []);

  return (
    <VideoPlayerContext.Provider value={{ 
      currentPlayingId, 
      playVideo, 
      stopVideo, 
      stopAll,
      isGlobalMuted,
      setGlobalMuted,
      toggleGlobalMute
    }}>
      {children}
    </VideoPlayerContext.Provider>
  );
}

export function useVideoPlayer() {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayer must be used within a VideoPlayerProvider');
  }
  return context;
}

// Hook for individual video cards
export function useVideoPlayback(videoId: string) {
  const { currentPlayingId, playVideo, stopVideo } = useVideoPlayer();
  
  const isPlaying = currentPlayingId === videoId;
  
  const play = useCallback(() => {
    playVideo(videoId);
  }, [videoId, playVideo]);
  
  const stop = useCallback(() => {
    stopVideo(videoId);
  }, [videoId, stopVideo]);
  
  return { isPlaying, play, stop };
}

// Hook for global mute state
export function useGlobalMute() {
  const { isGlobalMuted, setGlobalMuted, toggleGlobalMute } = useVideoPlayer();
  return { isGlobalMuted, setGlobalMuted, toggleGlobalMute };
}
