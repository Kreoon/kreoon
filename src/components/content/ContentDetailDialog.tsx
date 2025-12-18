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
import { Content, STATUS_LABELS, STATUS_COLORS, ContentStatus } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Calendar, User, Video, Link as LinkIcon, 
  DollarSign, FileText, Save, ExternalLink,
  Clock, CheckCircle, Trash2
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
  const { isAdmin, isClient } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    product: "",
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
      fetchOptions();
    }
  }, [content]);

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

  if (!content) return null;

  const canEdit = isAdmin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Video className="h-5 w-5 text-primary" />
              {editMode ? (
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-xl font-bold"
                />
              ) : (
                content.title
              )}
            </DialogTitle>
            <Badge className={STATUS_COLORS[content.status]}>
              {STATUS_LABELS[content.status]}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="equipo">Equipo</TabsTrigger>
            <TabsTrigger value="fechas">Fechas</TabsTrigger>
            {isAdmin && <TabsTrigger value="pagos">Pagos</TabsTrigger>}
          </TabsList>

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

            {/* Guión */}
            <div className="space-y-2 pt-4 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" /> Guión / Estrategia
              </h4>
              {editMode ? (
                <Textarea
                  value={formData.script}
                  onChange={(e) => setFormData({ ...formData, script: e.target.value })}
                  rows={8}
                />
              ) : (
                <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {content.script || "Sin guión"}
                </div>
              )}
            </div>
          </TabsContent>

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
    </Dialog>
  );
}
