/**
 * useSmartMatch
 *
 * Hook para obtener coincidencias inteligentes de creadores para campañas.
 * Usa el RPC smart_match_creators.
 * Extraído de useMarketplaceCampaigns.ts para mejor modularización.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SmartMatchResult } from '@/components/marketplace/types/marketplace';

export function useSmartMatch(campaignId: string | null) {
  const [results, setResults] = useState<SmartMatchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMatch = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('smart_match_creators', {
        p_campaign_id: id,
      });
      if (error) throw error;
      setResults((data || []) as SmartMatchResult[]);
    } catch (err) {
      console.error('[useSmartMatch] Error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (campaignId) fetchMatch(campaignId);
  }, [campaignId, fetchMatch]);

  return {
    results,
    loading,
    refetch: () => campaignId && fetchMatch(campaignId)
  };
}
