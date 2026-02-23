// ============================================================
// KREOON ANALYTICS ENGINE (KAE) - React Context
// ============================================================
//
// Thin wrapper that provides useAnalytics to the component tree.
// Uses useLocation() to trigger page_view on SPA route changes.

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';

type AnalyticsContextType = ReturnType<typeof useAnalytics>;

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const analytics = useAnalytics();
  const location = useLocation();
  const isFirstRender = useRef(true);

  // Track page views on SPA navigation (skip initial — useAnalytics handles that)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    analytics.trackPageView();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

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
      trackLeadCaptured: () => {},
      trackButtonClick: () => {},
      trackFormSubmit: () => {},
      trackSearch: () => {},
      trackVideoView: () => {},
      getContext: () => null,
    } as AnalyticsContextType;
  }
  return context;
}
