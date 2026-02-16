import { useState } from "react";
import { Link } from "react-router-dom";
import {
  UserPlus,
  Building2,
  Video,
  Users,
  DollarSign,
  TrendingUp,
  Wallet,
  AlertCircle,
  List,
  Download,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  usePlatformOverviewStats,
  useLeadsByMonth,
  useRecentLeadInteractions,
  useLeadDistribution,
  usePlatformLeads,
  useUsersNeedingAttention,
} from "@/hooks/useCrm";
import { CreateLeadModal } from "@/components/crm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TALENT_CATEGORY_LABELS,
  type TalentCategory,
} from "@/types/crm.types";

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
} as const;

type StatColor = keyof typeof STAT_COLORS;

const CATEGORY_CHART_COLORS: Record<string, string> = {
  content_creation: "#EC4899",
  post_production: "#A855F7",
  strategy_marketing: "#3B82F6",
  technology: "#22C55E",
  education: "#EAB308",
  client: "#F97316",
};

const INTERACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  email_sent: Mail,
  email_opened: Mail,
  call: Phone,
  meeting: Calendar,
  demo: Calendar,
  note: FileText,
  message: MessageSquare,
  whatsapp_sent: MessageSquare,
  whatsapp_reply: MessageSquare,
  form_submitted: FileText,
};

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; isPositive: boolean };
  color: StatColor;
}) {
  const c = STAT_COLORS[color];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/50 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && trend.value > 0 && (
            <p
              className={cn(
                "text-xs mt-1",
                trend.isPositive ? "text-green-400" : "text-red-400"
              )}
            >
              {trend.isPositive ? "+" : "-"}{trend.value} este mes
            </p>
          )}
          {subtitle && <p className="text-xs text-white/30 mt-1">{subtitle}</p>}
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", c.bg)}>
          <Icon className={cn("h-6 w-6", c.icon)} />
        </div>
      </div>
    </Card>
  );
}

