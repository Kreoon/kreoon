import { useEffect, useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

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

  useEffect(() => {
    if (!user || authLoading || !rolesLoaded) return;
    if (roles.length === 0) {
      navigate("/pending-access", { replace: true });
      return;
    }
    if (roles.includes("admin")) {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (roles.includes("strategist")) {
      navigate("/strategist-dashboard", { replace: true });
      return;
    }
    if (roles.includes("creator") || roles.includes("ambassador")) {
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
    navigate("/pending-access", { replace: true });
  }, [user, authLoading, rolesLoaded, roles, navigate]);

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
      <div className="flex min-h-screen items-center justify-center bg-kreoon-bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-kreoon-purple-500" />
      </div>
    );
  }

  if (user && rolesLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kreoon-bg-primary">
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
