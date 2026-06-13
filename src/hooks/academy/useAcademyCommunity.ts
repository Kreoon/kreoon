import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  AcademyPost,
  AcademyPostCategory,
  AcademyPostComment,
  PostReaction,
} from '@/types/academy-community';

const PAGE_SIZE = 20;

// ── FEED ──
export function useSpaceFeed(spaceId: string | undefined, categoryId?: string | null) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['academy', 'feed', spaceId, categoryId, user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      let q = (supabase as any)
        .from('academy_posts')
        .select(`
          *,
          author:profiles!author_id(full_name, avatar_url),
          category:academy_post_categories(name, emoji, color, slug),
          my_reaction:academy_post_reactions!post_id(reaction)
        `)
        .eq('space_id', spaceId!)
        .eq('status', 'published')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (categoryId) q = q.eq('category_id', categoryId);

      const { data, error } = await q;
      if (error) throw error;

      // my_reaction llega como array (relationship), aplanamos a la primera ocurrencia del user actual
      const posts = (data ?? []).map((p: any) => ({
        ...p,
        my_reaction: Array.isArray(p.my_reaction)
          ? p.my_reaction.find((r: any) => true)?.reaction ?? null
          : p.my_reaction,
      }));

      return posts as AcademyPost[];
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
    initialPageParam: 0,
    enabled: !!spaceId,
    staleTime: 60 * 1000,
  });
}

// ── CREAR POST ──
export function useCreatePost() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      space_id: string;
      body: string;
      body_html?: string | null;
      title?: string | null;
      category_id?: string | null;
      type?: 'post' | 'question' | 'announcement' | 'event' | 'poll';
      media_urls?: string[];
      poll_options?: { id: string; text: string; vote_count: number }[];
      poll_allows_multiple?: boolean;
      poll_ends_at?: string | null;
    }) => {
      if (!user) throw new Error('No user');
      const { data, error } = await (supabase as any)
        .from('academy_posts')
        .insert({ ...input, author_id: user.id, status: 'published' })
        .select(`*, author:profiles!author_id(full_name, avatar_url)`)
        .single();
      if (error) throw error;
      return data as AcademyPost;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['academy', 'feed', data.space_id] });
    },
  });
}

// ── DELETE POST ──
export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId }: { postId: string; spaceId: string }) => {
      const { error } = await (supabase as any).from('academy_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: (_, { spaceId }) => {
      qc.invalidateQueries({ queryKey: ['academy', 'feed', spaceId] });
    },
  });
}

// ── REACT / TOGGLE ──
export function useReactToPost() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      postId,
      reaction,
    }: {
      postId: string;
      reaction: PostReaction;
      spaceId: string;
    }) => {
      if (!user) throw new Error('No user');
      const { data: existing } = await (supabase as any)
        .from('academy_post_reactions')
        .select('id, reaction')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing?.reaction === reaction) {
        await (supabase as any).from('academy_post_reactions').delete().eq('id', existing.id);
        return null;
      }

      const { data, error } = await (supabase as any)
        .from('academy_post_reactions')
        .upsert(
          { post_id: postId, user_id: user.id, reaction },
          { onConflict: 'post_id,user_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { spaceId }) => {
      qc.invalidateQueries({ queryKey: ['academy', 'feed', spaceId] });
    },
  });
}

// ── COMMENTS ──
export function usePostComments(postId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'comments', postId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_post_comments')
        .select(`
          *,
          author:profiles!author_id(full_name, avatar_url),
          replies:academy_post_comments!parent_id(
            *, author:profiles!author_id(full_name, avatar_url)
          )
        `)
        .eq('post_id', postId!)
        .is('parent_id', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AcademyPostComment[];
    },
    enabled: !!postId,
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      postId: string;
      body: string;
      parentId?: string;
      mediaUrls?: string[];
    }) => {
      if (!user) throw new Error('No user');
      const { data, error } = await (supabase as any)
        .from('academy_post_comments')
        .insert({
          post_id: args.postId,
          author_id: user.id,
          body: args.body,
          parent_id: args.parentId ?? null,
          media_urls: args.mediaUrls ?? [],
        })
        .select(`*, author:profiles!author_id(full_name, avatar_url)`)
        .single();
      if (error) throw error;
      return data as AcademyPostComment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['academy', 'comments', data.post_id] });
      qc.invalidateQueries({ queryKey: ['academy', 'feed'] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string; postId: string }) => {
      // Soft delete
      const { error } = await (supabase as any)
        .from('academy_post_comments')
        .update({ is_deleted: true, body: '[comentario eliminado]', body_html: null })
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: (_, { postId }) => {
      qc.invalidateQueries({ queryKey: ['academy', 'comments', postId] });
    },
  });
}

// ── CATEGORIES ──
export function useSpaceCategories(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'categories', spaceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_post_categories')
        .select('*')
        .eq('space_id', spaceId!)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AcademyPostCategory[];
    },
    enabled: !!spaceId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpsertCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AcademyPostCategory> & { space_id: string; name: string; slug: string }) => {
      const { data, error } = await (supabase as any)
        .from('academy_post_categories')
        .upsert(input, { onConflict: 'space_id,slug' })
        .select()
        .single();
      if (error) throw error;
      return data as AcademyPostCategory;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'categories'] }),
  });
}

// ── POLL VOTE ──
export function useVotePoll() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ postId, optionIds }: { postId: string; optionIds: string[]; spaceId: string }) => {
      if (!user) throw new Error('No user');
      const { data, error } = await (supabase as any)
        .from('academy_poll_votes')
        .upsert(
          { post_id: postId, user_id: user.id, option_ids: optionIds },
          { onConflict: 'post_id,user_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { spaceId }) => {
      qc.invalidateQueries({ queryKey: ['academy', 'feed', spaceId] });
    },
  });
}
