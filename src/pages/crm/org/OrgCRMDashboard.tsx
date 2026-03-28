import { useState } from "react";
import {
  Building2,
  Users,
  Flame,
  Star,
  GitBranch,
  DollarSign,
  Wallet,
  AlertCircle,
  CreditCard,
  UserPlus,
  Search,
  Calendar,
  MessageSquare,
  Phone,
  Mail,
  FileText,
  Handshake,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import {
  useOrgCrmOverview,
  useOrgCreatorStats,
  useOrgPipelineSummary,
  useOrgUpcomingActions,
  useOrgRecentActivity,
  useOrgContacts,
} from "@/hooks/useCrm";
import { CreateContactModal } from "@/components/crm";
import { useOrgFinanceStats, useOrgSubscription } from "@/hooks/useFinance";
import { CONTACT_TYPE_LABELS } from "@/types/crm.types";
import {
  SUBSCRIPTION_PLAN_LABELS,
  type SubscriptionPlan,
} from "@/types/finance.types";

// =====================================================
// STAT CARD
// =====================================================

type StatColor = "purple" | "pink" | "blue" | "green" | "yellow" | "orange";

const COLOR_MAP: Record<StatColor, { bg: string; text: string; iconBg: string }> = {
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", iconBg: "bg-purple-500/20" },
  pink:   { bg: "bg-pink-500/10",   text: "text-pink-400",   iconBg: "bg-pink-500/20" },
  blue:   { bg: "bg-blue-500/10",   text: "text-blue-400",   iconBg: "bg-blue-500/20" },
  green:  { bg: "bg-emerald-500/10", text: "text-emerald-400", iconBg: "bg-emerald-500/20" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", iconBg: "bg-yellow-500/20" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", iconBg: "bg-orange-500/20" },
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: StatColor;
}) {
  const c = COLOR_MAP[color];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center", c.iconBg)}>
          <Icon className={cn("h-5 w-5", c.text)} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-white/50">{title}</p>
          {subtitle && <p className="text-[10px] text-white/30 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// HELPERS
// =====================================================

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const isOverdue = (date: string) => isPast(new Date(date));

const formatDate = (date: string) => format(new Date(date), "dd MMM", { locale: es });

const INTERACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  call: Phone,
  meeting: Calendar,
  whatsapp: MessageSquare,
  proposal_sent: FileText,
  contract_signed: Handshake,
  note: FileText,
};

const OUTCOME_LABELS: Record<string, string> = {
  positive: "Positivo",
  neutral: "Neutral",
  negative: "Negativo",
};

const STRENGTH_DOT: Record<string, string> = {
  hot: "bg-red-500",
  warm: "bg-yellow-500",
  cold: "bg-blue-500",
};

// =====================================================
// ORG CRM DASHBOARD
// =====================================================

const OrgCRMDashboard = () => {
  const { currentOrgId, currentOrgName } = useOrgOwner();

  if (!currentOrgId) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="text-center py-16">
          <AlertTriangle className="h-8 w-8 text-yellow-400/50 mx-auto mb-2" />
          <p className="text-sm text-white/40">
            Selecciona una organizaci&#243;n para acceder al CRM
          </p>
        </div>
      </div>
    );
  }

  return <DashboardContent orgId={currentOrgId} orgName={currentOrgName} />;
};

