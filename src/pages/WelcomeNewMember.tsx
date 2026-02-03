import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PartyPopper, Trophy, Rocket, ArrowRight, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { StatusPageLayout } from "@/components/status/StatusPageLayout";
import { StatusCard } from "@/components/status/StatusCard";
import { RoleBadgeCard } from "@/components/status/RoleBadgeCard";
import { KreoonButton } from "@/components/ui/kreoon";
import type { RoleBadgeRole } from "@/components/status/RoleBadgeCard";

const VALID_ROLES: RoleBadgeRole[] = [
  "creator",
  "editor",
  "client",
  "strategist",
  "ambassador",
  "admin",
];

function isValidRole(role: string | null): role is RoleBadgeRole {
  return role != null && VALID_ROLES.includes(role as RoleBadgeRole);
}

const ROLE_LABELS: Record<string, string> = {
  creator: "Creador",
  editor: "Editor",
  client: "Marca",
  strategist: "Estratega",
  ambassador: "Embajador",
  admin: "Administrador",
};

function getDashboardPath(role: string | null): string {
  if (!role) return "/dashboard";
  switch (role) {
    case "creator":
      return "/creator-dashboard";
    case "editor":
      return "/editor-dashboard";
    case "client":
      return "/client-dashboard";
    case "strategist":
      return "/strategist-dashboard";
    case "ambassador":
    case "admin":
    default:
      return "/dashboard";
  }
}

interface NextStepItemProps {
  number: number;
  title: string;
  description: string;
  completed: boolean;
}

function NextStepItem({ number, title, description, completed }: NextStepItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          completed
            ? "bg-green-500 text-white"
            : "border border-kreoon-border bg-kreoon-bg-secondary text-kreoon-text-secondary",
        )}
      >
        {completed ? <Check className="h-4 w-4" /> : number}
      </div>
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-kreoon-text-secondary">{description}</p>
      </div>
    </div>
  );
}

export default function WelcomeNewMember() {
  const { user, loading, rolesLoaded, roles, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get("role");

  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  const role = roleFromUrl ?? (roles.length > 0 ? roles[0] : null);
  const roleLabel = role ? ROLE_LABELS[role] ?? role : "";

  useEffect(() => {
    async function fetchOrgName() {
      if (!user) return;

      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("current_organization_id")
          .eq("id", user.id)
          .single();

        if (profileData?.current_organization_id) {
          const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", profileData.current_organization_id)
            .single();

          if (org) {
            setOrganizationName(org.name);
          }
        }
      } catch (error) {
        console.error("Error fetching organization:", error);
      } finally {
        setLoadingOrg(false);
      }
    }

    if (user) {
      fetchOrgName();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || !rolesLoaded || loadingOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kreoon-bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-kreoon-purple-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <StatusPageLayout
      variant="success"
      icon={<PartyPopper className="h-12 w-12" />}
      title="¡Bienvenido a Kreoon!"
      subtitle={`Te has unido como ${roleLabel}${organizationName ? ` a ${organizationName}` : ""}`}
      showConfetti
      userInfo={{
        name: profile?.full_name ?? undefined,
        role: role ?? undefined,
      }}
      backgroundOrbs
    >
      {/* Insignia de logro inicial */}
      <div className="mb-6">
        <StatusCard variant="highlighted">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-kreoon-text-secondary">
                ¡Primera insignia desbloqueada!
              </p>
              <p className="text-lg font-semibold text-white">Miembro Fundador</p>
              <p className="text-xs text-kreoon-purple-400">+50 puntos de reputación</p>
            </div>
          </div>
        </StatusCard>
      </div>

      {/* Card del rol con beneficios */}
      {isValidRole(role) && (
        <RoleBadgeCard
          role={role}
          userName={profile?.full_name ?? undefined}
          showBenefits
          size="lg"
        />
      )}

      {/* Próximos pasos */}
      <StatusCard title="Tus próximos pasos" icon={<Rocket className="h-5 w-5" />}>
        <div className="space-y-4">
          <NextStepItem
            number={1}
            title="Completa tu perfil"
            description="Añade tu foto y bio para destacar"
            completed={false}
          />
          <NextStepItem
            number={2}
            title="Explora la comunidad"
            description="Conecta con otros miembros"
            completed={false}
          />
          <NextStepItem
            number={3}
            title={
              role === "creator"
                ? "Publica tu primer contenido"
                : "Crea tu primera campaña"
            }
            description={
              role === "creator"
                ? "Muestra tu talento al mundo"
                : "Encuentra creadores perfectos"
            }
            completed={false}
          />
        </div>
      </StatusCard>

      {/* Botones de acción */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <KreoonButton
          variant="primary"
          size="lg"
          onClick={() => navigate(getDashboardPath(role))}
          className="flex-1"
        >
          Ir a mi Dashboard
          <ArrowRight className="ml-2 h-5 w-5" />
        </KreoonButton>
        <KreoonButton
          variant="secondary"
          size="lg"
          onClick={() => navigate("/social")}
          className="flex-1"
        >
          Explorar la comunidad
        </KreoonButton>
      </div>
    </StatusPageLayout>
  );
}
