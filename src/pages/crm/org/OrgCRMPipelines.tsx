import { GitBranch, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { PipelineManager } from "@/components/crm";

// =====================================================
// ORG CRM PIPELINES PAGE
// =====================================================

const OrgCRMPipelines = () => {
  const { currentOrgId, currentOrgName } = useOrgOwner();

  if (!currentOrgId) {
    return (
      <div className="min-h-screen">
        <div className="p-4 md:p-6 space-y-6">
          <PageHeader icon={GitBranch} title="Pipelines" subtitle="Gestión de pipelines" />
          <div className="text-center py-16">
            <AlertTriangle className="h-8 w-8 text-yellow-400/50 mx-auto mb-2" />
            <p className="text-sm text-white/40">Selecciona una organización para acceder al CRM</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          icon={GitBranch}
          title="Pipelines"
          subtitle={currentOrgName ? `Pipelines de ${currentOrgName}` : "Gestión de pipelines"}
        />
        <PipelineManager organizationId={currentOrgId} />
      </div>
    </div>
  );
};

export default OrgCRMPipelines;
