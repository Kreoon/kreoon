// ============================================================
// KREOON ANALYTICS ENGINE (KAE) - React Context
// ============================================================
//
// Thin wrapper that provides useAnalytics to the component tree.
// The hook itself handles: auto page views, auto identify, flush lifecycle.

import React, { createContext, useContext } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

type AnalyticsContextType = ReturnType<typeof useAnalytics>;

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const analytics = useAnalytics();

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    return {
      track: () => {},
      trackPageView: () => {},
      trackConversion: () => {},
      identify: () => {},
      trackSignup: () => {},
      trackTrialStart: () => {},
      trackSubscription: () => {},
      trackContentCreated: () => {},
      trackButtonClick: () => {},
      trackFormSubmit: () => {},
      trackSearch: () => {},
      trackVideoView: () => {},
      getContext: () => null,
    } as AnalyticsContextType;
  }
  return context;
}
