import * as React from "react";
import { useEffect } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export interface LandingLayoutProps {
  children: React.ReactNode;
  onOpenAuth: (tab: "login" | "register") => void;
}

export function LandingLayout({ children, onOpenAuth }: LandingLayoutProps) {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return (
    <div className="relative z-10 min-h-screen bg-transparent">
      <PublicHeader onOpenAuth={onOpenAuth} transparent={true} />
      <main className="scroll-smooth pt-16">{children}</main>
      <PublicFooter />
    </div>
  );
}
