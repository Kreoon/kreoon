import { ReactNode, useState } from "react";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";
import { AuthModal } from "@/components/auth/AuthModal";

interface PublicLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  minimalFooter?: boolean;
  transparentHeader?: boolean;
}

export function PublicLayout({
  children,
  showFooter = true,
  minimalFooter = false,
  transparentHeader = false,
}: PublicLayoutProps) {
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    tab: "login" | "register";
  }>({ open: false, tab: "login" });

  // "register" lo resuelve AuthModal/PublicHeader navegando a /registro.
  const handleOpenAuth = (tab: "login" | "register") => {
    setAuthModal({ open: true, tab });
  };

  return (
    <div className="relative min-h-screen bg-kreoon-bg-primary">
      <PublicHeader onOpenAuth={handleOpenAuth} transparent={transparentHeader} />

      <main className="pt-16">{children}</main>

      {showFooter && <PublicFooter minimal={minimalFooter} />}

      <AuthModal
        open={authModal.open}
        initialTab={authModal.tab}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
