import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { cn } from "@/lib/utils";

export type AuthModalView = "login" | "register" | "forgot-password";

export interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
  preselectedRole?: string;
}

const viewTransition = {
  initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 12 : -12 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -12 : 12 }),
  transition: { duration: 0.2 },
};

export function AuthModal({
  open,
  onClose,
  initialTab = "login",
  preselectedRole,
}: AuthModalProps) {
  const [currentTab, setCurrentTab] = React.useState<AuthModalView>(initialTab);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [direction, setDirection] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setCurrentTab(initialTab === "register" ? "register" : "login");
      setShowForgotPassword(false);
    }
  }, [open, initialTab]);

  const setViewWithDirection = React.useCallback((nextView: AuthModalView) => {
    setDirection(
      nextView === "register" || nextView === "forgot-password" ? 1 : -1
    );
    setCurrentTab(nextView);
  }, []);

  const handleTabChange = React.useCallback(
    (tab: "login" | "register") => {
      setViewWithDirection(tab);
    },
    [setViewWithDirection]
  );

  const handleSuccess = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const view = showForgotPassword ? "forgot-password" : currentTab;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          "border-kreoon-border bg-kreoon-bg-card p-0 gap-0 overflow-hidden overflow-y-auto",
          "shadow-kreoon-glow-sm border-kreoon-purple-500/30",
          "max-w-lg w-[calc(100%-2rem)] sm:w-full",
          "h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-xl",
        )}
      >
        <DialogTitle className="sr-only">
          {view === "login" && "Iniciar sesión"}
          {view === "register" && "Crear cuenta"}
          {view === "forgot-password" && "Recuperar contraseña"}
        </DialogTitle>

        <div className={cn(
          "flex flex-col",
          view === "register" ? "p-4 sm:p-6" : "p-6 sm:p-8"
        )}>
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
                  onTabChange={(tab) => handleTabChange(tab)}
                />
                <LoginForm
                  onSuccess={handleSuccess}
                  onForgotPassword={() => setViewWithDirection("forgot-password")}
                  onSwitchToRegister={() => setViewWithDirection("register")}
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
              >
                {/* WizardContainer has its own design - no AuthTabs needed */}
                <RegisterForm
                  onSuccess={handleSuccess}
                  onSwitchToLogin={() => setCurrentTab("login")}
                  preselectedRole={preselectedRole}
                />
              </motion.div>
            )}

            {view === "forgot-password" && (
              <motion.div
                key="forgot-password"
                custom={direction}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={viewTransition}
                transition={{ duration: 0.2 }}
              >
                <ForgotPasswordForm
                  onBack={() => setViewWithDirection("login")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
