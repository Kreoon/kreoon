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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AdminKPIGrid,
  AdminUsersSection,
  AdminOrgsSection,
  AdminAISection,
  AdminHealthWidget,
} from "@/components/admin/dashboard";
import { KPIDetailSheet, type KPIType } from "@/components/admin/dashboard/sheets";
import {
  useAdminDashboardData,
  getPeriodLabel,
} from "@/hooks/useAdminDashboard";
import { MetaAdsDateRangePicker, type MetaAdsDateRangeValue } from "@/components/ui/meta-ads-date-range-picker";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

// =====================================================
// QUICK ACTIONS
// =====================================================

function QuickActionsCard() {
  const actions = [
    { label: "Ver Usuarios", href: "/crm/usuarios", icon: Users },
    { label: "Ver Organizaciones", href: "/crm/organizaciones", icon: Building2 },
    { label: "Configuracion IA", href: "/settings/ai", icon: Brain },
    { label: "Configuracion", href: "/settings", icon: Settings },
  ];

  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <ExternalLink className="h-5 w-5 text-purple-400" />
        Acciones Rapidas
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
// HEADER
// =====================================================

interface DashboardHeaderProps {
  dateRange: MetaAdsDateRangeValue;
  onDateRangeChange: (value: MetaAdsDateRangeValue) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

function DashboardHeader({ dateRange, onDateRangeChange, onRefresh, isLoading }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-500/20 rounded-sm">
          <LayoutDashboard className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-white/50">Panel de control de plataforma</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {/* Meta Ads Date Range Picker */}
        <MetaAdsDateRangePicker
          value={dateRange}
          onChange={onDateRangeChange}
          showComparison
        />

        {/* Refresh Button */}
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

// Convertir dateRange a period legacy para compatibilidad con hooks existentes
function dateRangeToPeriod(dateRange: MetaAdsDateRangeValue): '1d' | '7d' | '30d' | 'ytd' {
  if (dateRange.preset === 'today') return '1d';
  if (dateRange.preset === 'last_7') return '7d';
  if (dateRange.preset === 'this_year') return 'ytd';
  return '30d';
}

export default function PlatformAdminDashboard() {
  // Date range state (Meta Ads style)
  const [dateRange, setDateRange] = useState<MetaAdsDateRangeValue>(() => {
    const to = endOfDay(new Date());
    const from = startOfDay(subDays(to, 29));
    return { from, to, preset: 'last_30' };
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [openKPI, setOpenKPI] = useState<KPIType | null>(null);

  // Convert to legacy period for existing hooks
  const period = dateRangeToPeriod(dateRange);
  const { stats, aiStats, timeline, distribution, isLoading, refetch } = useAdminDashboardData(period);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <DashboardHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={refetch}
        isLoading={isLoading}
      />

      {/* KPI Grid - Clickeable */}
      <AdminKPIGrid
        stats={stats.data}
        aiStats={aiStats.data}
        isLoading={stats.isLoading}
        onKPIClick={(type) => setOpenKPI(type)}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1 w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500/20">
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-purple-500/20">
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="organizations" className="data-[state=active]:bg-purple-500/20">
            Organizaciones
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-purple-500/20">
            IA & Costos
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
            {/* Main Content - 3/5 */}
            <div className="lg:col-span-3 space-y-6">
              <AdminUsersSection
                stats={stats.data}
                timeline={timeline.data}
                isLoading={stats.isLoading || timeline.isLoading}
              />
            </div>

            {/* Sidebar - 2/5 */}
            <div className="lg:col-span-2 space-y-6">
              <AdminHealthWidget stats={stats.data} isLoading={stats.isLoading} />
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

          {/* Distribution by Role */}
          {distribution.data && distribution.data.by_role.length > 0 && (
            <Card className="p-4 md:p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                Distribucion por Rol
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {distribution.data.by_role.slice(0, 12).map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-sm bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <p className="text-xs text-white/50 truncate capitalize">
                      {item.role.replace(/_/g, ' ')}
                    </p>
                    <p className="text-lg font-semibold text-white">{item.count}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-6">
          <AdminOrgsSection stats={stats.data} isLoading={stats.isLoading} />
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-6">
          <AdminAISection aiStats={aiStats.data} isLoading={aiStats.isLoading} />
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className="text-center text-xs text-white/30 pt-4">
        Datos actualizados: {stats.data?.generated_at
          ? new Date(stats.data.generated_at).toLocaleString('es-CO')
          : 'Cargando...'
        }
        {' | '}Periodo: {dateRange.from && dateRange.to
          ? `${format(dateRange.from, 'dd MMM')} - ${format(dateRange.to, 'dd MMM, yyyy')}`
          : getPeriodLabel(period)
        }
      </div>

      {/* KPI Detail Sheet */}
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
