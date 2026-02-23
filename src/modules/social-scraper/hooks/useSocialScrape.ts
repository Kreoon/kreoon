import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ScrapeFilters, ScrapeResult, ScrapeTarget } from "../types/social-scraper.types";

export function useSocialScrape() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const scrapeMutation = useMutation({
    mutationFn: async (filters: ScrapeFilters & { target_id?: string }): Promise<ScrapeResult> => {
      const { data, error } = await supabase.functions.invoke("social-scraper", {
        body: {
          action: "scrape",
          platform: filters.platform,
          target_type: filters.target_type,
          target_value: filters.target_value,
          target_id: filters.target_id,
          limit: filters.limit || 30,
        },
      });
      if (error) throw error;
      return data as ScrapeResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scrape-items"] });
      queryClient.invalidateQueries({ queryKey: ["scrape-targets"] });
      toast({
        title: "Scraping completado",
        description: `${data.items_found} items encontrados (${data.saved} guardados)`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error de scraping", description: error.message, variant: "destructive" });
    },
  });

  const saveTargetMutation = useMutation({
    mutationFn: async (params: { platform: string; target_type: string; target_value: string; display_name?: string }) => {
      const { data, error } = await supabase
        .from("social_scrape_targets")
        .insert({
          ...params,
          created_by: (await supabase.auth.getUser()).data.user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ScrapeTarget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrape-targets"] });
      toast({ title: "Target guardado" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const { data, error } = await supabase.functions.invoke("social-scraper", {
        body: { action: "sync", target_id: targetId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scrape-items"] });
      queryClient.invalidateQueries({ queryKey: ["scrape-targets"] });
      toast({ title: "Sync completado", description: `${data.items_found} items sincronizados` });
    },
    onError: (error: Error) => {
      toast({ title: "Error de sync", description: error.message, variant: "destructive" });
    },
  });

  return {
    scrape: scrapeMutation.mutateAsync,
    isScraping: scrapeMutation.isPending,
    scrapeResult: scrapeMutation.data,
    saveTarget: saveTargetMutation.mutateAsync,
    isSaving: saveTargetMutation.isPending,
    syncTarget: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
  };
}
