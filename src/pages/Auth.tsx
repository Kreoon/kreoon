import { useEffect, useCallback, useState, useRef } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { useBranding } from "@/contexts/BrandingContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeReturnTo } from "@/lib/registration/returnTo";
import { REGISTRATION_BASE } from "@/lib/registration/paths";
import { getPostAuthDestination } from "@/lib/routing/postAuth";

export type AuthView = "login" | "forgot-password";

const viewTransition = {
  initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 12 : -12 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -12 : 12 }),
  transition: { duration: 0.2 },
};

function getInitialView(tab: string | null): AuthView {
  if (tab === "forgot-password") return "forgot-password";
  return "login";
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, rolesLoaded, roles, activeRole, profile } = useAuth();

  const tabParam = searchParams.get("tab");
  // Destino de retorno: solo rutas internas validadas (evita open redirect)
  const nextParam = sanitizeReturnTo(searchParams.get("next"));

  const [view, setView] = useState<AuthView>(() => getInitialView(tabParam));
  const [direction, setDirection] = useState(0);
  useEffect(() => {
    setView(getInitialView(tabParam));
  }, [tabParam]);

  // Auto-select org from domain-resolved branding (subdomain or custom domain)
  const { branding } = useBranding();
  const orgAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (!user || authLoading || !branding.resolved_org_id || orgAutoSelectedRef.current) return;
    orgAutoSelectedRef.current = true;
    // Visitar un dominio NO concede membresía ni cambia de contexto por sí solo: el contexto activo
    // solo se ajusta a la organización del dominio si la persona YA es miembro de ella.
    const resolvedOrgId = branding.resolved_org_id;
    supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", resolvedOrgId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle()
      .then(({ data: membership }) => {
        if (!membership) return;
        return supabase.from("profiles").update({ current_organization_id: resolvedOrgId }).eq("id", user.id);
      });
  }, [user, authLoading, branding.resolved_org_id]);

  useEffect(() => {
    if (!user || authLoading || !rolesLoaded) return;

    // Un destino explícito (o la vuelta al paso /continuar del registro) se respeta si es interno.
    // Los roles existentes van a su espacio habitual: ver src/lib/routing/postAuth.ts.
    const direct = getPostAuthDestination({ roles, activeRole, next: nextParam });
    if (roles.length > 0 || direct !== "/registro") {
      navigate(direct, { replace: true });
      return;
    }

    // Sin roles: marcas independientes y talento con perfil conservan su acceso; una identidad sin
    // nada se lleva a confirmar su alta como creador (nunca a elegir marca u organización).
    let cancelled = false;
    (async () => {
      try {
        const [{ data: creatorProfile }, { data: brandMember }] = await Promise.all([
          supabase.from("creator_profiles").select("id").eq("user_id", user.id).limit(1).maybeSingle(),
          supabase.from("brand_members").select("id").eq("user_id", user.id).limit(1).maybeSingle(),
        ]);
        if (cancelled) return;
        navigate(
          getPostAuthDestination({
            roles,
            hasCreatorProfile: Boolean(creatorProfile),
            isBrandMember: Boolean(brandMember),
          }),
          { replace: true },
        );
      } catch (error) {
        console.error("Error checking user type:", error);
        if (!cancelled) navigate("/registro", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, rolesLoaded, roles, activeRole, navigate, nextParam]);

  const setViewAndSyncUrl = useCallback(
    (nextView: AuthView) => {
      setDirection(nextView === "forgot-password" ? 1 : -1);
      setView(nextView);
      const next = new URLSearchParams(searchParams);
      next.set("tab", nextView);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const goToRegistration = useCallback(() => {
    navigate(REGISTRATION_BASE, { replace: false });
  }, [navigate]);

  // El alta ya no vive en /auth: el redirect genérico de /registro filtra la query (UTM/ref/next).
  if (tabParam === "register") {
    return <Navigate to={`${REGISTRATION_BASE}${location.search}`} replace />;
  }

  if (authLoading || (user && !rolesLoaded)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-kreoon-purple-500" />
      </div>
    );
  }

  if (user && rolesLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-kreoon-purple-500" />
      </div>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full space-y-6">
        <AnimatePresence mode="wait" custom={direction}>
          {view === "login" && (
            <motion.div
              key="login"
              custom={direction}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={viewTransition}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <AuthTabs
                activeTab="login"
                onTabChange={(tab) => {
                  if (tab === "register") goToRegistration();
                  else setViewAndSyncUrl(tab);
                }}
              />
              <LoginForm
                onForgotPassword={() => setViewAndSyncUrl("forgot-password")}
                onSwitchToRegister={goToRegistration}
              />
            </motion.div>
          )}

          {view === "forgot-password" && (
            <motion.div
              key="forgot-password"
              custom={direction}
              variants={viewTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={viewTransition.transition}
            >
              <ForgotPasswordForm onBack={() => setViewAndSyncUrl("login")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
}
