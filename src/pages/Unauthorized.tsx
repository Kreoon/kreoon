import { useNavigate } from "react-router-dom";
import {
  ShieldX,
  Lock,
  HelpCircle,
  ArrowRight,
  Home,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/contexts/BrandingContext";
import { StatusPageLayout } from "@/components/status/StatusPageLayout";
import { StatusCard } from "@/components/status/StatusCard";
import { KreoonButton, KreoonBadge } from "@/components/ui/kreoon";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  creator: "Creador",
  editor: "Editor",
  client: "Cliente",
  strategist: "Estratega",
  ambassador: "Embajador",
  team_leader: "Líder de equipo",
};

function getMyDashboardPath(roles: string[]): string {
  if (roles.includes("admin")) return "/";
  if (roles.includes("creator")) return "/creator-dashboard";
  if (roles.includes("editor")) return "/editor-dashboard";
  if (roles.includes("client")) return "/client-dashboard";
  if (roles.includes("strategist")) return "/strategist-dashboard";
  if (roles.includes("ambassador")) return "/dashboard";
  return "/auth";
}

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user, signOut, roles } = useAuth();
  const { branding } = useBranding();
  const supportEmail = branding.support_email || 'soporte@kreoon.com';

  return (
    <StatusPageLayout
      variant="error"
      icon={<ShieldX className="h-12 w-12" />}
      title="Acceso No Autorizado"
      subtitle="No tienes permisos para acceder a esta sección"
      backgroundOrbs
    >
      {/* Explicación */}
      <StatusCard variant="glass" className="mb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/20">
            <Lock className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <p className="mb-1 font-medium text-white">Área restringida</p>
            <p className="text-sm text-kreoon-text-secondary">
              La página que intentas acceder requiere permisos especiales que tu
              rol actual no tiene.
            </p>
          </div>
        </div>
      </StatusCard>

      {/* Información del usuario */}
      <StatusCard title="Tu información actual">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-kreoon-border py-2">
            <span className="text-kreoon-text-secondary">Email</span>
            <span className="text-white">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between border-b border-kreoon-border py-2">
            <span className="text-kreoon-text-secondary">Roles asignados</span>
            <div className="flex gap-2">
              {roles.map((role) => (
                <KreoonBadge key={role} variant="purple" size="sm">
                  {ROLE_LABELS[role] ?? role}
                </KreoonBadge>
              ))}
            </div>
          </div>
        </div>
      </StatusCard>

      {/* Sugerencias */}
      <StatusCard
        title="¿Qué puedes hacer?"
        icon={<HelpCircle className="h-5 w-5" />}
        className="mt-4"
      >
        <ul className="space-y-3 text-kreoon-text-secondary">
          <li className="flex items-start gap-2">
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-kreoon-purple-400" />
            <span>Ir a tu panel donde tienes acceso completo</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-kreoon-purple-400" />
            <span>
              Contactar a un administrador si crees que deberías tener acceso
            </span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-kreoon-purple-400" />
            <span>Verificar que estás usando la cuenta correcta</span>
          </li>
        </ul>
      </StatusCard>

      {/* Acciones */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <KreoonButton
          variant="primary"
          onClick={() => navigate(getMyDashboardPath(roles))}
        >
          <Home className="mr-2 h-4 w-4" />
          Ir a mi panel
        </KreoonButton>
        <KreoonButton variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver atrás
        </KreoonButton>
        <KreoonButton variant="ghost" onClick={() => signOut()}>
          Cerrar sesión
        </KreoonButton>
      </div>

      {/* Contacto */}
      <p className="mt-6 text-center text-sm text-kreoon-text-muted">
        ¿Necesitas ayuda? Contacta a{" "}
        <a
          href={`mailto:${supportEmail}`}
          className="text-kreoon-purple-400 hover:underline"
        >
          {supportEmail}
        </a>
      </p>
    </StatusPageLayout>
  );
}
