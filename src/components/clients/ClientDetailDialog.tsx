import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Content, STATUS_LABELS, STATUS_COLORS } from "@/types/database";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Building2, Video, Save, Mail, Phone, Calendar, DollarSign } from "lucide-react";

interface ClientDetailDialogProps {
  client: {
    id: string;
    name: string;
    logo_url: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    notes: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ClientDetailDialog({ client, open, onOpenChange, onUpdate }: ClientDetailDialogProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [assignedContent, setAssignedContent] = useState<Content[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    notes: ""
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        contact_email: client.contact_email || "",
        contact_phone: client.contact_phone || "",
        notes: client.notes || ""
      });
      fetchClientContent();
    }
  }, [client]);

  const fetchClientContent = async () => {
    if (!client) return;
    setLoadingContent(true);
    try {
      const { data } = await supabase
        .from('content')
        .select(`
          *,
          creator:profiles!content_creator_id_fkey(full_name),
          editor:profiles!content_editor_id_fkey(full_name)
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
      
      setAssignedContent((data || []) as any[]);
    } catch (error) {
      console.error('Error fetching client content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSave = async () => {
    if (!client) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          notes: formData.notes || null
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: "Guardado",
        description: "Los cambios se han guardado exitosamente"
      });
      
      setEditMode(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  const totalValue = assignedContent.reduce((sum, c) => {
    return sum + (c.creator_payment || 0) + (c.editor_payment || 0);
  }, 0);

  const completedContent = assignedContent.filter(c => c.status === 'approved' || c.status === 'paid');
  const activeContent = assignedContent.filter(c => !['approved', 'paid'].includes(c.status));

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            {client.logo_url ? (
              <img 
                src={client.logo_url} 
                alt={client.name}
                className="h-16 w-16 rounded-lg object-cover ring-2 ring-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center ring-2 ring-border">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <DialogTitle className="text-xl">{client.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{client.contact_email}</p>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="content">Proyectos ({assignedContent.length})</TabsTrigger>
            <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Nombre
                </Label>
                {editMode ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{client.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                {editMode ? (
                  <Input
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{client.contact_email || "—"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Teléfono
                </Label>
                {editMode ? (
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{client.contact_phone || "—"}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Notas</Label>
              {editMode ? (
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              ) : (
                <p className="text-sm">{client.notes || "Sin notas"}</p>
              )}
            </div>

            {isAdmin && (
              <div className="flex justify-end gap-3 pt-4 border-t">
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
            )}
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            {loadingContent ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : assignedContent.length === 0 ? (
              <div className="text-center py-8">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No tiene proyectos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeContent.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Activos ({activeContent.length})</h4>
                    <div className="space-y-2">
                      {activeContent.map(content => (
                        <div key={content.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{content.title}</p>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              {content.creator && <span>Creador: {content.creator.full_name}</span>}
                              {content.editor && <span>Editor: {content.editor.full_name}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={STATUS_COLORS[content.status]} variant="secondary">
                              {STATUS_LABELS[content.status]}
                            </Badge>
                            {content.deadline && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(content.deadline)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {completedContent.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Completados ({completedContent.length})</h4>
                    <div className="space-y-2">
                      {completedContent.slice(0, 5).map(content => (
                        <div key={content.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{content.title}</p>
                          </div>
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            Completado
                          </Badge>
                        </div>
                      ))}
                      {completedContent.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          + {completedContent.length - 5} más
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border bg-card text-center">
                <p className="text-2xl font-bold text-primary">{assignedContent.length}</p>
                <p className="text-xs text-muted-foreground">Total proyectos</p>
              </div>
              <div className="p-4 rounded-lg border bg-card text-center">
                <p className="text-2xl font-bold text-info">{activeContent.length}</p>
                <p className="text-xs text-muted-foreground">En progreso</p>
              </div>
              <div className="p-4 rounded-lg border bg-card text-center">
                <p className="text-2xl font-bold text-success">{completedContent.length}</p>
                <p className="text-xs text-muted-foreground">Completados</p>
              </div>
              <div className="p-4 rounded-lg border bg-card text-center">
                <p className="text-2xl font-bold text-warning flex items-center justify-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {totalValue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Valor total</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
