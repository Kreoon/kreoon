import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target,
  TrendingUp,
  FileVideo,
  CheckCircle,
  XCircle,
  DollarSign,
  Megaphone,
  Layers,
  Zap,
  Lightbulb,
  RefreshCw,
  Heart
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SPHERE_PHASES, SpherePhase, getSpherePhaseConfig } from "./types";

interface ClientMarketingDashboardProps {
  organizationId: string | null | undefined;
  clientId: string | null | undefined;
}

interface DashboardStats {
  activeObjective: string | null;
  totalContent: number;
  approvedContent: number;
  rejectedContent: number;
  pendingContent: number;
  inCampaignContent: number;
  activeCampaigns: number;
  totalInvestment: number;
  sphereCoverage: {
    engage: number;
    solution: number;
    remarketing: number;
    fidelize: number;
  };
}

const SPHERE_ICONS: Record<SpherePhase, React.ReactNode> = {
  engage: <Zap className="h-4 w-4" />,
  solution: <Lightbulb className="h-4 w-4" />,
  remarketing: <RefreshCw className="h-4 w-4" />,
  fidelize: <Heart className="h-4 w-4" />,
};

export function ClientMarketingDashboard({ organizationId, clientId }: ClientMarketingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (organizationId && clientId) {
      fetchStats();
    } else {
      setStats(null);
      setLoading(false);
    }
  }, [organizationId, clientId]);

  const fetchStats = async () => {
    if (!organizationId || !clientId) return;
    setLoading(true);

    try {
      // Fetch strategy
      const { data: strategy } = await supabase
        .from('marketing_strategies')
        .select('business_objective')
        .eq('organization_id', organizationId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch content stats
      const { data: contentData } = await supabase
        .from('content')
        .select('id, strategy_status, sphere_phase')
        .eq('organization_id', organizationId)
        .eq('client_id', clientId);

      const content = contentData || [];
      
      // Count by status
      const approved = content.filter(c => c.strategy_status === 'aprobado_estrategia').length;
      const rejected = content.filter(c => c.strategy_status === 'rechazado_estrategia').length;
      const pending = content.filter(c => c.strategy_status === 'pendiente_validacion').length;
      const inCampaign = content.filter(c => c.strategy_status === 'en_campaña').length;

      // Count by sphere phase
      const engage = content.filter(c => c.sphere_phase === 'engage').length;
      const solution = content.filter(c => c.sphere_phase === 'solution').length;
      const remarketing = content.filter(c => c.sphere_phase === 'remarketing').length;
      const fidelize = content.filter(c => c.sphere_phase === 'fidelize').length;

      // Fetch campaigns
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('id, status, spent')
        .eq('organization_id', organizationId)
        .eq('client_id', clientId);

      const activeCampaigns = (campaigns || []).filter(c => c.status === 'active').length;
      const totalInvestment = (campaigns || []).reduce((sum, c) => sum + (Number(c.spent) || 0), 0);

      setStats({
        activeObjective: strategy?.business_objective || null,
        totalContent: content.length,
        approvedContent: approved,
        rejectedContent: rejected,
        pendingContent: pending,
        inCampaignContent: inCampaign,
        activeCampaigns,
        totalInvestment,
        sphereCoverage: { engage, solution, remarketing, fidelize },
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!clientId) {
    return (
      <Card className="p-12 text-center border-dashed">
        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">Selecciona un cliente</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Selecciona un cliente para ver su dashboard de marketing
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const totalSphere = stats.sphereCoverage.engage + stats.sphereCoverage.solution + 
                      stats.sphereCoverage.remarketing + stats.sphereCoverage.fidelize;
  
  const getPhasePercent = (count: number) => totalSphere > 0 ? (count / totalSphere) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Objective Card */}
      {stats.activeObjective && (
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/20">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Objetivo Activo</p>
                <p className="text-lg font-semibold mt-1">{stats.activeObjective}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <FileVideo className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalContent}</p>
                <p className="text-sm text-muted-foreground">Total Contenidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approvedContent}</p>
                  <p className="text-sm text-muted-foreground">Aprobados</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-red-600 font-medium">{stats.rejectedContent}</p>
                <p className="text-xs text-muted-foreground">Rechazados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Megaphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeCampaigns}</p>
                <p className="text-sm text-muted-foreground">Campañas Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('es-CO', { 
                    style: 'currency', 
                    currency: 'COP',
                    minimumFractionDigits: 0 
                  }).format(stats.totalInvestment)}
                </p>
                <p className="text-sm text-muted-foreground">Inversión Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sphere Coverage - Método Esfera */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Cobertura Método Esfera
          </CardTitle>
          <CardDescription>
            Distribución del contenido por fase del Método Esfera
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {SPHERE_PHASES.map((phase) => {
              const count = stats.sphereCoverage[phase.value];
              const percent = getPhasePercent(count);
              
              return (
                <div key={phase.value} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Badge className={`${phase.bgColor} ${phase.color} gap-1`}>
                        {SPHERE_ICONS[phase.value]}
                        {phase.label}
                      </Badge>
                      <span className="text-muted-foreground">{phase.objective}</span>
                    </span>
                    <span className="font-medium">{count} piezas ({percent.toFixed(0)}%)</span>
                  </div>
                  <Progress value={percent} className="h-2" />
                </div>
              );
            })}
          </div>

          {/* Sphere Warnings */}
          {totalSphere > 0 && (
            <div className="pt-4 border-t space-y-2">
              {getPhasePercent(stats.sphereCoverage.solution) < 10 && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950 p-2 rounded">
                  <TrendingUp className="h-4 w-4" />
                  <span>Falta contenido SOLUCIÓN. Crea más demostraciones y casos de uso.</span>
                </div>
              )}
              {getPhasePercent(stats.sphereCoverage.remarketing) < 10 && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded">
                  <TrendingUp className="h-4 w-4" />
                  <span>Falta contenido REMARKETING. Necesitas más prueba social y manejo de objeciones.</span>
                </div>
              )}
              {getPhasePercent(stats.sphereCoverage.fidelize) < 5 && (
                <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 dark:bg-purple-950 p-2 rounded">
                  <TrendingUp className="h-4 w-4" />
                  <span>Sin contenido FIDELIZAR. Considera crear contenido educativo y de comunidad.</span>
                </div>
              )}
              {getPhasePercent(stats.sphereCoverage.engage) > 60 && (
                <div className="flex items-center gap-2 text-sm text-cyan-600 bg-cyan-50 dark:bg-cyan-950 p-2 rounded">
                  <TrendingUp className="h-4 w-4" />
                  <span>Exceso de ENGANCHAR. Balancea con contenido de Solución y Remarketing.</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}