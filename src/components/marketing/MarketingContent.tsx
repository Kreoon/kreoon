import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileVideo, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  Play,
  Zap,
  Lightbulb,
  RefreshCw,
  Heart,
  Target,
  Megaphone,
  Eye,
  ExternalLink,
  Copy,
  Download,
  MoreHorizontal,
  Send,
  Calendar,
  Users,
  Volume2,
  VolumeX
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentValidationDialog } from "./ContentValidationDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SPHERE_PHASES, SpherePhase, getSpherePhaseConfig } from "./types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HLSVideoPlayer, HLSVideoPlayerRef } from "@/components/video/HLSVideoPlayer";

interface MarketingContentProps {
  organizationId: string | null | undefined;
  selectedClientId?: string | null;
}

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  strategy_status: string;
  sphere_phase: SpherePhase | null;
  target_platform: string | null;
  content_objective: string | null;
  hook: string | null;
  cta: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  bunny_embed_url: string | null;
  script: string | null;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
  marketing_approved_at: string | null;
  marketing_campaign_id: string | null;
  trafficker_guidelines: string | null;
  strategist_guidelines: string | null;
  creator_id: string | null;
  client?: { id: string; name: string; logo_url: string | null } | null;
}

const SPHERE_ICONS: Record<SpherePhase, React.ReactNode> = {
  engage: <Zap className="h-3 w-3" />,
  solution: <Lightbulb className="h-3 w-3" />,
  remarketing: <RefreshCw className="h-3 w-3" />,
  fidelize: <Heart className="h-3 w-3" />,
};

