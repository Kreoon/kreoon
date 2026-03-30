import {
  Users,
  Building2,
  UserCheck,
  DollarSign,
  Brain,
  Activity,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdminDashboardStats, AdminAIStats } from "@/types/admin-dashboard.types";
import { formatLargeNumber, formatCurrency } from "@/hooks/useAdminDashboard";
import type { KPIType } from "./sheets";

// =====================================================
// CONSTANTS
// =====================================================

const STAT_COLORS = {
  purple: { bg: "bg-purple-500/20", text: "text-purple-300", icon: "text-purple-400" },
  pink: { bg: "bg-pink-500/20", text: "text-pink-300", icon: "text-pink-400" },
  blue: { bg: "bg-blue-500/20", text: "text-blue-300", icon: "text-blue-400" },
  green: { bg: "bg-green-500/20", text: "text-green-300", icon: "text-green-400" },
  yellow: { bg: "bg-yellow-500/20", text: "text-yellow-300", icon: "text-yellow-400" },
  orange: { bg: "bg-orange-500/20", text: "text-orange-300", icon: "text-orange-400" },
  cyan: { bg: "bg-cyan-500/20", text: "text-cyan-300", icon: "text-cyan-400" },
} as const;

type StatColor = keyof typeof STAT_COLORS;

// =====================================================
// STAT CARD
// =====================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; isPositive: boolean };
  color: StatColor;
  onClick?: () => void;
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color, onClick }: StatCardProps) {
  const c = STAT_COLORS[color];
  return (
    <Card
      className={cn(
        "p-4 md:p-5 hover:bg-white/[0.02] transition-colors",
        onClick && "cursor-pointer hover:ring-1 hover:ring-white/20"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs md:text-sm text-white/50 mb-1 truncate">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
          {trend && trend.value > 0 && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs mt-1",
                trend.isPositive ? "text-green-400" : "text-red-400"
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{trend.isPositive ? "+" : "-"}{trend.value}%</span>
            </div>
          )}
          {subtitle && <p className="text-xs text-white/30 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-sm flex items-center justify-center shrink-0 ml-2", c.bg)}>
          <Icon className={cn("h-5 w-5 md:h-6 md:w-6", c.icon)} />
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// LOADING SKELETON
// =====================================================

function StatCardSkeleton() {
  return (
    <Card className="p-4 md:p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-20 bg-white/10 rounded mb-2" />
          <div className="h-8 w-16 bg-white/10 rounded" />
        </div>
        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-sm" />
      </div>
    </Card>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

interface AdminKPIGridProps {
  stats?: AdminDashboardStats;
  aiStats?: AdminAIStats;
  isLoading?: boolean;
  onKPIClick?: (type: KPIType) => void;
}

export function AdminKPIGrid({ stats, aiStats, isLoading, onKPIClick }: AdminKPIGridProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {[...Array(6)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const kpis: StatCardProps[] = [
    {
      title: "Usuarios Totales",
      value: formatLargeNumber(stats.users.total),
      subtitle: `+${stats.users.new_period} nuevos`,
      icon: Users,
      trend: stats.users.new_period > 0 ? { value: stats.users.new_period, isPositive: true } : undefined,
      color: "purple",
      onClick: onKPIClick ? () => onKPIClick('users') : undefined,
    },
    {
      title: "Organizaciones",
      value: formatLargeNumber(stats.organizations.total),
      subtitle: `+${stats.organizations.new_period} nuevas`,
      icon: Building2,
      trend: stats.organizations.new_period > 0 ? { value: stats.organizations.new_period, isPositive: true } : undefined,
      color: "blue",
      onClick: onKPIClick ? () => onKPIClick('organizations') : undefined,
    },
    {
      title: "Creadores",
      value: formatLargeNumber(stats.creators.total),
      subtitle: `${stats.creators.verified || 0} verificados`,
      icon: UserCheck,
      color: "pink",
      onClick: onKPIClick ? () => onKPIClick('creators') : undefined,
    },
    {
      title: "Leads",
      value: formatLargeNumber(stats.leads.total),
      subtitle: `${stats.leads.converted_period} convertidos`,
      icon: TrendingUp,
      color: "green",
      onClick: onKPIClick ? () => onKPIClick('leads') : undefined,
    },
    {
      title: "Llamadas IA",
      value: aiStats ? formatLargeNumber(aiStats.calls.total) : "0",
      subtitle: aiStats
        ? `${aiStats.calls.success_rate}% exitosas${aiStats.costs.total_usd > 0 ? ` • $${aiStats.costs.total_usd.toFixed(2)}` : ''}`
        : "Sin datos",
      icon: Brain,
      color: "orange",
      onClick: onKPIClick ? () => onKPIClick('tokens') : undefined,
    },
    {
      title: "Health Score",
      value: `${stats.health.avg_health_score}%`,
      subtitle: `${stats.health.needs_attention} requieren atencion`,
      icon: Activity,
      trend: stats.health.avg_health_score >= 70
        ? { value: stats.health.avg_health_score, isPositive: true }
        : { value: 100 - stats.health.avg_health_score, isPositive: false },
      color: stats.health.avg_health_score >= 70 ? "cyan" : "yellow",
      onClick: onKPIClick ? () => onKPIClick('health') : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
      {kpis.map((kpi, index) => (
        <StatCard key={index} {...kpi} />
      ))}
    </div>
  );
}
