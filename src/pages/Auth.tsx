import { useEffect, useCallback, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { useBranding } from "@/contexts/BrandingContext";
import { supabase } from "@/integrations/supabase/client";

export type AuthView = "login" | "register" | "forgot-password";

const viewTransition = {
  initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 12 : -12 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -12 : 12 }),
  transition: { duration: 0.2 },
};

function getInitialView(tab: string | null): AuthView {
  if (tab === "register") return "register";
  if (tab === "forgot-password") return "forgot-password";
  return "login";
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, rolesLoaded, roles } = useAuth();

  const tabParam = searchParams.get("tab");
  const roleParam = searchParams.get("role");
  const intentParam = searchParams.get("intent");
  const nextParam = searchParams.get("next"); // Para redirecciones específicas (ej: /welcome/ugc-colombia)

  const [view, setView] = useState<AuthView>(() => getInitialView(tabParam));
  const [direction, setDirection] = useState(0);
  const initialRole =
    roleParam && ["creator", "editor", "client"].includes(roleParam)
      ? roleParam
      : null;

  // Map intent param to RegistrationIntent
  const initialIntent =
    intentParam && ["talent", "brand", "organization", "join"].includes(intentParam)
      ? (intentParam as "talent" | "brand" | "organization" | "join")
      : null;

  useEffect(() => {
    setView(getInitialView(tabParam));
  }, [tabParam]);

  // Auto-select org from domain-resolved branding (subdomain or custom domain)
  const { branding } = useBranding();
  const orgAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (!user || authLoading || !branding.resolved_org_id || orgAutoSelectedRef.current) return;
    orgAutoSelectedRef.current = true;
    // Set the user's current_organization_id to the domain-resolved org
    supabase
      .from("profiles")
      .update({ current_organization_id: branding.resolved_org_id })
      .eq("id", user.id)
      .then(() => {
        // The auth context will pick up the change via its listener
      });
  }, [user, authLoading, branding.resolved_org_id]);

  useEffect(() => {
    if (!user || authLoading || !rolesLoaded) return;

    // Si hay un parámetro next, redirigir a esa URL primero (ej: /welcome/ugc-colombia)
    if (nextParam) {
      navigate(nextParam, { replace: true });
      return;
    }

    // User has roles in an organization - navigate to their dashboard
    if (roles.length > 0) {
      if (roles.includes("admin")) {
        navigate("/dashboard", { replace: true });
        return;
      }
      if (roles.includes("strategist")) {
        navigate("/strategist-dashboard", { replace: true });
        return;
      }
      if (roles.includes("creator") || roles.includes("content_creator") || roles.includes("ambassador")) {
        navigate("/creator-dashboard", { replace: true });
        return;
      }
      if (roles.includes("editor")) {
        navigate("/editor-dashboard", { replace: true });
        return;
      }
      if (roles.includes("client")) {
        navigate("/client-dashboard", { replace: true });
        return;
      }
    }

    // User has no roles - check if they're a talent or brand
    const checkUserType = async () => {
      try {
        // Check if user has a creator_profile (talent)
        const { data: creatorProfile } = await supabase
          .from('creator_profiles')
          .select('id, is_active, bio, avatar_url')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (creatorProfile) {
          // User is a talent - check if they completed onboarding
          const hasCompletedProfile = creatorProfile.bio && creatorProfile.avatar_url;
          if (hasCompletedProfile) {
            // Profile completed - go to marketplace
            // ProtectedRoute will redirect to /unlock-access if gate is enabled and not unlocked
            navigate("/marketplace", { replace: true });
          } else {
            // Profile not completed - go to welcome/wizard
            navigate("/welcome-talent", { replace: true });
          }
          return;
        }

        // Check if user is a brand member
        const { data: brandMember } = await supabase
          .from('brand_members')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (brandMember) {
          // User is a brand - go to marketplace
          navigate("/marketplace", { replace: true });
          return;
        }

        // User has no profile type yet - default to talent flow
        navigate("/welcome-talent", { replace: true });
      } catch (error) {
        console.error('Error checking user type:', error);
        navigate("/welcome-talent", { replace: true });
      }
    };

    checkUserType();
  }, [user, authLoading, rolesLoaded, roles, navigate, nextParam]);

  const setViewAndSyncUrl = useCallback(
    (nextView: AuthView) => {
      setDirection(
        nextView === "register" || nextView === "forgot-password" ? 1 : -1,
      );
      setView(nextView);
      const next = new URLSearchParams(searchParams);
      next.set("tab", nextView);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

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
                onTabChange={(tab) => setViewAndSyncUrl(tab)}
              />
              <LoginForm
                onForgotPassword={() => setViewAndSyncUrl("forgot-password")}
                onSwitchToRegister={() => setViewAndSyncUrl("register")}
              />
            </motion.div>
          )}

          {view === "register" && (
            <motion.div
              key="register"
              custom={direction}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={viewTransition}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <AuthTabs
                activeTab="register"
                onTabChange={(tab) => setViewAndSyncUrl(tab)}
              />
              <RegisterForm
                onSwitchToLogin={() => setViewAndSyncUrl("login")}
                preselectedRole={initialRole ?? undefined}
                initialIntent={initialIntent}
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
