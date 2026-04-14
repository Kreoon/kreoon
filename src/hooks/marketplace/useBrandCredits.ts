/**
 * useBrandCredits
 *
 * Hook para obtener créditos de marca y transacciones.
 * Usa React Query para manejo de cache y estado del servidor.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BrandCredit, BrandCreditTransaction } from '@/components/marketplace/types/marketplace';

interface BrandCreditsData {
  credits: BrandCredit | null;
  transactions: BrandCreditTransaction[];
}

async function fetchBrandCredits(brandId: string): Promise<BrandCreditsData> {
  const [creditsRes, txRes] = await Promise.all([
    supabase
      .from('brand_credits')
      .select('*')
      .eq('brand_id', brandId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('brand_credit_transactions')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (creditsRes.error) throw creditsRes.error;
  if (txRes.error) throw txRes.error;

  return {
    credits: creditsRes.data as BrandCredit | null,
    transactions: (txRes.data || []) as BrandCreditTransaction[],
  };
}

export function useBrandCredits(brandId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['brand-credits', brandId],
    queryFn: () => fetchBrandCredits(brandId!),
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  return {
    credits: data?.credits ?? null,
    transactions: data?.transactions ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}
