import { Activity, Heart, AlertTriangle, TrendingDown, Users, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { AdminDashboardStats } from "@/types/admin-dashboard.types";

// =====================================================
// HEALTH STATUS
// =====================================================

interface HealthStatusProps {
  label: string;
  count: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

function HealthStatus({ label, count, color, icon: Icon }: HealthStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-8 h-8 rounded-sm flex items-center justify-center", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <span className="text-sm text-white/70">{label}</span>
      </div>
      <span className="text-lg font-semibold text-white">{count}</span>
    </div>
  );
}

// =====================================================
// HEALTH RING
// =====================================================

interface HealthRingProps {
  score: number;
}

function HealthRing({ score }: HealthRingProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };

  const color = getColor(score);

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        {/* Progress ring */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-white/50">Health Score</span>
      </div>
    </div>
  );
}

// =====================================================
// LOADING SKELETON
// =====================================================

function HealthWidgetSkeleton() {
  return (
    <Card className="p-4 md:p-6 animate-pulse">
      <div className="h-5 w-32 bg-white/10 rounded mb-4" />
      <div className="h-32 w-32 bg-white/5 rounded-full mx-auto mb-4" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 bg-white/5 rounded-sm" />
        ))}
      </div>
    </Card>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

interface AdminHealthWidgetProps {
  stats?: AdminDashboardStats;
  isLoading?: boolean;
}

export function AdminHealthWidget({ stats, isLoading }: AdminHealthWidgetProps) {
  if (isLoading || !stats) {
    return <HealthWidgetSkeleton />;
  }

  const healthStatuses = [
    {
      label: "Saludables",
      count: stats.health.healthy,
      color: "bg-green-500/20 text-green-400",
      icon: Heart,
    },
    {
      label: "En Riesgo",
      count: stats.health.at_risk,
      color: "bg-yellow-500/20 text-yellow-400",
      icon: AlertTriangle,
    },
    {
      label: "Churning",
      count: stats.health.churning,
      color: "bg-orange-500/20 text-orange-400",
      icon: TrendingDown,
    },
    {
      label: "Churned",
      count: stats.health.churned,
      color: "bg-red-500/20 text-red-400",
      icon: Users,
    },
  ];

  const total = stats.health.healthy + stats.health.at_risk + stats.health.churning + stats.health.churned;

  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-cyan-400" />
        Salud de Plataforma
      </h3>

      {/* Health Score Ring */}
      <HealthRing score={stats.health.avg_health_score} />

      {/* Health Statuses */}
      <div className="space-y-3 mt-6">
        {healthStatuses.map((status, index) => (
          <HealthStatus key={index} {...status} />
        ))}
      </div>

      {/* Needs Attention Alert */}
      {stats.health.needs_attention > 0 && (
        <div className="mt-4 p-3 rounded-sm bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-yellow-300">
              {stats.health.needs_attention} usuarios requieren atencion
            </span>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Usuarios monitoreados</span>
          <span className="text-white font-semibold">{total}</span>
        </div>
      </div>
    </Card>
  );
}
