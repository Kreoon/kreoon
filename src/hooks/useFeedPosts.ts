import { useCallback, useRef } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type FeedTab = 'for_you' | 'following' | 'niche';

export interface FeedPost {
  post_id: string;
  post_source: 'portfolio_item' | 'portfolio_post';
  author_user_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  title: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
  views_count: number;
  likes_count: number;
  reactions_count: number;
  category: string | null;
  is_liked: boolean;
  my_reaction: string | null;
  is_saved: boolean;
  is_following_author: boolean;
  created_at: string;
}

const PAGE_SIZE = 12;

export function useFeedPosts(tab: FeedTab, niche: string | null = null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Seed estable durante toda la sesion de scroll (mismo orden entre paginas), pero se
  // regenera en cada refresh explicito (pull-to-refresh) para variar el intercalado —
  // ver refetchWithNewOrder mas abajo.
  const seedRef = useRef(crypto.randomUUID());

  const query = useInfiniteQuery({
    queryKey: ['feed-posts', tab, niche, user?.id ?? 'anon'],
    queryFn: async ({ pageParam }: { pageParam: { createdAt: string; id: string } | null }) => {
      // El viewer se resuelve server-side via auth.uid() dentro de la RPC (SECURITY DEFINER) —
      // nunca se pasa un id de usuario desde el cliente (evita IDOR sobre saved/reactions/follows).
      const { data, error } = await supabase.rpc('get_feed_posts', {
        p_tab: tab,
        p_niche: niche ?? undefined,
        p_cursor_created_at: pageParam?.createdAt ?? undefined,
        p_cursor_id: pageParam?.id ?? undefined,
        p_limit: PAGE_SIZE,
        p_seed: seedRef.current,
      });
      if (error) throw error;
      return (data || []) as FeedPost[];
    },
    initialPageParam: null as { createdAt: string; id: string } | null,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage && lastPage.length === PAGE_SIZE) {
        const last = lastPage[lastPage.length - 1];
        return { createdAt: last.created_at, id: last.post_id };
      }
      // Fin real de contenido nuevo (pagina parcial o vacia). Scroll infinito estilo TikTok:
      // si ya se cargo algo, reciclar desde el principio (mismo pageParam que initialPageParam)
      // en vez de cortar el scroll. Si el feed esta genuinamente vacio, no reciclar en loop.
      const totalLoaded = allPages.reduce((sum, p) => sum + (p?.length ?? 0), 0);
      return totalLoaded > 0 ? null : undefined;
    },
    staleTime: 5 * 60 * 1000,
  });

  const posts = query.data?.pages.flat() ?? [];

  const refetchWithNewOrder = useCallback(() => {
    seedRef.current = crypto.randomUUID();
    return query.refetch();
  }, [query]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
  }, [queryClient]);

  const react = useCallback(async (post: FeedPost, reactionType: string) => {
    if (!user?.id) {
      toast.error('Inicia sesión para reaccionar');
      return;
    }
    if (post.post_source !== 'portfolio_item') {
      toast.error('Este post aún no soporta reacciones');
      return;
    }

    const removing = post.my_reaction === reactionType;

    // Optimistic update local cache
    queryClient.setQueryData(['feed-posts', tab, niche, user.id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: FeedPost[]) => page.map((p) =>
          p.post_id === post.post_id
            ? {
                ...p,
                my_reaction: removing ? null : reactionType,
                is_liked: !removing,
                reactions_count: p.reactions_count + (removing ? -1 : p.my_reaction ? 0 : 1),
              }
            : p
        )),
      };
    });

    try {
      if (removing) {
        const { error } = await supabase
          .from('feed_reactions')
          .delete()
          .eq('post_id', post.post_id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('feed_reactions')
          .upsert(
            { post_id: post.post_id, user_id: user.id, reaction_type: reactionType },
            { onConflict: 'post_id,user_id' }
          );
        if (error) throw error;
      }
    } catch (error) {
      console.error('[useFeedPosts] Error reacting:', error);
      toast.error('Error al reaccionar');
      invalidate();
    }
  }, [user?.id, tab, niche, queryClient, invalidate]);

  const toggleLikeLegacyPost = useCallback(async (post: FeedPost) => {
    if (!user?.id) {
      toast.error('Inicia sesión para reaccionar');
      return;
    }
    const viewerId = user.id;
    const wasLiked = post.is_liked;

    queryClient.setQueryData(['feed-posts', tab, niche, user.id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: FeedPost[]) => page.map((p) =>
          p.post_id === post.post_id
            ? { ...p, is_liked: !wasLiked, likes_count: p.likes_count + (wasLiked ? -1 : 1) }
            : p
        )),
      };
    });

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('portfolio_post_likes')
          .delete()
          .eq('post_id', post.post_id)
          .eq('viewer_id', viewerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('portfolio_post_likes')
          .insert({ post_id: post.post_id, viewer_id: viewerId });
        if (error && (error as { code?: string }).code !== '23505') throw error;
      }
    } catch (error) {
      console.error('[useFeedPosts] Error liking legacy post:', error);
      toast.error('Error al reaccionar');
      invalidate();
    }
  }, [user?.id, tab, niche, queryClient, invalidate]);

  const toggleSaved = useCallback(async (post: FeedPost) => {
    if (!user?.id) {
      toast.error('Inicia sesión para guardar');
      return;
    }
    const itemType = post.post_source === 'portfolio_item' ? 'portfolio_item' : 'post';
    const wasSaved = post.is_saved;

    queryClient.setQueryData(['feed-posts', tab, niche, user.id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: FeedPost[]) => page.map((p) =>
          p.post_id === post.post_id ? { ...p, is_saved: !wasSaved } : p
        )),
      };
    });

    try {
      if (wasSaved) {
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', user.id)
          .eq('item_type', itemType)
          .eq('item_id', post.post_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_items')
          .insert({ user_id: user.id, item_type: itemType, item_id: post.post_id });
        if (error && (error as { code?: string }).code !== '23505') throw error;
      }
    } catch (error) {
      console.error('[useFeedPosts] Error saving:', error);
      toast.error('Error al guardar');
      invalidate();
    }
  }, [user?.id, tab, niche, queryClient, invalidate]);

  return {
    posts,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: refetchWithNewOrder,
    isRefetching: query.isRefetching,
    react,
    toggleLikeLegacyPost,
    toggleSaved,
  };
}
