import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor, RichTextViewer } from "@/components/ui/rich-text-editor";
import { ProductSelector } from "@/components/products/ProductSelector";
import { ProductDetailDialog } from "@/components/products/ProductDetailDialog";
import { StrategistScriptForm } from "@/components/content/StrategistScriptForm";
import { Content, STATUS_LABELS, STATUS_COLORS, ContentStatus, STATUS_ORDER, ContentComment } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Calendar, User, Video, Link as LinkIcon, 
  DollarSign, FileText, Save, ExternalLink,
  Clock, CheckCircle, Trash2, MessageSquare, Send, FolderOpen, Package, Lock, Share2,
  Plus, X, Clipboard, Megaphone, Target
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ContentDetailDialogProps {
  content: Content | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  onDelete?: (contentId: string) => void;
}

interface SelectOption {
  id: string;
  name: string;
}

export function ContentDetailDialog({ content, open, onOpenChange, onUpdate, onDelete }: ContentDetailDialogProps) {
  const { toast } = useToast();
  const { isAdmin, isClient, isCreator, isEditor, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ContentStatus | null>(null);
  const [comments, setComments] = useState<(ContentComment & { profile?: { full_name: string } })[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    product: "",
    product_id: "",
    sales_angle: "",
    client_id: "",
    creator_id: "",
    editor_id: "",
    strategist_id: "",
    deadline: "",
    start_date: "",
    campaign_week: "",
    reference_url: "",
    video_url: "",
    video_urls: [] as string[],
    hooks_count: 1,
    drive_url: "",
    script: "",
    description: "",
    notes: "",
    creator_payment: 0,
    editor_payment: 0,
    creator_paid: false,
    editor_paid: false,
    invoiced: false,
    is_published: false,
    editor_guidelines: "",
    strategist_guidelines: "",
    trafficker_guidelines: ""
  });

  // Product data for script generation
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);

  // Options lists
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [creators, setCreators] = useState<SelectOption[]>([]);
  const [editors, setEditors] = useState<SelectOption[]>([]);
  const [strategists, setStrategists] = useState<SelectOption[]>([]);

  // Check if user can edit video tab (only strategist assigned or admin)
  const isStrategist = content?.strategist_id === user?.id;
  const canEditVideoTab = isAdmin || isStrategist;

  useEffect(() => {
    if (content) {
      const existingVideoUrls = (content as any).video_urls || [];
      const hooksCount = (content as any).hooks_count || Math.max(existingVideoUrls.length, 1);
      // Initialize video_urls array based on hooks_count
      const videoUrls = Array.from({ length: hooksCount }, (_, i) => existingVideoUrls[i] || '');
      
      setFormData({
        title: content.title || "",
        product: content.product || "",
        product_id: content.product_id || "",
        sales_angle: content.sales_angle || "",
        client_id: content.client_id || "",
        creator_id: content.creator_id || "",
        editor_id: content.editor_id || "",
        strategist_id: content.strategist_id || "",
        deadline: content.deadline ? content.deadline.split('T')[0] : "",
        start_date: content.start_date ? content.start_date.split('T')[0] : "",
        campaign_week: content.campaign_week || "",
        reference_url: content.reference_url || "",
        video_url: content.video_url || "",
        video_urls: videoUrls,
        hooks_count: hooksCount,
        drive_url: content.drive_url || "",
        script: content.script || "",
        description: content.description || "",
        notes: content.notes || "",
        creator_payment: content.creator_payment || 0,
        editor_payment: content.editor_payment || 0,
        creator_paid: content.creator_paid || false,
        editor_paid: content.editor_paid || false,
        invoiced: content.invoiced || false,
        is_published: (content as any).is_published || false,
        editor_guidelines: (content as any).editor_guidelines || "",
        strategist_guidelines: (content as any).strategist_guidelines || "",
        trafficker_guidelines: (content as any).trafficker_guidelines || ""
      });
      setCurrentStatus(content.status);
      fetchOptions();
      fetchComments();
      if (content.product_id) {
        fetchProduct(content.product_id);
      }
    }
  }, [content]);

  const fetchProduct = async (productId: string) => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();
    setSelectedProduct(data);
  };

  const handleProductChange = async (productId: string) => {
    setFormData({ ...formData, product_id: productId });
    if (productId) {
      await fetchProduct(productId);
    } else {
      setSelectedProduct(null);
    }
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
      const { error } = await supabase
        .from('content')
        .update({ status: newStatus })
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

  const fetchOptions = async () => {
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    setClients(clientsData || []);

    const { data: creatorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'creator');
    
    if (creatorRoles?.length) {
      const { data: creatorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorRoles.map(r => r.user_id));
      setCreators(creatorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }

    const { data: editorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'editor');
    
    if (editorRoles?.length) {
      const { data: editorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', editorRoles.map(r => r.user_id));
      setEditors(editorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }

    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    
    if (adminRoles?.length) {
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', adminRoles.map(r => r.user_id));
      setStrategists(adminProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es });
  };

  const handleSave = async () => {
    if (!content) return;
    setLoading(true);

    try {
      let updates: any = {};

      // Los creadores asignados solo pueden editar drive_url y notes
      const isAssignedCreatorCheck = isCreator && content.creator_id === user?.id && !isAdmin;
      const isAssignedEditorCheck = isEditor && content.editor_id === user?.id && !isAdmin;

      if (isAssignedCreatorCheck) {
        // Creadores solo pueden editar drive_url y notes
        updates = {
          drive_url: formData.drive_url || null,
          notes: formData.notes || null
        };
      } else if (isAssignedEditorCheck) {
        // Editores solo pueden editar video_url y notes
        updates = {
          video_url: formData.video_url || null,
          notes: formData.notes || null
        };
      } else if (isAdmin) {
        // Admin puede editar todo
        updates = {
          title: formData.title,
          product: formData.product || null,
          product_id: formData.product_id || null,
          sales_angle: formData.sales_angle || null,
          client_id: formData.client_id || null,
          creator_id: formData.creator_id || null,
          editor_id: formData.editor_id || null,
          strategist_id: formData.strategist_id || null,
          deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
          start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
          campaign_week: formData.campaign_week || null,
          reference_url: formData.reference_url || null,
          video_url: formData.video_url || null,
          video_urls: formData.video_urls.filter(url => url.trim() !== ''),
          hooks_count: formData.hooks_count,
          drive_url: formData.drive_url || null,
          script: formData.script || null,
          description: formData.description || null,
          notes: formData.notes || null,
          creator_payment: formData.creator_payment,
          editor_payment: formData.editor_payment,
          creator_paid: formData.creator_paid,
          editor_paid: formData.editor_paid,
          invoiced: formData.invoiced,
          is_published: formData.is_published,
          editor_guidelines: formData.editor_guidelines || null,
          strategist_guidelines: formData.strategist_guidelines || null,
          trafficker_guidelines: formData.trafficker_guidelines || null
        };

        if (formData.creator_id && !content.creator_id) {
          updates.creator_assigned_at = new Date().toISOString();
        }
        if (formData.editor_id && !content.editor_id) {
          updates.editor_assigned_at = new Date().toISOString();
        }

        // Si ambos están pagados y el contenido está aprobado, cambiar a estado "paid"
        const bothPaid = formData.creator_paid && formData.editor_paid;
        const wasNotBothPaid = !content.creator_paid || !content.editor_paid;
        if (bothPaid && wasNotBothPaid && content.status === 'approved') {
          updates.status = 'paid';
          updates.paid_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', content.id);

      if (error) throw error;

      // Si se agregó o cambió el drive_url, notificar a n8n para procesar con Bunny.net
      const driveUrlChanged = formData.drive_url && formData.drive_url !== content.drive_url;
      if (driveUrlChanged) {
        try {
          const { error: webhookError } = await supabase.functions.invoke('notify-drive-upload', {
            body: {
              content_id: content.id,
              drive_url: formData.drive_url
            }
          });
          
          if (webhookError) {
            console.error('Error notifying drive upload:', webhookError);
            toast({
              title: "Video guardado",
              description: "El link se guardó pero hubo un error al iniciar el procesamiento automático",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Procesando video",
              description: "El video se está procesando y se subirá automáticamente a Bunny.net"
            });
          }
        } catch (webhookErr) {
          console.error('Error calling webhook:', webhookErr);
        }
      } else {
        toast({
          title: "Guardado",
          description: "Los cambios se han guardado exitosamente"
        });
      }
      
      setEditMode(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating content:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isVerticalVideo = (url: string) => {
    return url.includes('instagram.com') || 
           url.includes('tiktok.com') || 
           url.includes('/shorts/') ||
           url.includes('/reel/');
  };

  const renderVideoEmbed = (url: string) => {
    if (!url) return null;
    
    const isVertical = isVerticalVideo(url);
    const containerClass = isVertical 
      ? "w-full h-full flex items-center justify-center"
      : "w-full h-full";
    const iframeClass = isVertical
      ? "w-auto h-full max-w-full"
      : "w-full h-full";
    
    if (url.includes('tiktok.com')) {
      const videoId = url.match(/video\/(\d+)/)?.[1];
      if (videoId) {
        return (
          <div className={containerClass}>
            <iframe
              src={`https://www.tiktok.com/embed/v2/${videoId}`}
              className={iframeClass}
              style={isVertical ? { aspectRatio: '9/16', height: '100%' } : undefined}
              allowFullScreen
            />
          </div>
        );
      }
    }
    
    if (url.includes('instagram.com')) {
      let cleanUrl = url.split('?')[0];
      cleanUrl = cleanUrl.replace(/\/$/, '');
      const embedUrl = cleanUrl + '/embed/captioned';
      return (
        <div className={containerClass}>
          <iframe
            src={embedUrl}
            className={iframeClass}
            style={isVertical ? { aspectRatio: '9/16', height: '100%' } : undefined}
            allowFullScreen
            scrolling="no"
            frameBorder="0"
          />
        </div>
      );
    }
    
    if (url.includes('/shorts/')) {
      const embedUrl = url.replace('/shorts/', '/embed/');
      return (
        <div className={containerClass}>
          <iframe
            src={embedUrl}
            className={iframeClass}
            style={{ aspectRatio: '9/16', height: '100%' }}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );
    }
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let embedUrl = url;
      if (url.includes('watch?v=')) {
        embedUrl = url.replace('watch?v=', 'embed/');
      } else if (url.includes('youtu.be/')) {
        embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
      }
      return (
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      );
    }
    
    if (url.includes('vimeo.com')) {
      return (
        <iframe
          src={url.replace('vimeo.com', 'player.vimeo.com/video')}
          className="w-full h-full"
          allowFullScreen
        />
      );
    }
    
    if (url.includes('drive.google.com')) {
      return (
        <iframe
          src={url.replace('/view', '/preview')}
          className="w-full h-full"
          allowFullScreen
        />
      );
    }
    
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return (
        <video
          src={url}
          className="w-full h-full object-contain"
          controls
        />
      );
    }
    
    return (
      <div className="w-full h-full flex items-center justify-center">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline flex items-center gap-2"
        >
          <ExternalLink className="h-5 w-5" />
          Ver video en nueva pestaña
        </a>
      </div>
    );
  };

  if (!content) return null;

  const canEdit = isAdmin;
  const canEditAsCreatorOrEditor = isCreator || isEditor;
  const isAssignedCreator = isCreator && content.creator_id === user?.id;
  const isAssignedEditor = isEditor && content.editor_id === user?.id;
  const canEditDriveUrl = isAdmin || isAssignedCreator;
  const canEditVideoUrl = isAdmin || isAssignedEditor;
  const canEditNotes = isAdmin || isAssignedCreator || isAssignedEditor;
  const canEnterEditMode = isAdmin || isAssignedCreator || isAssignedEditor;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-5xl max-h-[90vh] overflow-hidden p-0">
        {/* Hero Header - Landing Page Style */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 sm:p-8 border-b">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{ 
              backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }} />
          </div>
          
          <div className="relative">
            {/* Top Row: Status & Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {(isAdmin || isClient) ? (
                  <Select 
                    value={currentStatus || content.status} 
                    onValueChange={(v) => handleStatusChange(v as ContentStatus)}
                    disabled={loading}
                  >
                    <SelectTrigger className={`w-auto min-w-[140px] text-sm font-medium ${STATUS_COLORS[currentStatus || content.status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map(status => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[content.status]}`}>
                    {STATUS_LABELS[content.status]}
                  </Badge>
                )}
                
                {formData.is_published && (
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    <Share2 className="h-3 w-3 mr-1" />
                    Publicado
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {canEnterEditMode && (
                  <Button
                    variant={editMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? "Cancelar" : "Editar"}
                  </Button>
                )}
                {editMode && (
                  <Button onClick={handleSave} disabled={loading} size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    Guardar
                  </Button>
                )}
                {editMode && (
                  <Button onClick={handleSave} disabled={loading} size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    Guardar
                  </Button>
                )}
              </div>
            </div>

            {/* Title */}
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                {editMode ? (
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="text-2xl sm:text-3xl font-bold h-auto py-2 bg-background/50"
                  />
                ) : (
                  content.title
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Meta Info Row */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              {content.client?.name && (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full">
                  <Package className="h-4 w-4" />
                  <span>{content.client.name}</span>
                </div>
              )}
              {selectedProduct?.name && (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full">
                  <Target className="h-4 w-4" />
                  <span>{selectedProduct.name}</span>
                </div>
              )}
              {content.campaign_week && (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full">
                  <Calendar className="h-4 w-4" />
                  <span>{content.campaign_week}</span>
                </div>
              )}
              {content.deadline && (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full">
                  <Clock className="h-4 w-4" />
                  <span>Entrega: {formatDate(content.deadline)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area with Tabs */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-4 sm:p-6">
          <Tabs defaultValue="video">
            <TabsList className={`grid w-full h-auto gap-1 mb-6 ${
              isClient ? 'grid-cols-1' : 
              isAdmin ? 'grid-cols-3 sm:grid-cols-6' : 
              (isCreator || isEditor) ? 'grid-cols-3' : 'grid-cols-3'
            }`}>
              <TabsTrigger value="video" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">Video</TabsTrigger>
              {(isCreator || isEditor || isAdmin) && <TabsTrigger value="material" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">Material</TabsTrigger>}
              {(isCreator || isEditor || isAdmin) && <TabsTrigger value="general" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">General</TabsTrigger>}
              {isAdmin && <TabsTrigger value="equipo" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">Equipo</TabsTrigger>}
              {isAdmin && <TabsTrigger value="fechas" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">Fechas</TabsTrigger>}
              {isAdmin && <TabsTrigger value="pagos" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">Pagos</TabsTrigger>}
            </TabsList>

          {/* Video Tab - Reorganized: Video+Comments + Script Generator Form */}
          <TabsContent value="video" className="space-y-6 mt-4">
            {/* Publish to Portfolio Toggle - Only for Admin */}
            {isAdmin && (
              <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Share2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Publicar en Portafolio</p>
                    <p className="text-xs text-muted-foreground">
                      Este video será visible públicamente en /portfolio
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {formData.is_published && (
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      Publicado
                    </Badge>
                  )}
                  <Checkbox
                    id="is_published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => {
                      setFormData({ ...formData, is_published: !!checked });
                      if (!editMode) setEditMode(true);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Restriction notice for non-strategists */}
            {!canEditVideoTab && editMode && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
                <Lock className="h-4 w-4 text-warning" />
                <span>Solo el estratega asignado o un admin pueden editar esta sección</span>
              </div>
            )}

            {/* Section 1: Videos Finales (Hooks) + Comments side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Videos Finales (Multiple) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Video className="h-4 w-4" /> Videos Finales (Variables)
                  </h4>
                  
                  {/* Hooks count selector - edit mode only */}
                  {editMode && canEditVideoTab && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Cantidad:</Label>
                      <Select
                        value={String(formData.hooks_count)}
                        onValueChange={(value) => {
                          const newCount = parseInt(value);
                          const newUrls = Array.from({ length: newCount }, (_, i) => formData.video_urls[i] || '');
                          setFormData({ ...formData, hooks_count: newCount, video_urls: newUrls });
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Show hooks count badge when not editing */}
                {!editMode && formData.hooks_count > 1 && (
                  <Badge variant="secondary" className="w-fit">
                    {formData.hooks_count} variables configuradas
                  </Badge>
                )}
                
                {/* Video URL inputs based on hooks_count */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {formData.video_urls.map((videoUrl, index) => (
                    <div key={index} className="space-y-2 p-3 rounded-lg border bg-muted/30">
                      <span className="text-sm font-medium">Variable {index + 1}</span>
                      
                      {videoUrl && (
                        <div 
                          className="rounded-lg overflow-hidden bg-muted flex items-center justify-center"
                          style={{ height: '200px' }}
                        >
                          {renderVideoEmbed(videoUrl)}
                        </div>
                      )}
                      
                      {editMode && canEditVideoTab ? (
                        <Input
                          value={videoUrl}
                          onChange={(e) => {
                            const newUrls = [...formData.video_urls];
                            newUrls[index] = e.target.value;
                            setFormData({ ...formData, video_urls: newUrls });
                          }}
                          placeholder="https://... (URL del video editado)"
                          type="url"
                        />
                      ) : videoUrl ? (
                        <a 
                          href={videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                        >
                          Ver video <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Sin video cargado</p>
                      )}
                    </div>
                  ))}
                  
                  {/* Show empty state only if no hooks configured */}
                  {formData.video_urls.length === 0 && !editMode && (
                    <div className="rounded-lg border-2 border-dashed border-border flex items-center justify-center p-6">
                      <div className="text-center text-muted-foreground">
                        <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay videos configurados</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Comments */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Comentarios / Novedades
                </h4>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{comment.profile?.full_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), "d MMM, HH:mm", { locale: es })}
                          </span>
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No hay comentarios aún
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Textarea 
                    placeholder="Agregar un comentario..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 min-h-[60px]"
                  />
                  <Button 
                    onClick={handleAddComment} 
                    disabled={loadingComment || !newComment.trim()}
                    size="icon"
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Section 2: Strategist Script Form - Full Width (Only for strategist/admin) */}
            {canEditVideoTab && !isClient && (
              <div className="space-y-4 pt-6 border-t">
                {/* Product Selector */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" /> Producto Asociado
                  </h4>
                  {editMode ? (
                    <div className="max-w-md">
                      <ProductSelector
                        clientId={formData.client_id}
                        value={formData.product_id}
                        onChange={handleProductChange}
                        onCreateNew={() => setShowProductDialog(true)}
                      />
                    </div>
                  ) : selectedProduct ? (
                    <div className="p-3 rounded-lg border bg-muted/50 inline-flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-medium">{selectedProduct.name}</span>
                      {formData.sales_angle && (
                        <Badge variant="secondary">{formData.sales_angle}</Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin producto asociado</p>
                  )}
                </div>

                {/* Strategist Script Form */}
                <StrategistScriptForm
                  product={selectedProduct}
                  contentId={content.id}
                  onScriptGenerated={(script) => {
                    setFormData({ ...formData, script });
                    setEditMode(true);
                    toast({ title: "Guión generado", description: "Revisa y edita el guión generado" });
                  }}
                />
              </div>
            )}

            {/* Section 3: Script Editor/Viewer */}
            <div className="space-y-3 pt-6 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" /> Guión
              </h4>
              {editMode && canEditVideoTab ? (
                <RichTextEditor
                  content={formData.script || ''}
                  onChange={(html) => setFormData({ ...formData, script: html })}
                  placeholder="Escribe el guión aquí..."
                  className="min-h-[250px]"
                />
              ) : (
                <RichTextViewer 
                  content={content.script || ''} 
                  className="min-h-[100px] max-h-[400px] overflow-y-auto"
                />
              )}
            </div>

            {/* Section 4: Guidelines for different roles - Visible for all, editable by admin/strategist */}
            {/* Pautas para el Editor */}
            <div className="space-y-3 pt-6 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <Clipboard className="h-4 w-4 text-blue-500" /> Pautas para el Editor
              </h4>
              {editMode && canEditVideoTab ? (
                <RichTextEditor
                  content={formData.editor_guidelines || ''}
                  onChange={(html) => setFormData({ ...formData, editor_guidelines: html })}
                  placeholder="Instrucciones específicas para el editor: estilo de edición, música, ritmo, efectos, etc."
                  className="min-h-[150px]"
                />
              ) : formData.editor_guidelines || (content as any).editor_guidelines ? (
                <RichTextViewer 
                  content={formData.editor_guidelines || (content as any).editor_guidelines} 
                  className="min-h-[100px] max-h-[300px] overflow-y-auto"
                />
              ) : (
                <div className="min-h-[100px] rounded-md border bg-muted/30 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground italic">Sin pautas para el editor</p>
                </div>
              )}
            </div>

            {/* Pautas para el Estratega */}
            <div className="space-y-3 pt-6 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" /> Pautas para el Estratega
              </h4>
              {editMode && canEditVideoTab ? (
                <RichTextEditor
                  content={formData.strategist_guidelines || ''}
                  onChange={(html) => setFormData({ ...formData, strategist_guidelines: html })}
                  placeholder="Estrategia de contenido, objetivos, métricas a seguir, ajustes de copy, etc."
                  className="min-h-[150px]"
                />
              ) : formData.strategist_guidelines || (content as any).strategist_guidelines ? (
                <RichTextViewer 
                  content={formData.strategist_guidelines || (content as any).strategist_guidelines} 
                  className="min-h-[100px] max-h-[300px] overflow-y-auto"
                />
              ) : (
                <div className="min-h-[100px] rounded-md border bg-muted/30 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground italic">Sin pautas para el estratega</p>
                </div>
              )}
            </div>

            {/* Pautas para el Trafficker */}
            <div className="space-y-3 pt-6 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-green-500" /> Pautas para el Trafficker
              </h4>
              {editMode && canEditVideoTab ? (
                <RichTextEditor
                  content={formData.trafficker_guidelines || ''}
                  onChange={(html) => setFormData({ ...formData, trafficker_guidelines: html })}
                  placeholder="Indicaciones de pauta: público objetivo, presupuesto sugerido, plataformas, segmentación, etc."
                  className="min-h-[150px]"
                />
              ) : formData.trafficker_guidelines || (content as any).trafficker_guidelines ? (
                <RichTextViewer 
                  content={formData.trafficker_guidelines || (content as any).trafficker_guidelines} 
                  className="min-h-[100px] max-h-[300px] overflow-y-auto"
                />
              ) : (
                <div className="min-h-[100px] rounded-md border bg-muted/30 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground italic">Sin pautas para el trafficker</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* General Tab - Creator, Editor, Admin only */}
          {(isCreator || isEditor || isAdmin) && (
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs flex items-center gap-2">
                    <Package className="h-3 w-3" /> Producto
                  </Label>
                  {editMode ? (
                    <ProductSelector
                      clientId={formData.client_id || content.client_id || null}
                      value={formData.product_id}
                      onChange={(productId) => handleProductChange(productId)}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{selectedProduct?.name || content.product || "—"}</p>
                      {selectedProduct && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowProductDialog(true)}
                          className="h-6 px-2 text-xs"
                        >
                          Ver info
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Cliente</Label>
                  {editMode ? (
                    <Select 
                      value={formData.client_id} 
                      onValueChange={(v) => {
                        // Al cambiar cliente, limpiar el producto seleccionado
                        setFormData({ ...formData, client_id: v, product_id: '', product: '' });
                        setSelectedProduct(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{content.client?.name || "—"}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Campaña / Semana</Label>
                  {editMode ? (
                    <Input
                      value={formData.campaign_week}
                      onChange={(e) => setFormData({ ...formData, campaign_week: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{content.campaign_week || "—"}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> URLs
                </h4>
                
                <div className="grid gap-3">

                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">URL Drive Video Crudo</Label>
                    {editMode && canEditDriveUrl ? (
                      <Input
                        value={formData.drive_url}
                        onChange={(e) => setFormData({ ...formData, drive_url: e.target.value })}
                        type="url"
                        placeholder="https://drive.google.com/..."
                      />
                    ) : content.drive_url ? (
                      <a href={content.drive_url} target="_blank" rel="noopener noreferrer"
                         className="text-primary hover:underline flex items-center gap-1">
                        {content.drive_url} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <p className="text-muted-foreground">—</p>}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">URL Video Referencia</Label>
                    {editMode && isAdmin ? (
                      <Input
                        value={formData.reference_url}
                        onChange={(e) => setFormData({ ...formData, reference_url: e.target.value })}
                        type="url"
                      />
                    ) : content.reference_url ? (
                      <a href={content.reference_url} target="_blank" rel="noopener noreferrer"
                         className="text-primary hover:underline flex items-center gap-1">
                        {content.reference_url} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <p className="text-muted-foreground">—</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Notas
                </h4>
                {editMode && canEditNotes ? (
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="Agrega notas sobre el contenido..."
                  />
                ) : editMode ? (
                  <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {content.notes || "Sin notas"}
                  </div>
                ) : (
                  <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {content.notes || "Sin notas"}
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* Equipo Tab - Admin only */}
          {isAdmin && <TabsContent value="equipo" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <User className="h-3 w-3" /> Creador
                </Label>
                {editMode ? (
                  <Select 
                    value={formData.creator_id} 
                    onValueChange={(v) => setFormData({ ...formData, creator_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {creators.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{content.creator?.full_name || "Sin asignar"}</p>
                )}
                {content.creator_assigned_at && (
                  <p className="text-xs text-muted-foreground">
                    Asignado: {formatDate(content.creator_assigned_at)}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <User className="h-3 w-3" /> Editor
                </Label>
                {editMode ? (
                  <Select 
                    value={formData.editor_id} 
                    onValueChange={(v) => setFormData({ ...formData, editor_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {editors.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{content.editor?.full_name || "Sin asignar"}</p>
                )}
                {content.editor_assigned_at && (
                  <p className="text-xs text-muted-foreground">
                    Asignado: {formatDate(content.editor_assigned_at)}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <User className="h-3 w-3" /> Estratega
                </Label>
                {editMode ? (
                  <Select 
                    value={formData.strategist_id} 
                    onValueChange={(v) => setFormData({ ...formData, strategist_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {strategists.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{content.strategist?.full_name || "Sin asignar"}</p>
                )}
              </div>
            </div>
          </TabsContent>}

          {/* Fechas Tab - Admin only */}
          {isAdmin && (
            <TabsContent value="fechas" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Fecha Inicial
                  </Label>
                  {editMode ? (
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{formatDate(content.start_date)}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Fecha Límite
                  </Label>
                  {editMode ? (
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{formatDate(content.deadline)}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Fecha de Grabación</Label>
                  <p className="font-medium">{formatDate(content.recorded_at)}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Fecha Entregado</Label>
                  <p className="font-medium">{formatDate(content.delivered_at)}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Fecha Aprobado</Label>
                  <p className="font-medium">{formatDate(content.approved_at)}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Creado</Label>
                  <p className="font-medium">{formatDate(content.created_at)}</p>
                </div>
              </div>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="pagos" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Pago Creador
                  </h4>
                  {editMode ? (
                    <>
                      <Input
                        type="number"
                        value={formData.creator_payment}
                        onChange={(e) => setFormData({ ...formData, creator_payment: parseFloat(e.target.value) || 0 })}
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="creator_paid"
                          checked={formData.creator_paid}
                          onCheckedChange={(checked) => setFormData({ ...formData, creator_paid: !!checked })}
                        />
                        <Label htmlFor="creator_paid">Pagado</Label>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">${content.creator_payment?.toLocaleString()}</p>
                      <Badge variant={content.creator_paid ? "default" : "secondary"}>
                        {content.creator_paid ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Pagado</>
                        ) : "Pendiente"}
                      </Badge>
                    </>
                  )}
                </div>

                <div className="p-4 rounded-lg border space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Pago Editor
                  </h4>
                  {editMode ? (
                    <>
                      <Input
                        type="number"
                        value={formData.editor_payment}
                        onChange={(e) => setFormData({ ...formData, editor_payment: parseFloat(e.target.value) || 0 })}
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="editor_paid"
                          checked={formData.editor_paid}
                          onCheckedChange={(checked) => setFormData({ ...formData, editor_paid: !!checked })}
                        />
                        <Label htmlFor="editor_paid">Pagado</Label>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">${content.editor_payment?.toLocaleString()}</p>
                      <Badge variant={content.editor_paid ? "default" : "secondary"}>
                        {content.editor_paid ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Pagado</>
                        ) : "Pendiente"}
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2">
                  {editMode ? (
                    <>
                      <Checkbox
                        id="invoiced"
                        checked={formData.invoiced}
                        onCheckedChange={(checked) => setFormData({ ...formData, invoiced: !!checked })}
                      />
                      <Label htmlFor="invoiced">Facturado</Label>
                    </>
                  ) : (
                    <Badge variant={content.invoiced ? "default" : "outline"}>
                      {content.invoiced ? "Facturado" : "Sin facturar"}
                    </Badge>
                  )}
                </div>
              </div>
            </TabsContent>
          )}

          {/* Material Tab - Creator, Editor, Admin only */}
          {(isCreator || isEditor || isAdmin) && (
            <TabsContent value="material" className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Video de Referencia */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" /> Video de Referencia
                  </h4>
                  
                  {content.reference_url ? (
                    <div className="space-y-2">
                      <div 
                        className="rounded-lg overflow-hidden bg-muted flex items-center justify-center"
                        style={{ height: '350px' }}
                      >
                        {renderVideoEmbed(content.reference_url)}
                      </div>
                      <a 
                        href={content.reference_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                      >
                        Ver video original <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-border flex items-center justify-center" style={{ height: '200px' }}>
                      <div className="text-center text-muted-foreground">
                        <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay video de referencia</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contenido Crudo - Editable by Creator */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" /> Contenido Crudo (Drive)
                  </h4>
                  
                  {editMode && canEditDriveUrl ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <Label className="text-sm font-medium mb-2 block">URL de Carpeta de Drive</Label>
                        <Input
                          value={formData.drive_url}
                          onChange={(e) => setFormData({ ...formData, drive_url: e.target.value })}
                          placeholder="https://drive.google.com/..."
                          type="url"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Pega aquí el link de la carpeta de Google Drive con el contenido grabado
                        </p>
                      </div>
                    </div>
                  ) : content.drive_url ? (
                    <a 
                      href={content.drive_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div 
                        className="rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 transition-all hover:border-primary/50 flex items-center justify-center"
                        style={{ height: '350px' }}
                      >
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                          <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <FolderOpen className="h-12 w-12 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg text-foreground">Carpeta de Contenido</p>
                            <p className="text-sm text-muted-foreground mt-1">Clic para abrir en Drive</p>
                          </div>
                          <div className="flex items-center gap-2 text-primary font-medium">
                            <span>Abrir carpeta</span>
                            <ExternalLink className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-border flex items-center justify-center" style={{ height: '200px' }}>
                      <div className="text-center text-muted-foreground">
                        <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay carpeta de contenido</p>
                        {canEditDriveUrl && (
                          <p className="text-xs mt-2">Activa el modo edición para agregar el link</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </TabsContent>
          )}
          </Tabs>
        </div>

        {/* Footer Actions - Delete only (Edit/Save moved to header) */}
        {canEdit && (
          <div className="border-t p-4 bg-muted/30">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Proyecto
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente el proyecto "{content.title}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete?.(content.id);
                      onOpenChange(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </DialogContent>

      {/* Product Dialog */}
      <ProductDetailDialog
        product={null}
        clientId={formData.client_id}
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        onSave={() => {}}
      />
    </Dialog>
  );
}
