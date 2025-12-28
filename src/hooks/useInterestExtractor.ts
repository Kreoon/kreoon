import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Minimum time between extractions (1 hour)
const MIN_EXTRACTION_INTERVAL = 60 * 60 * 1000;
// Minimum events before triggering extraction
const MIN_EVENTS_FOR_EXTRACTION = 10;

function getAnonymousViewerId(): string | null {
  return localStorage.getItem('anon_viewer_id');
}

export function useInterestExtractor() {
  const { user } = useAuth();
  const lastExtractionRef = useRef<number>(0);
  const eventCountRef = useRef<number>(0);

  // Check if extraction should run
  const shouldExtract = useCallback(() => {
    const now = Date.now();
    const timeSinceLastExtraction = now - lastExtractionRef.current;
    
    // Only extract if enough time has passed and enough events
    return (
      timeSinceLastExtraction >= MIN_EXTRACTION_INTERVAL &&
      eventCountRef.current >= MIN_EVENTS_FOR_EXTRACTION
    );
  }, []);

  // Run the extraction
  const extractInterests = useCallback(async () => {
    const userId = user?.id;
    const viewerId = !userId ? getAnonymousViewerId() : null;

    if (!userId && !viewerId) {
      return;
    }

    try {
      console.log('[useInterestExtractor] Running interest extraction...');
      
      const response = await supabase.functions.invoke('interest-extractor', {
        body: { user_id: userId, viewer_id: viewerId }
      });

      if (response.error) {
        console.error('[useInterestExtractor] Error:', response.error);
        return;
      }

      console.log('[useInterestExtractor] Extraction complete:', response.data);
      lastExtractionRef.current = Date.now();
      eventCountRef.current = 0;

      // Store last extraction time
      localStorage.setItem('last_interest_extraction', String(Date.now()));
    } catch (error) {
      console.error('[useInterestExtractor] Error extracting interests:', error);
    }
  }, [user?.id]);

  // Increment event count and check if extraction needed
  const trackEvent = useCallback(() => {
    eventCountRef.current++;
    
    if (shouldExtract()) {
      extractInterests();
    }
  }, [shouldExtract, extractInterests]);

  // Initialize from storage
  useEffect(() => {
    const lastExtraction = localStorage.getItem('last_interest_extraction');
    if (lastExtraction) {
      lastExtractionRef.current = parseInt(lastExtraction, 10);
    }
  }, []);

  // Run extraction on mount if needed (check last extraction time)
  useEffect(() => {
    const lastExtraction = localStorage.getItem('last_interest_extraction');
    const now = Date.now();
    
    if (!lastExtraction || (now - parseInt(lastExtraction, 10)) > MIN_EXTRACTION_INTERVAL * 24) {
      // Run extraction if never run or more than 24 hours ago
      extractInterests();
    }
  }, [extractInterests]);

  return {
    trackEvent,
    extractInterests,
  };
}
