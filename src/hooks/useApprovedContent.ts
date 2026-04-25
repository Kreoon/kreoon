import { useQuery } from '@tanstack/react-query';

const PUBLIC_SHOWCASE_URL = 'https://wjkbqcrxwsmvtxmqgiqc.functions.supabase.co/public-showcase';

export interface ApprovedContent {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  bunny_embed_url: string | null;
  creator_name: string;
}

interface PublicVideo {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  creator_handle: string;
  brand_name: string;
}

export function useApprovedContent(limit = 10) {
  return useQuery({
    queryKey: ['approved-landing-content', limit],
    queryFn: async () => {
      const res = await fetch(`${PUBLIC_SHOWCASE_URL}?action=videos&limit=${limit}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const videos: PublicVideo[] = await res.json();

      return videos.map((v) => ({
        id: v.id,
        title: v.title || 'Contenido Premium',
        video_url: v.video_url,
        thumbnail_url: v.thumbnail_url,
        bunny_embed_url: null,
        creator_name: v.creator_handle || 'Creador Kreoon'
      })) as ApprovedContent[];
    },
    staleTime: 1000 * 60 * 30, // 30 min
    retry: 2,
  });
}
