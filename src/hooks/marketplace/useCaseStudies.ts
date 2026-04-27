/**
 * useCaseStudies
 *
 * Hook para gestionar casos de estudio de campañas.
 * Extraído de useMarketplaceCampaigns.ts para mejor modularización.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CaseStudy } from '@/components/marketplace/types/marketplace';

export function useCaseStudies(brandId?: string) {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCaseStudies = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('campaign_case_studies')
        .select('*')
        .order('created_at', { ascending: false });

      if (brandId) {
        query = query.eq('brand_id', brandId);
      } else {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCaseStudies(data || []);
    } catch (err) {
      console.error('[useCaseStudies] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchCaseStudies();
  }, [fetchCaseStudies]);

  const publishCaseStudy = useCallback(async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('campaign_case_studies')
        .update({ is_published: true, published_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchCaseStudies();
      return true;
    } catch (err) {
      console.error('[useCaseStudies] Publish error:', err);
      return false;
    }
  }, [fetchCaseStudies]);

  const updateCaseStudy = useCallback(async (id: string, data: Partial<CaseStudy>) => {
    try {
      const { error } = await (supabase as any)
        .from('campaign_case_studies')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchCaseStudies();
      return true;
    } catch (err) {
      console.error('[useCaseStudies] Update error:', err);
      return false;
    }
  }, [fetchCaseStudies]);

  return {
    caseStudies,
    loading,
    refetch: fetchCaseStudies,
    publishCaseStudy,
    updateCaseStudy
  };
}
