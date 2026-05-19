import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  ArrowRight,
  Rocket,
  Link2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { useBrand } from "@/hooks/useBrand";
import { StatusPageLayout } from "@/components/status/StatusPageLayout";
import { StatusCard } from "@/components/status/StatusCard";
import { KreoonButton } from "@/components/ui/kreoon";
import { CreateBrandDialog } from "@/components/brands/CreateBrandDialog";
import { JoinBrandDialog } from "@/components/brands/JoinBrandDialog";

export default function NoCompany() {
  const navigate = useNavigate();
  const { user, signOut, roles, rolesLoaded, loading } = useAuth();
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();
  const { hasBrand, isLoading: brandLoading } = useBrand();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
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
  }, [loading, rolesLoaded, orgLoading, user, roles, isPlatformRoot, currentOrgId, navigate]);

  // If user already has a brand, redirect to dashboard
  if (!brandLoading && hasBrand) {
    return <Navigate to="/client-dashboard" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <StatusPageLayout
      variant="pending"
      icon={<Building2 className="h-12 w-12" />}
      title="Bienvenido a KREOON"
      subtitle="Crea o unete a una marca para comenzar"
      userInfo={{
        name: user?.user_metadata?.full_name ?? undefined,
        email: user?.email ?? undefined,
      }}
      backgroundOrbs
    >
      {/* Main action cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button type="button" onClick={() => setShowCreate(true)} className="text-left">
          <StatusCard variant="glass" className="cursor-pointer hover:ring-2 hover:ring-kreoon-purple-500/40 transition-all h-full">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kreoon-purple-500/20">
                <Rocket className="h-7 w-7 text-kreoon-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-lg">Crear mi marca</p>
                <p className="text-sm text-kreoon-text-secondary mt-1">
                  Registra tu empresa y comienza a buscar talento creativo
                </p>
              </div>
            </div>
          </StatusCard>
        </button>

        <button type="button" onClick={() => setShowJoin(true)} className="text-left">
          <StatusCard variant="glass" className="cursor-pointer hover:ring-2 hover:ring-kreoon-purple-500/40 transition-all h-full">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/20">
                <Link2 className="h-7 w-7 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-lg">Unirme a una marca</p>
                <p className="text-sm text-kreoon-text-secondary mt-1">
                  Busca una marca existente o usa un codigo de invitacion
                </p>
              </div>
            </div>
          </StatusCard>
        </button>
      </div>

      {/* Explore community */}
      <StatusCard
        title="Mientras tanto, puedes:"
        icon={<Sparkles className="h-5 w-5 text-amber-500" />}
        className="mt-6"
      >
        <button
          type="button"
          onClick={() => navigate("/marketplace")}
          className="flex items-center gap-2 text-kreoon-purple-400 transition-colors hover:text-kreoon-purple-300"
        >
          <Users className="h-4 w-4" />
          Explorar la comunidad de creadores
          <ArrowRight className="h-4 w-4" />
        </button>
      </StatusCard>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <KreoonButton variant="primary" onClick={() => setShowCreate(true)}>
          Crear mi marca
        </KreoonButton>
        <KreoonButton variant="outline" onClick={handleSignOut}>
          Cerrar sesion
        </KreoonButton>
      </div>

      {/* Dialogs */}
      <CreateBrandDialog open={showCreate} onOpenChange={setShowCreate} />
      <JoinBrandDialog open={showJoin} onOpenChange={setShowJoin} />
    </StatusPageLayout>
  );
}
