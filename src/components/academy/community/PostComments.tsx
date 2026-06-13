import { useState, lazy, Suspense } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Send, Image as ImageIcon, Sticker, Smile, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  usePostComments,
  useCreateComment,
  useDeleteComment,
} from '@/hooks/academy/useAcademyCommunity';
import { useAuth } from '@/hooks/useAuth';
import { useBunnyImageUpload } from '@/hooks/useBunnyImageUpload';
import { toast } from 'sonner';
import { GifPicker } from './GifPicker';
import type { AcademyPostComment } from '@/types/academy-community';

const EmojiPicker = lazy(() =>
  import('emoji-picker-react').then((m) => ({ default: m.default }))
);

interface PostCommentsProps {
  postId: string;
  spaceId: string;
  accentColor?: string;
}

export function PostComments({ postId, spaceId, accentColor = '#8B5CF6' }: PostCommentsProps) {
  const { user, profile } = useAuth();
  const { data: comments = [], isLoading } = usePostComments(postId);
  const create = useCreateComment();
  const [replyTo, setReplyTo] = useState<string | null>(null);

  async function handleReply(parentId: string, body: string, mediaUrls: string[]) {
    if ((!body.trim() && mediaUrls.length === 0) || !user) return;
    await create.mutateAsync({ postId, body: body.trim(), parentId, mediaUrls });
    setReplyTo(null);
  }

  return (
    <div className="border-t border-white/5 pt-4 mt-4 space-y-3">
      <CommentComposer
        spaceId={spaceId}
        accentColor={accentColor}
        avatar={<MiniAvatar profile={profile} />}
        placeholder="Escribe un comentario..."
        onSubmit={async (body, mediaUrls) => {
          await create.mutateAsync({ postId, body: body.trim(), mediaUrls });
        }}
        submitting={create.isPending}
      />

      {isLoading ? (
        <div className="text-sm text-zinc-500">Cargando comentarios...</div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              spaceId={spaceId}
              currentUserId={user?.id ?? null}
              accentColor={accentColor}
              onReplyOpen={() => setReplyTo(c.id)}
              isReplying={replyTo === c.id}
              onReplyCancel={() => setReplyTo(null)}
              onReplySubmit={(body, media) => handleReply(c.id, body, media)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Composer reusable de comentario: input + media + gif + emoji + send. */
interface ComposerProps {
  spaceId: string;
  accentColor: string;
  avatar?: React.ReactNode;
  placeholder?: string;
  submitting?: boolean;
  onSubmit: (body: string, mediaUrls: string[]) => Promise<void> | void;
  onCancel?: () => void;
  compact?: boolean;
}

function CommentComposer({
  spaceId,
  accentColor,
  avatar,
  placeholder,
  submitting,
  onSubmit,
  onCancel,
  compact,
}: ComposerProps) {
  const { user } = useAuth();
  const { uploadImage } = useBunnyImageUpload();
  const [text, setText] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);

  async function handleFile(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.match(/\.([a-zA-Z0-9]{1,8})$/);
      const path = `academy/comments/${spaceId}/${user.id}/${crypto.randomUUID()}${ext ? `.${ext[1].toLowerCase()}` : ''}`;
      const result = await uploadImage(file, path, 25);
      if (!result.success || !result.cdnUrl) {
        throw new Error(result.error ?? 'Upload error');
      }
      setMediaUrls((arr) => [...arr, result.cdnUrl!]);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo subir');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!text.trim() && mediaUrls.length === 0) return;
    await onSubmit(text, mediaUrls);
    setText('');
    setMediaUrls([]);
  }

  return (
    <div className="flex items-start gap-2">
      {avatar}
      <div className="flex-1 space-y-2">
        {mediaUrls.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {mediaUrls.map((url) => (
              <MediaThumb
                key={url}
                url={url}
                onRemove={() => setMediaUrls((arr) => arr.filter((u) => u !== url))}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder={placeholder ?? 'Escribe...'}
            className={cn(
              'flex-1 bg-black/30 border border-white/10 rounded-full px-4 text-sm focus:outline-none focus:border-purple-500/50',
              compact ? 'py-1.5 text-xs' : 'py-2'
            )}
          />

          <label
            className="p-1.5 rounded-full hover:bg-white/5 cursor-pointer text-zinc-400 hover:text-zinc-200"
            title="Subir imagen, GIF, sticker, video o audio"
          >
            <ImageIcon className="h-4 w-4" />
            <input
              type="file"
              accept="image/*,video/*,audio/*,.gif,.webp,.apng,.avif"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = '';
              }}
            />
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowGif((v) => !v); setShowEmoji(false); }}
              className="p-1.5 rounded-full hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
              title="Buscar GIF"
            >
              <Sticker className="h-4 w-4" />
            </button>
            {showGif && (
              <GifPicker
                onSelect={(url) => setMediaUrls((arr) => [...arr, url])}
                onClose={() => setShowGif(false)}
              />
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowEmoji((v) => !v); setShowGif(false); }}
              className="p-1.5 rounded-full hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
              title="Emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
            {showEmoji && (
              <div className="absolute z-50 right-0 mt-2">
                <Suspense fallback={<div className="bg-zinc-950 rounded-xl border border-white/10 p-4 text-xs text-zinc-500">Cargando...</div>}>
                  <EmojiPicker
                    onEmojiClick={(e: any) => { setText((t) => t + e.emoji); setShowEmoji(false); }}
                    theme={'dark' as any}
                    searchPlaceHolder="Buscar emoji..."
                    width={320}
                    height={400}
                    lazyLoadEmojis
                  />
                </Suspense>
              </div>
            )}
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2"
            >
              Cancelar
            </button>
          )}
          <Button
            onClick={() => void handleSubmit()}
            disabled={(!text.trim() && mediaUrls.length === 0) || submitting || uploading}
            size="sm"
            style={{ backgroundColor: accentColor }}
            className="text-white"
          >
            {uploading || submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MediaThumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  const lower = url.toLowerCase().split('?')[0];
  const isVideo = /\.(mp4|webm|mov|m4v)$/.test(lower);
  const isAudio = /\.(mp3|wav|m4a|aac|opus|flac)$/.test(lower);
  return (
    <div className="relative">
      {isVideo ? (
        <video src={url} muted playsInline preload="metadata"
               className="h-16 w-16 rounded-lg object-cover bg-black" />
      ) : isAudio ? (
        <div className="h-16 w-16 rounded-lg bg-violet-500/10 border border-violet-500/30
                        flex items-center justify-center text-xs text-violet-300">🎵</div>
      ) : (
        <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1 -right-1 bg-zinc-800 rounded-full p-0.5 hover:bg-zinc-700"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

interface CommentItemProps {
  comment: AcademyPostComment;
  spaceId: string;
  currentUserId: string | null;
  accentColor: string;
  onReplyOpen: () => void;
  isReplying: boolean;
  onReplyCancel: () => void;
  onReplySubmit: (body: string, mediaUrls: string[]) => Promise<void> | void;
}

function CommentItem({
  comment,
  spaceId,
  currentUserId,
  accentColor,
  onReplyOpen,
  isReplying,
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
    return <div className="text-xs text-zinc-600 italic pl-12">[comentario eliminado]</div>;
  }

  return (
    <div className="flex items-start gap-2">
      <MiniAvatar profile={comment.author} />
      <div className="flex-1">
        <div className="bg-white/5 rounded-2xl px-3 py-2 inline-block max-w-full">
          <div className="text-xs font-semibold">{comment.author?.full_name ?? 'Usuario'}</div>
          {comment.body && (
            <div className="text-sm whitespace-pre-wrap break-words">{comment.body}</div>
          )}
        </div>
        <CommentMedia urls={(comment as any).media_urls ?? []} />
        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-3 pl-2">
          <span>{timeAgo}</span>
          <button onClick={onReplyOpen} className="hover:text-zinc-300">Responder</button>
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
          <div className="mt-2">
            <CommentComposer
              spaceId={spaceId}
              accentColor={accentColor}
              compact
              placeholder="Escribe una respuesta..."
              onSubmit={onReplySubmit}
              onCancel={onReplyCancel}
            />
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2 pl-4 border-l border-white/5">
            {comment.replies.map((r) => (
              <div key={r.id} className="flex items-start gap-2">
                <MiniAvatar profile={r.author} />
                <div className="flex-1">
                  <div className="bg-white/5 rounded-2xl px-3 py-2 inline-block max-w-full">
                    <div className="text-xs font-semibold">{r.author?.full_name ?? 'Usuario'}</div>
                    {r.body && (
                      <div className="text-sm whitespace-pre-wrap break-words">{r.body}</div>
                    )}
                  </div>
                  <CommentMedia urls={(r as any).media_urls ?? []} />
                  <div className="text-[10px] text-zinc-500 mt-1 pl-2">
                    {(() => {
                      try {
                        return formatDistanceToNow(new Date(r.created_at), { locale: es, addSuffix: true });
                      } catch { return ''; }
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

function CommentMedia({ urls }: { urls: string[] }) {
  if (!Array.isArray(urls) || urls.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {urls.slice(0, 4).map((url, i) => {
        const lower = String(url).toLowerCase().split('?')[0];
        const isVideo = /\.(mp4|webm|mov|m4v)$/.test(lower);
        const isAudio = /\.(mp3|wav|m4a|aac|opus|flac)$/.test(lower);
        if (isVideo) {
          return (
            <video
              key={i}
              src={url}
              controls
              playsInline
              preload="metadata"
              className="rounded-lg max-h-64 bg-black"
            />
          );
        }
        if (isAudio) {
          return <audio key={i} src={url} controls preload="metadata" className="w-full" />;
        }
        return (
          <img
            key={i}
            src={url}
            alt=""
            className="rounded-lg max-h-64 object-contain"
            loading="lazy"
          />
        );
      })}
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
