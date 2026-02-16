import { useEffect, useState } from 'react';

interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer_url: string | null;
  landing_page: string | null;
  captured_at: string | null;
}

const UTM_STORAGE_KEY = 'kreoon_utm_params';
const UTM_EXPIRY_HOURS = 24;

export function useUTMTracking() {
  const [utmParams, setUtmParams] = useState<UTMParams>({
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    referrer_url: null,
    landing_page: null,
    captured_at: null
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);

    const newUtmSource = urlParams.get('utm_source');
    const newUtmMedium = urlParams.get('utm_medium');
    const newUtmCampaign = urlParams.get('utm_campaign');
    const newUtmContent = urlParams.get('utm_content');
    const newUtmTerm = urlParams.get('utm_term');

    // Si hay nuevos UTMs, sobrescribir los guardados
    if (newUtmSource || newUtmMedium || newUtmCampaign) {
      const newParams: UTMParams = {
        utm_source: newUtmSource,
        utm_medium: newUtmMedium,
        utm_campaign: newUtmCampaign,
        utm_content: newUtmContent,
        utm_term: newUtmTerm,
        referrer_url: document.referrer || null,
        landing_page: window.location.pathname,
        captured_at: new Date().toISOString()
      };

      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(newParams));
      setUtmParams(newParams);
      return;
    }

    // Intentar recuperar UTMs guardados
    try {
      const stored = localStorage.getItem(UTM_STORAGE_KEY);
      if (stored) {
        const parsed: UTMParams = JSON.parse(stored);

        if (parsed.captured_at) {
          const capturedTime = new Date(parsed.captured_at).getTime();
          const hoursPassed = (Date.now() - capturedTime) / (1000 * 60 * 60);

          if (hoursPassed < UTM_EXPIRY_HOURS) {
            setUtmParams(parsed);
            return;
          }
        }

        // Expirados → limpiar
        localStorage.removeItem(UTM_STORAGE_KEY);
      }
    } catch {
      // ignore parse errors
    }

    // Sin UTMs previos válidos → capturar info básica
    setUtmParams({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      referrer_url: document.referrer || null,
      landing_page: window.location.pathname,
      captured_at: new Date().toISOString()
    });
  }, []);

  const getInferredSource = (): string => {
    if (utmParams.utm_source) return utmParams.utm_source;

    const referrer = utmParams.referrer_url || '';
    if (referrer.includes('instagram')) return 'instagram';
    if (referrer.includes('tiktok')) return 'tiktok';
    if (referrer.includes('facebook')) return 'facebook';
    if (referrer.includes('google')) return 'google';
    if (referrer.includes('linkedin')) return 'linkedin';
    if (referrer.includes('youtube')) return 'youtube';
    if (referrer.includes('twitter') || referrer.includes('x.com')) return 'twitter';

    return 'direct';
  };

  const getTrackingParams = () => ({
    lead_source: getInferredSource(),
    utm_source: utmParams.utm_source,
    utm_medium: utmParams.utm_medium,
    utm_campaign: utmParams.utm_campaign,
    utm_content: utmParams.utm_content,
    utm_term: utmParams.utm_term,
    referrer_url: utmParams.referrer_url,
    landing_page: utmParams.landing_page
  });

  const clearUTMParams = () => {
    localStorage.removeItem(UTM_STORAGE_KEY);
    setUtmParams({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      referrer_url: null,
      landing_page: null,
      captured_at: null
    });
  };

  return {
    utmParams,
    getTrackingParams,
    getInferredSource,
    clearUTMParams,
    hasUTMs: !!(utmParams.utm_source || utmParams.utm_medium || utmParams.utm_campaign)
  };
}

// Hook para tracking de eventos con UTMs incluidos
export function useTrackEvent() {
  const { getTrackingParams } = useUTMTracking();

  const trackEvent = (eventName: string, eventData?: Record<string, any>) => {
    const trackingParams = getTrackingParams();

    console.log('Track event:', {
      event: eventName,
      ...trackingParams,
      ...eventData,
      timestamp: new Date().toISOString()
    });

    // TODO: Enviar a analytics (PostHog, Mixpanel, GA, etc.)
  };

  return { trackEvent };
}
