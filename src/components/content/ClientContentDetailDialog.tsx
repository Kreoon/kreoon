import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AutoPauseVideo } from "@/components/content/AutoPauseVideo";
import { RichTextViewer } from "@/components/ui/rich-text-editor";
import { Content, STATUS_LABELS, STATUS_COLORS, ContentStatus, ContentComment } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Calendar, Video, Clock, CheckCircle, MessageSquare, Send, 
  Package, Target, Download, Loader2, ThumbsUp, AlertTriangle,
  Play, Eye, FileText, X
} from "lucide-react";

// Download Video Button Component
function DownloadVideoButton({ contentId, videoUrl, variantIndex, title }: {
  contentId: string;
  videoUrl: string;
  variantIndex: number;
  title: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Debes iniciar sesión", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke('bunny-download', {
        body: { content_id: contentId, video_url: videoUrl }
      });

      if (error) throw error;

      if (data.download_url) {
        const link = document.createElement('a');
        link.href = data.download_url;
        link.download = `${title}_variable_${variantIndex + 1}.mp4`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: "Descarga iniciada", description: "El video se está descargando" });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({ 
        title: "Error al descargar", 
        description: error instanceof Error ? error.message : "No se pudo descargar el video",
        variant: "destructive" 
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleDownload}
      disabled={downloading}
      className="gap-2"
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Descargar
    </Button>
  );
}

