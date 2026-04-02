import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MarketplaceSearchFilters {
  query: string;
  roles: string[];
  location_country: string | null;
  location_city: string | null;
  niches: string[];
  specializations: string[];
  min_rating: number | null;
  max_price: number | null;
  accepts_exchange: boolean | null;
  is_available: boolean | null;
  limit: number;
  offset: number;
}

export interface AIIntent {
  roles: string[];
  country: string | null;
  city: string | null;
  niches: string[];
  price_max: number | null;
  accepts_exchange: boolean | null;
  is_available: boolean | null;
  confidence: number;
  clean_keywords: string[];
}

export interface SearchCreatorResult {
  id: string;
  user_id: string;
  display_name: string;
  username: string | null;
  slug: string | null;
  avatar_url: string | null;
  bio: string | null;
  primary_role: string | null;
  location_city: string | null;
  location_country: string | null;
  rating_avg: number;
  rating_count: number;
  total_projects: number;
  response_time_hours: number | null;
  base_price: number | null;
  currency: string;
  accepts_exchange: boolean;
  is_verified: boolean;
  portfolio_count: number;
  portfolio_thumbnail: string | null; // Primer thumbnail del portafolio
  search_score: number;
  quality_score: number;
  activity_score: number;
  text_rank: number;
  final_rank: number;
  organization_id: string | null;
  organization_name: string | null;
  organization_logo: string | null;
  marketplace_roles: string[];
  categories: string[];
  content_types: string[];
  languages: string[];
  level: string;
  specializations: string[];
}

const DEFAULT_FILTERS: MarketplaceSearchFilters = {
  query: '',
  roles: [],
  location_country: null,
  location_city: null,
  niches: [],
  specializations: [],
  min_rating: null,
  max_price: null,
  accepts_exchange: null,
  is_available: null,
  limit: 20,
  offset: 0,
};

export function useMarketplaceSearch() {
  const [filters, setFilters] = useState<MarketplaceSearchFilters>(DEFAULT_FILTERS);
  const [aiMode, setAiMode] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiIntent, setAiIntent] = useState<AIIntent | null>(null);
  const [isParsingAI, setIsParsingAI] = useState(false);

  // Query principal — RPC con ranking integrado
  const searchQuery = useQuery({
    queryKey: ['marketplace-search', filters],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('search_marketplace_creators', {
        p_query: filters.query || '',
        p_roles: filters.roles.length > 0 ? filters.roles : null,
        p_location_country: filters.location_country,
        p_location_city: filters.location_city,
        p_niches: filters.niches.length > 0 ? filters.niches : null,
        p_specializations: filters.specializations.length > 0 ? filters.specializations : null,
        p_min_rating: filters.min_rating,
        p_max_price: filters.max_price,
        p_accepts_exchange: filters.accepts_exchange,
        p_is_available: filters.is_available,
        p_limit: filters.limit,
        p_offset: filters.offset,
      });

      if (error) throw error;
      return (data ?? []) as SearchCreatorResult[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    placeholderData: (prev) => prev,
  });

  // Parsear query con IA
  const parseAIQuery = useCallback(async (query: string) => {
    if (!query || query.trim().length < 3) return;

    setIsParsingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketplace-ai-search', {
        body: { query, use_gemini: query.length > 15 }
      });

      if (error) throw error;

      setAiIntent(data.parsed);
      setAiSuggestions(data.suggestions || []);

      if (data.filters) {
        setFilters(prev => ({
          ...prev,
          query: data.filters.query || '',
          roles: data.filters.roles || [],
          location_country: data.filters.location_country,
          location_city: data.filters.location_city,
          niches: data.filters.niches || [],
          max_price: data.filters.max_price,
          min_rating: data.filters.min_rating,
          accepts_exchange: data.filters.accepts_exchange,
          is_available: data.filters.is_available,
          offset: 0,
        }));
      }

      // Log silencioso para analytics
      supabase.from('marketplace_search_logs').insert({
        query_raw: query,
        query_parsed: data.parsed,
        results_count: searchQuery.data?.length ?? 0,
      }).then(() => {});

    } catch (err) {
      console.error('[MarketplaceSearch] AI error:', err);
    } finally {
      setIsParsingAI(false);
    }
  }, [searchQuery.data?.length]);

  // Registrar interacción (mejora el algoritmo)
  const trackInteraction = useCallback(async (
    creatorId: string,
    type: 'view' | 'click' | 'favorite' | 'unfavorite' | 'message' | 'hire',
    metadata?: Record<string, unknown>
  ) => {
    try {
      await supabase.from('marketplace_interactions').insert({
        creator_id: creatorId,
        interaction_type: type,
        source: aiMode ? 'ai_search' : filters.query ? 'search' : 'feed',
        metadata: metadata ?? {},
      });
    } catch {
      // Silent fail for tracking
    }
  }, [aiMode, filters.query]);

  const updateFilter = useCallback(<K extends keyof MarketplaceSearchFilters>(
    key: K,
    value: MarketplaceSearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setAiQuery('');
    setAiIntent(null);
    setAiSuggestions([]);
  }, []);

  const loadMore = useCallback(() => {
    setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  }, []);

  const activeFilterCount = [
    filters.roles.length > 0,
    filters.location_country,
    filters.niches.length > 0,
    filters.specializations.length > 0,
    filters.min_rating,
    filters.max_price,
    filters.accepts_exchange !== null,
    filters.is_available !== null,
  ].filter(Boolean).length;

  return {
    // Data
    filters,
    creators: searchQuery.data ?? [],
    isLoading: searchQuery.isLoading,
    isRefetching: searchQuery.isRefetching,
    error: searchQuery.error,
    activeFilterCount,

    // AI mode
    aiMode,
    setAiMode,
    aiQuery,
    setAiQuery,
    aiSuggestions,
    aiIntent,
    isParsingAI,
    parseAIQuery,

    // Actions
    updateFilter,
    setFilters,
    resetFilters,
    loadMore,
    trackInteraction,
    refetch: searchQuery.refetch,
  };
}
