import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  PieChart,
  Loader2,
  Brain,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRangePresetPicker } from '@/components/ui/date-range-preset-picker';
import { useDateRangePreset } from '@/hooks/useDateRangePreset';
import {
  LazyLineChart,
  LazyPieChart,
  LazyChartContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Pie,
  Cell,
  Bar,
  Legend,
} from '@/components/ui/lazy-charts';

interface UsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_tokens_input: number;
  total_tokens_output: number;
  estimated_cost: number;
}

interface ModuleUsage {
  module: string;
  count: number;
  tokens: number;
  cost: number;
  success_rate: number;
}

interface DailyUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface ProviderUsage {
  provider: string;
  model: string;
  count: number;
  tokens: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const MODULE_LABELS: Record<string, string> = {
  'ai_assistant': 'Asistente IA',
  'content.script.ai': 'Generación de Scripts',
  'content.editor.ai': 'Editor IA',
  'content.strategist.ai': 'Estratega IA',
  'content.designer.ai': 'Diseñador IA',
  'board.cards.ai': 'Análisis de Tarjetas',
  'board.states.ai': 'Estados del Tablero',
  'board.flows.ai': 'Flujos del Tablero',
  'talent.matching.ai': 'Matching de Talento',
  'up.quality.ai': 'Quality Score',
};

export function AIUsageDashboard({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(true);
  const dateRange = useDateRangePreset({ defaultPreset: 'last_7' });
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [moduleUsage, setModuleUsage] = useState<ModuleUsage[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [providerUsage, setProviderUsage] = useState<ProviderUsage[]>([]);

  useEffect(() => {
    fetchUsageData();
  }, [organizationId, dateRange.fromISO, dateRange.toISO]);

  const fetchUsageData = async () => {
    setLoading(true);
    try {
      const startDate = dateRange.fromISO;
      const endDate = dateRange.toISO;

      // Fetch usage logs
      const { data: logs } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (!logs || logs.length === 0) {
        setStats({
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          total_tokens_input: 0,
          total_tokens_output: 0,
          estimated_cost: 0
        });
        setModuleUsage([]);
        setDailyUsage([]);
        setProviderUsage([]);
        setLoading(false);
        return;
      }

      // Calculate overall stats
      const totalStats: UsageStats = {
        total_requests: logs.length,
        successful_requests: logs.filter(l => l.success).length,
        failed_requests: logs.filter(l => !l.success).length,
        total_tokens_input: logs.reduce((sum, l) => sum + (l.tokens_input || 0), 0),
        total_tokens_output: logs.reduce((sum, l) => sum + (l.tokens_output || 0), 0),
        estimated_cost: logs.reduce((sum, l) => sum + (l.estimated_cost || 0), 0)
      };
      setStats(totalStats);

      // Calculate module usage
      const moduleMap = new Map<string, { count: number; tokens: number; cost: number; success: number }>();
      logs.forEach(log => {
        const current = moduleMap.get(log.module) || { count: 0, tokens: 0, cost: 0, success: 0 };
        moduleMap.set(log.module, {
          count: current.count + 1,
          tokens: current.tokens + (log.tokens_input || 0) + (log.tokens_output || 0),
          cost: current.cost + (log.estimated_cost || 0),
          success: current.success + (log.success ? 1 : 0)
        });
      });
      const moduleData: ModuleUsage[] = Array.from(moduleMap.entries()).map(([module, data]) => ({
        module,
        count: data.count,
        tokens: data.tokens,
        cost: data.cost,
        success_rate: data.count > 0 ? (data.success / data.count) * 100 : 0
      })).sort((a, b) => b.count - a.count);
      setModuleUsage(moduleData);

      // Calculate daily usage
      const dailyMap = new Map<string, { requests: number; tokens: number; cost: number }>();
      logs.forEach(log => {
        const date = format(new Date(log.created_at), 'yyyy-MM-dd');
        const current = dailyMap.get(date) || { requests: 0, tokens: 0, cost: 0 };
        dailyMap.set(date, {
          requests: current.requests + 1,
          tokens: current.tokens + (log.tokens_input || 0) + (log.tokens_output || 0),
          cost: current.cost + (log.estimated_cost || 0)
        });
      });
      const dailyData: DailyUsage[] = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setDailyUsage(dailyData);

      // Calculate provider usage
      const providerMap = new Map<string, { count: number; tokens: number }>();
      logs.forEach(log => {
        const key = `${log.provider}|${log.model}`;
        const current = providerMap.get(key) || { count: 0, tokens: 0 };
        providerMap.set(key, {
          count: current.count + 1,
          tokens: current.tokens + (log.tokens_input || 0) + (log.tokens_output || 0)
        });
      });
      const providerData: ProviderUsage[] = Array.from(providerMap.entries()).map(([key, data]) => {
        const [provider, model] = key.split('|');
        return { provider, model, ...data };
      }).sort((a, b) => b.count - a.count);
      setProviderUsage(providerData);

    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const successRate = stats && stats.total_requests > 0 
    ? ((stats.successful_requests / stats.total_requests) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Dashboard de Uso IA
          </h3>
          <p className="text-sm text-muted-foreground">
            Monitorea el consumo y costos de IA en tu organización
          </p>
        </div>
        <DateRangePresetPicker
          value={dateRange.value}
          onChange={dateRange.setValue}
          presets={['last_7', 'last_15', 'last_30', 'last_90', 'this_month', 'custom']}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Solicitudes</p>
                <p className="text-2xl font-bold">{stats?.total_requests.toLocaleString() || 0}</p>
              </div>
              <div className="p-2 rounded-sm bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span className="text-green-600">{stats?.successful_requests || 0} exitosas</span>
              {(stats?.failed_requests || 0) > 0 && (
                <>
                  <span className="text-muted-foreground mx-1">·</span>
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span className="text-red-600">{stats?.failed_requests} fallidas</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tokens Usados</p>
                <p className="text-2xl font-bold">
                  {((stats?.total_tokens_input || 0) + (stats?.total_tokens_output || 0)).toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded-sm bg-chart-2/10">
                <Activity className="h-5 w-5 text-chart-2" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Input: {(stats?.total_tokens_input || 0).toLocaleString()}</span>
              <span>·</span>
              <span>Output: {(stats?.total_tokens_output || 0).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Costo Estimado</p>
                <p className="text-2xl font-bold">${(stats?.estimated_cost || 0).toFixed(2)}</p>
              </div>
              <div className="p-2 rounded-sm bg-chart-3/10">
                <DollarSign className="h-5 w-5 text-chart-3" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {dailyUsage.length > 1 && (
                <>
                  {dailyUsage[dailyUsage.length - 1]?.cost > dailyUsage[dailyUsage.length - 2]?.cost ? (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  )}
                  <span className="text-muted-foreground">vs día anterior</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa de Éxito</p>
                <p className="text-2xl font-bold">{successRate}%</p>
              </div>
              <div className="p-2 rounded-sm bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <Progress value={parseFloat(successRate)} className="mt-3 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Usage Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tendencia de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyUsage.length > 0 ? (
              <LazyChartContainer height={200}>
                <ResponsiveContainer width="100%" height={200}>
                  <LazyLineChart data={dailyUsage}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value), 'dd MMM yyyy', { locale: es })}
                      formatter={(value: number, name: string) => [
                        name === 'requests' ? value : value.toLocaleString(),
                        name === 'requests' ? 'Solicitudes' : 'Tokens'
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="requests"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LazyLineChart>
                </ResponsiveContainer>
              </LazyChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No hay datos en este periodo
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provider Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribución por Proveedor</CardTitle>
          </CardHeader>
          <CardContent>
            {providerUsage.length > 0 ? (
              <LazyChartContainer height={200}>
                <ResponsiveContainer width="100%" height={200}>
                  <LazyPieChart>
                    <Pie
                      data={providerUsage}
                      dataKey="count"
                      nameKey="model"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ model, percent }) => `${model.split('/').pop()} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {providerUsage.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </LazyPieChart>
                </ResponsiveContainer>
              </LazyChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No hay datos en este periodo
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Usage Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Uso por Módulo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {moduleUsage.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {moduleUsage.map((mod, i) => (
                  <div key={mod.module} className="flex items-center gap-4 p-3 rounded-sm bg-muted/50">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {MODULE_LABELS[mod.module] || mod.module}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{mod.count} solicitudes</span>
                        <span>·</span>
                        <span>{mod.tokens.toLocaleString()} tokens</span>
                        <span>·</span>
                        <span>${mod.cost.toFixed(3)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge 
                        variant={mod.success_rate >= 95 ? 'default' : mod.success_rate >= 80 ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {mod.success_rate.toFixed(0)}% éxito
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
              <Activity className="h-12 w-12 mb-3 opacity-20" />
              <p>No hay uso de IA registrado en este período</p>
              <p className="text-xs mt-1">Los datos aparecerán cuando uses funciones de IA</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
