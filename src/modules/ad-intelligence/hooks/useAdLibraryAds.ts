import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AdLibraryAd, AdLibrarySearch, AdPlatform } from "../types/ad-intelligence.types";

interface UseAdLibraryAdsParams {
  searchId?: string;
  platform?: AdPlatform;
  isActive?: boolean;
  pageSize?: number;
  page?: number;
  searchText?: string;
}

export function useAdLibraryAds(params: UseAdLibraryAdsParams = {}) {
  const { searchId, platform, isActive, pageSize = 50, page = 0, searchText } = params;

  return useQuery({
    queryKey: ["ad-library-ads", { searchId, platform, isActive, pageSize, page, searchText }],
    queryFn: async () => {
      let query = supabase
        .from("ad_library_ads")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (searchId) query = query.eq("search_id", searchId);
      if (platform) query = query.eq("platform", platform);
      if (isActive !== undefined) query = query.eq("is_active", isActive);
      if (searchText) query = query.or(`page_name.ilike.%${searchText}%,ad_creative_bodies.cs.{${searchText}}`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { ads: (data || []) as AdLibraryAd[], total: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdLibrarySearches() {
  return useQuery({
    queryKey: ["ad-library-searches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_library_searches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AdLibrarySearch[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdById(adId: string | null) {
  return useQuery({
    queryKey: ["ad-library-ad", adId],
    queryFn: async () => {
      if (!adId) return null;
      const { data, error } = await supabase
        .from("ad_library_ads")
        .select("*")
        .eq("id", adId)
        .single();
      if (error) throw error;
      return data as AdLibraryAd;
    },
    enabled: !!adId,
  });
}
