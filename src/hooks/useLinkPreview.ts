import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseLovable } from '@/integrations/supabase/lovable-client';

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

export function useLinkPreview() {
  const [previews, setPreviews] = useState<Map<string, LinkPreview>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const extractUrls = useCallback((text: string): string[] => {
    const matches = text.match(URL_REGEX);
    return matches || [];
  }, []);

  const fetchPreview = useCallback(async (url: string): Promise<LinkPreview | null> => {
    // Check cache first
    const cached = previews.get(url);
    if (cached) return cached;

    // Check if already loading
    if (loading.has(url)) return null;

    setLoading(prev => new Set(prev).add(url));

    try {
      // Check database cache
      const { data: dbCache } = await supabase
        .from('link_previews')
        .select('*')
        .eq('url', url)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (dbCache) {
        const preview: LinkPreview = {
          url: dbCache.url,
          title: dbCache.title,
          description: dbCache.description,
          image_url: dbCache.image_url,
          site_name: dbCache.site_name
        };
        setPreviews(prev => new Map(prev).set(url, preview));
        return preview;
      }

      // Fetch from edge function
      const { data, error } = await supabaseLovable.functions.invoke('fetch-document', {
        body: { url, type: 'metadata' }
      });

      if (error || !data) {
        console.error('Error fetching preview:', error);
        return null;
      }

      const preview: LinkPreview = {
        url,
        title: data.title || null,
        description: data.description || null,
        image_url: data.image || null,
        site_name: data.site_name || new URL(url).hostname
      };

      // Cache in database
      await supabase.from('link_previews').upsert({
        url,
        title: preview.title,
        description: preview.description,
        image_url: preview.image_url,
        site_name: preview.site_name
      }, { onConflict: 'url' });

      setPreviews(prev => new Map(prev).set(url, preview));
      return preview;
    } catch (error) {
      console.error('Error fetching link preview:', error);
      return null;
    } finally {
      setLoading(prev => {
        const updated = new Set(prev);
        updated.delete(url);
        return updated;
      });
    }
  }, [previews, loading]);

  const getPreviewsForMessage = useCallback(async (content: string): Promise<LinkPreview[]> => {
    const urls = extractUrls(content);
    const results: LinkPreview[] = [];

    for (const url of urls.slice(0, 3)) { // Max 3 previews per message
      const preview = await fetchPreview(url);
      if (preview) results.push(preview);
    }

    return results;
  }, [extractUrls, fetchPreview]);

  return {
    previews,
    loading,
    extractUrls,
    fetchPreview,
    getPreviewsForMessage,
    isLoading: (url: string) => loading.has(url)
  };
}
