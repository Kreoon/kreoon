import { useState } from "react";
import {
  ContactRound,
  Users,
  TrendingUp,
  UserCheck,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

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
} from "@/components/crm";

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
      className="rounded-xl p-4"
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(16px) saturate(180%)",
        border: "1px solid rgba(139, 92, 246, 0.2)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
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

  const handleStageChange = (leadId: string, stage: LeadStage) => {
    updateLead.mutate({ id: leadId, data: { stage } });
  };

  const handleLeadClick = (lead: PlatformLeadSummary) => {
    setSelectedLead(lead);
  };

  const handlePanelUpdate = () => {
    refetch();
  };

  return (
    <div className="min-h-screen">
      <div className="flex h-full">
        {/* Main Area - shrinks when panel is open */}
        <div
          className={cn(
            "flex-1 min-w-0 transition-all duration-300 ease-in-out",
            selectedLead && "mr-[440px]",
          )}
        >
          <div className="p-4 md:p-6 space-y-6">
            <PageHeader
              icon={ContactRound}
              title="Leads"
              subtitle="Gestión de leads y prospectos de la plataforma Kreoon"
            />

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

            {/* Kanban */}
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
          </div>
        </div>

        {/* Lead Detail Side Panel */}
        {selectedLead && (
          <div className="fixed inset-y-0 right-0 z-40 animate-in slide-in-from-right duration-300">
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
