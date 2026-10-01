import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath } from "@/utils/navigation";

import { CreatorHome } from "@/components/landing/CreatorHome";
import { AuthModal } from "@/components/auth/AuthModal";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, roles, rolesLoaded, loading, activeRole } = useAuth();
  const navigate = useNavigate();
  const hasRedirectedRef = useRef(false);

  const [authModal, setAuthModal] = useState<{
    open: boolean;
    tab: "login" | "register";
  }>({ open: false, tab: "login" });

  useEffect(() => {
    if (!loading && user && rolesLoaded && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const dashboardPath = getDashboardPath(roles, activeRole ?? undefined);
      navigate(dashboardPath, { replace: true });
    }
  }, [user, roles, rolesLoaded, loading, activeRole, navigate]);

  // El alta pública es solo de creadores y vive en /registro; el modal solo sirve para login.
  const handleOpenAuth = (tab: "login" | "register") => {
    if (tab === "register") {
      navigate("/registro");
      return;
    }
    setAuthModal({ open: true, tab });
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user && rolesLoaded) {
    return null;
  }

  return (
    <>
      <CreatorHome onLogin={() => handleOpenAuth("login")} />
      <AuthModal
        open={authModal.open}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
        initialTab={authModal.tab}
      />
    </>
  );
}
