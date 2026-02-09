import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, Circle } from "lucide-react";
import { StatusPageLayout } from "@/components/status/StatusPageLayout";
import { StatusCard } from "@/components/status/StatusCard";
import { RoleBadgeCard } from "@/components/status/RoleBadgeCard";
import { PendingAnimation } from "@/components/status/PendingAnimation";
import { KreoonButton } from "@/components/ui/kreoon";
import { Loader2 } from "lucide-react";
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

export default function PendingAccess() {
  const { user, signOut, roles, loading, rolesLoaded, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const isPending = profile?.organization_status === "pending_assignment";

  useEffect(() => {
    if (!loading && rolesLoaded && roles.length > 0 && profile?.organization_status !== "pending_assignment") {
      if (roles.includes("admin")) {
        navigate("/dashboard", { replace: true });
      } else if (roles.includes("creator")) {
        navigate("/creator-dashboard", { replace: true });
      } else if (roles.includes("editor")) {
        navigate("/editor-dashboard", { replace: true });
      } else if (roles.includes("client")) {
        navigate("/client-dashboard", { replace: true });
      } else if (roles.includes("strategist")) {
        navigate("/strategist-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [loading, rolesLoaded, roles, profile, navigate]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    const fetchOrgAndRole = async () => {
      if (!profile?.current_organization_id || !user?.id) {
        setLoadingOrg(false);
        return;
      }
      try {
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", profile.current_organization_id)
          .single();
        if (orgError) throw orgError;
        setOrganizationName(org?.name ?? null);

        const { data: memberRole, error: roleError } = await supabase
          .from("organization_member_roles")
          .select("role")
          .eq("organization_id", profile.current_organization_id)
          .eq("user_id", user.id)
          .single();
        if (!roleError && memberRole) {
          setUserRole(memberRole.role);
        }
      } catch (error) {
        console.error("Error fetching organization info:", error);
      } finally {
        setLoadingOrg(false);
      }
    };
    fetchOrgAndRole();
  }, [profile?.current_organization_id, user?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
  };

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    undefined;

  if (loading || !rolesLoaded || loadingOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kreoon-bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-kreoon-purple-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kreoon-bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-kreoon-purple-500" />
      </div>
    );
  }

  if (roles.length > 0 && !isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kreoon-bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-kreoon-purple-500" />
      </div>
    );
  }

  return (
    <StatusPageLayout
      variant="pending"
      icon={<Clock className="h-12 w-12" />}
      title="Acceso Pendiente de Aprobación"
      subtitle="Tu solicitud está siendo revisada por el equipo"
      userInfo={{
        name: displayName ?? undefined,
        email: user.email ?? undefined,
        role: userRole ?? undefined,
      }}
      backgroundOrbs
    >
      <PendingAnimation
        variant="orbit"
        label="Revisando tu solicitud..."
      />

      {isValidRole(userRole) && (
        <RoleBadgeCard
          role={userRole}
          userName={displayName ?? undefined}
          showBenefits
          size="md"
        />
      )}

      <StatusCard variant="glass" title="¿Qué sigue?">
        <ul className="space-y-3 text-kreoon-text-secondary">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
            Cuenta creada exitosamente
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-5 w-5 shrink-0 text-yellow-500" />
            Esperando aprobación del administrador
          </li>
          <li className="flex items-center gap-2">
            <Circle className="h-5 w-5 shrink-0 text-kreoon-text-muted" />
            Acceso completo a la plataforma
          </li>
        </ul>
      </StatusCard>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <KreoonButton
          variant="primary"
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => navigate("/marketplace")}
        >
          Explorar la comunidad
        </KreoonButton>
        <KreoonButton
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
          onClick={handleSignOut}
        >
          Cerrar sesión
        </KreoonButton>
      </div>

      <p className="mt-6 text-center text-sm text-kreoon-text-muted">
        ¿Tienes preguntas? Contacta a{" "}
        <a
          href="mailto:soporte@kreoon.com"
          className="text-kreoon-purple-400 hover:underline"
        >
          soporte@kreoon.com
        </a>
      </p>
    </StatusPageLayout>
  );
}
