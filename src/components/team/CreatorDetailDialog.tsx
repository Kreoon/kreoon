import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Content, STATUS_LABELS, STATUS_COLORS } from "@/types/database";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { User, Video, Mail, Phone, Calendar, DollarSign, MapPin, Instagram, Facebook, Edit } from "lucide-react";
import { CreatorEditorForm } from "./CreatorEditorForm";

interface CreatorProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  document_type?: string | null;
  document_number?: string | null;
  city?: string | null;
  address?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  role: 'creator' | 'editor';
}

interface CreatorDetailDialogProps {
  creator: CreatorProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  cc: "Cédula de Ciudadanía",
  ce: "Cédula de Extranjería",
  passport: "Pasaporte",
  nit: "NIT"
};

export function CreatorDetailDialog({ creator, open, onOpenChange, onUpdate }: CreatorDetailDialogProps) {
  const { isAdmin } = useAuth();
  const [assignedContent, setAssignedContent] = useState<Content[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [fullProfile, setFullProfile] = useState<CreatorProfile | null>(null);

  useEffect(() => {
    if (creator && open) {
      fetchFullProfile();
      fetchAssignedContent();
    }
  }, [creator, open]);

  const fetchFullProfile = async () => {
    if (!creator) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', creator.id)
        .single();
      
      if (data) {
        setFullProfile({ ...data, role: creator.role } as CreatorProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

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

  const handleFormSuccess = () => {
    fetchFullProfile();
    onUpdate?.();
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  const profile = fullProfile || creator;

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
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
                  <DialogTitle className="text-xl">{profile?.full_name}</DialogTitle>
                  <Badge className={roleLabels[creator.role].className}>
                    {roleLabels[creator.role].label}
                  </Badge>
                </div>
              </div>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </DialogHeader>

          <Tabs defaultValue="info" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="content">Contenido ({assignedContent.length})</TabsTrigger>
              <TabsTrigger value="stats">Estadísticas</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 mt-4">
              {/* Datos Personales */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Datos Personales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <User className="h-3 w-3" /> Nombre
                    </Label>
                    <p className="font-medium">{profile?.full_name}</p>
                  </div>

                  {profile?.document_type && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Documento</Label>
                      <p className="font-medium">
                        {DOCUMENT_TYPE_LABELS[profile.document_type] || profile.document_type}: {profile?.document_number || "—"}
                      </p>
                    </div>
                  )}

                  {profile?.city && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Ciudad
                      </Label>
                      <p className="font-medium">{profile.city}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contacto */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Contacto</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <Phone className="h-3 w-3" /> WhatsApp / Teléfono
                    </Label>
                    <p className="font-medium">{profile?.phone || "—"}</p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </Label>
                    <p className="font-medium">{profile?.email}</p>
                  </div>

                  {profile?.address && (
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-muted-foreground text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Dirección
                      </Label>
                      <p className="font-medium">{profile.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Redes Sociales */}
              {(profile?.instagram || profile?.facebook || profile?.tiktok) && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Redes Sociales</h4>
                  <div className="flex flex-wrap gap-3">
                    {profile?.instagram && (
                      <a 
                        href={`https://instagram.com/${profile.instagram.replace('@', '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <Instagram className="h-4 w-4" />
                        <span className="text-sm">{profile.instagram}</span>
                      </a>
                    )}
                    {profile?.facebook && (
                      <a 
                        href={profile.facebook.startsWith('http') ? profile.facebook : `https://facebook.com/${profile.facebook}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <Facebook className="h-4 w-4" />
                        <span className="text-sm">{profile.facebook}</span>
                      </a>
                    )}
                    {profile?.tiktok && (
                      <a 
                        href={`https://tiktok.com/${profile.tiktok.replace('@', '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                        </svg>
                        <span className="text-sm">{profile.tiktok}</span>
                      </a>
                    )}
                  </div>
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

      {fullProfile && (
        <CreatorEditorForm
          open={showEditForm}
          onOpenChange={setShowEditForm}
          profile={fullProfile}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}
