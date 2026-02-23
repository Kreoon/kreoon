import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ContentAIAnalysis } from "../types/social-scraper.types";

export function useScrapeAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (itemId: string): Promise<ContentAIAnalysis> => {
      const { data, error } = await supabase.functions.invoke("social-scraper", {
        body: { action: "analyze", item_id: itemId },
      });
      if (error) throw error;
      return data as ContentAIAnalysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrape-items"] });
      toast({ title: "Análisis completado" });
    },
    onError: (error: Error) => {
      toast({ title: "Error de análisis", description: error.message, variant: "destructive" });
    },
  });

  const batchAnalyzeMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const results = [];
      for (const id of itemIds) {
        try {
          const { data, error } = await supabase.functions.invoke("social-scraper", {
            body: { action: "analyze", item_id: id },
          });
          if (error) throw error;
          results.push({ id, success: true, data });
        } catch (err: any) {
          results.push({ id, success: false, error: err.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["scrape-items"] });
      const ok = results.filter(r => r.success).length;
      toast({ title: "Análisis batch", description: `${ok}/${results.length} analizados` });
    },
  });

  return {
    analyze: analyzeMutation.mutateAsync,
    isAnalyzing: analyzeMutation.isPending,
    batchAnalyze: batchAnalyzeMutation.mutateAsync,
    isBatchAnalyzing: batchAnalyzeMutation.isPending,
  };
}
