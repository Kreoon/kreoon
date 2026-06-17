import { useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  RefreshCw,
  Users,
  Building2,
  Brain,
  Settings,
  ExternalLink,
  AlertTriangle,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AdminKPIGrid,
  AdminUsersSection,
  AdminAISection,
  AdminHealthWidget,
} from "@/components/admin/dashboard";
import {
  KPIDetailSheet,
  type KPIType,
} from "@/components/admin/dashboard/sheets";
import {
  useAdminDashboardData,
  getPeriodLabel,
} from "@/hooks/useAdminDashboard";
import {
  MetaAdsDateRangePicker,
  type MetaAdsDateRangeValue,
} from "@/components/ui/meta-ads-date-range-picker";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { PancakeSyncPanel } from "@/components/crm/PancakeSyncPanel";
import { PlatformBansManagement } from "@/components/settings/PlatformBansManagement";
import { PlatformUsersManagement } from "@/components/settings/PlatformUsersManagement";
import {
  usePancakeDashboardStats,
  useTriggerBulkSync,
} from "@/hooks/usePancakeDashboard";
import type { AdminDashboardStats } from "@/types/admin-dashboard.types";

// =====================================================
// QUICK ACTIONS
// =====================================================

function QuickActionsCard() {
  const actions = [
    { label: "Ver Usuarios", href: "/team", icon: Users },
    {
      label: "Ver Organizaciones",
      href: "/talent?tab=clientes",
      icon: Building2,
    },
    { label: "Configuración IA", href: "/settings/ai", icon: Brain },
    { label: "Configuración", href: "/settings", icon: Settings },
    { label: "Pancake CRM", href: "/crm/overview", icon: Wifi },
  ];

  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <ExternalLink className="h-5 w-5 text-purple-400" />
        Acciones Rápidas
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, index) => (
          <Link key={index} to={action.href}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-auto py-3 px-3 bg-white/[0.02] hover:bg-white/[0.05]"
            >
              <action.icon className="h-4 w-4 text-white/50" />
              <span className="text-sm text-white/70">{action.label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// =====================================================
// ALERT BANNER
// =====================================================

interface AlertBannerProps {
  stats: AdminDashboardStats | undefined;
  pancakeErrorRate: number;
  pancakeLoading: boolean;
}

function AlertBanner({
  stats,
  pancakeErrorRate,
  pancakeLoading,
}: AlertBannerProps) {
  const needsAttention = stats?.health?.needs_attention ?? 0;
  const hasPancakeError = !pancakeLoading && pancakeErrorRate > 20;
  const hasHealthAlert = needsAttention > 0;

  if (!hasHealthAlert && !hasPancakeError) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {hasHealthAlert && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex-1">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm">
            <span className="font-semibold">{needsAttention}</span> organización
            {needsAttention !== 1 ? "es" : ""} requieren atención (en riesgo o
            churning)
          </span>
        </div>
      )}
      {hasPancakeError && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-red-500/10 border border-red-500/20 text-red-400 flex-1">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm">
            Pancake CRM: tasa de error de sync en{" "}
            <span className="font-semibold">
              {pancakeErrorRate.toFixed(0)}%
            </span>
            . Verifica la integración.
          </span>
        </div>
      )}
    </div>
  );
}

// =====================================================
// HEADER
// =====================================================

