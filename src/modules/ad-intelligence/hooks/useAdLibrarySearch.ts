import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AdSearchFilters, AdSearchResult, AdLibrarySearch } from "../types/ad-intelligence.types";

export function useAdLibrarySearch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: async (filters: AdSearchFilters): Promise<AdSearchResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const body: Record<string, any> = {
        action: "search",
        platform: filters.platform,
        limit: filters.limit || 50,
      };

      // Platform-specific params
      if (filters.platform === "meta") {
        if (filters.search_terms) body.search_terms = filters.search_terms;
        if (filters.page_ids?.length) body.search_page_ids = filters.page_ids;
        if (filters.countries?.length) body.ad_reached_countries = filters.countries;
        if (filters.date_min) body.ad_delivery_date_min = filters.date_min;
        if (filters.date_max) body.ad_delivery_date_max = filters.date_max;
        if (filters.media_type && filters.media_type !== "ALL") body.media_type = filters.media_type;
        if (filters.ad_active_status) body.ad_active_status = filters.ad_active_status;
        if (filters.publisher_platforms?.length) body.publisher_platforms = filters.publisher_platforms;
      } else if (filters.platform === "tiktok") {
        if (filters.search_terms) body.search_terms = filters.search_terms;
        if (filters.country_code) body.country_code = filters.country_code;
        if (filters.period) body.period = filters.period;
        if (filters.media_type && filters.media_type !== "ALL") body.ad_format = filters.media_type;
      } else if (filters.platform === "google") {
        if (filters.search_terms) body.search_terms = filters.search_terms;
        if (filters.advertiser_id) body.advertiser_id = filters.advertiser_id;
        if (filters.region) body.region = filters.region;
        if (filters.date_min) body.date_range_start = filters.date_min;
        if (filters.date_max) body.date_range_end = filters.date_max;
        if (filters.format) body.format = filters.format;
      }

      const { data, error } = await supabase.functions.invoke("ad-intelligence", { body });
      if (error) throw error;
      return data as AdSearchResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ad-library-ads"] });
      toast({
        title: "Búsqueda completada",
        description: `${data.ads_found} anuncios encontrados (${data.new_ads} nuevos, ${data.updated_ads} actualizados)`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error en búsqueda", description: error.message, variant: "destructive" });
    },
  });

  const saveSearchMutation = useMutation({
    mutationFn: async (params: { name: string; filters: AdSearchFilters }) => {
      const { data, error } = await supabase
        .from("ad_library_searches")
        .insert({
          name: params.name,
          platform: params.filters.platform,
          search_config: params.filters,
          created_by: (await supabase.auth.getUser()).data.user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AdLibrarySearch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-library-searches"] });
      toast({ title: "Búsqueda guardada" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (searchId: string) => {
      const { data, error } = await supabase.functions.invoke("ad-intelligence", {
        body: { action: "sync", search_id: searchId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ad-library-ads"] });
      queryClient.invalidateQueries({ queryKey: ["ad-library-searches"] });
      toast({
        title: "Sincronización completada",
        description: `${data.ads_found} anuncios sincronizados`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error de sync", description: error.message, variant: "destructive" });
    },
  });

  return {
    search: searchMutation.mutateAsync,
    isSearching: searchMutation.isPending,
    searchResult: searchMutation.data,
    saveSearch: saveSearchMutation.mutateAsync,
    isSaving: saveSearchMutation.isPending,
    syncSearch: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
  };
}
