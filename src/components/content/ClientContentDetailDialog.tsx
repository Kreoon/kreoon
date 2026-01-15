import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AutoPauseVideo } from "@/components/content/AutoPauseVideo";
import { RichTextViewer } from "@/components/ui/rich-text-editor";
import { ScriptViewer } from "@/components/content/ScriptViewer";
import { StarRatingInput } from "@/components/ui/star-rating-input";
import { Content, STATUS_LABELS, STATUS_COLORS, ContentStatus, ContentComment } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Calendar, Video, Clock, CheckCircle, MessageSquare, Send, 
  Package, Target, Download, Loader2, ThumbsUp, AlertTriangle,
  FileText, X, User, Star
} from "lucide-react";

// Download Video Button Component
function DownloadVideoButton({ contentId, videoUrl, variantIndex, title, fullWidth = false }: {
  contentId: string;
  videoUrl: string;
  variantIndex: number;
  title: string;
  fullWidth?: boolean;
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
      className={`gap-2 ${fullWidth ? 'w-full' : ''}`}
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
  const [comments, setComments] = useState<(ContentComment & { profile?: { full_name: string; avatar_url?: string } })[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [productName, setProductName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'videos' | 'script' | 'comments'>('videos');
  
  // Star rating state for approval
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [creatorRating, setCreatorRating] = useState(0);
  const [editorRating, setEditorRating] = useState(0);

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
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []);
      const commentsWithProfiles = commentsData.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id) || { full_name: 'Usuario' }
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

  const handleApproveClick = () => {
    // Show rating dialog instead of immediately approving
    setShowRatingDialog(true);
  };

  const handleConfirmApproval = async () => {
    if (!content) return;
    setLoading(true);
    try {
      const updates: any = { 
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      };
      
      // Add ratings if provided
      if (creatorRating > 0 && content.creator_id) {
        updates.creator_rating = creatorRating;
        updates.creator_rated_at = new Date().toISOString();
        updates.creator_rated_by = user?.id;
      }
      if (editorRating > 0 && content.editor_id) {
        updates.editor_rating = editorRating;
        updates.editor_rated_at = new Date().toISOString();
        updates.editor_rated_by = user?.id;
      }
      
      const { error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', content.id);
      if (error) throw error;
      
      setCurrentStatus('approved');
      setShowRatingDialog(false);
      setCreatorRating(0);
      setEditorRating(0);
      toast({ title: "¡Contenido aprobado!", description: "Gracias por tu calificación" });
      onUpdate?.();
    } catch (error) {
      toast({ title: "Error al aprobar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: ContentStatus) => {
    if (!content) return;
    
    // For approval, use the rating dialog flow
    if (newStatus === 'approved') {
      handleApproveClick();
      return;
    }
    
    setLoading(true);
    try {
      const updates: any = { status: newStatus };
      
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

  const hasVideos = videoUrls.length > 0;
  const hasScript = !!content.script;
  const hasEditorGuidelines = !!(content as any).editor_guidelines;
  const isDraftOrScriptPending = currentStatus === 'draft' || currentStatus === 'script_pending';
  const canApproveScript = isDraftOrScriptPending && hasScript;
  const canApprove = currentStatus === 'delivered' || currentStatus === 'corrected';
  const canReportIssue = currentStatus === 'delivered' || currentStatus === 'corrected';
  const canDownload = ['approved', 'paid', 'delivered', 'corrected'].includes(currentStatus || '');

  const handleApproveScript = async () => {
    if (!content || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('content')
        .update({ 
          script_approved_at: new Date().toISOString(),
          script_approved_by: user.id,
          status: 'script_approved'
        })
        .eq('id', content.id);
      if (error) throw error;
      setCurrentStatus('script_approved');
      toast({ title: "Guión aprobado", description: "El contenido pasará a producción" });
      onUpdate?.();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error al aprobar guión", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Simplified view for draft/script_pending status
  if (isDraftOrScriptPending) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-3xl max-h-[95vh] overflow-hidden p-0 gap-0">
          {/* Header */}
          <div className="relative border-b bg-gradient-to-r from-primary/5 via-background to-primary/5">
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={`shrink-0 ${STATUS_COLORS[currentStatus || content.status]}`}>
                      {STATUS_LABELS[currentStatus || content.status]}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <FileText className="h-3 w-3" />
                      Revisión de guión
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight truncate">{content.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                    {content.client?.name && (
                      <span className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" />
                        {content.client.name}
                      </span>
                    )}
                    {productName && (
                      <span className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" />
                        {productName}
                      </span>
                    )}
                    {content.campaign_week && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {content.campaign_week}
                      </span>
                    )}
                    {content.deadline && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Entrega: {formatDate(content.deadline)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto max-h-[calc(95vh-200px)]">
            <div className="p-6 space-y-6">
              {/* Script Section */}
              {hasScript ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Guión del Contenido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScriptViewer 
                      content={content.script} 
                      maxHeight="h-[500px]"
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-warning/30 bg-warning/5">
                  <CardContent className="p-6 text-center">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-warning" />
                    <p className="font-medium">El guión está siendo preparado</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Te notificaremos cuando esté listo para revisión
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Editor Guidelines */}
              {hasEditorGuidelines && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Video className="h-5 w-5 text-primary" />
                      Pautas de Edición
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <RichTextViewer 
                        content={(content as any).editor_guidelines} 
                        className="prose prose-sm dark:prose-invert max-w-none"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sales Angle */}
              {content.sales_angle && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Ángulo de Venta
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/90">{content.sales_angle}</p>
                  </CardContent>
                </Card>
              )}

              {/* Comments Section */}
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Comentarios
                    {comments.length > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        ({comments.length})
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Si necesitas modificaciones en el guión, escríbelas aquí
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Textarea 
                      placeholder="Escribe aquí las correcciones o sugerencias para el guión..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleAddComment} 
                        disabled={loadingComment || !newComment.trim()}
                        variant="outline"
                        className="gap-2"
                      >
                        {loadingComment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Enviar Comentario
                      </Button>
                    </div>
                  </div>

                  {/* Comments list */}
                  {comments.length > 0 && (
                    <div className="space-y-3 pt-4 border-t">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                          <Avatar className="h-8 w-8 shrink-0">
                            {comment.profile?.avatar_url ? (
                              <img src={comment.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-medium text-sm">{comment.profile?.full_name}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {format(new Date(comment.created_at), "d MMM, HH:mm", { locale: es })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer with Approve Script button */}
          {canApproveScript && (
            <div className="border-t p-4 bg-gradient-to-r from-success/5 via-background to-success/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">¿El guión está listo?</p>
                  <p className="text-xs text-muted-foreground">
                    Al aprobar, el contenido pasará a producción
                  </p>
                </div>
                <Button
                  onClick={handleApproveScript}
                  disabled={loading}
                  className="gap-2 bg-success hover:bg-success/90 text-success-foreground shrink-0"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Aprobar Guión
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-6xl max-h-[95vh] overflow-hidden p-0 gap-0">
        {/* Header */}
        <div className="relative border-b bg-gradient-to-r from-primary/5 via-background to-primary/5">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={`shrink-0 ${STATUS_COLORS[currentStatus || content.status]}`}>
                    {STATUS_LABELS[currentStatus || content.status]}
                  </Badge>
                  {videoUrls.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Video className="h-3 w-3" />
                      {videoUrls.length} {videoUrls.length === 1 ? 'video' : 'videos'}
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-bold tracking-tight truncate">{content.title}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {content.client?.name && (
                    <span className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      {content.client.name}
                    </span>
                  )}
                  {productName && (
                    <span className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      {productName}
                    </span>
                  )}
                  {content.campaign_week && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {content.campaign_week}
                    </span>
                  )}
                  {content.deadline && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Entrega: {formatDate(content.deadline)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons for delivered/corrected */}
            {(canApprove || canReportIssue) && (
              <div className="flex flex-wrap gap-3 mt-4 p-4 rounded-xl bg-gradient-to-r from-success/5 via-warning/5 to-success/5 border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">¿Qué deseas hacer con este contenido?</p>
                  <p className="text-xs text-muted-foreground">Revisa los videos y el guión antes de tomar una decisión</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {canApprove && (
                    <Button
                      onClick={() => handleStatusChange('approved')}
                      disabled={loading}
                      className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Aprobar
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
                      Novedad
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6">
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'videos'
                  ? 'bg-background text-foreground border-t border-x'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Video className="h-4 w-4 inline-block mr-2" />
              Videos ({videoUrls.length})
            </button>
            <button
              onClick={() => setActiveTab('script')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'script'
                  ? 'bg-background text-foreground border-t border-x'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <FileText className="h-4 w-4 inline-block mr-2" />
              Guión
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative ${
                activeTab === 'comments'
                  ? 'bg-background text-foreground border-t border-x'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <MessageSquare className="h-4 w-4 inline-block mr-2" />
              Comentarios
              {comments.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {comments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto max-h-[calc(95vh-280px)]">
          <div className="p-6">
            {/* Videos Tab */}
            {activeTab === 'videos' && (
              <div className="space-y-6">
                {hasVideos ? (
                  <>
                    {/* Videos Grid - Each video independent */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {videoUrls.map((url: string, idx: number) => (
                        <Card key={idx} className="overflow-hidden">
                          <div className="relative">
                            <div className="aspect-[9/16] bg-black rounded-t-lg overflow-hidden">
                              <AutoPauseVideo
                                src={url}
                                index={idx}
                                contentId={content.id}
                                thumbnailUrl={content.thumbnail_url}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-sm font-medium">
                              Video {idx + 1}
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Variante {idx + 1}</span>
                              {canDownload && (
                                <DownloadVideoButton
                                  contentId={content.id}
                                  videoUrl={url}
                                  variantIndex={idx}
                                  title={content.title}
                                />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Download All Info */}
                    {canDownload && videoUrls.length > 1 && (
                      <Card className="border-success/20 bg-success/5">
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground text-center">
                            {videoUrls.length} videos disponibles. Usa el botón "Descargar" en cada video.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-6 rounded-full bg-muted/50 mb-4">
                      <Video className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Videos en Proceso</h3>
                    <p className="text-muted-foreground max-w-md">
                      Los videos están siendo editados por nuestro equipo. 
                      Te notificaremos cuando estén listos para revisión.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Script Tab */}
            {activeTab === 'script' && (
              <div className="space-y-4">
                {hasScript ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Guión del Contenido
                        </CardTitle>
                        {content.script_approved_at && (
                          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aprobado
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <RichTextViewer 
                          content={content.script} 
                          className="prose prose-sm dark:prose-invert max-w-none"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-6 rounded-full bg-muted/50 mb-4">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Sin Guión</h3>
                    <p className="text-muted-foreground max-w-md">
                      Este contenido aún no tiene un guión asociado.
                    </p>
                  </div>
                )}

                {/* Sales Angle */}
                {content.sales_angle && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Ángulo de Venta
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground/90">{content.sales_angle}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Description */}
                {content.description && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Descripción</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground/90">{content.description}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-6">
                {/* Add comment section - Prominent */}
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      Agregar Comentario o Novedad
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Usa este espacio para comunicar correcciones, sugerencias o aprobar el contenido
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Textarea 
                        placeholder="Escribe aquí las correcciones necesarias, observaciones sobre el video, cambios en el guión, etc..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[120px] resize-none"
                      />
                      <div className="flex justify-end">
                        <Button 
                          onClick={handleAddComment} 
                          disabled={loadingComment || !newComment.trim()}
                          className="gap-2"
                        >
                          {loadingComment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Enviar Comentario
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Comments list */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    Historial de Comentarios
                    <span className="text-sm font-normal text-muted-foreground">
                      ({comments.length})
                    </span>
                  </h3>
                  
                  {comments.length > 0 ? (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <Card key={comment.id} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10 shrink-0">
                                {comment.profile?.avatar_url ? (
                                  <img src={comment.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    <User className="h-5 w-5" />
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-medium text-sm">{comment.profile?.full_name}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {format(new Date(comment.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.comment}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium mb-1">No hay comentarios aún</p>
                      <p className="text-sm">
                        Sé el primero en agregar un comentario sobre este contenido
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Rating Dialog for Approval */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="max-w-md">
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                <ThumbsUp className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-lg font-semibold">¡Aprobar Contenido!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Antes de aprobar, califica el trabajo del equipo (opcional)
              </p>
            </div>

            <div className="space-y-4">
              {content?.creator_id && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-info" />
                    <span className="text-sm font-medium">Creador de Contenido</span>
                  </div>
                  <StarRatingInput
                    value={creatorRating}
                    onChange={setCreatorRating}
                    size="lg"
                  />
                </div>
              )}

              {content?.editor_id && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">Editor de Video</span>
                  </div>
                  <StarRatingInput
                    value={editorRating}
                    onChange={setEditorRating}
                    size="lg"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRatingDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground gap-2"
                onClick={handleConfirmApproval}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Aprobar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
