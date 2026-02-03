import { useNavigate } from "react-router-dom";
import {
  Building2,
  Unlock,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
} from "lucide-react";
import { StatusPageLayout } from "@/components/status/StatusPageLayout";
import { StatusCard } from "@/components/status/StatusCard";
import { KreoonButton } from "@/components/ui/kreoon";
import { RootOrgSwitcher } from "@/components/layout/RootOrgSwitcher";

export default function NoOrganization() {
  const navigate = useNavigate();

  return (
    <StatusPageLayout
      variant="info"
      icon={<Building2 className="h-12 w-12" />}
      title="Selecciona una Organización"
      subtitle="Como administrador, necesitas elegir una organización para acceder a sus módulos"
      backgroundOrbs
    >
      {/* Selector de organización destacado */}
      <StatusCard variant="highlighted" className="mb-6">
        <div className="space-y-4">
          <p className="text-kreoon-text-secondary">
            Elige la organización con la que deseas trabajar:
          </p>

          {/* RootOrgSwitcher con estilo mejorado */}
          <div className="rounded-lg border border-kreoon-border bg-kreoon-bg-secondary p-4">
            <RootOrgSwitcher />
          </div>
        </div>
      </StatusCard>

      {/* Información sobre qué se desbloquea */}
      <StatusCard
        title="Al seleccionar una organización podrás:"
        icon={<Unlock className="h-5 w-5" />}
      >
        <ul className="space-y-2 text-kreoon-text-secondary">
          <li className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 shrink-0 text-kreoon-purple-400" />
            Acceder al Dashboard completo
          </li>
          <li className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-kreoon-purple-400" />
            Gestionar usuarios y roles
          </li>
          <li className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-kreoon-purple-400" />
            Ver y gestionar contenido
          </li>
          <li className="flex items-center gap-2">
            <Settings className="h-4 w-4 shrink-0 text-kreoon-purple-400" />
            Configurar la organización
          </li>
        </ul>
      </StatusCard>

      {/* Acción secundaria */}
      <div className="mt-6">
        <KreoonButton variant="outline" onClick={() => navigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Ir a Configuración General
        </KreoonButton>
      </div>
    </StatusPageLayout>
  );
}
