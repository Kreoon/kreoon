import { Scroll } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StandaloneScriptGenerator } from "@/components/scripts/StandaloneScriptGenerator";

const Scripts = () => {
  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader
          icon={Scroll}
          title="KREOON IA"
          subtitle="Genera guiones profesionales para cualquier producto o servicio"
        />
        <StandaloneScriptGenerator />
      </div>
    </div>
  );
};

export default Scripts;