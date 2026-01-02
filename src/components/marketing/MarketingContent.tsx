import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Heart
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentValidationDialog } from "./ContentValidationDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SPHERE_PHASES, SpherePhase, getSpherePhaseConfig } from "./types";

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
  sphere_phase: SpherePhase;
  target_platform: string | null;
  content_objective: string | null;
  hook: string | null;
  cta: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  script: string | null;
  created_at: string;
  creator?: { id: string; display_name: string; avatar_url: string | null } | null;
  client?: { id: string; name: string; logo_url: string | null } | null;
}

const STRATEGY_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Borrador', color: 'bg-gray-500', icon: <Clock className="h-4 w-4" /> },
  pendiente_validacion: { label: 'Pendiente', color: 'bg-amber-500', icon: <Clock className="h-4 w-4" /> },
  aprobado_estrategia: { label: 'Aprobado', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4" /> },
  rechazado_estrategia: { label: 'Rechazado', color: 'bg-red-500', icon: <XCircle className="h-4 w-4" /> },
  en_campaña: { label: 'En Campaña', color: 'bg-blue-500', icon: <Play className="h-4 w-4" /> },
  archivado: { label: 'Archivado', color: 'bg-gray-400', icon: <Clock className="h-4 w-4" /> },
};

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
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSphere, setFilterSphere] = useState<string>("all");

  useEffect(() => {
    if (organizationId && selectedClientId) {
      fetchContent();
    } else {
      setContent([]);
      setLoading(false);
    }
  }, [organizationId, selectedClientId, filterStatus, filterSphere]);

  const fetchContent = async () => {
    if (!organizationId || !selectedClientId) return;
    setLoading(true);

    try {
      let query = supabase
        .from('content')
        .select(`
          id, title, description, status, strategy_status, sphere_phase,
          target_platform, content_objective, hook, cta, thumbnail_url,
          video_url, script, created_at,
          creator:profiles!content_creator_id_fkey(id, display_name, avatar_url),
          client:clients!content_client_id_fkey(id, name, logo_url)
        `)
        .eq('organization_id', organizationId)
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq('strategy_status', filterStatus);
      }

      if (filterSphere !== "all") {
        query = query.eq('sphere_phase', filterSphere as SpherePhase);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContent((data || []) as unknown as ContentItem[]);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Error al cargar contenidos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    return STRATEGY_STATUS_CONFIG[status] || STRATEGY_STATUS_CONFIG.draft;
  };

  const getSphereConfig = (phase: SpherePhase | string) => {
    return getSpherePhaseConfig(phase as SpherePhase);
  };

  const getStatusCounts = () => {
    const counts: Record<string, number> = {};
    content.forEach(c => {
      counts[c.strategy_status] = (counts[c.strategy_status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (!selectedClientId) {
    return (
      <Card className="p-12 text-center border-dashed">
        <FileVideo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">Selecciona un cliente</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Selecciona un cliente para analizar y validar su contenido de marketing
        </p>
      </Card>
    );
  }

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
      {/* Header with Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950 dark:to-amber-900/50 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts['pendiente_validacion'] || 0}</p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950 dark:to-green-900/50 border-green-200 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500/20">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts['aprobado_estrategia'] || 0}</p>
              <p className="text-sm text-muted-foreground">Aprobados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950 dark:to-red-900/50 border-red-200 dark:border-red-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500/20">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts['rechazado_estrategia'] || 0}</p>
              <p className="text-sm text-muted-foreground">Rechazados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500/20">
              <Play className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts['en_campaña'] || 0}</p>
              <p className="text-sm text-muted-foreground">En Campaña</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STRATEGY_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSphere} onValueChange={setFilterSphere}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fase Esfera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las fases</SelectItem>
            {SPHERE_PHASES.map((phase) => (
              <SelectItem key={phase.value} value={phase.value}>{phase.label}</SelectItem>
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
            No hay contenido disponible para validar con los filtros seleccionados
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {content.map((item) => {
            const statusConfig = getStatusConfig(item.strategy_status);
            const sphereConfig = getSphereConfig(item.sphere_phase);

            return (
              <Card 
                key={item.id} 
                className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                onClick={() => {
                  setSelectedContent(item);
                  setShowValidation(true);
                }}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted">
                  {item.thumbnail_url ? (
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
                  {/* Status Badge Overlay */}
                  <div className="absolute top-2 right-2">
                    <Badge className={`${statusConfig.color} text-white gap-1`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </Badge>
                  </div>
                  {/* Sphere Phase Overlay */}
                  <div className="absolute top-2 left-2">
                    <Badge className={`${sphereConfig.bgColor} ${sphereConfig.color} gap-1`}>
                      {SPHERE_ICONS[item.sphere_phase]}
                      {sphereConfig.label}
                    </Badge>
                  </div>
                  {/* Play Button Overlay */}
                  {item.video_url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-3 rounded-full bg-white/90">
                        <Play className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h4 className="font-semibold line-clamp-1">{item.title}</h4>
                    {item.content_objective && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.content_objective}
                      </p>
                    )}
                  </div>

                  {/* Platform & Date */}
                  <div className="flex items-center justify-between text-sm">
                    {item.target_platform && (
                      <Badge variant="outline" className="text-xs">
                        {item.target_platform}
                      </Badge>
                    )}
                    <span className="text-muted-foreground">
                      {format(new Date(item.created_at), "d MMM", { locale: es })}
                    </span>
                  </div>

                  {/* Creator */}
                  {item.creator && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={item.creator.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {item.creator.display_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground truncate">
                        {item.creator.display_name}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Validation Dialog */}
      <ContentValidationDialog
        content={selectedContent}
        open={showValidation}
        onOpenChange={setShowValidation}
        onSuccess={() => {
          fetchContent();
          setShowValidation(false);
        }}
        organizationId={organizationId}
        clientId={selectedClientId}
      />
    </div>
  );
}