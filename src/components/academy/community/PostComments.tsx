import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  usePostComments,
  useCreateComment,
  useDeleteComment,
} from '@/hooks/academy/useAcademyCommunity';
import { useAuth } from '@/hooks/useAuth';
import type { AcademyPostComment } from '@/types/academy-community';

interface PostCommentsProps {
  postId: string;
  accentColor?: string;
}

export function PostComments({ postId, accentColor = '#8B5CF6' }: PostCommentsProps) {
  const { user, profile } = useAuth();
  const { data: comments = [], isLoading } = usePostComments(postId);
  const create = useCreateComment();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  async function handlePost() {
    if (!text.trim() || !user) return;
    await create.mutateAsync({ postId, body: text.trim() });
    setText('');
  }

  async function handleReply(parentId: string) {
    if (!replyText.trim() || !user) return;
    await create.mutateAsync({ postId, body: replyText.trim(), parentId });
    setReplyText('');
    setReplyTo(null);
  }

  return (
    <div className="border-t border-white/5 pt-4 mt-4 space-y-3">
      {/* Composer */}
      <div className="flex items-start gap-2">
        <MiniAvatar profile={profile} />
        <div className="flex-1 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePost();
              }
            }}
            placeholder="Escribe un comentario..."
            className="flex-1 bg-black/30 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-purple-500/50"
          />
          <Button
            onClick={handlePost}
            disabled={!text.trim() || create.isPending}
            size="sm"
            style={{ backgroundColor: accentColor }}
            className="text-white"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-sm text-zinc-500">Cargando comentarios...</div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={user?.id ?? null}
              accentColor={accentColor}
              onReplyOpen={() => setReplyTo(c.id)}
              isReplying={replyTo === c.id}
              replyText={replyText}
              setReplyText={setReplyText}
              onReplyCancel={() => setReplyTo(null)}
              onReplySubmit={() => handleReply(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: AcademyPostComment;
  currentUserId: string | null;
  accentColor: string;
  onReplyOpen: () => void;
  isReplying: boolean;
  replyText: string;
  setReplyText: (s: string) => void;
  onReplyCancel: () => void;
  onReplySubmit: () => void;
}

function CommentItem({
  comment,
  currentUserId,
  accentColor,
  onReplyOpen,
  isReplying,
  replyText,
  setReplyText,
  onReplyCancel,
  onReplySubmit,
}: CommentItemProps) {
  const del = useDeleteComment();
  const isAuthor = currentUserId === comment.author_id;

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(comment.created_at), { locale: es, addSuffix: true });
    } catch {
      return '';
    }
  })();

  if (comment.is_deleted) {
    return (
      <div className="text-xs text-zinc-600 italic pl-12">[comentario eliminado]</div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <MiniAvatar profile={comment.author} />
      <div className="flex-1">
        <div className="bg-white/5 rounded-2xl px-3 py-2 inline-block max-w-full">
          <div className="text-xs font-semibold">{comment.author?.full_name ?? 'Usuario'}</div>
          <div className="text-sm whitespace-pre-wrap break-words">{comment.body}</div>
        </div>
        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-3 pl-2">
          <span>{timeAgo}</span>
          <button onClick={onReplyOpen} className="hover:text-zinc-300">
            Responder
          </button>
          {isAuthor && (
            <button
              onClick={() => del.mutate({ commentId: comment.id, postId: comment.post_id })}
              className="hover:text-rose-300"
            >
              Eliminar
            </button>
          )}
        </div>

        {isReplying && (
          <div className="mt-2 flex items-center gap-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onReplySubmit();
                }
              }}
              placeholder="Escribe una respuesta..."
              className="flex-1 bg-black/30 border border-white/10 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500/50"
              autoFocus
            />
            <button onClick={onReplyCancel} className="text-xs text-zinc-500 hover:text-zinc-300">
              Cancelar
            </button>
            <button
              onClick={onReplySubmit}
              className={cn('text-xs text-white px-2 py-1 rounded')}
              style={{ backgroundColor: accentColor }}
            >
              Enviar
            </button>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2 pl-4 border-l border-white/5">
            {comment.replies.map((r) => (
              <div key={r.id} className="flex items-start gap-2">
                <MiniAvatar profile={r.author} />
                <div className="flex-1">
                  <div className="bg-white/5 rounded-2xl px-3 py-2 inline-block max-w-full">
                    <div className="text-xs font-semibold">{r.author?.full_name ?? 'Usuario'}</div>
                    <div className="text-sm whitespace-pre-wrap break-words">{r.body}</div>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1 pl-2">
                    {(() => {
                      try {
                        return formatDistanceToNow(new Date(r.created_at), {
                          locale: es,
                          addSuffix: true,
                        });
                      } catch {
                        return '';
                      }
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniAvatar({ profile }: { profile: any }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />;
  }
  return (
    <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-semibold">
      {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}
