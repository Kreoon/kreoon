import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath } from "@/utils/navigation";

import { LandingLayout } from "@/components/landing/LandingLayout";
import { StoryScrollContainer } from "@/components/landing/StoryScrollContainer";
import { StoryTransition } from "@/components/landing/StoryTransition";
import { HeroModern } from "@/components/landing/sections/HeroModern";
import { SolutionRolesSection } from "@/components/landing/sections/SolutionRolesSection";
import { AIEngineSection } from "@/components/landing/sections/AIEngineSection";
import { ProjectKanbanShowcase } from "@/components/landing/sections/ProjectKanbanShowcase";
import { FactorySection } from "@/components/landing/sections/FactorySection";
import { VideoShowcase } from "@/components/landing/sections/VideoShowcase";
import { MarketplaceUniverse } from "@/components/landing/sections/MarketplaceUniverse";
import { PricingSection } from "@/components/landing/sections/PricingSection";
import { CTASection } from "@/components/landing/sections/CTASection";
import { BrandsPartners } from "@/components/landing/sections/BrandsPartners";
import { NebulaBackground } from "@/components/landing/NebulaBackground";

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
      <NebulaBackground />
      <LandingLayout
        onOpenAuth={(tab) => handleOpenAuth(tab)}
      >
        <StoryScrollContainer>
          <HeroModern
            onGetStarted={() => handleOpenAuth("register")}
            onWatchDemo={() => {
              document.getElementById("factory")?.scrollIntoView({ behavior: "smooth" });
            }}
          />

          <BrandsPartners />

          <StoryTransition label="Ecosistema" variant="glow" />

          <SolutionRolesSection />

          <StoryTransition variant="line" />

          <VideoShowcase />

          <StoryTransition label="Inteligencia" variant="glow" />

          <div id="ai-engine">
            <AIEngineSection />
          </div>

          <StoryTransition variant="fade" />

          <ProjectKanbanShowcase />

          <StoryTransition label="Producción" variant="glow" />

          <div id="factory">
            <FactorySection />
          </div>

          <StoryTransition variant="line" />

          <div id="marketplace">
            <MarketplaceUniverse />
          </div>

          <StoryTransition label="Planes" variant="glow" />

          <div id="pricing">
            <PricingSection
              onSelectPlan={handleSelectPlan}
              highlightedPlan="marcas-starter"
            />
          </div>

          <StoryTransition variant="fade" />

          <CTASection onGetStarted={() => handleOpenAuth("register")} />
        </StoryScrollContainer>
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
