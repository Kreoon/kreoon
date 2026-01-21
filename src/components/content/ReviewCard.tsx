import { useState, useRef } from 'react';
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  Play, 
  Pause,
  Volume2, 
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Loader2,
  Video as VideoIcon,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Convert Bunny CDN URLs to embeddable iframe URLs (same pattern as TikTokFeed/Portfolio)
function getEmbedUrl(url: string, muted: boolean): string {
  if (!url) return '';
  
  // Already an embed URL
  if (url.includes('iframe.mediadelivery.net')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=false&muted=${muted}&loop=true&preload=true`;
  }
  
  // Convert CDN URL to embed URL
  const cdnMatch = url.match(/vz-(\d+)\.b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) {
    const [, libraryId, videoId] = cdnMatch;
    return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false&muted=${muted}&loop=true&preload=true`;
  }
  
  // Return original URL if not a Bunny URL
  return url;
}

// Check if URL is a Bunny video URL that should use iframe
function isBunnyUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('iframe.mediadelivery.net') || url.includes('b-cdn.net');
}

interface ReviewCardProps {
  content: Content;
  onApprove?: () => void;
  onReject?: () => void;
  onUpdate?: () => void;
  userId?: string;
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  profile?: { full_name: string; avatar_url?: string };
}

export function ReviewCard({ content, onApprove, onReject, onUpdate, userId }: ReviewCardProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');

  const videoUrls = (content as any).video_urls || [];
  const hasMultipleVariants = videoUrls.length > 1;
  const currentVideoUrl = videoUrls[currentVariantIndex] || (content as any).video_url || (content as any).bunny_embed_url;
  
  // Use iframe embed for Bunny videos (same as portfolio)
  const shouldUseEmbed = isBunnyUrl(currentVideoUrl);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data: commentsData } = await supabase
        .from('content_comments')
        .select('*')
        .eq('content_id', content.id)
        .order('created_at', { ascending: false });

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []);
        setComments(commentsData.map(c => ({
          ...c,
          profile: profileMap.get(c.user_id) || { full_name: 'Usuario' }
        })));
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
    setShowFeedback(false);
  };

  const handleAddComment = async () => {
    if (!userId || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('content_comments')
        .insert({
          content_id: content.id,
          user_id: userId,
          comment: newComment.trim()
        });
      if (error) throw error;
      setNewComment('');
      fetchComments();
      toast({ title: 'Comentario agregado' });
    } catch (error) {
      toast({ title: 'Error al agregar comentario', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      // Use centralized UP-aware status change
      const { updateContentStatusWithUP } = await import('@/hooks/useContentStatusWithUP');
      await updateContentStatusWithUP({
        contentId: content.id,
        oldStatus: content.status as ContentStatus,
        newStatus: 'approved'
      });
      
      // Update approved_by separately (UP handler doesn't set this)
      await supabase
        .from('content')
        .update({ approved_by: userId })
        .eq('id', content.id);

      if (feedback) {
        await supabase
          .from('content_comments')
          .insert({
            content_id: content.id,
            user_id: userId,
            comment: `Aprobado: ${feedback}`
          });
      }

      toast({ title: 'Contenido aprobado' });
      setFeedback('');
      setShowFeedback(false);
      onApprove?.();
      onUpdate?.();
    } catch (error) {
      console.error('Error approving content:', error);
      toast({ title: 'Error al aprobar', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!userId || !feedback.trim()) {
      toast({ title: 'Escribe las correcciones necesarias', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // Use centralized UP-aware status change (delivered -> issue triggers penalty)
      const { updateContentStatusWithUP } = await import('@/hooks/useContentStatusWithUP');
      await updateContentStatusWithUP({
        contentId: content.id,
        oldStatus: content.status as ContentStatus,
        newStatus: 'issue'
      });

      await supabase
        .from('content_comments')
        .insert({
          content_id: content.id,
          user_id: userId,
          comment: `Correcciones: ${feedback}`
        });

      toast({ title: 'Enviado a corrección' });
      setFeedback('');
      setShowFeedback(false);
      onReject?.();
      onUpdate?.();
    } catch (error) {
      console.error('Error rejecting content:', error);
      toast({ title: 'Error al enviar corrección', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Video Section */}
        <div className="relative aspect-[9/16] max-h-[500px] bg-black">
          {shouldUseEmbed && currentVideoUrl ? (
            // Use Bunny embed iframe for CDN videos (same style as portfolio)
            <>
              <iframe
                src={getEmbedUrl(currentVideoUrl, muted)}
                className="w-full h-full border-0"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
              
              {/* Volume toggle for iframe */}
              <button
                onClick={() => setMuted(!muted)}
                className="absolute top-16 right-3 z-30 p-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </>
          ) : currentVideoUrl ? (
            <>
              <video
                ref={videoRef}
                src={currentVideoUrl}
                loop
                muted={muted}
                playsInline
                className="w-full h-full object-contain"
                onClick={togglePlayPause}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
              
              {/* Play/Pause overlay */}
              {!playing && (
                <div 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  onClick={togglePlayPause}
                >
                  <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="h-8 w-8 text-white fill-white ml-1" />
                  </div>
                </div>
              )}
            </>
          ) : content.thumbnail_url ? (
            <img 
              src={content.thumbnail_url} 
              alt={content.title}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/50">
              <VideoIcon className="h-12 w-12 mb-2" />
              <span>Sin video</span>
            </div>
          )}

          {/* Top gradient */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          
          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

          {/* Status badge */}
          <div className="absolute top-3 left-3">
            <Badge className={cn("text-xs", STATUS_COLORS[content.status])}>
              {STATUS_LABELS[content.status]}
            </Badge>
          </div>

          {/* Variant selector */}
          {hasMultipleVariants && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
              <button
                onClick={() => setCurrentVariantIndex(prev => Math.max(0, prev - 1))}
                disabled={currentVariantIndex === 0}
                className="text-white disabled:opacity-30 p-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white text-xs font-medium px-1">
                {currentVariantIndex + 1}/{videoUrls.length}
              </span>
              <button
                onClick={() => setCurrentVariantIndex(prev => Math.min(videoUrls.length - 1, prev + 1))}
                disabled={currentVariantIndex === videoUrls.length - 1}
                className="text-white disabled:opacity-30 p-1"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Video controls */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            {/* Info */}
            <div className="flex-1 min-w-0 mr-3">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-6 w-6 border border-white/30">
                  <AvatarImage src={(content as any).creator?.avatar_url} />
                  <AvatarFallback className="bg-white/20 text-white text-xs">
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-white text-sm font-medium truncate">
                  {(content as any).creator?.full_name || 'Sin creador'}
                </span>
              </div>
              <p className="text-white text-sm font-medium line-clamp-2">{content.title}</p>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setMuted(!muted)}
                className="p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                onClick={handleToggleComments}
                className={cn(
                  "p-2 rounded-full backdrop-blur-sm text-white transition-colors",
                  showComments ? "bg-primary" : "bg-black/40 hover:bg-black/60"
                )}
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="border-t bg-muted/30 max-h-48 overflow-y-auto">
            <div className="p-3 space-y-2">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Escribe un comentario..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                  rows={2}
                />
                <Button
                  size="icon"
                  onClick={handleAddComment}
                  disabled={submitting || !newComment.trim()}
                  className="shrink-0"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              
              {loadingComments ? (
                <div className="text-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-2">
                  {comments.slice(0, 3).map((comment) => (
                    <div key={comment.id} className="flex gap-2 text-sm">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-xs">{comment.profile?.full_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), "d MMM", { locale: es })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{comments.length - 3} comentarios más
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">Sin comentarios</p>
              )}
            </div>
          </div>
        )}

        {/* Feedback input */}
        {showFeedback && (
          <div className="border-t p-3 bg-muted/30">
            <Textarea
              placeholder="Describe las correcciones necesarias..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[80px] text-sm resize-none mb-2"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={submitting}
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                size="sm"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ThumbsUp className="h-4 w-4 mr-1" />}
                Aprobar
              </Button>
              <Button
                onClick={handleReject}
                disabled={submitting || !feedback.trim()}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ThumbsDown className="h-4 w-4 mr-1" />}
                Corrección
              </Button>
            </div>
            <button
              onClick={() => setShowFeedback(false)}
              className="w-full text-xs text-muted-foreground mt-2 hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Action buttons - Only show if feedback panel is hidden */}
        {!showFeedback && (
          <div className="border-t p-3 flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={submitting}
              className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
              size="sm"
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              Aprobar
            </Button>
            <Button
              onClick={() => setShowFeedback(true)}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <ThumbsDown className="h-4 w-4 mr-1" />
              Corrección
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