function DashboardContent({ orgId, orgName }: { orgId: string; orgName: string | null }) {
  const [showCreateContact, setShowCreateContact] = useState(false);

  // Data hooks
  const { data: overview } = useOrgCrmOverview(orgId);
  const { data: creatorStats } = useOrgCreatorStats(orgId);
  const { data: pipelineSummary } = useOrgPipelineSummary(orgId);
  const { data: upcomingActions = [] } = useOrgUpcomingActions(orgId, 5);
  const { data: recentActivity = [] } = useOrgRecentActivity(orgId, 10);
  const { data: recentContacts = [] } = useOrgContacts(orgId, { limit: 5 });
  const { data: financeStats } = useOrgFinanceStats(orgId);
  const { data: subscription } = useOrgSubscription(orgId);

  // Derived
  const topCreators = creatorStats?.top_collaborators || [];
  const pipelineStages = pipelineSummary?.stages || [];
  const totalContactsInPipeline = pipelineStages.reduce((a, s) => a + s.contact_count, 0);

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-8">
        {/* ========== HEADER ========== */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-purple-500/20 rounded-sm">
              <Building2 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                CRM {orgName || "Organizaci\u00f3n"}
              </h1>
              <p className="text-white/60">
                Gestiona tus relaciones con contactos y talento
              </p>
            </div>
          </div>
        </div>

        {/* ========== SECTION 1: KPI CARDS ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Contactos"
            value={overview?.total_contacts ?? "\u2014"}
            subtitle={overview ? `+${overview.new_contacts_this_month} este mes` : undefined}
            icon={Users}
            color="purple"
          />
          <StatCard
            title="Leads Activos"
            value={overview?.hot_leads ?? "\u2014"}
            subtitle={overview ? `${overview.warm_leads} calientes` : undefined}
            icon={Flame}
            color="orange"
          />
          <StatCard
            title="Talento Favorito"
            value={creatorStats?.total_favorites ?? "\u2014"}
            subtitle={
              overview
                ? `${overview.total_collaborations} colaboraciones`
                : undefined
            }
            icon={Star}
            color="yellow"
          />
          <StatCard
            title="Pipelines Activos"
            value={overview?.total_pipelines ?? "\u2014"}
            subtitle={
              overview ? `${overview.contacts_in_pipeline} en proceso` : undefined
            }
            icon={GitBranch}
            color="blue"
          />
        </div>

        {/* ========== SECTION 2: FINANCE KPI CARDS ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Gastado Total"
            value={formatCurrency(creatorStats?.total_spent || 0)}
            subtitle="USD"
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="Pagado a Talento"
            value={formatCurrency(overview?.total_paid_to_creators || 0)}
            subtitle={`${overview?.worked_with_creators || 0} proyectos`}
            icon={Wallet}
            color="purple"
          />
          <StatCard
            title="Por Pagar"
            value={formatCurrency(financeStats?.invoices_pending || 0)}
            subtitle={financeStats?.invoices_pending_count ? `${financeStats.invoices_pending_count} facturas` : undefined}
            icon={AlertCircle}
            color="orange"
          />
          <StatCard
            title="Plan Actual"
            value={SUBSCRIPTION_PLAN_LABELS[(subscription?.plan || "free") as SubscriptionPlan] || "Free"}
            subtitle={subscription?.current_period_end
              ? `Renueva ${format(new Date(subscription.current_period_end), "dd MMM", { locale: es })}`
              : undefined
            }
            icon={CreditCard}
            color="blue"
          />
        </div>

        {/* ========== SECTION 3: TWO COLUMNS ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* --- Left Column (3/5) --- */}
          <div className="lg:col-span-3 space-y-6">
            {/* Pipeline Overview */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Pipeline Principal</h3>
                <Link
                  to="/org-crm/pipelines"
                  className="text-purple-400 text-sm hover:underline"
                >
                  Ver todos
                </Link>
              </div>

              {pipelineStages.length > 0 ? (
                <div className="space-y-3">
                  {pipelineStages.map((stage, index) => {
                    const percentage =
                      totalContactsInPipeline > 0
                        ? (stage.contact_count / totalContactsInPipeline) * 100
                        : 0;
                    return (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-24 text-sm text-white/70 truncate">
                          {stage.stage_name}
                        </div>
                        <div className="flex-1 h-8 bg-white/5 rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm flex items-center px-3 text-xs text-white font-medium"
                            style={{
                              width: `${Math.max(percentage, 10)}%`,
                              backgroundColor: stage.stage_color || "#A855F7",
                            }}
                          >
                            {stage.contact_count}
                          </div>
                        </div>
                        <div className="w-24 text-right text-sm text-white/50">
                          {formatCurrency(stage.deal_value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center">
                  <div className="text-center">
                    <GitBranch className="h-8 w-8 text-white/10 mx-auto mb-2" />
                    <p className="text-sm text-white/30">Sin pipeline configurado</p>
                    <Link
                      to="/org-crm/pipelines"
                      className="text-xs text-purple-400/60 hover:text-purple-400 mt-2 inline-block"
                    >
                      Crear Pipeline
                    </Link>
                  </div>
                </div>
              )}
            </Card>

            {/* Contactos Recientes */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Contactos Recientes</h3>
                <Link
                  to="/clients-hub?tab=contactos"
                  className="text-purple-400 text-sm hover:underline"
                >
                  Ver todos
                </Link>
              </div>
              <div className="space-y-3">
                {recentContacts.length > 0 ? (
                  recentContacts.slice(0, 5).map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-sm hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300">
                          {contact.full_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="text-white font-medium">{contact.full_name}</p>
                          <p className="text-white/50 text-sm">
                            {contact.company || contact.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            STRENGTH_DOT[contact.relationship_strength as string] ||
                              "bg-white/20"
                          )}
                        />
                        <span className="text-white/40 text-xs">
                          {CONTACT_TYPE_LABELS[
                            contact.contact_type as keyof typeof CONTACT_TYPE_LABELS
                          ] || contact.contact_type}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-white/40 text-sm text-center py-4">
                    Sin contactos a&#250;n
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* --- Right Column (2/5) --- */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Talento */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Top Talento</h3>
                <Link
                  to="/talent?tab=externo"
                  className="text-purple-400 text-sm hover:underline"
                >
                  Ver todos
                </Link>
              </div>
              <div className="space-y-3">
                {topCreators.length > 0 ? (
                  topCreators.slice(0, 5).map((rel: any, index: number) => (
                    <div
                      key={rel.creator_id}
                      className="flex items-center justify-between p-2 bg-white/5 rounded-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-white/30 text-sm w-4">{index + 1}</span>
                        <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                          {rel.avatar_url ? (
                            <img
                              src={rel.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <span className="text-pink-300 text-sm">
                              {rel.full_name?.charAt(0) || "?"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm">{rel.full_name}</p>
                          <p className="text-white/40 text-xs">
                            {rel.times_worked_together} proyectos
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 text-sm">
                          {formatCurrency(rel.total_paid || 0)}
                        </p>
                        {rel.average_rating_given != null && (
                          <div className="flex items-center gap-1 text-yellow-400 text-xs">
                            <Star className="w-3 h-3 fill-current" />
                            {rel.average_rating_given.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center">
                    <Star className="h-6 w-6 text-white/10 mx-auto mb-2" />
                    <p className="text-sm text-white/30">Sin colaboraciones a&#250;n</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Pr&#243;ximas Acciones */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Pr&#243;ximas Acciones
              </h3>
              <div className="space-y-3">
                {upcomingActions.length > 0 ? (
                  upcomingActions.slice(0, 5).map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center gap-3 p-2 bg-white/5 rounded-sm"
                    >
                      <div
                        className={cn(
                          "p-2 rounded-sm",
                          isOverdue(action.next_action_date)
                            ? "bg-red-500/20"
                            : "bg-blue-500/20"
                        )}
                      >
                        <Calendar
                          className={cn(
                            "w-4 h-4",
                            isOverdue(action.next_action_date)
                              ? "text-red-400"
                              : "text-blue-400"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{action.next_action}</p>
                        <p className="text-white/40 text-xs">{action.contact_name}</p>
                      </div>
                      <span
                        className={cn(
                          "text-xs",
                          isOverdue(action.next_action_date)
                            ? "text-red-400"
                            : "text-white/50"
                        )}
                      >
                        {formatDate(action.next_action_date)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-white/40 text-sm text-center py-4">
                    No hay acciones pendientes
                  </p>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Acciones R&#225;pidas</h3>
              <div className="space-y-2">
                <Button
                  onClick={() => setShowCreateContact(true)}
                  className="w-full justify-start"
                  variant="ghost"
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Nuevo Contacto
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link to="/org-crm/pipelines">
                    <GitBranch className="w-4 h-4 mr-2" /> Ver Pipelines
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link to="/marketplace">
                    <Search className="w-4 h-4 mr-2" /> Buscar Talento
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* ========== SECTION 4: ACTIVITY TABLE ========== */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h3>
          {recentActivity.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-white/30 border-b border-white/5">
                    <th className="pb-3 pr-4 font-medium">Tipo</th>
                    <th className="pb-3 pr-4 font-medium">Contacto</th>
                    <th className="pb-3 pr-4 font-medium hidden md:table-cell">Asunto</th>
                    <th className="pb-3 pr-4 font-medium hidden sm:table-cell">Resultado</th>
                    <th className="pb-3 pr-4 font-medium hidden lg:table-cell">Por</th>
                    <th className="pb-3 font-medium text-right">Cu&#225;ndo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((activity) => {
                    const IconComp =
                      INTERACTION_ICONS[activity.interaction_type] || MessageSquare;
                    return (
                      <tr
                        key={activity.id}
                        className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <IconComp className="h-3.5 w-3.5 text-white/30" />
                            <span className="text-xs text-white/50 capitalize">
                              {activity.interaction_type?.replace(/_/g, " ")}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div>
                            <p className="text-xs text-white/70">{activity.contact_name}</p>
                            {activity.contact_company && (
                              <p className="text-[10px] text-white/30">
                                {activity.contact_company}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 hidden md:table-cell">
                          <p className="text-xs text-white/50 truncate max-w-[180px]">
                            {activity.subject || "\u2014"}
                          </p>
                        </td>
                        <td className="py-3 pr-4 hidden sm:table-cell">
                          {activity.outcome ? (
                            <span
                              className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full",
                                activity.outcome === "positive"
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : activity.outcome === "negative"
                                    ? "bg-red-500/15 text-red-400"
                                    : "bg-white/5 text-white/40"
                              )}
                            >
                              {OUTCOME_LABELS[activity.outcome] || activity.outcome}
                            </span>
                          ) : (
                            <span className="text-[10px] text-white/20">{"\u2014"}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 hidden lg:table-cell">
                          <span className="text-xs text-white/40">
                            {activity.performed_by_name || "Sistema"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-[10px] text-white/30">
                            {formatDate(activity.created_at)}
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
              <Clock className="h-8 w-8 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">Sin actividad registrada</p>
            </div>
          )}
        </Card>
      </div>

      {/* Create Contact Modal */}
      <CreateContactModal
        open={showCreateContact}
        onOpenChange={setShowCreateContact}
        organizationId={orgId}
      />
    </div>
  );
}

export default OrgCRMDashboard;
