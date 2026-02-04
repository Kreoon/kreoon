import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';
import { updateContentStatusWithUP } from '@/hooks/useContentStatusWithUP';
import { ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { SocialStyleVideoPlayer } from '@/components/video/SocialStyleVideoPlayer';
import { ContentSettingsDialog } from '@/components/content/ContentSettingsDialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { CommentsSection } from '@/components/content/CommentsSection';
import {
  Play,
  Heart,
  Eye,
  Download,
  MessageCircle,
  Share2,
  ChevronLeft,
  ChevronRight,
  User,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  FileCheck,
  AlertTriangle,
  Settings,
  MoreVertical,
  ExternalLink,
  Handshake,
  Check,
  X,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface UnifiedContentItem {
  id: string;
  title: string;
  description?: string | null;
  script?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  video_urls?: string[] | null;
  bunny_embed_url?: string | null;
  status: string;
  is_published?: boolean;
  views_count?: number;
  likes_count?: number;
  shared_on_kreoon?: boolean;
  is_collaborative?: boolean;
  deadline?: string | null;
  created_at?: string;
  creator_id?: string | null;
  client_id?: string | null;
  creator?: { full_name?: string; avatar_url?: string | null } | null;
  client?: { name?: string; logo_url?: string | null } | null;
  is_liked?: boolean;
}

interface UnifiedContentCardProps {
  content: UnifiedContentItem;
  userId?: string;
  isAdmin?: boolean;
  isClient?: boolean;
  isCreator?: boolean;
  isOwner?: boolean;
  showRatings?: boolean;
  showDownload?: boolean;
  showKreoonToggle?: boolean;
  showWorkflowActions?: boolean;
  showPublishToggle?: boolean;
  onUpdate?: () => void;
  onStatusChange?: (id: string, status: ContentStatus, notes?: string) => Promise<void>;
  onOpenFullscreen?: () => void;
  onLike?: (id: string) => void;
  onView?: (id: string) => void;
  className?: string;
}

// Lazy loaded image with intersection observer
const LazyThumbnail = memo(function LazyThumbnail({
  src,
  alt,
  className
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={cn("relative w-full h-full bg-muted", className)}>
      {inView && src && (
        <img
          src={src}
          alt={alt}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
      )}
      {(!loaded || !src) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="h-8 w-8 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
});

export const UnifiedContentCard = memo(function UnifiedContentCard({
  content,
  userId,
  isAdmin = false,
  isClient = false,
  isCreator = false,
  isOwner = false,
  showRatings = false,
  showDownload = true,
  showKreoonToggle = false,
  showWorkflowActions = true,
  showPublishToggle = false,
  onUpdate,
  onStatusChange,
  onOpenFullscreen,
  onLike,
  onView,
  className
}: UnifiedContentCardProps) {
  const { toast: toastHook } = useToast();
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isTogglingKreoon, setIsTogglingKreoon] = useState(false);
  const [kreoonEnabled, setKreoonEnabled] = useState(content.shared_on_kreoon ?? false);

  // Get all video URLs
  const videoUrls = content.video_urls?.filter(u => u?.trim()) || [];
  if (content.video_url && !videoUrls.includes(content.video_url)) {
    videoUrls.unshift(content.video_url);
  }
  if (content.bunny_embed_url && !videoUrls.includes(content.bunny_embed_url)) {
    videoUrls.push(content.bunny_embed_url);
  }

  const hasMultipleVariants = videoUrls.length > 1;
  const currentVideoUrl = videoUrls[currentVariantIndex] || videoUrls[0];
  const hasVideo = currentVideoUrl || content.thumbnail_url;

  // Check if download is allowed (only when approved/delivered)
  const canDownload = showDownload &&
    ['delivered', 'approved', 'published', 'completed', 'paid'].includes(content.status) &&
    !!currentVideoUrl;

  // Workflow actions based on status
  const getAvailableActions = useCallback(() => {
    if (!showWorkflowActions) return [];
    const actions: { status: ContentStatus; label: string; icon: any; variant: 'success' | 'warning' | 'default' }[] = [];

    if (content.status === 'script_pending') {
      actions.push({
        status: 'script_approved',
        label: 'Aprobar Guión',
        icon: FileCheck,
        variant: 'success'
      });
    }

    if (content.status === 'delivered' || content.status === 'review') {
      actions.push({
        status: 'approved',
        label: 'Aprobar',
        icon: ThumbsUp,
        variant: 'success'
      });
      actions.push({
        status: 'issue',
        label: 'Correcciones',
        icon: AlertTriangle,
        variant: 'warning'
      });
    }

    if (content.status === 'corrected') {
      actions.push({
        status: 'approved',
        label: 'Aprobar',
        icon: ThumbsUp,
        variant: 'success'
      });
    }

    return actions;
  }, [content.status, showWorkflowActions]);

  const handleDownload = async () => {
    if (isDownloading || !currentVideoUrl) return;

    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bunny-download', {
        body: {
          content_id: content.id,
          video_url: currentVideoUrl,
        },
      });

      if (error) throw error;
      const downloadUrl = data?.download_url;
      const title = data?.title;

      if (!downloadUrl) {
        toast.error('No se pudo generar el link de descarga');
        return;
      }

      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error('El archivo no está disponible para descarga');
      }

      const blob = await res.blob();
      const safeName = (title || content.title || 'video')
        .toLowerCase()
        .replace(/[^a-z0-9\-_]+/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${safeName || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      toast.success('Descarga iniciada');
    } catch (e) {
      console.error('download error', e);
      toast.error('Error al descargar');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleToggleKreoon = async () => {
    if (isTogglingKreoon) return;

    setIsTogglingKreoon(true);
    const newValue = !kreoonEnabled;

    try {
      const { error } = await supabase
        .from('content')
        .update({
          shared_on_kreoon: newValue,
          show_on_creator_profile: newValue,
          show_on_client_profile: newValue,
          is_collaborative: newValue,
          shared_at: newValue ? new Date().toISOString() : null
        })
        .eq('id', content.id);

      if (error) throw error;

      setKreoonEnabled(newValue);
      toast.success(newValue ? 'Compartido en Kreoon Social' : 'Removido de Kreoon Social');
      onUpdate?.();
    } catch (error) {
      console.error('Error toggling Kreoon:', error);
      toast.error('Error al cambiar estado');
    } finally {
      setIsTogglingKreoon(false);
    }
  };

  const handleAction = async (status: ContentStatus, label: string) => {
    if (!userId) return;
    setSubmitting(true);
    try {
      if (onStatusChange) {
        await onStatusChange(content.id, status, feedback || undefined);
      } else {
        await updateContentStatusWithUP({
          contentId: content.id,
          oldStatus: content.status as ContentStatus,
          newStatus: status
        });

        const updateData: any = {};
        if (status === 'approved') {
          updateData.approved_by = userId;
        }
        if (status === 'script_approved') {
          updateData.script_approved_at = new Date().toISOString();
          updateData.script_approved_by = userId;
        }

        if (Object.keys(updateData).length > 0) {
          await supabase.from('content').update(updateData).eq('id', content.id);
        }
      }

      if (feedback) {
        await supabase.from('content_comments').insert({
          content_id: content.id,
          user_id: userId,
          comment: `${label}: ${feedback}`
        });
      }

      toastHook({ title: label, description: 'El contenido ha sido actualizado' });
      setFeedback('');
      setShowFeedback(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating content status:', error);
      toastHook({ title: 'Error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = () => {
    if (onLike) {
      onLike(content.id);
    }
  };

  const actions = getAvailableActions();

  return (
    <Card className={cn("overflow-hidden group", className)}>
      <CardContent className="p-0">
        {/* Video/Thumbnail Section */}
        <div
          className="relative w-full bg-black cursor-pointer"
          style={{ aspectRatio: '9/16', maxHeight: '500px' }}
          onClick={onOpenFullscreen}
        >
          {currentVideoUrl ? (
            <SocialStyleVideoPlayer
              src={currentVideoUrl}
              poster={content.thumbnail_url || undefined}
              showControls={true}
              autoPlay={false}
            />
          ) : (
            <LazyThumbnail
              src={content.thumbnail_url}
              alt={content.title}
            />
          )}

          {/* Status badge */}
          <div className="absolute top-3 left-3 z-10">
            <Badge className={cn("text-xs font-medium", STATUS_COLORS[content.status as keyof typeof STATUS_COLORS] || 'bg-gray-500')}>
              {STATUS_LABELS[content.status as keyof typeof STATUS_LABELS] || content.status}
            </Badge>
          </div>

          {/* Kreoon Social badge */}
          {kreoonEnabled && (
            <div className="absolute top-3 right-3 z-10">
              <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1">
                <Handshake className="h-3 w-3" />
                Kreoon
              </Badge>
            </div>
          )}

          {/* Variant selector */}
          {hasMultipleVariants && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentVariantIndex(prev => Math.max(0, prev - 1));
                }}
                disabled={currentVariantIndex === 0}
                className="text-white disabled:opacity-30 p-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white text-xs font-medium px-1">
                {currentVariantIndex + 1}/{videoUrls.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentVariantIndex(prev => Math.min(videoUrls.length - 1, prev + 1));
                }}
                disabled={currentVariantIndex === videoUrls.length - 1}
                className="text-white disabled:opacity-30 p-1"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="p-3 space-y-2">
          {/* Creator & Title */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-5 w-5 border border-border">
                  <AvatarImage src={content.creator?.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {content.creator?.full_name || 'Sin creador'}
                </span>
              </div>
              <p className="text-sm font-medium line-clamp-2">{content.title}</p>
              {content.client?.name && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Para: {content.client.name}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {canDownload && (
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    "bg-primary/10 text-primary hover:bg-primary/20",
                    isDownloading && "opacity-60 cursor-not-allowed"
                  )}
                  title="Descargar video"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
              )}

              {onLike && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleLike(); }}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    content.is_liked
                      ? "bg-red-500/10 text-red-500"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  <Heart className="h-4 w-4" fill={content.is_liked ? "currentColor" : "none"} />
                </button>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
                className="p-2 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
              </button>

              {/* Settings menu for owners/admins */}
              {(isAdmin || isOwner || isCreator) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setShowSettings(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Configuración
                    </DropdownMenuItem>

                    {showKreoonToggle && (
                      <DropdownMenuItem onClick={handleToggleKreoon} disabled={isTogglingKreoon}>
                        <Handshake className="h-4 w-4 mr-2" />
                        {kreoonEnabled ? 'Quitar de Kreoon' : 'Compartir en Kreoon'}
                      </DropdownMenuItem>
                    )}

                    {currentVideoUrl && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <a href={currentVideoUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver video original
                          </a>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Stats row */}
          {(content.views_count !== undefined || content.likes_count !== undefined) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {content.views_count !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {content.views_count >= 1000
                    ? `${(content.views_count / 1000).toFixed(1)}K`
                    : content.views_count}
                </span>
              )}
              {content.likes_count !== undefined && (
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {content.likes_count >= 1000
                    ? `${(content.likes_count / 1000).toFixed(1)}K`
                    : content.likes_count}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Feedback input for corrections */}
        {showFeedback && (
          <div className="border-t p-3 bg-muted/30">
            <Textarea
              placeholder="Describe las correcciones necesarias..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[60px] text-sm resize-none mb-2"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleAction('approved', 'Aprobado')}
                disabled={submitting}
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                size="sm"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ThumbsUp className="h-4 w-4 mr-1" />}
                Aprobar
              </Button>
              <Button
                onClick={() => handleAction('issue', 'Correcciones')}
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

        {/* Action buttons - Only show if there are available actions and feedback is hidden */}
        {!showFeedback && actions.length > 0 && (
          <div className="border-t p-3 flex gap-2">
            {actions.map(action => (
              <Button
                key={action.status}
                onClick={() => {
                  if (action.status === 'issue') {
                    setShowFeedback(true);
                  } else {
                    handleAction(action.status, action.label);
                  }
                }}
                disabled={submitting}
                className={cn(
                  "flex-1",
                  action.variant === 'success' && "bg-success hover:bg-success/90 text-success-foreground",
                  action.variant === 'warning' && "bg-warning hover:bg-warning/90 text-warning-foreground"
                )}
                size="sm"
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <action.icon className="h-4 w-4 mr-1" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>

      {/* Settings Dialog */}
      <ContentSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        contentId={content.id}
        onSuccess={onUpdate}
      />

      {/* Comments Drawer */}
      <Drawer open={showComments} onOpenChange={setShowComments}>
        <DrawerContent className="h-[70vh] bg-zinc-900 border-none">
          <CommentsSection
            contentId={content.id}
            isOpen={showComments}
            onClose={() => setShowComments(false)}
          />
        </DrawerContent>
      </Drawer>
    </Card>
  );
});
