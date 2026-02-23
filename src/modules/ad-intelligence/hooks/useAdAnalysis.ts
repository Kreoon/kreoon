import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AdAIAnalysis, TokenStatus } from "../types/ad-intelligence.types";

export function useAdAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (adId: string): Promise<AdAIAnalysis> => {
      const { data, error } = await supabase.functions.invoke("ad-intelligence", {
        body: { action: "analyze", ad_id: adId },
      });
      if (error) throw error;
      return data as AdAIAnalysis;
    },
    onSuccess: (_data, adId) => {
      queryClient.invalidateQueries({ queryKey: ["ad-library-ad", adId] });
      queryClient.invalidateQueries({ queryKey: ["ad-library-ads"] });
      toast({ title: "Análisis completado" });
    },
    onError: (error: Error) => {
      toast({ title: "Error de análisis", description: error.message, variant: "destructive" });
    },
  });

  const batchAnalyzeMutation = useMutation({
    mutationFn: async (adIds: string[]) => {
      const results = [];
      for (const adId of adIds) {
        try {
          const { data, error } = await supabase.functions.invoke("ad-intelligence", {
            body: { action: "analyze", ad_id: adId },
          });
          if (error) throw error;
          results.push({ adId, success: true, data });
        } catch (err: any) {
          results.push({ adId, success: false, error: err.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["ad-library-ads"] });
      const succeeded = results.filter(r => r.success).length;
      toast({
        title: "Análisis batch completado",
        description: `${succeeded}/${results.length} anuncios analizados`,
      });
    },
  });

  return {
    analyze: analyzeMutation.mutateAsync,
    isAnalyzing: analyzeMutation.isPending,
    analysisResult: analyzeMutation.data,
    batchAnalyze: batchAnalyzeMutation.mutateAsync,
    isBatchAnalyzing: batchAnalyzeMutation.isPending,
    batchProgress: batchAnalyzeMutation.data,
  };
}

export function useTokenStatus() {
  return useQuery({
    queryKey: ["ad-intelligence-token-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ad-intelligence", {
        body: { action: "token_status" },
      });
      if (error) throw error;
      return data as TokenStatus;
    },
    staleTime: 10 * 60 * 1000,
  });
}
