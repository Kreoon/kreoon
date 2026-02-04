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
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

// Check if URL is a Bunny video
function isBunnyUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('mediadelivery.net') || url.includes('b-cdn.net');
}

// Check if URL is a direct video file
function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.includes('supabase.co/storage');
}

// Build Bunny embed URL with proper parameters
function buildBunnyEmbedUrl(libraryId: string, videoId: string): string {
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false&preload=true&responsive=true&controls=true`;
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

  // Parse Bunny video info
  const bunnyIds = useMemo(
    () => (currentVideoUrl ? extractBunnyIds(currentVideoUrl) : null),
    [currentVideoUrl]
  );
  const bunnyUrls = useMemo(
    () => (currentVideoUrl ? getBunnyVideoUrls(currentVideoUrl) : null),
    [currentVideoUrl]
  );

  // Determine player type
  const isBunny = currentVideoUrl ? isBunnyUrl(currentVideoUrl) : false;
  const canUseIframe = isBunny && !!bunnyIds && /^\d+$/.test(String(bunnyIds.libraryId));
  const embedUrl = canUseIframe ? buildBunnyEmbedUrl(bunnyIds!.libraryId, bunnyIds!.videoId) : null;
  const canUseVideoTag = !!bunnyUrls && (!!bunnyUrls.mp4 || !!bunnyUrls.hls);
  const videoSrc = canUseVideoTag ? (bunnyUrls!.mp4 || bunnyUrls!.hls) : null;
  const canUseDirectUrl = !!currentVideoUrl && isDirectVideoUrl(currentVideoUrl);
  const directVideoSrc = canUseDirectUrl ? currentVideoUrl : null;

  // Check if download is allowed (only when approved/delivered)
  const canDownload = showDownload &&
    ['delivered', 'approved', 'published', 'completed', 'paid'].includes(content.status) &&
    !!currentVideoUrl;

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

  const handleDownload = async () => {
    if (isDownloading || !currentVideoUrl) return;
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bunny-download', {
        body: { content_id: content.id, video_url: currentVideoUrl },
      });
      if (error) throw error;

      const downloadUrl = data?.download_url;
      if (!downloadUrl) {
        toast.error('No se pudo generar el link de descarga');
        return;
      }

      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);

      const blob = await res.blob();
      const safeName = (data?.title || content.title || 'video')
        .toLowerCase().replace(/[^a-z0-9\-_]+/gi, '-').slice(0, 80);

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

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/content/${content.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: content.title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copiado al portapapeles');
      }
    } catch (e) {
      // User cancelled share
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
      toast.success(newValue ? 'Compartido en Kreoon Social' : 'Removido de Kreoon Social');
      onUpdate?.();
    } catch (error) {
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
      toastHook({ title: label, description: 'El contenido ha sido actualizado' });
      setFeedback('');
      setShowFeedback(false);
      onUpdate?.();
    } catch (error) {
      toastHook({ title: 'Error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLike) onLike(content.id);
  };

  const actions = getAvailableActions();

  return (
    <Card className={cn(
      "overflow-hidden group bg-card border-border",
      "hover:border-primary/40 transition-all duration-200 hover:shadow-lg",
      className
    )}>
      {/* Video Player Section - Native Bunny Embed */}
      <div
        className="relative w-full bg-black cursor-pointer"
        style={{ aspectRatio: '9/16' }}
        onClick={onOpenFullscreen}
      >
        {/* Status Badge - Top Left */}
        <div className="absolute top-2 left-2 z-10">
          <Badge className={cn(
            "text-[10px] font-semibold px-2 py-0.5 shadow-lg",
            STATUS_COLORS[content.status as keyof typeof STATUS_COLORS] || 'bg-gray-500'
          )}>
            {STATUS_LABELS[content.status as keyof typeof STATUS_LABELS] || content.status}
          </Badge>
        </div>

        {/* Kreoon Badge - Top Right */}
        {kreoonEnabled && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-2 py-0.5 shadow-lg">
              <Handshake className="h-3 w-3 mr-1" />
              Kreoon
            </Badge>
          </div>
        )}

        {/* Video Player - Smart detection */}
        {embedUrl ? (
          // Use Bunny iframe embed when we have valid numeric libraryId
          <iframe
            key={`embed-${embedUrl}-${currentVariantIndex}`}
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ border: 'none' }}
          />
        ) : (videoSrc || directVideoSrc) ? (
          // Use native video element for CDN URLs or direct files
          <video
            key={videoSrc || directVideoSrc}
            src={videoSrc || directVideoSrc || undefined}
            poster={bunnyUrls?.thumbnail || content.thumbnail_url || undefined}
            className="w-full h-full object-contain"
            controls
            playsInline
            preload="metadata"
          />
        ) : content.thumbnail_url ? (
          <img
            src={content.thumbnail_url}
            alt={content.title}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/40">
            <Video className="h-12 w-12 mb-2" />
            <span className="text-sm">Sin video</span>
          </div>
        )}

        {/* Variant Navigation */}
        {hasMultipleVariants && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentVariantIndex(prev => Math.max(0, prev - 1));
              }}
              disabled={currentVariantIndex === 0}
              className="text-white disabled:opacity-30 p-0.5 hover:bg-white/20 rounded transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-white text-xs font-medium min-w-[40px] text-center">
              {currentVariantIndex + 1} / {videoUrls.length}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentVariantIndex(prev => Math.min(videoUrls.length - 1, prev + 1));
              }}
              disabled={currentVariantIndex === videoUrls.length - 1}
              className="text-white disabled:opacity-30 p-0.5 hover:bg-white/20 rounded transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Info Section - Below Video */}
      <div className="p-3 space-y-3">
        {/* Title / Product Name */}
        <h3 className="font-semibold text-sm line-clamp-2 text-foreground">
          {content.title}
        </h3>

        {/* Creator & Client Info Row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {/* Creator (Who recorded it) */}
          {content.creator && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar className="h-5 w-5 border border-border flex-shrink-0">
                <AvatarImage src={content.creator.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  <User className="h-2.5 w-2.5" />
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{content.creator.full_name || 'Creador'}</span>
            </div>
          )}

          {/* Client/Company (What company it's from) */}
          {content.client && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{content.client.name || 'Cliente'}</span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {formatCount(content.views_count || 0)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {formatCount(content.likes_count || 0)}
          </span>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 pt-1">
          {/* Download Button */}
          {canDownload && (
            <Button
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              disabled={isDownloading}
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Descargar
            </Button>
          )}

          {/* Share Button */}
          <Button
            onClick={(e) => { e.stopPropagation(); handleShare(); }}
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 flex-1"
          >
            <Share2 className="h-3.5 w-3.5" />
            Compartir
          </Button>

          {/* Like Button */}
          {onLike && (
            <Button
              onClick={handleLike}
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 w-8 p-0",
                content.is_liked && "text-red-500"
              )}
            >
              <Heart className="h-4 w-4" fill={content.is_liked ? "currentColor" : "none"} />
            </Button>
          )}

          {/* Comments */}
          <Button
            onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>

          {/* More Options - Admin/Owner only */}
          {(isAdmin || isOwner || isCreator) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Feedback Input for Corrections */}
        {showFeedback && (
          <div className="pt-2 space-y-2">
            <Textarea
              placeholder="Describe las correcciones necesarias..."
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
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ThumbsUp className="h-3.5 w-3.5 mr-1" />}
                Aprobar
              </Button>
              <Button
                onClick={() => handleAction('issue', 'Correcciones')}
                disabled={submitting || !feedback.trim()}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ThumbsDown className="h-3.5 w-3.5 mr-1" />}
                Corrección
              </Button>
            </div>
            <button
              onClick={() => setShowFeedback(false)}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Workflow Action Buttons */}
        {!showFeedback && actions.length > 0 && (
          <div className="flex gap-2 pt-1">
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
                  action.variant === 'success' && "bg-green-600 hover:bg-green-700",
                  action.variant === 'warning' && "bg-amber-500 hover:bg-amber-600"
                )}
                size="sm"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <action.icon className="h-3.5 w-3.5 mr-1" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <ContentSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        contentId={content.id}
        onSuccess={onUpdate}
      />

      {/* Comments Drawer */}
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
