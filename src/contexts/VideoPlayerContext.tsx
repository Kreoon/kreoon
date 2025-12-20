import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface VideoPlayerContextType {
  currentPlayingId: string | null;
  playVideo: (id: string) => void;
  stopVideo: (id: string) => void;
  stopAll: () => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export function VideoPlayerProvider({ children }: { children: ReactNode }) {
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  const playVideo = useCallback((id: string) => {
    setCurrentPlayingId(id);
  }, []);

  const stopVideo = useCallback((id: string) => {
    setCurrentPlayingId(prev => prev === id ? null : prev);
  }, []);

  const stopAll = useCallback(() => {
    setCurrentPlayingId(null);
  }, []);

  return (
    <VideoPlayerContext.Provider value={{ currentPlayingId, playVideo, stopVideo, stopAll }}>
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
