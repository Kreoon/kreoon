import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KreoonGlassCard } from "@/components/ui/kreoon/KreoonGlassCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  Clock,
  DollarSign,
  Star,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

const PURPLE_GRADIENT = ["#a855f7", "#7c3aed", "#6d28d9", "#5b21b6"];
const CHART_COLORS = ["#a855f7", "#c084fc", "#e879f9", "#d8b4fe", "#a78bfa"];

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
}

function MetricCard({ title, value, change, icon }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <KreoonGlassCard className="p-4" intensity="medium">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-kreoon-text-muted">{title}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              {isPositive && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
              {isNegative && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
              <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                {isPositive ? "+" : ""}
                {change}%
              </span>
              <span className="text-kreoon-text-muted">vs ayer</span>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-kreoon-purple-500/30 bg-kreoon-purple-500/10 p-2.5 text-kreoon-purple-400">
          {icon}
        </div>
      </div>
    </KreoonGlassCard>
  );
}

const MODULE_LABELS: Record<string, string> = {
  tablero: "Board AI",
  "board_cards": "Tarjetas",
  "board_flows": "Flujos",
  "talent.matching.ai": "Matching Talento",
  "content-ai": "Content AI",
  portfolio: "Portfolio AI",
  streaming_ai: "Streaming AI",
  scripts: "Scripts",
  sistema_up: "UP Gamification",
};

