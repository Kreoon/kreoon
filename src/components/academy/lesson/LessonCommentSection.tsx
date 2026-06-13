import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Heart, MessageCircle, Pin, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  useLessonComments,
  useCreateLessonComment,
  useToggleLessonCommentLike,
  useFeatureLessonComment,
  useDeleteLessonComment,
} from '@/hooks/academy/useAcademyLessonComments';
import { TimestampChip } from './TimestampChip';
import type { AcademyLessonComment } from '@/types/academy-v3';

interface LessonCommentSectionProps {
  lessonId: string;
  courseId: string;
  spaceId: string;
  instructorId: string;
  currentVideoTimestamp?: number;
  accentColor?: string;
  onTimestampClick?: (seconds: number) => void;
}

type SortMode = 'featured' | 'recent' | 'popular';

export function LessonCommentSection({
  lessonId,
  courseId,
  spaceId,
  instructorId,
  currentVideoTimestamp,
  accentColor = '#8B5CF6',
  onTimestampClick,
}: LessonCommentSectionProps) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useLessonComments(lessonId, courseId);
  const create = useCreateLessonComment();
  const [text, setText] = useState('');
  const [withTimestamp, setWithTimestamp] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('featured');
  const isInstructor = user?.id === instructorId;

  const sorted = useMemo(() => {
    const arr = [...comments];
    if (sort === 'recent') {
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === 'popular') {
      arr.sort((a, b) => b.like_count - a.like_count);
    }
    // 'featured' viene ya ordenado del backend
    return arr;
  }, [comments, sort]);

  async function handlePost(parentId?: string) {
    if (!text.trim()) return;
    await create.mutateAsync({
      lessonId,
      courseId,
      spaceId,
      body: text.trim(),
      parentId,
      videoTimestampSeconds:
        withTimestamp && typeof currentVideoTimestamp === 'number'
          ? Math.floor(currentVideoTimestamp)
          : undefined,
    });
    setText('');
    setWithTimestamp(false);
    setReplyTo(null);
  }

  const totalCount =
    comments.length +
    comments.reduce((sum, c) => sum + (c.replies?.length ?? 0), 0);

  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          {totalCount} comentario{totalCount === 1 ? '' : 's'}
        </h2>
        <div className="flex items-center gap-1 text-xs">
          {(['featured', 'recent', 'popular'] as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                'px-2 py-1 rounded transition-colors',
                sort === s ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {s === 'featured' ? 'Destacados' : s === 'recent' ? 'Recientes' : 'Populares'}
            </button>
          ))}
        </div>
      </div>

      {/* Composer principal */}
      {user && !replyTo && (
        <div className="mb-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Comparte tu duda, idea o aporte sobre esta lección..."
            className="w-full min-h-20 rounded-lg bg-black/30 border border-white/10 p-3 text-sm focus:outline-none focus:border-purple-500/50"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={withTimestamp}
                disabled={typeof currentVideoTimestamp !== 'number'}
                onChange={(e) => setWithTimestamp(e.target.checked)}
                className="accent-purple-500"
              />
              <Clock className="h-3 w-3" />
              Comentar en {typeof currentVideoTimestamp === 'number' ? formatTime(currentVideoTimestamp) : '--:--'}
            </label>
            <Button
              onClick={() => handlePost()}
              disabled={!text.trim() || create.isPending}
              size="sm"
              className="text-white"
              style={{ backgroundColor: accentColor }}
            >
              {create.isPending ? 'Publicando...' : 'Comentar'}
            </Button>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="text-zinc-500 text-sm py-6 text-center">Cargando comentarios...</div>
      ) : sorted.length === 0 ? (
        <div className="text-zinc-500 text-sm py-6 text-center">Sé el primero en comentar.</div>
      ) : (
        <ul className="space-y-4">
          {sorted.map((c) => (
            <li key={c.id}>
              <CommentItem
                comment={c}
                lessonId={lessonId}
                courseId={courseId}
                spaceId={spaceId}
                accentColor={accentColor}
                isInstructorView={isInstructor}
                replyTo={replyTo}
                replyText={text}
                setReplyText={setText}
                onReplyOpen={() => {
                  setReplyTo(c.id);
                  setText('');
                }}
                onReplyCancel={() => {
                  setReplyTo(null);
                  setText('');
                }}
                onReplySubmit={() => handlePost(c.id)}
                onTimestampClick={onTimestampClick}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface CommentItemProps {
  comment: AcademyLessonComment;
  lessonId: string;
  courseId: string;
  spaceId: string;
  accentColor: string;
  isInstructorView: boolean;
  replyTo: string | null;
  replyText: string;
  setReplyText: (s: string) => void;
  onReplyOpen: () => void;
  onReplyCancel: () => void;
  onReplySubmit: () => void;
  onTimestampClick?: (seconds: number) => void;
}

function CommentItem({
  comment,
  lessonId,
  spaceId,
  courseId,
  accentColor,
  isInstructorView,
  replyTo,
  replyText,
  setReplyText,
  onReplyOpen,
  onReplyCancel,
  onReplySubmit,
  onTimestampClick,
}: CommentItemProps) {
  const { user } = useAuth();
  const toggleLike = useToggleLessonCommentLike();
  const feature = useFeatureLessonComment();
  const del = useDeleteLessonComment();
  const isAuthor = user?.id === comment.author_id;
  const isReplying = replyTo === comment.id;

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(comment.created_at), { locale: es, addSuffix: true });
    } catch {
      return '';
    }
  })();

  const containerCls = cn(
    'p-4 rounded-xl border',
    comment.is_featured
      ? 'border-cyan-500/40 bg-cyan-500/5'
      : comment.is_pinned
      ? 'border-amber-500/30 bg-amber-500/5'
      : 'border-white/5 bg-white/[0.02]'
  );

  return (
    <div className={containerCls}>
      {comment.is_featured && (
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-cyan-300 mb-2">
          <Sparkles className="h-3 w-3" /> Respuesta destacada del instructor
        </div>
      )}
      {comment.is_pinned && !comment.is_featured && (
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-amber-300 mb-2">
          <Pin className="h-3 w-3" /> Fijado
        </div>
      )}

      <div className="flex items-start gap-3">
        <Avatar profile={comment.author} accentColor={accentColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{comment.author?.full_name ?? 'Usuario'}</span>
            {comment.is_instructor && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded border"
                style={{
                  borderColor: `${accentColor}40`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
              >
                Instructor
              </span>
            )}
            <span className="text-[10px] text-zinc-500">{timeAgo}</span>
            {typeof comment.video_timestamp_seconds === 'number' && (
              <TimestampChip
                seconds={comment.video_timestamp_seconds}
                label={comment.video_timestamp_label}
                onClick={onTimestampClick}
                accentColor={accentColor}
              />
            )}
          </div>
          <p className="text-sm text-zinc-200 mt-1 whitespace-pre-wrap break-words">
            {comment.body}
          </p>

          <div className="mt-2 flex items-center gap-3 text-xs">
            <button
              onClick={() =>
                toggleLike.mutate({
                  commentId: comment.id,
                  lessonId,
                  isLiked: !!comment.is_liked_by_me,
                })
              }
              className={cn(
                'flex items-center gap-1 transition-colors',
                comment.is_liked_by_me ? 'text-rose-300' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Heart
                className={cn('h-3.5 w-3.5', comment.is_liked_by_me && 'fill-rose-400')}
              />
              {comment.like_count > 0 && comment.like_count}
            </button>
            {!comment.parent_id && (
              <button
                onClick={isReplying ? onReplyCancel : onReplyOpen}
                className="text-zinc-500 hover:text-zinc-300"
              >
                {isReplying ? 'Cancelar' : 'Responder'}
              </button>
            )}
            {isInstructorView && !comment.parent_id && (
              <button
                onClick={() =>
                  feature.mutate({
                    commentId: comment.id,
                    lessonId,
                    featured: !comment.is_featured,
                  })
                }
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                {comment.is_featured ? 'Quitar destacado' : 'Destacar'}
              </button>
            )}
            {(isAuthor || isInstructorView) && (
              <button
                onClick={() => {
                  if (confirm('¿Eliminar este comentario?')) {
                    del.mutate({ commentId: comment.id, lessonId });
                  }
                }}
                className="text-rose-400/70 hover:text-rose-300 flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          {isReplying && (
            <div className="mt-3 pl-3 border-l border-white/10">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Tu respuesta..."
                className="w-full min-h-16 rounded-lg bg-black/30 border border-white/10 p-2 text-sm focus:outline-none focus:border-purple-500/50"
                autoFocus
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onReplyCancel}>
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={onReplySubmit}
                  disabled={!replyText.trim()}
                  className="text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Responder
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <ul className="mt-3 space-y-3 pl-3 border-l border-white/10">
              {comment.replies.map((r) => (
                <li key={r.id}>
                  <ReplyItem
                    comment={r}
                    lessonId={lessonId}
                    accentColor={accentColor}
                    isAuthor={user?.id === r.author_id}
                    isInstructorView={isInstructorView}
                    onTimestampClick={onTimestampClick}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplyItem({
  comment,
  lessonId,
  accentColor,
  isAuthor,
  isInstructorView,
  onTimestampClick,
}: {
  comment: AcademyLessonComment;
  lessonId: string;
  accentColor: string;
  isAuthor: boolean;
  isInstructorView: boolean;
  onTimestampClick?: (seconds: number) => void;
}) {
  const toggleLike = useToggleLessonCommentLike();
  const del = useDeleteLessonComment();
  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(comment.created_at), { locale: es, addSuffix: true });
    } catch {
      return '';
    }
  })();

  if (comment.is_deleted) {
    return (
      <div className="text-xs text-zinc-600 italic">[comentario eliminado]</div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <Avatar profile={comment.author} accentColor={accentColor} size={28} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold">{comment.author?.full_name ?? 'Usuario'}</span>
          {comment.is_instructor && (
            <span
              className="text-[9px] px-1 py-0.5 rounded"
              style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
            >
              Instructor
            </span>
          )}
          <span className="text-[10px] text-zinc-500">{timeAgo}</span>
        </div>
        <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap break-words">
          {comment.body}
        </p>
        <div className="mt-1 flex items-center gap-3 text-[10px]">
          <button
            onClick={() =>
              toggleLike.mutate({
                commentId: comment.id,
                lessonId,
                isLiked: !!comment.is_liked_by_me,
              })
            }
            className={cn(
              'flex items-center gap-1 transition-colors',
              comment.is_liked_by_me ? 'text-rose-300' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Heart className={cn('h-3 w-3', comment.is_liked_by_me && 'fill-rose-400')} />
            {comment.like_count > 0 && comment.like_count}
          </button>
          {(isAuthor || isInstructorView) && (
            <button
              onClick={() => {
                if (confirm('¿Eliminar respuesta?')) {
                  del.mutate({ commentId: comment.id, lessonId });
                }
              }}
              className="text-rose-400/70 hover:text-rose-300"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ profile, accentColor, size = 36 }: { profile: any; accentColor: string; size?: number }) {
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        className="rounded-full object-cover flex-shrink-0"
        style={{ height: size, width: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
      style={{
        height: size,
        width: size,
        backgroundColor: `${accentColor}40`,
        fontSize: size * 0.4,
      }}
    >
      {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}
