import React, { createContext, useContext, useEffect } from 'react';
import { useTrackingEngine, TrackEventOptions } from '@/hooks/useTrackingEngine';

interface TrackingContextValue {
  trackEvent: (options: TrackEventOptions) => Promise<void>;
  trackPageView: (page: string, metadata?: Record<string, unknown>) => void;
  trackButtonClick: (buttonId: string, metadata?: Record<string, unknown>) => void;
  trackFormSubmit: (formId: string, metadata?: Record<string, unknown>) => void;
  trackSearch: (query: string, resultsCount?: number) => void;
  trackError: (error: string, metadata?: Record<string, unknown>) => void;
  trackUserLogin: () => void;
  trackUserLogout: () => void;
  trackProfileUpdate: (profileId: string, changes?: Record<string, unknown>) => void;
  trackContentUpload: (contentId: string, metadata?: Record<string, unknown>) => void;
  trackContentApproval: (contentId: string, approved: boolean) => void;
  trackStatusChange: (contentId: string, fromStatus: string, toStatus: string) => void;
  trackCardCreated: (cardId: string, metadata?: Record<string, unknown>) => void;
  trackCardMoved: (cardId: string, fromColumn: string, toColumn: string) => void;
  trackVideoView: (videoId: string) => void;
  trackVideoLike: (videoId: string) => void;
  trackVideoShare: (videoId: string, platform?: string) => void;
  trackFollow: (profileId: string, entityType?: 'user' | 'profile') => void;
  trackMessageSent: (conversationId: string, metadata?: Record<string, unknown>) => void;
  trackAIRequest: (module: string, action: string, metadata?: Record<string, unknown>) => void;
  trackAIResponse: (module: string, action: string, success: boolean, metadata?: Record<string, unknown>) => void;
  startViewTimer: (entityType: 'user' | 'content' | 'organization' | 'project' | 'chat' | 'portfolio' | 'profile' | 'story' | 'card' | 'message', entityId: string) => void;
  endViewTimer: (entityType: 'user' | 'content' | 'organization' | 'project' | 'chat' | 'portfolio' | 'profile' | 'story' | 'card' | 'message', entityId: string) => void;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const tracking = useTrackingEngine();

  // Auto-track page views on route change
  useEffect(() => {
    const handlePopState = () => {
      tracking.trackPageView(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [tracking]);

  return (
    <TrackingContext.Provider value={tracking}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const context = useContext(TrackingContext);
  if (!context) {
    // Return a no-op implementation when outside provider
    return {
      trackEvent: async () => {},
      trackPageView: () => {},
      trackButtonClick: () => {},
      trackFormSubmit: () => {},
      trackSearch: () => {},
      trackError: () => {},
      trackUserLogin: () => {},
      trackUserLogout: () => {},
      trackProfileUpdate: () => {},
      trackContentUpload: () => {},
      trackContentApproval: () => {},
      trackStatusChange: () => {},
      trackCardCreated: () => {},
      trackCardMoved: () => {},
      trackVideoView: () => {},
      trackVideoLike: () => {},
      trackVideoShare: () => {},
      trackFollow: () => {},
      trackMessageSent: () => {},
      trackAIRequest: () => {},
      trackAIResponse: () => {},
      startViewTimer: () => {},
      endViewTimer: () => {},
    };
  }
  return context;
}