interface ClientContentDetailDialogProps {
  content: Content | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ClientContentDetailDialog({ content, open, onOpenChange, onUpdate }: ClientContentDetailDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ContentStatus | null>(null);
  const [comments, setComments] = useState<(ContentComment & { profile?: { full_name: string } })[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [productName, setProductName] = useState<string | null>(null);

  const videoUrls = (content as any)?.video_urls || [];
  const hooksCount = (content as any)?.hooks_count || Math.max(videoUrls.length, 1);

  useEffect(() => {
    if (content) {
      setCurrentStatus(content.status);
      fetchComments();
      if (content.product_id) {
        fetchProduct(content.product_id);
      }
    }
  }, [content]);

  const fetchProduct = async (productId: string) => {
    const { data } = await supabase
      .from('products')
      .select('name')
      .eq('id', productId)
      .maybeSingle();
    setProductName(data?.name || null);
  };

  const fetchComments = async () => {
    if (!content) return;
    const { data: commentsData } = await supabase
      .from('content_comments')
      .select('*')
      .eq('content_id', content.id)
      .order('created_at', { ascending: false });
    
    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      const commentsWithProfiles = commentsData.map(c => ({
        ...c,
        profile: { full_name: profileMap.get(c.user_id) || 'Usuario' }
      }));
      setComments(commentsWithProfiles);
    } else {
      setComments([]);
    }
  };

  const handleAddComment = async () => {
    if (!content || !newComment.trim() || !user) return;
    setLoadingComment(true);
    try {
      const { error } = await supabase
        .from('content_comments')
        .insert({
          content_id: content.id,
          user_id: user.id,
          comment: newComment.trim()
        });
      if (error) throw error;
      setNewComment("");
      fetchComments();
      toast({ title: "Comentario agregado" });
    } catch (error) {
      toast({ title: "Error al agregar comentario", variant: "destructive" });
    } finally {
      setLoadingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: ContentStatus) => {
    if (!content) return;
    setLoading(true);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'approved') {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = user?.id;
      }
      
      const { error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', content.id);
      if (error) throw error;
      setCurrentStatus(newStatus);
      toast({ title: "Estado actualizado", description: `Nuevo estado: ${STATUS_LABELS[newStatus]}` });
      onUpdate?.();
    } catch (error) {
      toast({ title: "Error al actualizar estado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es });
  };

  if (!content) return null;

  const canApprove = currentStatus === 'delivered' || currentStatus === 'corrected';
  const canReportIssue = currentStatus === 'delivered' || currentStatus === 'corrected';
  const canDownload = ['approved', 'paid', 'delivered', 'corrected'].includes(currentStatus || '');
  const currentVideoUrl = videoUrls[selectedVideoIndex] || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-4xl max-h-[95vh] overflow-hidden p-0 gap-0">
        {/* Hero Section */}
        <div className="relative">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
          
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Video Hero */}
          <div className="relative pt-8 pb-6 px-6">
            {/* Main Video Display */}
            {currentVideoUrl ? (
              <div className="relative mx-auto" style={{ maxWidth: '320px' }}>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <AutoPauseVideo
                    src={currentVideoUrl}
                    index={selectedVideoIndex}
                    className="w-full bg-black"
                    style={{ aspectRatio: '9/16' }}
                  />
                  
                  {/* Video overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Play indicator */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                    <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </div>
                  </div>
                </div>

                {/* Video variant selector */}
                {videoUrls.length > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    {videoUrls.map((url: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedVideoIndex(idx)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          idx === selectedVideoIndex 
                            ? 'bg-primary scale-125' 
                            : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        }`}
                        title={`Variable ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="mx-auto rounded-2xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center bg-muted/50 backdrop-blur-sm"
                style={{ maxWidth: '320px', aspectRatio: '9/16' }}
              >
                <Video className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-lg">Video pendiente</p>
                <p className="text-muted-foreground/70 text-sm mt-1">En proceso de edición</p>
              </div>
            )}
          </div>
        </div>

        {/* Content Info */}
        <ScrollArea className="flex-1 max-h-[calc(95vh-500px)]">
          <div className="px-6 py-6 space-y-6">
            {/* Title and Status */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <h2 className="text-2xl font-bold tracking-tight">{content.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {content.client?.name && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        {content.client.name}
                      </span>
                    )}
                    {productName && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" />
                          {productName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Badge className={`shrink-0 text-sm px-3 py-1.5 ${STATUS_COLORS[currentStatus || content.status]}`}>
                  {STATUS_LABELS[currentStatus || content.status]}
                </Badge>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-3">
                {content.campaign_week && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                    <Calendar className="h-3.5 w-3.5" />
                    {content.campaign_week}
                  </div>
                )}
                {content.deadline && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                    <Clock className="h-3.5 w-3.5" />
                    Entrega: {formatDate(content.deadline)}
                  </div>
                )}
                {videoUrls.length > 1 && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                    <Video className="h-3.5 w-3.5" />
                    {videoUrls.length} variables
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Only show for delivered/corrected status */}
            {(canApprove || canReportIssue || canDownload) && (
              <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border">
                {canApprove && (
                  <Button
                    onClick={() => handleStatusChange('approved')}
                    disabled={loading}
                    className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Aprobar Contenido
                  </Button>
                )}
                {canReportIssue && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange('issue')}
                    disabled={loading}
                    className="gap-2 border-warning text-warning hover:bg-warning/10"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Reportar Novedad
                  </Button>
                )}
                {canDownload && currentVideoUrl && (
                  <DownloadVideoButton
                    contentId={content.id}
                    videoUrl={currentVideoUrl}
                    variantIndex={selectedVideoIndex}
                    title={content.title}
                  />
                )}
              </div>
            )}

            {/* Script Section */}
            {content.script && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Guión
                  {content.script_approved_at && (
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20 ml-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aprobado
                    </Badge>
                  )}
                </h3>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <RichTextViewer 
                    content={content.script} 
                    className="max-h-[200px] overflow-y-auto"
                  />
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Comentarios
                {comments.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({comments.length})
                  </span>
                )}
              </h3>
              
              {/* Add comment */}
              <div className="flex gap-3">
                <Textarea 
                  placeholder="Escribe un comentario o detalla cualquier novedad..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 min-h-[80px] resize-none"
                />
                <Button 
                  onClick={handleAddComment} 
                  disabled={loadingComment || !newComment.trim()}
                  size="icon"
                  className="shrink-0 h-10 w-10"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Comments list */}
              <div className="space-y-3">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div 
                      key={comment.id} 
                      className="p-4 bg-muted/50 rounded-lg border border-border/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{comment.profile?.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "d MMM, HH:mm", { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90">{comment.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay comentarios aún</p>
                    <p className="text-xs mt-1">Agrega un comentario para comunicarte con el equipo</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
