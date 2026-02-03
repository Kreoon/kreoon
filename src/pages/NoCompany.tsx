import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Clock,
  CheckCircle,
  Circle,
  Lightbulb,
  Users,
  UserCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { StatusPageLayout } from "@/components/status/StatusPageLayout";
import { StatusCard } from "@/components/status/StatusCard";
import { KreoonButton } from "@/components/ui/kreoon";

type TimelineStatus = "completed" | "current" | "pending";

interface TimelineItemProps {
  status: TimelineStatus;
  title: string;
  description: string;
}

function TimelineItem({ status, title, description }: TimelineItemProps) {
  return (
    <div className="relative flex items-start gap-3">
      {/* Línea conectora (no mostrar en el último) */}
      <div className="absolute left-[11px] top-6 -z-10 h-full w-0.5 bg-kreoon-border" />

      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          status === "current" && "ring-4 ring-kreoon-purple-500/20",
        )}
      >
        {status === "completed" ? (
          <CheckCircle className="h-6 w-6 text-green-500" />
        ) : status === "current" ? (
          <div className="h-3 w-3 animate-pulse rounded-full bg-kreoon-purple-500" />
        ) : (
          <Circle className="h-6 w-6 text-kreoon-text-muted" />
        )}
      </div>

      <div>
        <p
          className={cn(
            "font-medium",
            status === "pending" ? "text-kreoon-text-muted" : "text-white",
          )}
        >
          {title}
        </p>
        <p className="text-sm text-kreoon-text-secondary">{description}</p>
      </div>
    </div>
  );
}

export default function NoCompany() {
  const navigate = useNavigate();
  const { user, signOut, roles, rolesLoaded, loading } = useAuth();
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();

  useEffect(() => {
    // Si el usuario no es cliente (ej. rol removido), redirigir según rol y permisos.
    if (loading || !rolesLoaded || orgLoading) return;
    if (!user) return;

    const isClient = roles.includes("client");
    const isAdmin = roles.includes("admin") || roles.includes("team_leader");

    if (!isClient && isAdmin) {
      if (isPlatformRoot && !currentOrgId) {
        navigate("/no-organization", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [
    loading,
    rolesLoaded,
    orgLoading,
    user,
    roles,
    isPlatformRoot,
    currentOrgId,
    navigate,
  ]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <StatusPageLayout
      variant="pending"
      icon={<Briefcase className="h-12 w-12" />}
      title="¡Ya casi estás listo!"
      subtitle="Tu cuenta está activa, solo falta un paso más"
      userInfo={{
        name: user?.user_metadata?.full_name ?? undefined,
        email: user?.email ?? undefined,
      }}
      backgroundOrbs
    >
      {/* Explicación del estado */}
      <StatusCard variant="glass" className="mb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <Clock className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="mb-1 font-medium text-white">
              Asignación de empresa pendiente
            </p>
            <p className="text-sm text-kreoon-text-secondary">
              Un administrador de tu organización te asignará a una empresa
              pronto. Recibirás una notificación cuando esté listo.
            </p>
          </div>
        </div>
      </StatusCard>

      {/* Timeline visual del proceso */}
      <StatusCard title="Estado de tu cuenta">
        <div className="space-y-4">
          <TimelineItem
            status="completed"
            title="Cuenta creada"
            description="Tu registro fue exitoso"
          />
          <TimelineItem
            status="completed"
            title="Email verificado"
            description="Tu identidad está confirmada"
          />
          <TimelineItem
            status="current"
            title="Asignación de empresa"
            description="En proceso..."
          />
          <TimelineItem
            status="pending"
            title="Acceso completo"
            description="Podrás gestionar campañas y contenido"
          />
        </div>
      </StatusCard>

      {/* Mientras tanto... */}
      <StatusCard
        title="Mientras tanto, puedes:"
        icon={<Lightbulb className="h-5 w-5 text-amber-500" />}
        className="mt-4"
      >
        <ul className="space-y-3">
          <li>
            <button
              type="button"
              onClick={() => navigate("/social")}
              className="flex items-center gap-2 text-kreoon-purple-400 transition-colors hover:text-kreoon-purple-300"
            >
              <Users className="h-4 w-4" />
              Explorar la comunidad de creadores
              <ArrowRight className="h-4 w-4" />
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 text-kreoon-purple-400 transition-colors hover:text-kreoon-purple-300"
            >
              <UserCircle className="h-4 w-4" />
              Completar tu perfil
              <ArrowRight className="h-4 w-4" />
            </button>
          </li>
        </ul>
      </StatusCard>

      {/* Acciones */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <KreoonButton variant="primary" onClick={() => navigate("/social")}>
          Explorar la comunidad
        </KreoonButton>
        <KreoonButton variant="outline" onClick={handleSignOut}>
          Cerrar sesión
        </KreoonButton>
      </div>
    </StatusPageLayout>
  );
}
