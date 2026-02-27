import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ParsedFilters {
  search: string;
  country: string | null;
  marketplace_roles: string[];
  category: string | null;
}

export function useMarketplaceAISearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const parseQuery = useCallback(async (query: string): Promise<ParsedFilters | null> => {
    if (!query.trim()) return null;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketplace-ai-search', {
        body: { query },
      });

      if (error) throw error;

      setSuggestions(data.suggestions || []);
      return data.filters;
    } catch (err) {
      console.error('AI search error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { parseQuery, isLoading, suggestions };
}
