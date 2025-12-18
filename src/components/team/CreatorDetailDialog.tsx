import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Content, STATUS_LABELS, STATUS_COLORS } from "@/types/database";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { User, Video, Save, Mail, Phone, Calendar, DollarSign } from "lucide-react";

interface CreatorDetailDialogProps {
  creator: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    phone: string | null;
    bio: string | null;
    role: 'creator' | 'editor';
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function CreatorDetailDialog({ creator, open, onOpenChange, onUpdate }: CreatorDetailDialogProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [assignedContent, setAssignedContent] = useState<Content[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    bio: ""
  });

  useEffect(() => {
    if (creator) {
      setFormData({
        full_name: creator.full_name || "",
        email: creator.email || "",
        phone: creator.phone || "",
        bio: creator.bio || ""
      });
      fetchAssignedContent();
    }
  }, [creator]);

  const fetchAssignedContent = async () => {
    if (!creator) return;
    setLoadingContent(true);
    try {
      const field = creator.role === 'creator' ? 'creator_id' : 'editor_id';
      const { data } = await supabase
        .from('content')
        .select(`
          *,
          client:clients(name)
        `)
        .eq(field, creator.id)
        .order('created_at', { ascending: false });
      
      setAssignedContent((data || []) as Content[]);
    } catch (error) {
      console.error('Error fetching assigned content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSave = async () => {
    if (!creator) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          bio: formData.bio || null
        })
        .eq('id', creator.id);

      if (error) throw error;

      toast({
        title: "Guardado",
        description: "Los cambios se han guardado exitosamente"
      });
      
      setEditMode(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating profile:', error);
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

  const totalPayment = assignedContent.reduce((sum, c) => {
    return sum + (creator?.role === 'creator' ? (c.creator_payment || 0) : (c.editor_payment || 0));
  }, 0);

  const completedContent = assignedContent.filter(c => c.status === 'approved' || c.status === 'paid');
  const activeContent = assignedContent.filter(c => !['approved', 'paid'].includes(c.status));

  if (!creator) return null;

  const roleLabels = {
    creator: { label: "Creador", className: "bg-primary/10 text-primary" },
    editor: { label: "Editor", className: "bg-info/10 text-info" }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            {creator.avatar_url ? (
              <img 
                src={creator.avatar_url} 
                alt={creator.full_name}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <DialogTitle className="text-xl">{creator.full_name}</DialogTitle>
              <Badge className={roleLabels[creator.role].className}>
                {roleLabels[creator.role].label}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="content">Contenido ({assignedContent.length})</TabsTrigger>
            <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <User className="h-3 w-3" /> Nombre
                </Label>
                {editMode ? (
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{creator.full_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                <p className="font-medium">{creator.email}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Teléfono
                </Label>
                {editMode ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{creator.phone || "—"}</p>
                )}
              </div>
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
                <p className="text-muted-foreground">No tiene contenido asignado</p>
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
                            <p className="text-xs text-muted-foreground">{content.client?.name}</p>
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
                            <p className="text-xs text-muted-foreground">{content.client?.name}</p>
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
                <p className="text-xs text-muted-foreground">Total asignados</p>
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
                  {totalPayment.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total ganado</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
