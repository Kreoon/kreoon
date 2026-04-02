import { useState, useMemo } from "react";
import {
  ContactRound,
  Users,
  TrendingUp,
  UserCheck,
  Activity,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import {
  usePlatformLeads,
  useUpdateLead,
  useDeleteLead,
  useLeadStats,
} from "@/hooks/useCrm";

import {
  LeadKanban,
  LeadDetailPanel,
  CreateLeadModal,
  ViewModeToggle,
} from "@/components/crm";
import type { ViewMode } from "@/components/crm";

import {
  LEAD_STAGE_LABELS,
  LEAD_STAGE_COLORS,
} from "@/types/crm.types";
import type {
  PlatformLeadSummary,
  LeadStage,
} from "@/types/crm.types";

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div
      className="rounded-sm p-4"
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(16px) saturate(180%)",
        border: "1px solid rgba(139, 92, 246, 0.2)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-white/50">{label}</p>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// PLATFORM CRM LEADS PAGE
// =====================================================

const PlatformCRMLeads = () => {
  const { data: leads = [], isLoading: leadsLoading, refetch } = usePlatformLeads();
  const { data: stats } = useLeadStats(30);
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const [selectedLead, setSelectedLead] = useState<PlatformLeadSummary | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.full_name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  const handleStageChange = (leadId: string, stage: LeadStage) => {
    updateLead.mutate({ id: leadId, data: { stage } });
  };

  const handleLeadClick = (lead: PlatformLeadSummary) => {
    setSelectedLead((prev) => (prev?.id === lead.id ? null : lead));
  };

  const handlePanelUpdate = () => {
    refetch();
  };

  return (
    <div className="min-h-screen">
      <div className="flex h-full">
        <div
          className={cn(
            "flex-1 min-w-0 transition-all duration-300 ease-in-out",
            selectedLead && "md:mr-[440px]",
          )}
        >
          <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <PageHeader
                icon={ContactRound}
                title="Leads"
                subtitle="Gestión de leads y prospectos de la plataforma Kreoon"
              />
              <div className="flex gap-3 items-center">
                {viewMode !== "cards" && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      placeholder="Buscar lead..."
                      className="w-56 bg-white/5 border-white/10 pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                )}
                <ViewModeToggle value={viewMode} onChange={setViewMode} />
              </div>
            </div>

            {/* Stats Row */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Total Leads"
                  value={stats.total_leads}
                  icon={Users}
                  color="bg-blue-500/15 text-blue-400"
                />
                <StatCard
                  label="Últimos 30 días"
                  value={stats.leads_in_period}
                  icon={TrendingUp}
                  color="bg-purple-500/15 text-purple-400"
                />
                <StatCard
                  label="Tasa conversión"
                  value={`${(stats.conversion_rate * 100).toFixed(1)}%`}
                  icon={UserCheck}
                  color="bg-green-500/15 text-green-400"
                />
                <StatCard
                  label="Interesados"
                  value={stats.by_stage?.interested ?? 0}
                  icon={Activity}
                  color="bg-yellow-500/15 text-yellow-400"
                />
              </div>
            )}

            {/* ========== KANBAN (CARDS) VIEW ========== */}
            {viewMode === "cards" && (
              <LeadKanban
                leads={leads}
                onStageChange={handleStageChange}
                onEdit={handleLeadClick}
                onDelete={(id) => {
                  deleteLead.mutate(id);
                  if (selectedLead?.id === id) setSelectedLead(null);
                }}
                onClick={handleLeadClick}
                onCreateLead={() => setShowCreateModal(true)}
                isLoading={leadsLoading}
              />
            )}

            {/* ========== TABLE VIEW ========== */}
            {viewMode === "table" && !leadsLoading && filtered.length > 0 && (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70">Nombre</TableHead>
                      <TableHead className="text-white/70">Email</TableHead>
                      <TableHead className="text-white/70 hidden md:table-cell">Teléfono</TableHead>
                      <TableHead className="text-white/70">Etapa</TableHead>
                      <TableHead className="text-white/70 hidden md:table-cell">Score</TableHead>
                      <TableHead className="text-white/70 hidden lg:table-cell">Fuente</TableHead>
                      <TableHead className="text-white/70 hidden lg:table-cell">Última interacción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((lead) => (
                      <TableRow
                        key={lead.id}
                        onClick={() => handleLeadClick(lead)}
                        className={cn(
                          "border-white/10 hover:bg-white/5 cursor-pointer",
                          selectedLead?.id === lead.id && "bg-[#8b5cf6]/10"
                        )}
                      >
                        <TableCell className="text-white font-medium">
                          {lead.full_name || "Sin nombre"}
                        </TableCell>
                        <TableCell className="text-white/70 text-sm">
                          {lead.email || "—"}
                        </TableCell>
                        <TableCell className="text-white/50 text-sm hidden md:table-cell">
                          {lead.phone || "—"}
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full", LEAD_STAGE_COLORS[lead.stage])}>
                            {LEAD_STAGE_LABELS[lead.stage]}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className={cn(
                            "text-sm font-medium",
                            lead.lead_score >= 70 ? "text-green-400" :
                            lead.lead_score >= 40 ? "text-yellow-400" : "text-white/50"
                          )}>
                            {lead.lead_score}
                          </span>
                        </TableCell>
                        <TableCell className="text-white/50 text-xs hidden lg:table-cell">
                          {lead.lead_source || "—"}
                        </TableCell>
                        <TableCell className="text-white/50 text-xs hidden lg:table-cell">
                          {lead.last_interaction_at
                            ? formatDistanceToNow(new Date(lead.last_interaction_at), { addSuffix: true, locale: es })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* ========== LIST VIEW ========== */}
            {viewMode === "list" && !leadsLoading && filtered.length > 0 && (
              <div className="space-y-1.5">
                {filtered.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => handleLeadClick(lead)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded-sm hover:bg-white/5 cursor-pointer transition-colors border border-transparent",
                      selectedLead?.id === lead.id && "bg-[#8b5cf6]/10 border-[#8b5cf6]/30"
                    )}
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 text-sm shrink-0">
                      {lead.full_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{lead.full_name || "Sin nombre"}</p>
                      <p className="text-xs text-white/40 truncate">{lead.email || lead.phone || "Sin contacto"}</p>
                    </div>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full hidden sm:inline-flex", LEAD_STAGE_COLORS[lead.stage])}>
                      {LEAD_STAGE_LABELS[lead.stage]}
                    </span>
                    <span className={cn(
                      "text-xs font-medium",
                      lead.lead_score >= 70 ? "text-green-400" :
                      lead.lead_score >= 40 ? "text-yellow-400" : "text-white/50"
                    )}>
                      {lead.lead_score}
                    </span>
                    {lead.lead_source && (
                      <span className="text-[10px] text-white/40 hidden md:inline">{lead.lead_source}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty / loading states for table/list */}
            {viewMode !== "cards" && leadsLoading && (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-white/40">Cargando leads...</p>
              </div>
            )}
            {viewMode !== "cards" && !leadsLoading && filtered.length === 0 && (
              <div className="p-12 text-center">
                <ContactRound className="h-10 w-10 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/40">
                  {search ? "Sin resultados para la búsqueda" : "Aún no hay leads"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile backdrop */}
        {selectedLead && (
          <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSelectedLead(null)} />
        )}

        {/* Lead Detail Side Panel */}
        {selectedLead && (
          <div className="fixed inset-y-0 right-0 w-full md:w-auto z-40 animate-in slide-in-from-right duration-300">
            <LeadDetailPanel
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
              onUpdate={handlePanelUpdate}
            />
          </div>
        )}
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
};

export default PlatformCRMLeads;
