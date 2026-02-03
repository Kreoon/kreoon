import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath } from "@/utils/navigation";

import { LandingLayout } from "@/components/landing/LandingLayout";
import { HeroSection } from "@/components/landing/sections/HeroSection";
import { LogosSection } from "@/components/landing/sections/LogosSection";
import { ValuePropositionSection } from "@/components/landing/sections/ValuePropositionSection";
import { HowItWorksSection } from "@/components/landing/sections/HowItWorksSection";
import { FeaturesSection } from "@/components/landing/sections/FeaturesSection";
import { TestimonialsSection } from "@/components/landing/sections/TestimonialsSection";
import { PricingSection } from "@/components/landing/sections/PricingSection";
import { CTASection } from "@/components/landing/sections/CTASection";

import { AuthModal } from "@/components/auth/AuthModal";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, roles, rolesLoaded, loading, activeRole } = useAuth();
  const navigate = useNavigate();
  const hasRedirectedRef = useRef(false);

  const [authModal, setAuthModal] = useState<{
    open: boolean;
    tab: "login" | "register";
    preselectedRole?: string;
  }>({ open: false, tab: "login" });

  useEffect(() => {
    if (!loading && user && rolesLoaded && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const dashboardPath = getDashboardPath(roles, activeRole ?? undefined);
      navigate(dashboardPath, { replace: true });
    }
  }, [user, roles, rolesLoaded, loading, activeRole, navigate]);

  const handleOpenAuth = (tab: "login" | "register", role?: string) => {
    setAuthModal({ open: true, tab, preselectedRole: role });
  };

  const handleSelectSegment = (segment: string) => {
    const roleMap: Record<string, string> = {
      client: "client",
      creator: "creator",
      editor: "editor",
    };
    handleOpenAuth("register", roleMap[segment] ?? segment);
  };

  const handleSelectPlan = (planId: string) => {
    handleOpenAuth("register");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kreoon-bg-primary">
        <Loader2 className="h-12 w-12 animate-spin text-kreoon-purple-500" />
      </div>
    );
  }

  if (user && rolesLoaded) {
    return null;
  }

  return (
    <>
      <LandingLayout
        onOpenAuth={(tab) => handleOpenAuth(tab)}
      >
        <HeroSection onGetStarted={() => handleOpenAuth("register")} />

        <LogosSection />

        <ValuePropositionSection onSelectSegment={handleSelectSegment} />

        <HowItWorksSection />

        <FeaturesSection />

        <TestimonialsSection />

        <PricingSection
          onSelectPlan={handleSelectPlan}
          highlightedPlan="marcas-starter"
        />

        <CTASection onGetStarted={() => handleOpenAuth("register")} />
      </LandingLayout>

      <AuthModal
        open={authModal.open}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
        initialTab={authModal.tab}
        preselectedRole={authModal.preselectedRole}
      />
    </>
  );
}
