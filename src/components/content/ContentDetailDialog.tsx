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
import { ScriptGenerator } from "@/components/content/ScriptGenerator";
import { Content, STATUS_LABELS, STATUS_COLORS, ContentStatus, STATUS_ORDER, ContentComment } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Calendar, User, Video, Link as LinkIcon, 
  DollarSign, FileText, Save, ExternalLink,
  Clock, CheckCircle, Trash2, MessageSquare, Send, FolderOpen, Upload, File, Package
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
    drive_url: "",
    script: "",
    description: "",
    notes: "",
    creator_payment: 0,
    editor_payment: 0,
    creator_paid: false,
    editor_paid: false,
    invoiced: false
  });

  // Product data for script generation
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);

  // Options lists
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [creators, setCreators] = useState<SelectOption[]>([]);
  const [editors, setEditors] = useState<SelectOption[]>([]);
  const [strategists, setStrategists] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (content) {
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
        drive_url: content.drive_url || "",
        script: content.script || "",
        description: content.description || "",
        notes: content.notes || "",
        creator_payment: content.creator_payment || 0,
        editor_payment: content.editor_payment || 0,
        creator_paid: content.creator_paid || false,
        editor_paid: content.editor_paid || false,
        invoiced: content.invoiced || false
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
      const updates: any = {
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
        drive_url: formData.drive_url || null,
        script: formData.script || null,
        description: formData.description || null,
        notes: formData.notes || null,
        creator_payment: formData.creator_payment,
        editor_payment: formData.editor_payment,
        creator_paid: formData.creator_paid,
        editor_paid: formData.editor_paid,
        invoiced: formData.invoiced
      };

      // Si se asigna creador y no tenía, agregar fecha
      if (formData.creator_id && !content.creator_id) {
        updates.creator_assigned_at = new Date().toISOString();
      }
      if (formData.editor_id && !content.editor_id) {
        updates.editor_assigned_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', content.id);

      if (error) throw error;

      toast({
        title: "Guardado",
        description: "Los cambios se han guardado exitosamente"
      });
      
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

// Helper function to check if URL is vertical video (social media)
  const isVerticalVideo = (url: string) => {
    return url.includes('instagram.com') || 
           url.includes('tiktok.com') || 
           url.includes('/shorts/') ||
           url.includes('/reel/');
  };

// Helper function to render embedded video player
  const renderVideoEmbed = (url: string) => {
    if (!url) return null;
    
    const isVertical = isVerticalVideo(url);
    const containerClass = isVertical 
      ? "w-full h-full flex items-center justify-center"
      : "w-full h-full";
    const iframeClass = isVertical
      ? "w-auto h-full max-w-full"
      : "w-full h-full";
    
    // TikTok
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
    
    // Instagram - Clean URL and create embed
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
    
    // YouTube Shorts (vertical)
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
    
    // YouTube (horizontal)
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
    
    // Vimeo
    if (url.includes('vimeo.com')) {
      return (
        <iframe
          src={url.replace('vimeo.com', 'player.vimeo.com/video')}
          className="w-full h-full"
          allowFullScreen
        />
      );
    }
    
    // Google Drive
    if (url.includes('drive.google.com')) {
      return (
        <iframe
          src={url.replace('/view', '/preview')}
          className="w-full h-full"
          allowFullScreen
        />
      );
    }
    
    // Direct video files
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return (
        <video
          src={url}
          className="w-full h-full object-contain"
          controls
        />
      );
    }
    
    // Fallback: link to open externally
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-3 flex-1 min-w-0">
              <Video className="h-5 w-5 text-primary shrink-0" />
              {editMode ? (
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-xl font-bold"
                />
              ) : (
                <span className="truncate">{content.title}</span>
              )}
            </DialogTitle>
            {(isAdmin || isClient) ? (
              <Select 
                value={currentStatus || content.status} 
                onValueChange={(v) => handleStatusChange(v as ContentStatus)}
                disabled={loading}
              >
                <SelectTrigger className={`w-auto min-w-[140px] ${STATUS_COLORS[currentStatus || content.status]}`}>
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
              <Badge className={STATUS_COLORS[content.status]}>
                {STATUS_LABELS[content.status]}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="video" className="mt-4">
          <TabsList className={`grid w-full ${isClient ? 'grid-cols-2' : isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <TabsTrigger value="video">Video Final</TabsTrigger>
            {!isClient && <TabsTrigger value="material">Material</TabsTrigger>}
            {!isClient && <TabsTrigger value="general">General</TabsTrigger>}
            <TabsTrigger value="equipo">Equipo</TabsTrigger>
            {!isClient && <TabsTrigger value="fechas">Fechas</TabsTrigger>}
            {isAdmin && <TabsTrigger value="pagos">Pagos</TabsTrigger>}
          </TabsList>

          {/* General Tab - Solo para Admin, Creadores y Editores */}
          {!isClient && (
            <TabsContent value="general" className="space-y-4 mt-4">
              {/* Información general */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Producto</Label>
                  {editMode ? (
                    <Input
                      value={formData.product}
                      onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{content.product || "—"}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Cliente</Label>
                  {editMode ? (
                    <Select 
                      value={formData.client_id} 
                      onValueChange={(v) => setFormData({ ...formData, client_id: v })}
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

              {/* URLs */}
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> URLs
                </h4>
                
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">URL Final</Label>
                    {editMode ? (
                      <Input
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        type="url"
                      />
                    ) : content.video_url ? (
                      <a href={content.video_url} target="_blank" rel="noopener noreferrer" 
                         className="text-primary hover:underline flex items-center gap-1">
                        {content.video_url} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <p className="text-muted-foreground">—</p>}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">URL Drive Video Crudo</Label>
                    {editMode ? (
                      <Input
                        value={formData.drive_url}
                        onChange={(e) => setFormData({ ...formData, drive_url: e.target.value })}
                        type="url"
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
                    {editMode ? (
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

              {/* Notas */}
              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Notas
                </h4>
                {editMode ? (
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                  />
                ) : (
                  <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {content.notes || "Sin notas"}
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          <TabsContent value="equipo" className="space-y-4 mt-4">
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
          </TabsContent>

          {/* Fechas Tab - Solo para Admin, Creadores y Editores */}
          {!isClient && (
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
                    <Clock className="h-3 w-3" /> Fecha Límite de Entrega
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

          {/* Video Final Tab - Visible para todos */}
          <TabsContent value="video" className="space-y-6 mt-4">
            {/* Sección 1: Video + Comentarios en 2 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video Final */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Video className="h-4 w-4" /> Video Final
                </h4>
                
                {content.video_url ? (
                  <div className="space-y-2">
                    <div 
                      className="rounded-lg overflow-hidden bg-muted flex items-center justify-center"
                      style={{ height: '400px' }}
                    >
                      {renderVideoEmbed(content.video_url)}
                    </div>
                    <a 
                      href={content.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                    >
                      Ver video original <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-border flex items-center justify-center" style={{ height: '250px' }}>
                    <div className="text-center text-muted-foreground">
                      <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay video cargado</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Comentarios - al lado del video */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Comentarios / Novedades
                </h4>
                
                {/* Lista de comentarios */}
                <div className="space-y-3 max-h-[350px] overflow-y-auto">
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
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No hay comentarios aún
                    </p>
                  )}
                </div>
                
                {/* Agregar comentario */}
                <div className="flex gap-2 pt-2">
                  <Textarea 
                    placeholder="Agregar un comentario o novedad..."
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

            {/* Sección 2: Producto y Generador de Guión */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t">
              {/* Producto Asociado */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" /> Producto Asociado
                </h4>
                {editMode ? (
                  <div className="space-y-3">
                    <ProductSelector
                      clientId={formData.client_id}
                      value={formData.product_id}
                      onChange={handleProductChange}
                      onCreateNew={() => setShowProductDialog(true)}
                    />
                    {selectedProduct && (
                      <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                        <p className="font-medium text-sm">{selectedProduct.name}</p>
                        {selectedProduct.sales_angles?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {selectedProduct.sales_angles.map((angle: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {angle}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedProduct?.sales_angles?.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Ángulo de Venta para este proyecto</Label>
                        <Select 
                          value={formData.sales_angle} 
                          onValueChange={(v) => setFormData({ ...formData, sales_angle: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar ángulo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedProduct.sales_angles.map((angle: string, idx: number) => (
                              <SelectItem key={idx} value={angle}>{angle}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ) : selectedProduct ? (
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <p className="font-medium">{selectedProduct.name}</p>
                    {formData.sales_angle && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Ángulo: <Badge variant="secondary">{formData.sales_angle}</Badge>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin producto asociado</p>
                )}
              </div>

              {/* Generador de Guión con n8n */}
              {!isClient && (
                <ScriptGenerator
                  product={selectedProduct}
                  onScriptGenerated={(script) => {
                    setFormData({ ...formData, script });
                    setEditMode(true);
                    toast({ title: "Guión generado", description: "Revisa y edita el guión generado" });
                  }}
                />
              )}
            </div>

            {/* Sección 3: Guión / Estrategia - Ancho completo con editor de texto enriquecido */}
            <div className="space-y-3 pt-6 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" /> Guión / Estrategia
              </h4>
              {editMode ? (
                <RichTextEditor
                  content={formData.script || ''}
                  onChange={(html) => setFormData({ ...formData, script: html })}
                  placeholder="Escribe el guión o estrategia aquí..."
                  className="min-h-[250px]"
                />
              ) : (
                <RichTextViewer 
                  content={content.script || ''} 
                  className="min-h-[150px] max-h-[400px] overflow-y-auto"
                />
              )}
            </div>

            {/* Sección 3: Archivos adjuntos (Investigación, Brief, Onboarding) */}
            <div className="space-y-3 pt-6 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" /> Archivos (Investigación / Brief / Onboarding)
              </h4>
              <p className="text-sm text-muted-foreground">
                Aquí puedes agregar enlaces a documentos de investigación, briefs o información de onboarding.
              </p>
              
              {editMode ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">URL del documento o carpeta</Label>
                    <Input
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="https://drive.google.com/... o URL del documento"
                      type="url"
                    />
                  </div>
                </div>
              ) : content.description ? (
                <a 
                  href={content.description} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <File className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Documentos del proyecto</p>
                    <p className="text-sm text-muted-foreground truncate">{content.description}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </a>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                  <File className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No hay archivos adjuntos</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Material Tab - Solo para Admin, Creadores y Editores */}
          {!isClient && (
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
                        style={{ height: '400px' }}
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
                    <div className="rounded-lg border-2 border-dashed border-border flex items-center justify-center" style={{ height: '250px' }}>
                      <div className="text-center text-muted-foreground">
                        <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay video de referencia</p>
                        <p className="text-xs">Agrega una URL en la pestaña General</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Carpeta Drive - Contenido Crudo */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" /> Contenido Crudo (Drive)
                  </h4>
                  
                  {content.drive_url ? (
                    <a 
                      href={content.drive_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div 
                        className="rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 transition-all hover:border-primary/50 hover:from-primary/10 hover:to-primary/20 hover:shadow-lg flex items-center justify-center"
                        style={{ height: '400px' }}
                      >
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                          <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <FolderOpen className="h-12 w-12 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg text-foreground">Carpeta de Contenido Crudo</p>
                            <p className="text-sm text-muted-foreground mt-1">Haz clic para abrir en Google Drive</p>
                          </div>
                          <div className="flex items-center gap-2 text-primary font-medium">
                            <span>Abrir carpeta</span>
                            <ExternalLink className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-border flex items-center justify-center" style={{ height: '250px' }}>
                      <div className="text-center text-muted-foreground">
                        <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay carpeta de contenido</p>
                        <p className="text-xs">Agrega una URL en la pestaña General</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Actions */}
        {canEdit && (
          <div className="flex justify-between pt-4 border-t mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
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

            <div className="flex gap-3">
              {editMode ? (
                <>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditMode(true)}>
                  Editar
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Product Dialog */}
      <ProductDetailDialog
        product={null}
        clientId={formData.client_id}
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        onSave={() => {
          // Refresh products after creating new one
        }}
      />
    </Dialog>
  );
}
