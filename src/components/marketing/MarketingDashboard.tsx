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
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { DashboardConfigDialog } from "./DashboardConfigDialog";
import { BudgetAlerts } from "./BudgetAlerts";

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
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
  // Chart data
  dailyMetrics: { date: string; investment: number; leads: number; sales: number }[];
  channelDistribution: { name: string; value: number; color: string }[];
  performanceByChannel: { channel: string; leads: number; sales: number; investment: number }[];
}

const OBJECTIVE_LABELS: Record<string, string> = {
  sales: "Ventas",
  leads: "Leads",
  traffic: "Tráfico",
  awareness: "Alcance",
};

const CHANNEL_COLORS: Record<string, string> = {
  meta_ads: "#1877F2",
  google_ads: "#4285F4",
  tiktok_ads: "#000000",
  youtube_ads: "#FF0000",
  linkedin_ads: "#0A66C2",
  organic: "#22C55E",
  email: "#F59E0B",
  other: "#8B5CF6",
};

const CHANNEL_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok_ads: "TikTok Ads",
  youtube_ads: "YouTube Ads",
  linkedin_ads: "LinkedIn Ads",
  organic: "Orgánico",
  email: "Email",
  other: "Otros",
};

export function MarketingDashboard({ organizationId, selectedClientId }: MarketingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [showConfig, setShowConfig] = useState(false);

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
        .select('id, channel_type, channel_name, status, last_sync_at, monthly_budget')
        .eq('organization_id', organizationId);

      // Fetch campaigns
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('id, status')
        .eq('organization_id', organizationId);

      // Fetch sync logs for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: syncLogs } = await supabase
        .from('traffic_sync_logs')
        .select('sync_date, investment, sales, leads, clicks, impressions, channel_id')
        .eq('organization_id', organizationId)
        .gte('sync_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('sync_date', { ascending: true });

      // Calculate totals for current month
      const firstOfMonth = new Date(new Date().setDate(1)).toISOString().split('T')[0];
      const currentMonthLogs = syncLogs?.filter(l => l.sync_date >= firstOfMonth) || [];
      
      const totalInvestment = currentMonthLogs.reduce((sum, log) => sum + (Number(log.investment) || 0), 0);
      const totalSales = currentMonthLogs.reduce((sum, log) => sum + (Number(log.sales) || 0), 0);
      const totalLeads = currentMonthLogs.reduce((sum, log) => sum + (Number(log.leads) || 0), 0);

      const activeChannels = channels?.filter(c => c.status === 'active').length || 0;
      const pendingSyncChannels = channels?.filter(c => !c.last_sync_at || c.last_sync_at < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).length || 0;
      const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;

      let currentValue = 0;
      if (config?.main_objective_type === 'sales') currentValue = totalSales;
      else if (config?.main_objective_type === 'leads') currentValue = totalLeads;

      // Prepare daily metrics for chart
      const dailyMetricsMap: Record<string, { investment: number; leads: number; sales: number }> = {};
      syncLogs?.forEach(log => {
        if (!dailyMetricsMap[log.sync_date]) {
          dailyMetricsMap[log.sync_date] = { investment: 0, leads: 0, sales: 0 };
        }
        dailyMetricsMap[log.sync_date].investment += Number(log.investment) || 0;
        dailyMetricsMap[log.sync_date].leads += Number(log.leads) || 0;
        dailyMetricsMap[log.sync_date].sales += Number(log.sales) || 0;
      });

      const dailyMetrics = Object.entries(dailyMetricsMap)
        .map(([date, metrics]) => ({
          date: new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          ...metrics
        }))
        .slice(-14); // Last 14 days

      // Prepare channel distribution for pie chart
      const channelInvestmentMap: Record<string, number> = {};
      currentMonthLogs.forEach(log => {
        const channel = channels?.find(c => c.id === log.channel_id);
        if (channel) {
          const type = channel.channel_type;
          channelInvestmentMap[type] = (channelInvestmentMap[type] || 0) + (Number(log.investment) || 0);
        }
      });

      const channelDistribution = Object.entries(channelInvestmentMap)
        .map(([type, value]) => ({
          name: CHANNEL_LABELS[type] || type,
          value,
          color: CHANNEL_COLORS[type] || "#8B5CF6"
        }))
        .filter(item => item.value > 0);

      // Prepare performance by channel for bar chart
      const performanceMap: Record<string, { leads: number; sales: number; investment: number }> = {};
      currentMonthLogs.forEach(log => {
        const channel = channels?.find(c => c.id === log.channel_id);
        if (channel) {
          const name = channel.channel_name;
          if (!performanceMap[name]) {
            performanceMap[name] = { leads: 0, sales: 0, investment: 0 };
          }
          performanceMap[name].leads += Number(log.leads) || 0;
          performanceMap[name].sales += Number(log.sales) || 0;
          performanceMap[name].investment += Number(log.investment) || 0;
        }
      });

      const performanceByChannel = Object.entries(performanceMap)
        .map(([channel, metrics]) => ({ channel, ...metrics }))
        .slice(0, 5);

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
        dailyMetrics,
        channelDistribution,
        performanceByChannel,
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
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-64 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-64 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <>
        <Card className="p-8 text-center">
          <Settings2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Configura tu Dashboard</h3>
          <p className="text-muted-foreground mb-4">
            Define tus objetivos de marketing y configura los canales de tráfico
          </p>
          <Button onClick={() => setShowConfig(true)}>Comenzar Configuración</Button>
        </Card>
        <DashboardConfigDialog
          organizationId={organizationId}
          open={showConfig}
          onOpenChange={setShowConfig}
          onSuccess={fetchDashboardData}
        />
      </>
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
      {/* Budget Alerts */}
      <BudgetAlerts organizationId={organizationId} />

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

        {/* Canales y Campañas */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Canales & Campañas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div>
                <div className="text-2xl font-bold">{data.channels.active}</div>
                <p className="text-xs text-muted-foreground">Canales</p>
              </div>
              <div className="border-l pl-4">
                <div className="text-2xl font-bold">{data.campaigns.active}</div>
                <p className="text-xs text-muted-foreground">Campañas</p>
              </div>
            </div>
            {data.syncStatus.pendingChannels > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 mt-2">
                {data.syncStatus.pendingChannels} pendientes de sync
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Investment & Results Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tendencia de Inversión y Resultados
            </CardTitle>
            <CardDescription>Últimos 14 días</CardDescription>
          </CardHeader>
          <CardContent>
            {data.dailyMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.dailyMetrics}>
                  <defs>
                    <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="investment" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorInvestment)" 
                    name="Inversión"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="#22C55E" 
                    fillOpacity={1} 
                    fill="url(#colorLeads)" 
                    name="Leads"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>Sin datos suficientes para mostrar gráfico</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Distribución de Inversión por Canal
            </CardTitle>
            <CardDescription>Este mes</CardDescription>
          </CardHeader>
          <CardContent>
            {data.channelDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.channelDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.channelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value, data.investment.currency)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>Sin datos de inversión por canal</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance by Channel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Rendimiento por Canal
          </CardTitle>
          <CardDescription>Leads y ventas del mes actual</CardDescription>
        </CardHeader>
        <CardContent>
          {data.performanceByChannel.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={data.performanceByChannel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="channel" type="category" tick={{ fontSize: 12 }} width={120} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="leads" fill="hsl(var(--primary))" name="Leads" radius={[0, 4, 4, 0]} />
                <Bar dataKey="sales" fill="#22C55E" name="Ventas" radius={[0, 4, 4, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sincroniza datos de tus canales para ver el rendimiento</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Radio className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Agregar Canal</h4>
              <p className="text-sm text-muted-foreground">Configura nuevas fuentes de tráfico</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500/10">
              <RefreshCw className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold">Sincronizar Data</h4>
              <p className="text-sm text-muted-foreground">Actualiza métricas de campañas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500/10">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold">Generar Reporte</h4>
              <p className="text-sm text-muted-foreground">Crea un informe de rendimiento</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Config Dialog */}
      <DashboardConfigDialog
        organizationId={organizationId}
        open={showConfig}
        onOpenChange={setShowConfig}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
}
