import { Building2, Crown, Sparkles, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  LazyPieChart,
  LazyBarChart,
  LazyChartContainer,
  Pie,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "@/components/ui/lazy-charts";
import { cn } from "@/lib/utils";
import type { AdminDashboardStats } from "@/types/admin-dashboard.types";

// =====================================================
// CONSTANTS
// =====================================================

const TIER_COLORS: Record<string, string> = {
  free: "#6b7280",
  starter: "#3b82f6",
  pro: "#8b5cf6",
  "agencias-pro": "#ec4899",
  business: "#ec4899",
  enterprise: "#f59e0b",
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  "agencias-pro": "Agencias Pro",
  business: "Business",
  enterprise: "Enterprise",
};

const TIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Building2,
  starter: Star,
  pro: Sparkles,
  business: Crown,
  enterprise: Crown,
};

// =====================================================
// CHART TOOLTIP
// =====================================================

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="rounded-sm px-3 py-2 text-xs bg-[#0f0f14]/95 border border-purple-500/30">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: data.payload.fill }} />
        <span className="text-white/70">{data.name}:</span>
        <span className="text-white font-semibold">{data.value}</span>
      </div>
    </div>
  );
}

// =====================================================
// TIER CARD
// =====================================================

interface TierCardProps {
  tier: string;
  count: number;
  total: number;
}

function TierCard({ tier, count, total }: TierCardProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const Icon = TIER_ICONS[tier] || Building2;
  const color = TIER_COLORS[tier] || TIER_COLORS.free;
  const label = TIER_LABELS[tier] || tier;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-sm bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div
        className="w-9 h-9 rounded-sm flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white font-medium">{label}</span>
          <span className="text-sm text-white/70">{count}</span>
        </div>
        <span className="text-xs text-white/40">{percentage}% del total</span>
      </div>
    </div>
  );
}

// =====================================================
// LOADING SKELETON
// =====================================================

function OrgsSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <Card className="p-4 md:p-6 animate-pulse">
        <div className="h-5 w-40 bg-white/10 rounded mb-4" />
        <div className="h-[200px] bg-white/5 rounded-full mx-auto w-[200px]" />
      </Card>
      <Card className="p-4 md:p-6 animate-pulse">
        <div className="h-5 w-32 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-sm" />
          ))}
        </div>
      </Card>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

interface AdminOrgsSectionProps {
  stats?: AdminDashboardStats;
  isLoading?: boolean;
}

export function AdminOrgsSection({ stats, isLoading }: AdminOrgsSectionProps) {
  if (isLoading || !stats) {
    return <OrgsSectionSkeleton />;
  }

  const byTier = stats.organizations.by_tier || {};
  const total = stats.organizations.total || 0;

  // Preparar datos para pie chart
  const pieData = Object.entries(byTier).map(([tier, count]) => ({
    name: TIER_LABELS[tier] || tier,
    value: count,
    fill: TIER_COLORS[tier] || TIER_COLORS.free,
  }));

  // Ordenar tiers para la lista
  const tierOrder = ['free', 'starter', 'pro', 'business', 'enterprise'];
  const sortedTiers = Object.entries(byTier).sort((a, b) => {
    const indexA = tierOrder.indexOf(a[0]);
    const indexB = tierOrder.indexOf(b[0]);
    return indexA - indexB;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Grafico de Distribucion */}
      <Card className="p-4 md:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-400" />
          Distribucion por Plan
        </h3>
        {pieData.length > 0 ? (
          <LazyChartContainer height={220}>
            <ResponsiveContainer width="100%" height={220}>
              <LazyPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </LazyPieChart>
            </ResponsiveContainer>
          </LazyChartContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-white/40">
            No hay organizaciones registradas
          </div>
        )}
        <div className="mt-2 text-center">
          <span className="text-2xl font-bold text-white">{total}</span>
          <span className="text-sm text-white/50 ml-2">organizaciones totales</span>
        </div>
      </Card>

      {/* Lista por Tier */}
      <Card className="p-4 md:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-400" />
          Planes Activos
        </h3>
        <div className="space-y-3">
          {sortedTiers.length > 0 ? (
            sortedTiers.map(([tier, count]) => (
              <TierCard key={tier} tier={tier} count={count} total={total} />
            ))
          ) : (
            <div className="text-center text-white/40 py-8">
              No hay datos de planes
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Nuevas este periodo</span>
            <span className="text-green-400 font-semibold">+{stats.organizations.new_period}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