export function MarketingContent({ organizationId, selectedClientId }: MarketingContentProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [filterSphere, setFilterSphere] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("available");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [assignData, setAssignData] = useState({
    campaign_id: "",
    sphere_phase: "" as SpherePhase | "",
    trafficker_guidelines: "",
    strategist_guidelines: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchApprovedContent();
      fetchClients();
      fetchCampaigns();
    }
  }, [organizationId, selectedClientId, filterSphere, filterClient, activeTab]);

  const fetchClients = async () => {
    if (!organizationId) return;
    
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('organization_id', organizationId)
      .or('strategy_service_enabled.eq.true,traffic_service_enabled.eq.true')
      .order('name');
    
    setClients(data || []);
  };

  const fetchCampaigns = async () => {
    if (!organizationId) return;
    
    const { data } = await supabase
      .from('marketing_campaigns')
      .select('id, name')
      .eq('organization_id', organizationId)
      .in('status', ['planning', 'active'])
      .order('name');
    
    setCampaigns(data || []);
  };

  const fetchApprovedContent = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      let query = supabase
        .from('content')
        .select(`
          id, title, description, status, strategy_status, sphere_phase,
          target_platform, content_objective, hook, cta, thumbnail_url,
          video_url, bunny_embed_url, script, created_at, approved_at, paid_at,
          marketing_approved_at, marketing_campaign_id, creator_id,
          trafficker_guidelines, strategist_guidelines,
          client:clients!content_client_id_fkey(id, name, logo_url)
        `)
        .eq('organization_id', organizationId);

      // Filter by tab
      if (activeTab === "available") {
        // Contenido aprobado o pagado, disponible para marketing
        query = query.in('status', ['approved', 'paid']);
      } else if (activeTab === "in_campaign") {
        // Contenido ya asignado a campaña
        query = query.not('marketing_campaign_id', 'is', null);
      } else if (activeTab === "marketing_approved") {
        // Contenido aprobado por marketing
        query = query.not('marketing_approved_at', 'is', null);
      }

      // Filter by client if selected
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      } else if (filterClient !== "all") {
        query = query.eq('client_id', filterClient);
      }

      // Filter by sphere phase
      if (filterSphere !== "all") {
        query = query.eq('sphere_phase', filterSphere as SpherePhase);
      }

      const { data, error } = await query.order('approved_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setContent((data || []) as unknown as ContentItem[]);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Error al cargar contenidos');
    } finally {
      setLoading(false);
    }
  };

  const getSphereConfig = (phase: SpherePhase | string | null) => {
    if (!phase) return null;
    return getSpherePhaseConfig(phase as SpherePhase);
  };

  const handleAssignToCampaign = async () => {
    if (!selectedContent || !assignData.campaign_id) {
      toast.error('Selecciona una campaña');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('content')
        .update({
          marketing_campaign_id: assignData.campaign_id,
          sphere_phase: assignData.sphere_phase || null,
          trafficker_guidelines: assignData.trafficker_guidelines || null,
          strategist_guidelines: assignData.strategist_guidelines || null,
          strategy_status: 'en_campaña',
        })
        .eq('id', selectedContent.id);

      if (error) throw error;

      toast.success('Contenido asignado a campaña');
      setShowAssignDialog(false);
      setAssignData({ campaign_id: "", sphere_phase: "", trafficker_guidelines: "", strategist_guidelines: "" });
      fetchApprovedContent();
    } catch (error) {
      console.error('Error assigning content:', error);
      toast.error('Error al asignar contenido');
    } finally {
      setSaving(false);
    }
  };

  const handleMarketingApproval = async (contentId: string, approved: boolean) => {
    try {
      const updates: Record<string, unknown> = approved
        ? { marketing_approved_at: new Date().toISOString() }
        : { marketing_rejected_at: new Date().toISOString() };

      const { error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', contentId);

      if (error) throw error;
      
      toast.success(approved ? 'Contenido aprobado para marketing' : 'Contenido rechazado');
      fetchApprovedContent();
    } catch (error) {
      console.error('Error updating content:', error);
      toast.error('Error al actualizar');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  const getContentCounts = () => {
    return {
      available: content.filter(c => !c.marketing_campaign_id).length,
      in_campaign: content.filter(c => c.marketing_campaign_id).length,
      marketing_approved: content.filter(c => c.marketing_approved_at).length,
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileVideo className="h-5 w-5 text-primary" />
            Contenido para Marketing
          </h3>
          <p className="text-sm text-muted-foreground">
            Contenido aprobado disponible para campañas y pauta
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Disponible
          </TabsTrigger>
          <TabsTrigger value="in_campaign" className="gap-2">
            <Megaphone className="h-4 w-4" />
            En Campaña
          </TabsTrigger>
          <TabsTrigger value="marketing_approved" className="gap-2">
            <Target className="h-4 w-4" />
            Aprobado Marketing
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            {!selectedClientId && (
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filterSphere} onValueChange={setFilterSphere}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Fase Esfera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fases</SelectItem>
                {SPHERE_PHASES.map((phase) => (
                  <SelectItem key={phase.value} value={phase.value}>
                    <span className="flex items-center gap-2">
                      {SPHERE_ICONS[phase.value]}
                      {phase.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Grid */}
          {content.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <FileVideo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Sin contenido</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {activeTab === "available" 
                  ? "No hay contenido aprobado disponible para marketing"
                  : activeTab === "in_campaign"
                  ? "No hay contenido asignado a campañas"
                  : "No hay contenido aprobado por marketing"}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {content.map((item) => {
                const sphereConfig = getSphereConfig(item.sphere_phase);

                return (
                  <Card 
                    key={item.id} 
                    className="group hover:shadow-lg transition-all overflow-hidden"
                  >
                    {/* Video/Thumbnail */}
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {(item.video_url || item.bunny_embed_url) ? (
                        <HLSVideoPlayer
                          src={item.video_url || item.bunny_embed_url || ''}
                          poster={item.thumbnail_url || undefined}
                          autoPlay={false}
                          muted={true}
                          loop={true}
                          aspectRatio="16:9"
                          objectFit="cover"
                          showControls={false}
                          className="w-full h-full"
                        />
                      ) : item.thumbnail_url ? (
                        <img 
                          src={item.thumbnail_url} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileVideo className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Status Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {sphereConfig && (
                          <Badge className={`${sphereConfig.bgColor} ${sphereConfig.color} gap-1`}>
                            {SPHERE_ICONS[item.sphere_phase!]}
                            {sphereConfig.label}
                          </Badge>
                        )}
                        {item.marketing_approved_at && (
                          <Badge className="bg-green-500 text-white gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Aprobado MKT
                          </Badge>
                        )}
                      </div>

                      {/* Client Badge */}
                      {item.client && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="gap-1">
                            {item.client.logo_url ? (
                              <img src={item.client.logo_url} className="h-3 w-3 rounded" alt="" />
                            ) : null}
                            {item.client.name}
                          </Badge>
                        </div>
                      )}

                      {/* Play Overlay */}
                      {(item.video_url || item.bunny_embed_url) && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => {
                            setSelectedContent(item);
                            setShowValidation(true);
                          }}
                        >
                          <div className="p-3 rounded-full bg-white/90">
                            <Play className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold line-clamp-1">{item.title}</h4>
                          {item.content_objective && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {item.content_objective}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedContent(item);
                              setShowValidation(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalles
                            </DropdownMenuItem>
                            {!item.marketing_campaign_id && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedContent(item);
                                setAssignData({
                                  campaign_id: "",
                                  sphere_phase: item.sphere_phase || "",
                                  trafficker_guidelines: item.trafficker_guidelines || "",
                                  strategist_guidelines: item.strategist_guidelines || "",
                                });
                                setShowAssignDialog(true);
                              }}>
                                <Megaphone className="h-4 w-4 mr-2" />
                                Asignar a Campaña
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {item.hook && (
                              <DropdownMenuItem onClick={() => copyToClipboard(item.hook!, 'Hook')}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Hook
                              </DropdownMenuItem>
                            )}
                            {item.cta && (
                              <DropdownMenuItem onClick={() => copyToClipboard(item.cta!, 'CTA')}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar CTA
                              </DropdownMenuItem>
                            )}
                            {item.script && (
                              <DropdownMenuItem onClick={() => copyToClipboard(item.script!, 'Guión')}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Guión
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {!item.marketing_approved_at && (
                              <>
                                <DropdownMenuItem onClick={() => handleMarketingApproval(item.id, true)}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Aprobar para Marketing
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMarketingApproval(item.id, false)}>
                                  <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                  Rechazar
                                </DropdownMenuItem>
                              </>
                            )}
                            {(item.video_url || item.bunny_embed_url) && (
                              <DropdownMenuItem asChild>
                                <a href={item.video_url || item.bunny_embed_url || ''} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Abrir Video
                                </a>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {item.target_platform && (
                            <Badge variant="outline" className="text-xs">
                              {item.target_platform}
                            </Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.approved_at 
                            ? format(new Date(item.approved_at), "d MMM", { locale: es })
                            : format(new Date(item.created_at), "d MMM", { locale: es })}
                        </span>
                      </div>

                      {/* Actions */}
                      {!item.marketing_campaign_id && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setSelectedContent(item);
                              setAssignData({
                                campaign_id: "",
                                sphere_phase: item.sphere_phase || "",
                                trafficker_guidelines: item.trafficker_guidelines || "",
                                strategist_guidelines: item.strategist_guidelines || "",
                              });
                              setShowAssignDialog(true);
                            }}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Usar en Campaña
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Tabs>

      {/* Validation Dialog */}
      <ContentValidationDialog
        content={selectedContent}
        open={showValidation}
        onOpenChange={setShowValidation}
        onSuccess={() => {
          fetchApprovedContent();
          setShowValidation(false);
        }}
        organizationId={organizationId}
        clientId={selectedClientId}
      />

      {/* Assign to Campaign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Asignar a Campaña
            </DialogTitle>
            <DialogDescription>
              Configura el contenido "{selectedContent?.title}" para usarlo en una campaña de marketing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Campaign Select */}
            <div className="space-y-2">
              <Label>Campaña de Destino</Label>
              <Select 
                value={assignData.campaign_id} 
                onValueChange={(v) => setAssignData(prev => ({ ...prev, campaign_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una campaña" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sphere Phase */}
            <div className="space-y-2">
              <Label>Fase Esfera</Label>
              <Select 
                value={assignData.sphere_phase} 
                onValueChange={(v) => setAssignData(prev => ({ ...prev, sphere_phase: v as SpherePhase }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Asignar fase del Método Esfera" />
                </SelectTrigger>
                <SelectContent>
                  {SPHERE_PHASES.map((phase) => (
                    <SelectItem key={phase.value} value={phase.value}>
                      <span className="flex items-center gap-2">
                        {SPHERE_ICONS[phase.value]}
                        {phase.label} - {phase.objective}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Strategist Guidelines */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" />
                Indicaciones para Estratega
              </Label>
              <Textarea
                value={assignData.strategist_guidelines}
                onChange={(e) => setAssignData(prev => ({ ...prev, strategist_guidelines: e.target.value }))}
                placeholder="Ángulo de venta, emoción principal, objetivo estratégico..."
                rows={3}
              />
            </div>

            {/* Trafficker Guidelines */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-blue-600" />
                Indicaciones para Trafficker
              </Label>
              <Textarea
                value={assignData.trafficker_guidelines}
                onChange={(e) => setAssignData(prev => ({ ...prev, trafficker_guidelines: e.target.value }))}
                placeholder="Público objetivo, segmentación sugerida, presupuesto recomendado..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignToCampaign} disabled={saving || !assignData.campaign_id}>
              {saving ? 'Asignando...' : 'Asignar a Campaña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