interface DashboardHeaderProps {
  dateRange: MetaAdsDateRangeValue;
  onDateRangeChange: (value: MetaAdsDateRangeValue) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

function DashboardHeader({
  dateRange,
  onDateRangeChange,
  onRefresh,
  isLoading,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-500/20 rounded-sm">
          <LayoutDashboard className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">
            Admin Dashboard
          </h1>
          <p className="text-sm text-white/50">
            Panel de control de plataforma
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <MetaAdsDateRangePicker
          value={dateRange}
          onChange={onDateRangeChange}
          showComparison
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          className="shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

function dateRangeToPeriod(
  dateRange: MetaAdsDateRangeValue,
): "1d" | "7d" | "30d" | "ytd" {
  if (dateRange.preset === "today") return "1d";
  if (dateRange.preset === "last_7") return "7d";
  if (dateRange.preset === "this_year") return "ytd";
  return "30d";
}

export default function PlatformAdminDashboard() {
  const [dateRange, setDateRange] = useState<MetaAdsDateRangeValue>(() => {
    const to = endOfDay(new Date());
    const from = startOfDay(subDays(to, 29));
    return { from, to, preset: "last_30" };
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [openKPI, setOpenKPI] = useState<KPIType | null>(null);

  const period = dateRangeToPeriod(dateRange);
  const { stats, aiStats, timeline, distribution, isLoading, refetch } =
    useAdminDashboardData(period);

  const { data: pancakeStats, isLoading: pancakeLoading } =
    usePancakeDashboardStats();
  const triggerSync = useTriggerBulkSync();

  const pancakeErrorRate = pancakeStats?.sync_health?.error_rate_pct ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <DashboardHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={refetch}
        isLoading={isLoading}
      />

      <AdminKPIGrid
        stats={stats.data}
        aiStats={aiStats.data}
        isLoading={stats.isLoading}
        onKPIClick={(type) => setOpenKPI(type)}
      />

      <AlertBanner
        stats={stats.data}
        pancakeErrorRate={pancakeErrorRate}
        pancakeLoading={pancakeLoading}
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-white/5 border border-white/10 p-1 w-full sm:w-auto overflow-x-auto">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-purple-500/20"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-purple-500/20"
          >
            Usuarios
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="data-[state=active]:bg-purple-500/20"
          >
            IA & Costos
          </TabsTrigger>
          <TabsTrigger
            value="pancake"
            className="data-[state=active]:bg-purple-500/20"
          >
            Pancake CRM
          </TabsTrigger>
          <TabsTrigger
            value="accounts"
            className="data-[state=active]:bg-purple-500/20"
          >
            Cuentas
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-purple-500/20"
          >
            Seguridad
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
            <div className="lg:col-span-3 space-y-6">
              <AdminUsersSection
                stats={stats.data}
                timeline={timeline.data}
                isLoading={stats.isLoading || timeline.isLoading}
              />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <AdminHealthWidget
                stats={stats.data}
                isLoading={stats.isLoading}
              />
              <QuickActionsCard />
            </div>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <AdminUsersSection
            stats={stats.data}
            timeline={timeline.data}
            isLoading={stats.isLoading || timeline.isLoading}
          />

          {distribution.data && distribution.data.by_role.length > 0 && (
            <Card className="p-4 md:p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                Distribución por Rol
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {distribution.data.by_role.slice(0, 12).map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-sm bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <p className="text-xs text-white/50 truncate capitalize">
                      {item.role.replace(/_/g, " ")}
                    </p>
                    <p className="text-lg font-semibold text-white">
                      {item.count}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-6">
          <AdminAISection
            aiStats={aiStats.data}
            isLoading={aiStats.isLoading}
          />
        </TabsContent>

        {/* Pancake CRM Tab */}
        <TabsContent value="pancake" className="space-y-4">
          <PancakeSyncPanel
            data={pancakeStats}
            isLoading={pancakeLoading}
            isSyncing={triggerSync.isPending}
            onSync={() => triggerSync.mutate()}
          />
        </TabsContent>

        {/* Accounts Tab — lista completa de usuarios con acciones (banear, roles, etc.) */}
        <TabsContent value="accounts" className="space-y-4">
          <PlatformUsersManagement />
        </TabsContent>

        {/* Security / Bans Tab */}
        <TabsContent value="security" className="space-y-4">
          <PlatformBansManagement />
        </TabsContent>
      </Tabs>

      <div className="text-center text-xs text-white/30 pt-4">
        Datos actualizados:{" "}
        {stats.data?.generated_at
          ? new Date(stats.data.generated_at).toLocaleString("es-CO")
          : "Cargando..."}
        {" | "}Periodo:{" "}
        {dateRange.from && dateRange.to
          ? `${format(dateRange.from, "dd MMM")} - ${format(dateRange.to, "dd MMM, yyyy")}`
          : getPeriodLabel(period)}
      </div>

      <KPIDetailSheet
        type={openKPI}
        isOpen={openKPI !== null}
        onClose={() => setOpenKPI(null)}
        stats={stats.data}
        aiStats={aiStats.data}
      />
    </div>
  );
}
