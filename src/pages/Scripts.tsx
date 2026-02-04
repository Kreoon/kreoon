import { Scroll } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StandaloneScriptGenerator } from "@/components/scripts/StandaloneScriptGenerator";
import { AITokensPanelTrigger } from "@/components/ai/AITokensPanel";
import { useAuth } from "@/hooks/useAuth";

const Scripts = () => {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Page Header - Kreoon Tech */}
        <PageHeader
          icon={Scroll}
          title="Kreoon IA"
          subtitle="Tu asistente de inteligencia artificial para creación de contenido"
          action={
            profile?.current_organization_id && (
              <AITokensPanelTrigger
                organizationId={profile.current_organization_id}
                variant="header"
              />
            )
          }
        />
        <StandaloneScriptGenerator />
      </div>
    </div>
  );
};

export default Scripts;