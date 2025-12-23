import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { X, Heart, Send, Loader2 } from "lucide-react";

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface PortfolioCommentsSectionProps {
  postId: string;
  onClose?: () => void;
  isOpen?: boolean;
}

export function PortfolioCommentsSection({ postId, onClose, isOpen = true }: PortfolioCommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [postId, isOpen]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_post_comments')
        .select('id, comment, created_at, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enrichedComments = data.map(c => ({
          id: c.id,
          comment: c.comment,
          created_at: c.created_at,
          user: profilesMap.get(c.user_id) || null
        }));

        setComments(enrichedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('portfolio_post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          comment: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      toast.success('Comentario agregado');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Error al agregar comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const TikTokComment = ({ comment }: { comment: Comment }) => (
    <div className="flex gap-3 py-3">
      <Avatar className="h-10 w-10 flex-shrink-0 ring-1 ring-white/10">
        <AvatarImage src={comment.user?.avatar_url || undefined} />
        <AvatarFallback className="bg-zinc-700 text-white text-sm">
          {comment.user?.full_name?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white/90 text-sm">
            {comment.user?.full_name || 'Usuario'}
          </span>
          <span className="text-xs text-white/40">
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: false,
              locale: es
            })}
          </span>
        </div>
        <p className="text-white/80 text-sm mt-1 leading-relaxed">{comment.comment}</p>
        <div className="flex items-center gap-4 mt-2">
          <button className="flex items-center gap-1 text-white/40 hover:text-white/60 transition-colors">
            <Heart className="h-4 w-4" />
          </button>
          <button className="text-white/40 hover:text-white/60 text-xs transition-colors">
            Responder
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-t-3xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-center py-3 relative border-b border-white/10">
        <div className="w-10 h-1 bg-white/20 rounded-full absolute top-2" />
        <h3 className="text-white font-semibold text-base mt-2">
          {comments.length} comentarios
        </h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/40">
            <p className="text-sm">Sé el primero en comentar</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {comments.map((comment) => (
              <TikTokComment key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 p-3 pb-safe">
        {user ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-zinc-700 text-white text-xs">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Añade un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full bg-zinc-800 text-white placeholder-white/40 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="text-primary font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        ) : (
          <div className="text-center py-2">
            <p className="text-white/40 text-sm">Inicia sesión para comentar</p>
          </div>
        )}
      </div>
    </div>
  );
}