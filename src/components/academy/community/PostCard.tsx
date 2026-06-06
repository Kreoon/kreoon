import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MessageCircle,
  Pin,
  Megaphone,
  MoreHorizontal,
  Trash2,
  Heart,
  Flame,
  Hand,
  Lightbulb,
  ThumbsUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
import {
  useReactToPost,
  useDeletePost,
  useVotePoll,
} from '@/hooks/academy/useAcademyCommunity';
import type { AcademyPost, PostReaction } from '@/types/academy-community';

interface PostCardProps {
  post: AcademyPost;
  spaceId: string;
  currentUserId: string | null;
  isOwner: boolean;
  accentColor?: string;
  onCommentClick?: (postId: string) => void;
}

const REACTIONS: { key: PostReaction; icon: any; color: string; label: string }[] = [
  { key: 'like', icon: ThumbsUp, color: '#60a5fa', label: 'Me gusta' },
  { key: 'love', icon: Heart, color: '#ef4444', label: 'Me encanta' },
  { key: 'fire', icon: Flame, color: '#f97316', label: 'Fuego' },
  { key: 'clap', icon: Hand, color: '#fbbf24', label: 'Aplauso' },
  { key: 'insightful', icon: Lightbulb, color: '#a78bfa', label: 'Insight' },
];

export function PostCard({
  post,
  spaceId,
  currentUserId,
  isOwner,
  accentColor = '#8B5CF6',
  onCommentClick,
}: PostCardProps) {
  const react = useReactToPost();
  const del = useDeletePost();
  const vote = useVotePoll();
  const [showFull, setShowFull] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const isAuthor = currentUserId === post.author_id;
  const canDelete = isAuthor || isOwner;
  const myReaction = normalizeReaction(post.my_reaction);
  const bodyHtml = post.body_html ?? post.body.replace(/\n/g, '<br>');
  const bodyHtmlClean = sanitizeHTML(bodyHtml);

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(post.created_at), { locale: es, addSuffix: true });
    } catch {
      return '';
    }
  })();

  function handleDelete() {
    if (!confirm('¿Eliminar este post?')) return;
    del.mutate({ postId: post.id, spaceId });
  }

  return (
    <article className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 hover:border-white/20 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar profile={post.author} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{post.author?.full_name ?? 'Usuario'}</span>
            {post.is_pinned && (
              <span className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20">
                <Pin className="h-2.5 w-2.5" /> Fijado
              </span>
            )}
            {post.is_announcement && (
              <span className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                <Megaphone className="h-2.5 w-2.5" /> Anuncio
              </span>
            )}
            {post.category && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded border"
                style={{
                  borderColor: `${post.category.color}40`,
                  backgroundColor: `${post.category.color}1a`,
                  color: post.category.color,
                }}
              >
                {post.category.emoji} {post.category.name}
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">{timeAgo}</div>
        </div>
        {canDelete && (
          <div className="relative">
            <button
              onClick={() => setShowActions((v) => !v)}
              className="text-zinc-500 hover:text-zinc-300 p-1"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showActions && (
              <div className="absolute right-0 top-7 z-10 bg-[#0c0c16] border border-white/10 rounded-lg overflow-hidden min-w-[140px]">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      {post.title && <h3 className="font-bold text-lg mb-2 leading-snug">{post.title}</h3>}

      {/* Body */}
      <div
        className={cn(
          'prose prose-invert prose-sm max-w-none text-zinc-300',
          !showFull && 'line-clamp-3'
        )}
        dangerouslySetInnerHTML={{ __html: bodyHtmlClean }}
      />
      {post.body.length > 280 && !showFull && (
        <button
          onClick={() => setShowFull(true)}
          className="text-sm text-purple-400 hover:text-purple-300 mt-1"
        >
          Ver más
        </button>
      )}

      {/* Media */}
      {post.media_urls.length > 0 && (
        <div
          className={cn(
            'mt-3 grid gap-2 rounded-xl overflow-hidden',
            post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          )}
        >
          {post.media_urls.slice(0, 4).map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="w-full h-48 object-cover rounded-lg"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* Poll */}
      {post.type === 'poll' && post.poll_options && post.poll_options.length > 0 && (
        <PollDisplay
          post={post}
          spaceId={spaceId}
          onVote={(optionIds) => vote.mutate({ postId: post.id, optionIds, spaceId })}
          accentColor={accentColor}
        />
      )}

      {/* Reactions */}
      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
        <div className="flex items-center gap-1">
          {REACTIONS.map((r) => {
            const isActive = myReaction === r.key;
            return (
              <button
                key={r.key}
                onClick={() => react.mutate({ postId: post.id, reaction: r.key, spaceId })}
                title={r.label}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  isActive ? 'bg-white/10' : 'hover:bg-white/5'
                )}
                style={isActive ? { color: r.color } : undefined}
              >
                <r.icon className={cn('h-3.5 w-3.5', !isActive && 'text-zinc-500')} />
              </button>
            );
          })}
          {post.like_count > 0 && (
            <span className="text-xs text-zinc-500 ml-1">{post.like_count}</span>
          )}
        </div>

        <button
          onClick={() => onCommentClick?.(post.id)}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {post.comment_count > 0 ? `${post.comment_count} comentarios` : 'Comentar'}
        </button>
      </div>
    </article>
  );
}

function normalizeReaction(my: AcademyPost['my_reaction']): PostReaction | null {
  if (!my) return null;
  if (Array.isArray(my)) return my[0]?.reaction ?? null;
  if (typeof my === 'string') return my;
  return null;
}

function PollDisplay({
  post,
  spaceId,
  onVote,
  accentColor,
}: {
  post: AcademyPost;
  spaceId: string;
  onVote: (optionIds: string[]) => void;
  accentColor: string;
}) {
  void spaceId;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const totalVotes = post.poll_options.reduce((s, o) => s + (o.vote_count ?? 0), 0);
  const hasVoted = !!post.my_poll_vote && post.my_poll_vote.length > 0;

  return (
    <div className="mt-3 space-y-2">
      {post.poll_options.map((opt) => {
        const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
        const isSelected = selected.has(opt.id) || post.my_poll_vote?.includes(opt.id);
        return (
          <button
            key={opt.id}
            disabled={hasVoted}
            onClick={() => {
              const next = new Set(selected);
              if (post.poll_allows_multiple) {
                isSelected ? next.delete(opt.id) : next.add(opt.id);
              } else {
                next.clear();
                next.add(opt.id);
              }
              setSelected(next);
              if (!post.poll_allows_multiple) onVote([opt.id]);
            }}
            className="w-full relative p-3 rounded-lg border border-white/10 bg-white/5 hover:border-white/20 transition-colors overflow-hidden text-left"
          >
            {(hasVoted || totalVotes > 0) && (
              <div
                className="absolute inset-y-0 left-0 opacity-30"
                style={{ width: `${pct}%`, backgroundColor: accentColor }}
              />
            )}
            <div className="relative flex items-center justify-between text-sm">
              <span>{opt.text}</span>
              {(hasVoted || totalVotes > 0) && (
                <span className="text-xs text-zinc-400">
                  {pct}% · {opt.vote_count}
                </span>
              )}
            </div>
          </button>
        );
      })}
      {post.poll_allows_multiple && !hasVoted && selected.size > 0 && (
        <button
          onClick={() => onVote(Array.from(selected))}
          className="text-sm px-3 py-1.5 rounded text-white"
          style={{ backgroundColor: accentColor }}
        >
          Votar
        </button>
      )}
    </div>
  );
}

function Avatar({ profile }: { profile: any }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />;
  }
  return (
    <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-semibold text-sm">
      {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}
