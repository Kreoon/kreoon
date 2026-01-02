import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  DollarSign, 
  TrendingUp, 
  Radio, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(value);
};

interface MarketingDashboardProps {
  organizationId: string | null | undefined;
  selectedClientId?: string | null;
}

interface DashboardData {
  mainObjective: {
    type: string;
    value: number;
    current: number;
    period: string;
  };
  investment: {
    monthly: number;
    spent: number;
    currency: string;
  };
  roi: {
    estimated: number;
    trend: 'up' | 'down' | 'stable';
  };
  channels: {
    active: number;
    total: number;
  };
  campaigns: {
    active: number;
    total: number;
  };
  syncStatus: {
    lastSync: string | null;
    pendingChannels: number;
  };
}

const OBJECTIVE_LABELS: Record<string, string> = {
  sales: "Ventas",
  leads: "Leads",
  traffic: "Tráfico",
  awareness: "Alcance",
};

export function MarketingDashboard({ organizationId, selectedClientId }: MarketingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (organizationId) {
      fetchDashboardData();
    }
  }, [organizationId, selectedClientId]);

  const fetchDashboardData = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      // Fetch dashboard config
      const { data: config } = await supabase
        .from('marketing_dashboard_config')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      // Fetch channels
      const { data: channels } = await supabase
        .from('traffic_channels')
        .select('id, status, last_sync_at')
        .eq('organization_id', organizationId);

      // Fetch campaigns
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('id, status')
        .eq('organization_id', organizationId);

      // Fetch recent sync logs for investment calculation
      const { data: syncLogs } = await supabase
        .from('traffic_sync_logs')
        .select('investment, sales, leads')
        .eq('organization_id', organizationId)
        .gte('sync_date', new Date(new Date().setDate(1)).toISOString().split('T')[0]);

      const totalInvestment = syncLogs?.reduce((sum, log) => sum + (Number(log.investment) || 0), 0) || 0;
      const totalSales = syncLogs?.reduce((sum, log) => sum + (Number(log.sales) || 0), 0) || 0;
      const totalLeads = syncLogs?.reduce((sum, log) => sum + (Number(log.leads) || 0), 0) || 0;

      const activeChannels = channels?.filter(c => c.status === 'active').length || 0;
      const pendingSyncChannels = channels?.filter(c => !c.last_sync_at || c.last_sync_at < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).length || 0;
      const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;

      let currentValue = 0;
      if (config?.main_objective_type === 'sales') currentValue = totalSales;
      else if (config?.main_objective_type === 'leads') currentValue = totalLeads;

      setData({
        mainObjective: {
          type: config?.main_objective_type || 'sales',
          value: config?.main_objective_value || 0,
          current: currentValue,
          period: config?.main_objective_period || 'monthly',
        },
        investment: {
          monthly: config?.monthly_investment || 0,
          spent: totalInvestment,
          currency: config?.currency || 'COP',
        },
        roi: {
          estimated: config?.estimated_roi || 0,
          trend: totalInvestment > 0 && totalSales > totalInvestment ? 'up' : 'stable',
        },
        channels: {
          active: activeChannels,
          total: channels?.length || 0,
        },
        campaigns: {
          active: activeCampaigns,
          total: campaigns?.length || 0,
        },
        syncStatus: {
          lastSync: channels?.[0]?.last_sync_at || null,
          pendingChannels: pendingSyncChannels,
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-8 text-center">
        <Settings2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">Configura tu Dashboard</h3>
        <p className="text-muted-foreground mb-4">
          Define tus objetivos de marketing y configura los canales de tráfico
        </p>
        <Button>Comenzar Configuración</Button>
      </Card>
    );
  }

  const objectiveProgress = data.mainObjective.value > 0 
    ? (data.mainObjective.current / data.mainObjective.value) * 100 
    : 0;

  const investmentProgress = data.investment.monthly > 0 
    ? (data.investment.spent / data.investment.monthly) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Objetivo Principal */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Objetivo Principal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.mainObjective.current.toLocaleString()} / {data.mainObjective.value.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {OBJECTIVE_LABELS[data.mainObjective.type] || data.mainObjective.type} ({data.mainObjective.period})
            </p>
            <Progress value={objectiveProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {objectiveProgress.toFixed(1)}% completado
            </p>
          </CardContent>
        </Card>

        {/* Inversión Mensual */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Inversión Mensual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.investment.spent, data.investment.currency)}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              de {formatCurrency(data.investment.monthly, data.investment.currency)} presupuestados
            </p>
            <Progress value={investmentProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {investmentProgress.toFixed(1)}% ejecutado
            </p>
          </CardContent>
        </Card>

        {/* ROI Estimado */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ROI Estimado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{data.roi.estimated}x</span>
              {data.roi.trend === 'up' && (
                <Badge variant="default" className="bg-green-500/20 text-green-600 gap-1">
                  <ArrowUpRight className="h-3 w-3" /> Subiendo
                </Badge>
              )}
              {data.roi.trend === 'down' && (
                <Badge variant="destructive" className="gap-1">
                  <ArrowDownRight className="h-3 w-3" /> Bajando
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Retorno sobre inversión publicitaria
            </p>
          </CardContent>
        </Card>

        {/* Canales Activos */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Canales de Tráfico
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.channels.active} <span className="text-lg text-muted-foreground">/ {data.channels.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Canales activos
            </p>
            {data.syncStatus.pendingChannels > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                {data.syncStatus.pendingChannels} pendientes de sync
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Campañas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Campañas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{data.campaigns.active}</div>
                <p className="text-muted-foreground">de {data.campaigns.total} campañas totales</p>
              </div>
              <Button variant="outline" asChild>
                <a href="#campaigns">Ver todas</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estado de Sincronización */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Sincronización de Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                {data.syncStatus.lastSync ? (
                  <>
                    <div className="text-sm font-medium">Última sincronización</div>
                    <p className="text-muted-foreground">
                      {new Date(data.syncStatus.lastSync).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Sin sincronizaciones aún</p>
                )}
              </div>
              <Button>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
