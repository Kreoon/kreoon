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

export function VideoPlayerProvider({ children }: { children: ReactNode }) {
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [isGlobalMuted, setIsGlobalMuted] = useState(false); // Audio ON by default

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
  }, []);

  const toggleGlobalMute = useCallback(() => {
    setIsGlobalMuted(prev => !prev);
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