function PlaceholderStatCard({
  title,
  icon: Icon,
  color,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: StatColor;
}) {
  const c = STAT_COLORS[color];
  return (
    <Card className="p-5 opacity-60">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/40 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white/20">—</p>
          <p className="text-xs text-white/20 mt-1">Próximamente</p>
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", c.bg, "opacity-50")}>
          <Icon className={cn("h-6 w-6", c.icon)} />
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// CUSTOM TOOLTIPS
// =====================================================

function BarTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs bg-[#0f0f14]/95 border border-purple-500/30 backdrop-blur-xl">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color }} />
          <span className="text-white/80">{p.name}: {p.value}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg px-3 py-2 text-xs bg-[#0f0f14]/95 border border-purple-500/30 backdrop-blur-xl">
      <span className="text-white/80">{item.name}: {item.value}</span>
    </div>
  );
}

// =====================================================
// PLATFORM CRM DASHBOARD
// =====================================================

const PlatformCRMDashboard = () => {
  const [showCreateLead, setShowCreateLead] = useState(false);

  // Data hooks
  const { data: overview } = usePlatformOverviewStats();
  const { data: monthlyData = [] } = useLeadsByMonth(6);
  const { data: recentInteractions = [] } = useRecentLeadInteractions(10);
  const { data: distribution } = useLeadDistribution();
  const { data: recentLeads = [] } = usePlatformLeads({ limit: 5 });
  const { data: usersNeedingAttention = [] } = useUsersNeedingAttention();

  // Prepare category chart data with proper labels
  const categoryDistribution = (distribution?.by_category || []).slice(0, 6).map((c) => ({
    category: c.category as TalentCategory,
    name: TALENT_CATEGORY_LABELS[c.category as TalentCategory] || c.category?.replace(/_/g, " ") || "Otro",
    count: c.count,
  }));

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        {/* ========== HEADER ========== */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard CRM</h1>
          <p className="text-white/60">Overview del ecosistema Kreoon</p>
        </div>

        {/* ========== SECTION 1: KPI CARDS ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Leads"
            value={overview?.total_leads ?? "—"}
            icon={UserPlus}
            color="purple"
            trend={overview?.new_leads_this_month ? { value: overview.new_leads_this_month, isPositive: true } : undefined}
          />
          <StatCard
            title="Organizaciones Activas"
            value={overview?.total_organizations ?? "—"}
            icon={Building2}
            color="blue"
            trend={overview?.new_orgs_this_month ? { value: overview.new_orgs_this_month, isPositive: true } : undefined}
          />
          <StatCard
            title="Creadores Activos"
            value={overview?.total_creators ?? "—"}
            icon={Video}
            color="pink"
            trend={overview?.new_creators_this_month ? { value: overview.new_creators_this_month, isPositive: true } : undefined}
          />
          <StatCard
            title="Usuarios Registrados"
            value={overview?.total_users ?? "—"}
            icon={Users}
            color="green"
            trend={overview?.new_users_this_month ? { value: overview.new_users_this_month, isPositive: true } : undefined}
          />
        </div>

        {/* ========== SECTION 2: FINANCE KPIs ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <PlaceholderStatCard title="MRR" icon={DollarSign} color="green" />
          <PlaceholderStatCard title="Ingresos Este Mes" icon={TrendingUp} color="blue" />
          <PlaceholderStatCard title="Pagos a Creadores" icon={Wallet} color="purple" />
          <PlaceholderStatCard title="Por Cobrar" icon={AlertCircle} color="orange" />
        </div>

        {/* ========== SECTION 3: MAIN GRID (3/2 split) ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* --- Left Column (3/5) --- */}
          <div className="lg:col-span-3 space-y-6">
            {/* Leads por Mes */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Leads por Mes</h3>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A855F7" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                      <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" />
                        <stop offset="100%" stopColor="#14B8A6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="label"
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<BarTooltipContent />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="total" name="Total" fill="url(#purpleGradient)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="converted" name="Convertidos" fill="url(#greenGradient)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center">
                  <p className="text-sm text-white/30">Sin datos de leads aún</p>
                </div>
              )}
            </Card>

            {/* Leads Recientes */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Leads Recientes</h3>
                <Link to="/crm/leads" className="text-purple-400 text-sm hover:underline">
                  Ver todos
                </Link>
              </div>
              <div className="space-y-3">
                {recentLeads.length > 0 ? (
                  recentLeads.map((lead) => {
                    const catKey = lead.talent_category as TalentCategory | null;
                    const catLabel = catKey ? TALENT_CATEGORY_LABELS[catKey] : null;
                    const catColor = catKey ? CATEGORY_CHART_COLORS[catKey] : null;

                    return (
                      <Link
                        key={lead.id}
                        to="/crm/leads"
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/[0.08] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 shrink-0 text-sm font-medium">
                            {lead.full_name?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{lead.full_name || "Sin nombre"}</p>
                            <p className="text-white/50 text-sm truncate">{lead.email || "—"}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          {catLabel && (
                            <span
                              className="text-xs px-2 py-1 rounded-full inline-block"
                              style={{
                                backgroundColor: catColor ? `${catColor}20` : "rgba(255,255,255,0.1)",
                                color: catColor || "rgba(255,255,255,0.5)",
                              }}
                            >
                              {catLabel}
                            </span>
                          )}
                          <p className="text-white/40 text-xs mt-1">
                            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-white/30 text-sm py-6 text-center">Sin leads aún</p>
                )}
              </div>
            </Card>

            {/* Activity Table */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h3>
              {recentInteractions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-white/30 border-b border-white/5">
                        <th className="pb-3 pr-4 font-medium">Tipo</th>
                        <th className="pb-3 pr-4 font-medium">Lead</th>
                        <th className="pb-3 pr-4 font-medium hidden md:table-cell">Asunto</th>
                        <th className="pb-3 pr-4 font-medium hidden lg:table-cell">Por</th>
                        <th className="pb-3 font-medium text-right">Cuándo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInteractions.map((interaction) => {
                        const IconComp = INTERACTION_ICONS[interaction.interaction_type] || MessageSquare;
                        return (
                          <tr
                            key={interaction.id}
                            className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <IconComp className="h-4 w-4 text-purple-400/60" />
                                <span className="text-sm text-white/50 capitalize">
                                  {interaction.interaction_type.replace(/_/g, " ")}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div>
                                <p className="text-sm text-white/80">{interaction.lead_name}</p>
                                <p className="text-xs text-white/30">{interaction.lead_email}</p>
                              </div>
                            </td>
                            <td className="py-3 pr-4 hidden md:table-cell">
                              <p className="text-sm text-white/50 truncate max-w-[200px]">
                                {interaction.subject || "—"}
                              </p>
                            </td>
                            <td className="py-3 pr-4 hidden lg:table-cell">
                              <span className="text-sm text-white/40">
                                {interaction.performed_by_name || "Sistema"}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <span className="text-xs text-white/30">
                                {formatDistanceToNow(new Date(interaction.created_at), {
                                  addSuffix: true,
                                  locale: es,
                                })}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <MessageSquare className="h-8 w-8 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">Sin interacciones registradas</p>
                </div>
              )}
            </Card>
          </div>

          {/* --- Right Column (2/5) --- */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category Distribution Donut */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Por Categoría</h3>
              {categoryDistribution.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="count"
                        nameKey="name"
                        paddingAngle={3}
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={CATEGORY_CHART_COLORS[entry.category] || "#6366f1"}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {categoryDistribution.map((cat) => (
                      <div key={cat.category} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORY_CHART_COLORS[cat.category] || "#6366f1" }}
                        />
                        <span className="text-white/70 truncate">{cat.name}</span>
                        <span className="text-white ml-auto shrink-0">{cat.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-sm text-white/30">Sin datos de categorías</p>
                </div>
              )}
            </Card>

            {/* Users Needing Attention */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Necesitan Atención</h3>
                <Link to="/crm/usuarios" className="text-purple-400 text-sm hover:underline">
                  Ver todos
                </Link>
              </div>
              <div className="space-y-3">
                {usersNeedingAttention.length > 0 ? (
                  usersNeedingAttention.slice(0, 5).map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">
                          {user.full_name || user.email}
                        </p>
                        <p className="text-white/40 text-xs">
                          {user.days_since_last_activity != null
                            ? `${user.days_since_last_activity} días inactivo`
                            : "Sin actividad"}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ml-3",
                          user.health_score < 30
                            ? "bg-red-500/20 text-red-400"
                            : user.health_score < 50
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                        )}
                      >
                        {user.health_score}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-white/30 text-sm py-6 text-center">
                    Todos los usuarios están activos
                  </p>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Acciones Rápidas</h3>
              <div className="space-y-2">
                <Button
                  onClick={() => setShowCreateLead(true)}
                  variant="ghost"
                  className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nuevo Lead
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5">
                  <Link to="/crm/leads">
                    <List className="w-4 h-4 mr-2" />
                    Ver todos los leads
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white/30 cursor-not-allowed"
                  disabled
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar reporte
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal open={showCreateLead} onOpenChange={setShowCreateLead} />
    </div>
  );
};

export default PlatformCRMDashboard;
