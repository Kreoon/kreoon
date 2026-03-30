import { UserCheck, UserX, UserCog, Mail, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  LazyAreaChart,
  LazyChartContainer,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "@/components/ui/lazy-charts";
import { cn } from "@/lib/utils";
import type { AdminDashboardStats, AdminActivityTimeline } from "@/types/admin-dashboard.types";

// =====================================================
// MINI STAT
// =====================================================

interface MiniStatProps {
  label: string;
  value: number;
  total: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function MiniStat({ label, value, total, icon: Icon, color }: MiniStatProps) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-sm bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className={cn("w-9 h-9 rounded-sm flex items-center justify-center", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/50 truncate">{label}</span>
          <span className="text-sm font-semibold text-white">{value.toLocaleString()}</span>
        </div>
        <Progress value={percentage} className="h-1.5" />
      </div>
      <span className="text-xs text-white/40 ml-1">{percentage}%</span>
    </div>
  );
}

// =====================================================
// CHART TOOLTIP
// =====================================================

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm px-3 py-2 text-xs bg-[#0f0f14]/95 border border-purple-500/30 backdrop-blur-xl">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white">{p.value} registros</span>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// LOADING SKELETON
// =====================================================

function UsersSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <Card className="p-4 md:p-6 animate-pulse">
        <div className="h-5 w-32 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-sm" />
          ))}
        </div>
      </Card>
      <Card className="p-4 md:p-6 animate-pulse">
        <div className="h-5 w-40 bg-white/10 rounded mb-4" />
        <div className="h-[200px] bg-white/5 rounded-sm" />
      </Card>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

interface AdminUsersSectionProps {
  stats?: AdminDashboardStats;
  timeline?: AdminActivityTimeline;
  isLoading?: boolean;
}

export function AdminUsersSection({ stats, timeline, isLoading }: AdminUsersSectionProps) {
  if (isLoading || !stats) {
    return <UsersSectionSkeleton />;
  }

  const total = stats.users.total || 1;

  const userMetrics = [
    {
      label: "Onboarding Completado",
      value: stats.users.onboarding_completed,
      total,
      icon: UserCheck,
      color: "bg-green-500/20 text-green-400",
    },
    {
      label: "Onboarding Pendiente",
      value: stats.users.onboarding_pending,
      total,
      icon: Clock,
      color: "bg-yellow-500/20 text-yellow-400",
    },
    {
      label: "Perfil Completo",
      value: stats.users.profile_complete,
      total,
      icon: UserCog,
      color: "bg-blue-500/20 text-blue-400",
    },
    {
      label: "Perfil Incompleto",
      value: stats.users.profile_incomplete,
      total,
      icon: UserX,
      color: "bg-red-500/20 text-red-400",
    },
  ];

  // Preparar datos para grafico
  const chartData = timeline?.registrations.map((r) => ({
    date: r.period.slice(5, 10), // MM-DD
    registros: r.count || 0,
  })) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Estado de Usuarios */}
      <Card className="p-4 md:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <UserCog className="h-5 w-5 text-purple-400" />
          Estado de Usuarios
        </h3>
        <div className="space-y-3">
          {userMetrics.map((metric, index) => (
            <MiniStat key={index} {...metric} />
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Total Usuarios</span>
            <span className="text-white font-semibold">{stats.users.total.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Grafico de Registros */}
      <Card className="p-4 md:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-400" />
          Nuevos Registros
        </h3>
        {chartData.length > 0 ? (
          <LazyChartContainer height={200}>
            <ResponsiveContainer width="100%" height={200}>
              <LazyAreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRegistros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  axisLine={{ stroke: '#333' }}
                />
                <YAxis
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  axisLine={{ stroke: '#333' }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="registros"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#colorRegistros)"
                />
              </LazyAreaChart>
            </ResponsiveContainer>
          </LazyChartContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-white/40">
            No hay datos de registros para mostrar
          </div>
        )}
      </Card>
    </div>
  );
}