export function AIMonitoringDashboard({ organizationId: propOrgId }: { organizationId?: string }) {
  const { profile } = useAuth();
  const organizationId = propOrgId || profile?.current_organization_id;

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7");

  const [callsToday, setCallsToday] = useState(0);
  const [callsTodayChange, setCallsTodayChange] = useState<number | undefined>();
  const [avgTimeMs, setAvgTimeMs] = useState<number | null>(null);
  const [avgTimeChange, setAvgTimeChange] = useState<number | undefined>();
  const [totalCost, setTotalCost] = useState(0);
  const [costChange, setCostChange] = useState<number | undefined>();
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [ratingChange, setRatingChange] = useState<number | undefined>();

  const [usageByModule, setUsageByModule] = useState<{ module: string; name: string; calls: number }[]>([]);
  const [usageOverTime, setUsageOverTime] = useState<{ date: string; calls: number; cost: number }[]>([]);
  const [costByModule, setCostByModule] = useState<{ module: string; name: string; cost: number }[]>([]);
  const [latencyByModule, setLatencyByModule] = useState<{ module: string; name: string; avgMs: number; p95?: number }[]>([]);
  const [ratingsByModule, setRatingsByModule] = useState<{ module: string; name: string; avgRating: number; count: number }[]>([]);
  const [recentErrors, setRecentErrors] = useState<{ id: string; module: string; action: string; error_message: string; created_at: string }[]>([]);
  const [errorRateByModule, setErrorRateByModule] = useState<{ module: string; name: string; total: number; errors: number; rate: number }[]>([]);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [organizationId, period]);

  const fetchDashboardData = async () => {
    if (!organizationId) return;
    setLoading(true);

    const days = parseInt(period, 10);
    const startDate = startOfDay(subDays(new Date(), days)).toISOString();
    const endDate = endOfDay(new Date()).toISOString();

    try {
      const { data: logs, error } = await supabase
        .from("ai_usage_logs")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const list = logs || [];

      const todayStart = startOfDay(new Date()).toISOString();
      const yesterdayStart = startOfDay(subDays(new Date(), 1)).toISOString();
      const yesterdayEnd = endOfDay(subDays(new Date(), 1)).toISOString();

      const todayCalls = list.filter((l) => l.created_at >= todayStart).length;
      const yesterdayCalls = list.filter(
        (l) => l.created_at >= yesterdayStart && l.created_at <= yesterdayEnd
      ).length;
      setCallsToday(todayCalls);
      setCallsTodayChange(
        yesterdayCalls > 0 ? Math.round(((todayCalls - yesterdayCalls) / yesterdayCalls) * 100) : undefined
      );

      const withTime = list.filter((l) => l.response_time_ms != null);
      const avgMs = withTime.length ? withTime.reduce((s, l) => s + (l.response_time_ms || 0), 0) / withTime.length : null;
      setAvgTimeMs(avgMs);
      const yesterdayWithTime = list.filter(
        (l) => l.created_at >= yesterdayStart && l.created_at <= yesterdayEnd && l.response_time_ms != null
      );
      const yesterdayAvgMs =
        yesterdayWithTime.length
          ? yesterdayWithTime.reduce((s, l) => s + (l.response_time_ms || 0), 0) / yesterdayWithTime.length
          : null;
      if (yesterdayAvgMs != null && avgMs != null && yesterdayAvgMs > 0) {
        setAvgTimeChange(Math.round(((avgMs - yesterdayAvgMs) / yesterdayAvgMs) * 100));
      }

      const cost = list.reduce((s, l) => s + (Number(l.estimated_cost) || 0), 0);
      setTotalCost(cost);
      const yesterdayCost = list
        .filter((l) => l.created_at >= yesterdayStart && l.created_at <= yesterdayEnd)
        .reduce((s, l) => s + (Number(l.estimated_cost) || 0), 0);
      if (yesterdayCost > 0) {
        setCostChange(Math.round(((cost - yesterdayCost) / yesterdayCost) * 100));
      }

      const withRating = list.filter((l) => l.user_rating != null);
      const rating =
        withRating.length ? withRating.reduce((s, l) => s + (l.user_rating || 0), 0) / withRating.length : null;
      setAvgRating(rating);
      const yesterdayRating = list.filter(
        (l) => l.created_at >= yesterdayStart && l.created_at <= yesterdayEnd && l.user_rating != null
      );
      const yesterdayRatingAvg =
        yesterdayRating.length
          ? yesterdayRating.reduce((s, l) => s + (l.user_rating || 0), 0) / yesterdayRating.length
          : null;
      if (yesterdayRatingAvg != null && rating != null && yesterdayRatingAvg > 0) {
        setRatingChange(Math.round(((rating - yesterdayRatingAvg) / yesterdayRatingAvg) * 100 * 10) / 10);
      }

      const moduleMap = new Map<string, number>();
      list.forEach((l) => {
        const m = l.module || "other";
        moduleMap.set(m, (moduleMap.get(m) || 0) + 1);
      });
      setUsageByModule(
        Array.from(moduleMap.entries())
          .map(([module, calls]) => ({ module, name: MODULE_LABELS[module] || module, calls }))
          .sort((a, b) => b.calls - a.calls)
      );

      const dailyMap = new Map<string, { calls: number; cost: number }>();
      list.forEach((l) => {
        const d = format(new Date(l.created_at), "yyyy-MM-dd");
        const cur = dailyMap.get(d) || { calls: 0, cost: 0 };
        dailyMap.set(d, {
          calls: cur.calls + 1,
          cost: cur.cost + (Number(l.estimated_cost) || 0),
        });
      });
      setUsageOverTime(
        Array.from(dailyMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date))
      );

      const costModuleMap = new Map<string, number>();
      list.forEach((l) => {
        const m = l.module || "other";
        costModuleMap.set(m, (costModuleMap.get(m) || 0) + (Number(l.estimated_cost) || 0));
      });
      setCostByModule(
        Array.from(costModuleMap.entries())
          .map(([module, cost]) => ({ module, name: MODULE_LABELS[module] || module, cost }))
          .sort((a, b) => b.cost - a.cost)
      );

      const latencyModuleMap = new Map<string, number[]>();
      list.forEach((l) => {
        if (l.response_time_ms == null) return;
        const m = l.module || "other";
        const arr = latencyModuleMap.get(m) || [];
        arr.push(l.response_time_ms);
        latencyModuleMap.set(m, arr);
      });
      setLatencyByModule(
        Array.from(latencyModuleMap.entries()).map(([module, times]) => {
          const sorted = [...times].sort((a, b) => a - b);
          const p95 = sorted[Math.floor(sorted.length * 0.95)];
          const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
          return {
            module,
            name: MODULE_LABELS[module] || module,
            avgMs: Math.round(avgMs),
            p95,
          };
        })
      );

      const ratingModuleMap = new Map<string, { sum: number; count: number }>();
      list.forEach((l) => {
        if (l.user_rating == null) return;
        const m = l.module || "other";
        const cur = ratingModuleMap.get(m) || { sum: 0, count: 0 };
        ratingModuleMap.set(m, { sum: cur.sum + l.user_rating, count: cur.count + 1 });
      });
      setRatingsByModule(
        Array.from(ratingModuleMap.entries()).map(([module, { sum, count }]) => ({
          module,
          name: MODULE_LABELS[module] || module,
          avgRating: Math.round((sum / count) * 10) / 10,
          count,
        }))
      );

      const errors = list.filter((l) => !l.success || (l.error_message && l.error_message.length > 0));
      setRecentErrors(
        errors.slice(0, 10).map((l) => ({
          id: l.id,
          module: l.module,
          action: l.action,
          error_message: l.error_message || "Error",
          created_at: l.created_at,
        }))
      );

      const errorModuleMap = new Map<string, { total: number; errors: number }>();
      list.forEach((l) => {
        const m = l.module || "other";
        const cur = errorModuleMap.get(m) || { total: 0, errors: 0 };
        cur.total += 1;
        if (!l.success || (l.error_message && l.error_message.length > 0)) cur.errors += 1;
        errorModuleMap.set(m, cur);
      });
      setErrorRateByModule(
        Array.from(errorModuleMap.entries()).map(([module, { total, errors: errCount }]) => ({
          module,
          name: MODULE_LABELS[module] || module,
          total,
          errors: errCount,
          rate: total > 0 ? Math.round((errCount / total) * 100) : 0,
        }))
      );
    } catch (e) {
      console.error("AIMonitoringDashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!organizationId) {
    return (
      <KreoonGlassCard className="p-8 text-center">
        <p className="text-kreoon-text-muted">Selecciona una organización para ver el monitoreo de IA.</p>
      </KreoonGlassCard>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-kreoon-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-white">Monitoreo de Uso IA</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px] border-kreoon-border bg-kreoon-bg-secondary/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="14">Últimos 14 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          title="Llamadas Hoy"
          value={callsToday.toLocaleString()}
          change={callsTodayChange}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Tiempo Promedio"
          value={avgTimeMs != null ? `${(avgTimeMs / 1000).toFixed(1)}s` : "—"}
          change={avgTimeChange}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Costo Estimado"
          value={`$${totalCost.toFixed(2)}`}
          change={costChange}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Rating Promedio"
          value={avgRating != null ? avgRating.toFixed(1) : "—"}
          change={ratingChange}
          icon={<Star className="h-5 w-5" />}
        />
      </div>

      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-5 rounded-xl border border-kreoon-border bg-kreoon-bg-secondary/50 p-1">
          <TabsTrigger
            value="usage"
            className="rounded-lg data-[state=active]:bg-kreoon-purple-500/20 data-[state=active]:text-kreoon-purple-400"
          >
            Uso
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="rounded-lg data-[state=active]:bg-kreoon-purple-500/20 data-[state=active]:text-kreoon-purple-400"
          >
            Performance
          </TabsTrigger>
          <TabsTrigger
            value="costs"
            className="rounded-lg data-[state=active]:bg-kreoon-purple-500/20 data-[state=active]:text-kreoon-purple-400"
          >
            Costos
          </TabsTrigger>
          <TabsTrigger
            value="quality"
            className="rounded-lg data-[state=active]:bg-kreoon-purple-500/20 data-[state=active]:text-kreoon-purple-400"
          >
            Calidad
          </TabsTrigger>
          <TabsTrigger
            value="errors"
            className="rounded-lg data-[state=active]:bg-kreoon-purple-500/20 data-[state=active]:text-kreoon-purple-400"
          >
            Errores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="mt-6 space-y-6">
          <KreoonGlassCard className="p-6" intensity="medium">
            <h3 className="mb-4 text-sm font-medium text-white">Llamadas por Módulo</h3>
            {usageByModule.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={usageByModule} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} width={75} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(30,27,75,0.95)",
                      border: "1px solid rgba(168,85,247,0.3)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar dataKey="calls" fill="url(#purpleBar)" radius={[0, 4, 4, 0]} />
                  <defs>
                    <linearGradient id="purpleBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-kreoon-text-muted">
                No hay datos en este período
              </div>
            )}
          </KreoonGlassCard>

          <KreoonGlassCard className="p-6" intensity="medium">
            <h3 className="mb-4 text-sm font-medium text-white">Uso en el Tiempo</h3>
            {usageOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={usageOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    tickFormatter={(v) => format(new Date(v), "dd/MM", { locale: es })}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(30,27,75,0.95)",
                      border: "1px solid rgba(168,85,247,0.3)",
                      borderRadius: "8px",
                    }}
                    labelFormatter={(v) => format(new Date(v), "dd MMM yyyy", { locale: es })}
                  />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    name="Llamadas"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: "#7c3aed" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    name="Costo ($)"
                    stroke="#c084fc"
                    strokeWidth={2}
                    dot={{ fill: "#a78bfa" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-kreoon-text-muted">
                No hay datos en este período
              </div>
            )}
          </KreoonGlassCard>
        </TabsContent>

        <TabsContent value="performance" className="mt-6 space-y-6">
          <KreoonGlassCard className="p-6" intensity="medium">
            <h3 className="mb-4 text-sm font-medium text-white">Latencia por Módulo</h3>
            {latencyByModule.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={latencyByModule} margin={{ top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} unit=" ms" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(30,27,75,0.95)",
                      border: "1px solid rgba(168,85,247,0.3)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="avgMs" name="Promedio (ms)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-kreoon-text-muted">
                No hay datos de latencia (response_time_ms)
              </div>
            )}
          </KreoonGlassCard>
        </TabsContent>

        <TabsContent value="costs" className="mt-6 space-y-6">
          <KreoonGlassCard className="p-6" intensity="medium">
            <h3 className="mb-4 text-sm font-medium text-white">Costo por Módulo</h3>
            {costByModule.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costByModule}
                    dataKey="cost"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {costByModule.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(30,27,75,0.95)",
                      border: "1px solid rgba(168,85,247,0.3)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Costo"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-kreoon-text-muted">
                No hay datos de costos
              </div>
            )}
          </KreoonGlassCard>
        </TabsContent>

        <TabsContent value="quality" className="mt-6 space-y-6">
          <KreoonGlassCard className="p-6" intensity="medium">
            <h3 className="mb-4 text-sm font-medium text-white">Rating por Módulo</h3>
            {ratingsByModule.length > 0 ? (
              <div className="space-y-3">
                {ratingsByModule.map((r) => (
                  <div
                    key={r.module}
                    className="flex items-center justify-between rounded-lg border border-kreoon-border bg-kreoon-bg-secondary/30 p-3"
                  >
                    <span className="text-sm text-white">{r.name}</span>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-400" />
                      <span className="font-medium text-white">{r.avgRating.toFixed(1)}</span>
                      <span className="text-xs text-kreoon-text-muted">({r.count} votos)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[120px] items-center justify-center text-kreoon-text-muted">
                No hay ratings de usuario aún
              </div>
            )}
          </KreoonGlassCard>
        </TabsContent>

        <TabsContent value="errors" className="mt-6 space-y-6">
          <KreoonGlassCard className="p-6" intensity="medium">
            <h3 className="mb-4 text-sm font-medium text-white">Tasa de Error por Módulo</h3>
            {errorRateByModule.length > 0 ? (
              <div className="space-y-2">
                {errorRateByModule.map((e) => (
                  <div
                    key={e.module}
                    className="flex items-center justify-between rounded-lg border border-kreoon-border bg-kreoon-bg-secondary/30 p-3"
                  >
                    <span className="text-sm text-white">{e.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={e.rate > 5 ? "text-red-400" : "text-emerald-400"}>
                        {e.rate}%
                      </span>
                      <span className="text-xs text-kreoon-text-muted">
                        {e.errors}/{e.total}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[100px] items-center justify-center text-kreoon-text-muted">
                Sin datos
              </div>
            )}
          </KreoonGlassCard>

          <KreoonGlassCard className="p-6" intensity="medium">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Errores Recientes
            </h3>
            {recentErrors.length > 0 ? (
              <div className="space-y-2">
                {recentErrors.map((err) => (
                  <div
                    key={err.id}
                    className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between text-xs text-kreoon-text-muted">
                      <span>{MODULE_LABELS[err.module] || err.module} · {err.action}</span>
                      <span>{format(new Date(err.created_at), "dd/MM HH:mm", { locale: es })}</span>
                    </div>
                    <p className="mt-1 truncate text-red-300">{err.error_message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>No hay errores recientes</span>
              </div>
            )}
          </KreoonGlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
