import { useQuery } from '@tanstack/react-query';

const PUBLIC_SHOWCASE_URL = 'https://wjkbqcrxwsmvtxmqgiqc.functions.supabase.co/public-showcase';

export interface PublicVideo {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  creator_handle: string;
  brand_name: string;
}

export interface PublicStats {
  creators_count: number;
  brands_count: number;
  campaigns_completed: number;
  videos_approved: number;
  updated_at: string;
}

export interface PublicBrand {
  id: string;
  name: string;
  logo_url: string;
}

async function fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      lastError = err as Error;
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}

export function usePublicStats() {
  return useQuery({
    queryKey: ['public-showcase-stats'],
    queryFn: () => fetchWithRetry<PublicStats>(`${PUBLIC_SHOWCASE_URL}?action=stats`),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function usePublicVideos(limit = 12) {
  return useQuery({
    queryKey: ['public-showcase-videos', limit],
    queryFn: () => fetchWithRetry<PublicVideo[]>(`${PUBLIC_SHOWCASE_URL}?action=videos&limit=${limit}`),
    staleTime: 60 * 60_000,
    gcTime: 2 * 60 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function usePublicBrands(limit = 20) {
  return useQuery({
    queryKey: ['public-showcase-brands', limit],
    queryFn: () => fetchWithRetry<PublicBrand[]>(`${PUBLIC_SHOWCASE_URL}?action=brands&limit=${limit}`),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
}
