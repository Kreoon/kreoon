import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ScrapeItem, ScrapeTarget, SocialPlatform } from "../types/social-scraper.types";

interface UseScrapeItemsParams {
  targetId?: string;
  platform?: SocialPlatform;
  contentType?: string;
  pageSize?: number;
  page?: number;
}

export function useScrapeItems(params: UseScrapeItemsParams = {}) {
  const { targetId, platform, contentType, pageSize = 50, page = 0 } = params;

  return useQuery({
    queryKey: ["scrape-items", { targetId, platform, contentType, pageSize, page }],
    queryFn: async () => {
      let query = supabase
        .from("social_scrape_items")
        .select("*", { count: "exact" })
        .order("published_at", { ascending: false, nullsFirst: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (targetId) query = query.eq("target_id", targetId);
      if (platform) query = query.eq("platform", platform);
      if (contentType) query = query.eq("content_type", contentType);

      const { data, error, count } = await query;
      if (error) throw error;
      return { items: (data || []) as ScrapeItem[], total: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useScrapeTargets() {
  return useQuery({
    queryKey: ["scrape-targets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_scrape_targets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ScrapeTarget[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
