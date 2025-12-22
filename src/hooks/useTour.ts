import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getTourConfig, RoleTourConfig } from "@/components/tour/tourSteps";
import { toast } from "sonner";

export function useTour() {
  const { user, profile, roles } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourConfig, setTourConfig] = useState<RoleTourConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedTour, setHasCheckedTour] = useState(false);

  useEffect(() => {
    if (!user || !profile || !roles.length) {
      setIsLoading(false);
      return;
    }

    // Only check once per session to avoid re-showing
    if (hasCheckedTour) {
      setIsLoading(false);
      return;
    }

    // Check if user has seen the tour - must be explicitly false (never seen)
    // null or undefined means tour was seen or not applicable
    const hasSeenTour = (profile as any).has_seen_tour;
    
    // Only show if has_seen_tour is explicitly false (new user who hasn't seen it)
    if (hasSeenTour === false) {
      const config = getTourConfig(roles);
      if (config) {
        setTourConfig(config);
        // Small delay to let the dashboard render first
        setTimeout(() => {
          setShowWelcome(true);
        }, 500);
      }
    }
    
    setHasCheckedTour(true);
    setIsLoading(false);
  }, [user, profile, roles, hasCheckedTour]);

  const startTour = useCallback(() => {
    setShowWelcome(false);
    // Small delay to allow the welcome dialog to close
    setTimeout(() => {
      setShowTour(true);
    }, 300);
  }, []);

  const closeTour = useCallback(async () => {
    setShowTour(false);
    setShowWelcome(false);
    
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ has_seen_tour: true })
          .eq("id", user.id);
      } catch (error) {
        console.error("Error updating tour status:", error);
      }
    }
  }, [user]);

  const completeTour = useCallback(async () => {
    setShowTour(false);
    
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ has_seen_tour: true })
          .eq("id", user.id);
        
        toast.success("¡Tour completado! Ya conoces las funcionalidades principales.");
      } catch (error) {
        console.error("Error updating tour status:", error);
      }
    }
  }, [user]);

  const resetTour = useCallback(async () => {
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ has_seen_tour: false })
          .eq("id", user.id);
        
        const config = getTourConfig(roles);
        if (config) {
          setTourConfig(config);
          setShowWelcome(true);
        }
      } catch (error) {
        console.error("Error resetting tour:", error);
      }
    }
  }, [user, roles]);

  return {
    showWelcome,
    showTour,
    tourConfig,
    isLoading,
    startTour,
    closeTour,
    completeTour,
    resetTour,
    userName: profile?.full_name?.split(" ")[0] || "Usuario"
  };
}
