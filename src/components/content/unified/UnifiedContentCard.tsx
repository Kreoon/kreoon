import { useState, memo, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
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
import { ContentSettingsDialog } from '@/components/content/ContentSettingsDialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { CommentsSection } from '@/components/content/CommentsSection';
import { extractBunnyIds, getBunnyVideoUrls } from '@/hooks/useHLSPlayer';
import {
  Download,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  FileCheck,
  AlertTriangle,
  Share2,
  Building2,
  Video,
  Settings,
  Handshake,
  Heart,
  Eye,
  Play,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  showDownload?: boolean;
  showKreoonToggle?: boolean;
  showWorkflowActions?: boolean;
  onUpdate?: () => void;
  onStatusChange?: (id: string, status: ContentStatus, notes?: string) => Promise<void>;
  onOpenFullscreen?: () => void;
  onLike?: (id: string) => void;
  onView?: (id: string) => void;
  className?: string;
}

// Format counts
function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export const UnifiedContentCard = memo(function UnifiedContentCard({
  content,
  userId,
  isAdmin = false,
  isClient = false,
  isCreator = false,
  isOwner = false,
  showDownload = true,
  showKreoonToggle = false,
  showWorkflowActions = true,
  onUpdate,
  onStatusChange,
  onOpenFullscreen,
  onLike,
  onView,
  className
}: UnifiedContentCardProps) {
  const { toast: toastHook } = useToast();
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isTogglingKreoon, setIsTogglingKreoon] = useState(false);
  const [kreoonEnabled, setKreoonEnabled] = useState(content.shared_on_kreoon ?? false);

  // Get all video URLs
  const videoUrls = useMemo(() => {
    const urls: string[] = [];
    if (content.bunny_embed_url) urls.push(content.bunny_embed_url);
    if (content.video_url && !urls.includes(content.video_url)) urls.push(content.video_url);
    if (content.video_urls) {
      content.video_urls.filter(u => u?.trim() && !urls.includes(u)).forEach(u => urls.push(u));
    }
    return urls.filter(u => u?.trim());
  }, [content.bunny_embed_url, content.video_url, content.video_urls]);

  const hasMultipleVariants = videoUrls.length > 1;
  const currentVideoUrl = videoUrls[currentVariantIndex] || videoUrls[0];

  // Parse Bunny video info for direct URLs
  const bunnyUrls = useMemo(
    () => (currentVideoUrl ? getBunnyVideoUrls(currentVideoUrl) : null),
    [currentVideoUrl]
  );

  // Get best video source (prefer MP4 for faster loading)
  const videoSrc = bunnyUrls?.mp4 || bunnyUrls?.hls || currentVideoUrl;
  const thumbnailSrc = bunnyUrls?.thumbnail || content.thumbnail_url;

  // Check if download is allowed (only when approved/delivered)
  const canDownload = showDownload &&
    ['delivered', 'approved', 'published', 'completed', 'paid'].includes(content.status) &&
    !!videoSrc;

  const canManage = isAdmin || isOwner || isCreator;

  // Workflow actions based on status
  const getAvailableActions = useCallback(() => {
    if (!showWorkflowActions) return [];
    const actions: { status: ContentStatus; label: string; icon: any; variant: 'success' | 'warning' }[] = [];

    if (content.status === 'script_pending') {
      actions.push({ status: 'script_approved', label: 'Aprobar Guión', icon: FileCheck, variant: 'success' });
    }
    if (content.status === 'delivered' || content.status === 'review') {
      actions.push({ status: 'approved', label: 'Aprobar', icon: ThumbsUp, variant: 'success' });
      actions.push({ status: 'issue', label: 'Correcciones', icon: AlertTriangle, variant: 'warning' });
    }
    if (content.status === 'corrected') {
      actions.push({ status: 'approved', label: 'Aprobar', icon: ThumbsUp, variant: 'success' });
    }
    return actions;
  }, [content.status, showWorkflowActions]);

  // Direct download using video URL
  const handleDownload = async () => {
    if (isDownloading || !videoSrc) return;
    setIsDownloading(true);

    try {
      // Try direct download first
      const downloadUrl = bunnyUrls?.mp4 || videoSrc;

      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const safeName = (content.title || 'video')
        .toLowerCase().replace(/[^a-z0-9\-_]+/gi, '-').slice(0, 80);

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${safeName}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success('Descarga completada');
    } catch (e) {
      console.error('download error', e);
      // Fallback: open in new tab
      window.open(videoSrc, '_blank');
      toast.info('Abriendo video en nueva pestaña');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/content/${content.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: content.title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copiado');
      }
    } catch (e) {
      // User cancelled
    }
  };

  const handleToggleKreoon = async () => {
    if (isTogglingKreoon) return;
    setIsTogglingKreoon(true);
    const newValue = !kreoonEnabled;
    try {
      const { error } = await supabase.from('content').update({
        shared_on_kreoon: newValue,
        show_on_creator_profile: newValue,
        show_on_client_profile: newValue,
        is_collaborative: newValue,
        shared_at: newValue ? new Date().toISOString() : null
      }).eq('id', content.id);
      if (error) throw error;
      setKreoonEnabled(newValue);
      toast.success(newValue ? 'Compartido en Kreoon' : 'Removido de Kreoon');
      onUpdate?.();
    } catch (error) {
      toast.error('Error');
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
        if (status === 'approved') updateData.approved_by = userId;
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
      toastHook({ title: label, description: 'Contenido actualizado' });
      setFeedback('');
      setShowFeedback(false);
      onUpdate?.();
    } catch (error) {
      toastHook({ title: 'Error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const actions = getAvailableActions();

  return (
    <Card className={cn(
      "overflow-hidden bg-card border-border rounded-xl",
      "hover:shadow-xl transition-all duration-300",
      className
    )}>
      {/* Video Section */}
      <div className="relative w-full bg-black" style={{ aspectRatio: '9/16' }}>
        {/* Top Bar - Status + Settings */}
        <div className="absolute top-0 left-0 right-0 z-20 p-2 flex items-start justify-between">
          <Badge className={cn(
            "text-[10px] font-semibold px-2 py-0.5 shadow-md",
            STATUS_COLORS[content.status as keyof typeof STATUS_COLORS] || 'bg-gray-500'
          )}>
            {STATUS_LABELS[content.status as keyof typeof STATUS_LABELS] || content.status}
          </Badge>

          <div className="flex items-center gap-1">
            {kreoonEnabled && (
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-2 py-0.5 shadow-md">
                <Handshake className="h-3 w-3" />
              </Badge>
            )}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-7 w-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowComments(true)}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Comentarios
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Video Player or Thumbnail */}
        {isPlaying && videoSrc ? (
          <video
            key={videoSrc}
            src={videoSrc}
            className="absolute inset-0 w-full h-full object-contain"
            controls
            autoPlay
            playsInline
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div
            className="absolute inset-0 cursor-pointer group/play"
            onClick={() => videoSrc ? setIsPlaying(true) : onOpenFullscreen?.()}
          >
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt={content.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center">
                <Video className="h-16 w-16 text-gray-600" />
              </div>
            )}

            {/* Play Button Overlay */}
            {videoSrc && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/play:bg-black/40 transition-colors">
                <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover/play:scale-110 transition-transform">
                  <Play className="h-8 w-8 text-gray-900 ml-1" fill="currentColor" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Variant Navigation */}
        {hasMultipleVariants && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentVariantIndex(prev => Math.max(0, prev - 1));
                setIsPlaying(false);
              }}
              disabled={currentVariantIndex === 0}
              className="text-white disabled:opacity-30 p-0.5 hover:bg-white/20 rounded"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-white text-xs font-medium min-w-[40px] text-center">
              {currentVariantIndex + 1}/{videoUrls.length}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentVariantIndex(prev => Math.min(videoUrls.length - 1, prev + 1));
                setIsPlaying(false);
              }}
              disabled={currentVariantIndex === videoUrls.length - 1}
              className="text-white disabled:opacity-30 p-0.5 hover:bg-white/20 rounded"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3 space-y-2.5">
        {/* Title */}
        <h3 className="font-semibold text-sm line-clamp-2 text-foreground leading-tight">
          {content.title}
        </h3>

        {/* Creator & Client */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {content.creator && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Avatar className="h-5 w-5 border border-border flex-shrink-0">
                  <AvatarImage src={content.creator.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    <User className="h-2.5 w-2.5" />
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[80px]">{content.creator.full_name || 'Creador'}</span>
              </div>
            )}
            {content.client && (
              <div className="flex items-center gap-1 min-w-0">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate max-w-[80px]">{content.client.name}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-[11px] flex-shrink-0">
            <span className="flex items-center gap-0.5">
              <Eye className="h-3 w-3" />
              {formatCount(content.views_count || 0)}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart className="h-3 w-3" />
              {formatCount(content.likes_count || 0)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {canDownload ? (
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              size="sm"
              className="flex-1 h-9 text-xs gap-1.5"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Descargar
            </Button>
          ) : (
            <Button
              onClick={handleShare}
              size="sm"
              className="flex-1 h-9 text-xs gap-1.5"
            >
              <Share2 className="h-4 w-4" />
              Compartir
            </Button>
          )}

          {canDownload && (
            <Button
              onClick={handleShare}
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}

          {onLike && (
            <Button
              onClick={(e) => { e.stopPropagation(); onLike(content.id); }}
              size="sm"
              variant="outline"
              className={cn("h-9 w-9 p-0", content.is_liked && "text-red-500 border-red-500/50")}
            >
              <Heart className="h-4 w-4" fill={content.is_liked ? "currentColor" : "none"} />
            </Button>
          )}

          {!canManage && (
            <Button
              onClick={() => setShowComments(true)}
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Feedback for Corrections */}
        {showFeedback && (
          <div className="space-y-2 pt-2 border-t">
            <Textarea
              placeholder="Describe las correcciones..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleAction('approved', 'Aprobado')}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
              </Button>
              <Button
                onClick={() => handleAction('issue', 'Correcciones')}
                disabled={submitting || !feedback.trim()}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
              </Button>
              <Button
                onClick={() => setShowFeedback(false)}
                variant="ghost"
                size="sm"
                className="px-3"
              >
                X
              </Button>
            </div>
          </div>
        )}

        {/* Workflow Actions */}
        {!showFeedback && actions.length > 0 && (
          <div className="flex gap-2 pt-2 border-t">
            {actions.map(action => (
              <Button
                key={action.status}
                onClick={() => action.status === 'issue' ? setShowFeedback(true) : handleAction(action.status, action.label)}
                disabled={submitting}
                className={cn(
                  "flex-1 h-9",
                  action.variant === 'success' && "bg-green-600 hover:bg-green-700",
                  action.variant === 'warning' && "bg-amber-500 hover:bg-amber-600"
                )}
                size="sm"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <action.icon className="h-4 w-4 mr-1.5" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ContentSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        contentId={content.id}
        onSuccess={onUpdate}
      />

      <Drawer open={showComments} onOpenChange={setShowComments}>
        <DrawerContent className="h-[70vh] bg-background border-t">
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
