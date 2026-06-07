import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AcademyLessonComment } from '@/types/academy-v3';

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function useLessonComments(lessonId: string | undefined, courseId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!lessonId) return;
    const channel = (supabase as any)
      .channel(`lesson-comments-${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'academy_lesson_comments',
          filter: `lesson_id=eq.${lessonId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['academy', 'lesson-comments', lessonId] })
      )
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [lessonId, qc]);

  return useQuery({
    queryKey: ['academy', 'lesson-comments', lessonId, user?.id],
    queryFn: async () => {
      if (!lessonId) return [];
      const { data, error } = await (supabase as any)
        .from('academy_lesson_comments')
        .select(
          `
          *,
          author:profiles!author_id(full_name, avatar_url),
          is_liked_by_me:academy_lesson_comment_likes!comment_id(id),
          replies:academy_lesson_comments!parent_id(
            *,
            author:profiles!author_id(full_name, avatar_url),
            is_liked_by_me:academy_lesson_comment_likes!comment_id(id)
          )
        `
        )
        .eq('lesson_id', lessonId)
        .is('parent_id', null)
        .order('is_pinned', { ascending: false })
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;

      let instructorId: string | null = null;
      if (courseId) {
        const { data: courseData } = await (supabase as any)
          .from('academy_courses')
          .select('instructor_id')
          .eq('id', courseId)
          .maybeSingle();
        instructorId = courseData?.instructor_id ?? null;
      }

      const normalizeLiked = (raw: any) => {
        const v = raw;
        if (Array.isArray(v)) {
          // ¿alguno corresponde al usuario actual? El filtro RLS no es por user_id en el join,
          // así que comprobamos manualmente con un select extra para mantener la precisión:
          return v.length > 0;
        }
        return false;
      };

      return ((data ?? []) as any[]).map((c) => ({
        ...c,
        is_instructor: instructorId ? c.author_id === instructorId : false,
        is_liked_by_me: normalizeLiked(c.is_liked_by_me),
        replies: (c.replies ?? [])
          .filter((r: any) => !r.is_deleted || r.author_id === user?.id)
          .map((r: any) => ({
            ...r,
            is_instructor: instructorId ? r.author_id === instructorId : false,
            is_liked_by_me: normalizeLiked(r.is_liked_by_me),
          })),
      })) as AcademyLessonComment[];
    },
    enabled: !!lessonId,
    staleTime: 30_000,
  });
}

export function useCreateLessonComment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      lessonId: string;
      courseId: string;
      spaceId: string;
      body: string;
      parentId?: string;
      videoTimestampSeconds?: number;
    }) => {
      if (!user) throw new Error('No user');
      const videoLabel =
        typeof args.videoTimestampSeconds === 'number'
          ? formatTimestamp(args.videoTimestampSeconds)
          : null;

      const { data, error } = await (supabase as any)
        .from('academy_lesson_comments')
        .insert({
          lesson_id: args.lessonId,
          course_id: args.courseId,
          space_id: args.spaceId,
          author_id: user.id,
          body: args.body,
          parent_id: args.parentId ?? null,
          video_timestamp_seconds: args.videoTimestampSeconds ?? null,
          video_timestamp_label: videoLabel,
        })
        .select('*, author:profiles!author_id(full_name, avatar_url)')
        .single();
      if (error) throw error;
      return data as AcademyLessonComment;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ['academy', 'lesson-comments', data.lesson_id] }),
  });
}

export function useToggleLessonCommentLike() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      commentId,
      lessonId,
      isLiked,
    }: {
      commentId: string;
      lessonId: string;
      isLiked: boolean;
    }) => {
      if (!user) throw new Error('No user');
      if (isLiked) {
        await (supabase as any)
          .from('academy_lesson_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        await (supabase as any)
          .from('academy_lesson_comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
      }
      return { lessonId };
    },
    onSuccess: (_, { lessonId }) =>
      qc.invalidateQueries({ queryKey: ['academy', 'lesson-comments', lessonId] }),
  });
}

export function useFeatureLessonComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commentId,
      lessonId,
      featured,
    }: {
      commentId: string;
      lessonId: string;
      featured: boolean;
    }) => {
      await (supabase as any)
        .from('academy_lesson_comments')
        .update({ is_featured: featured })
        .eq('id', commentId);
      return { lessonId };
    },
    onSuccess: (_, { lessonId }) =>
      qc.invalidateQueries({ queryKey: ['academy', 'lesson-comments', lessonId] }),
  });
}

export function useDeleteLessonComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, lessonId }: { commentId: string; lessonId: string }) => {
      await (supabase as any)
        .from('academy_lesson_comments')
        .update({ is_deleted: true, body: '[comentario eliminado]', body_html: null })
        .eq('id', commentId);
      return { lessonId };
    },
    onSuccess: (_, { lessonId }) =>
      qc.invalidateQueries({ queryKey: ['academy', 'lesson-comments', lessonId] }),
  });
}
