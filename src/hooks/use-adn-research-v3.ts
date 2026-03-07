/**
 * useAdnResearchV3 - Hook para el sistema de research de 22 pasos
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  startAdnResearchV3,
  getResearchSession,
  pollResearchProgress,
  getResearchResult,
  getActiveResearchSession,
  getLatestCompletedSession,
  hasCompletedResearch,
  cancelResearchSession,
  type StartResearchParams,
} from "@/lib/services/adn-research-v3.service";
import type {
  AdnResearchV3Config,
  AdnResearchV3Session,
  AdnResearchV3Result,
  AdnResearchV3Status,
} from "@/types/adn-research-v3";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseAdnResearchV3Options {
  productId?: string;
  organizationId?: string;
  autoLoadSession?: boolean;
  autoLoad?: boolean; // alias for autoLoadSession
}

export interface ProgressState {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  currentStepName: string | null;
  status: AdnResearchV3Status | null;
  tokensConsumed: number;
  hasPartialResults: boolean;
  completedSteps: number[];
  isIntelligenceGathering: boolean;
}

interface UseAdnResearchV3Return {
  // State
  session: AdnResearchV3Session | null;
  result: AdnResearchV3Result | null;
  isLoading: boolean;
  isStarting: boolean;
  error: string | null;

  // Derived
  isRunning: boolean;
  isCompleted: boolean;
  hasError: boolean;
  progress: number;
  currentStepName: string | null;
  tokensUsed: number;
  progressState: ProgressState;

  // Actions
  start: (params: Omit<StartResearchParams, "productId" | "organizationId">) => Promise<boolean>;
  cancel: () => Promise<boolean>;
  refresh: () => Promise<void>;
  loadResult: () => Promise<void>;
  regenerateTab: (tabKey: string) => Promise<boolean>;
  clearError: () => void;
}

// ─── Step Names ──────────────────────────────────────────────────────────────

const STEP_NAMES: Record<number, string> = {
  0: "Inicializando",
  1: "Panorama de Mercado",
  2: "Análisis de Competencia",
  3: "Jobs To Be Done",
  4: "Avatares Ideales",
  5: "Psicología Profunda",
  6: "Neuromarketing",
  7: "Posicionamiento",
  8: "Ángulos de Copy",
  9: "Oferta Irresistible",
  10: "Creativos de Video",
  11: "Calendario 30 Días",
  12: "Lead Magnets",
  13: "Redes Sociales",
  14: "Meta Ads",
  15: "TikTok Ads",
  16: "Google Ads",
  17: "Email Marketing",
  18: "Landing Pages",
  19: "Estrategia de Lanzamiento",
  20: "KPIs y Métricas",
  21: "Contenido Orgánico",
  22: "Resumen Ejecutivo",
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAdnResearchV3(
  options: UseAdnResearchV3Options = {}
): UseAdnResearchV3Return {
  const { productId, organizationId, autoLoadSession = true, autoLoad } = options;
  const shouldAutoLoad = autoLoad ?? autoLoadSession;
  const { toast } = useToast();

  // State
  const [session, setSession] = useState<AdnResearchV3Session | null>(null);
  const [result, setResult] = useState<AdnResearchV3Result | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Derived State ─────────────────────────────────────────────────────────

  const isRunning = useMemo(() => {
    if (!session) return false;
    return ["initializing", "gathering_intelligence", "researching"].includes(session.status);
  }, [session?.status]);

  const isCompleted = useMemo(() => session?.status === "completed", [session?.status]);

  const hasError = useMemo(() => session?.status === "error", [session?.status]);

  const progress = useMemo(() => {
    if (!session) return 0;
    return Math.round((session.current_step / session.total_steps) * 100);
  }, [session?.current_step, session?.total_steps]);

  const currentStepName = useMemo(() => {
    if (!session) return null;
    if (session.status === "gathering_intelligence") return "Recopilando Inteligencia";
    return STEP_NAMES[session.current_step] || `Paso ${session.current_step}`;
  }, [session?.current_step, session?.status]);

  const tokensUsed = useMemo(() => session?.tokens_consumed || 0, [session?.tokens_consumed]);

  // ─── Progress State ─────────────────────────────────────────────────────────

  const progressState = useMemo((): ProgressState => {
    const currentStep = session?.current_step || 0;
    const totalSteps = session?.total_steps || 22;
    const status = session?.status || null;
    const progressSteps = session?.progress?.steps || [];
    const completedSteps = progressSteps
      .filter((s) => s.status === "completed")
      .map((s) => s.step);

    return {
      currentStep,
      totalSteps,
      percentage: Math.round((currentStep / totalSteps) * 100),
      currentStepName: currentStepName,
      status,
      tokensConsumed: session?.tokens_consumed || 0,
      hasPartialResults: completedSteps.length > 0,
      completedSteps,
      isIntelligenceGathering: status === "gathering_intelligence",
    };
  }, [session, currentStepName]);

  // ─── Clear Error ────────────────────────────────────────────────────────────

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ─── Load Session ──────────────────────────────────────────────────────────

  const loadActiveSession = useCallback(async () => {
    if (!productId) return;

    setIsLoading(true);
    try {
      // First check for active session
      const active = await getActiveResearchSession(productId);
      if (active) {
        setSession(active);
        return;
      }

      // Then check for completed session
      const completed = await getLatestCompletedSession(productId);
      if (completed) {
        setSession(completed);
        // Also load result
        const res = await getResearchResult(productId);
        if (res) setResult(res);
      }
    } catch (err) {
      console.error("Error loading session:", err);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  // ─── Start Research ────────────────────────────────────────────────────────

  const start = useCallback(
    async (params: Omit<StartResearchParams, "productId" | "organizationId">): Promise<boolean> => {
      if (!productId) {
        setError("No productId provided");
        return false;
      }

      setIsStarting(true);
      setIsLoading(true);
      setError(null);

      try {
        // Use provided organizationId or get from current user
        let orgId = organizationId;
        if (!orgId) {
          const { data: userData } = await supabase.auth.getUser();
          const { data: memberData } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", userData?.user?.id)
            .limit(1)
            .single();

          if (!memberData?.organization_id) {
            throw new Error("No se encontró la organización");
          }
          orgId = memberData.organization_id;
        }

        const response = await startAdnResearchV3({
          productId,
          organizationId: orgId,
          ...params,
        });

        if (!response.success) {
          // Check for insufficient tokens using the code from service
          if (response.code === "INSUFFICIENT_TOKENS" || response.error?.includes("insuficientes")) {
            const err = new Error(response.error) as Error & {
              code?: string;
              shortfall?: number;
              required_tokens?: number;
              current_balance?: number;
            };
            err.code = "INSUFFICIENT_TOKENS";
            err.shortfall = response.shortfall || (response.required_tokens ? response.required_tokens - (response.current_balance || 0) : 2400);
            err.required_tokens = response.required_tokens;
            err.current_balance = response.current_balance;
            throw err;
          }
          throw new Error(response.error || "Error iniciando research");
        }

        toast({
          title: "Research iniciado",
          description: "KIRO está analizando tu producto. Esto puede tomar 8-12 minutos.",
        });

        // Load the new session
        if (response.sessionId) {
          const newSession = await getResearchSession(response.sessionId);
          if (newSession) setSession(newSession);
        }

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        setError(msg);
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
        throw err; // Re-throw for caller to handle specific error types
      } finally {
        setIsStarting(false);
        setIsLoading(false);
      }
    },
    [productId, organizationId, toast]
  );

  // ─── Cancel ────────────────────────────────────────────────────────────────

  const cancel = useCallback(async (): Promise<boolean> => {
    if (!session?.id) return false;

    const success = await cancelResearchSession(session.id);
    if (success) {
      setSession((prev) => (prev ? { ...prev, status: "cancelled" as AdnResearchV3Status } : null));
      toast({
        title: "Cancelado",
        description: "El research ha sido cancelado.",
      });
    }
    return success;
  }, [session?.id, toast]);

  // ─── Refresh ───────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (session?.id) {
      const updated = await getResearchSession(session.id);
      if (updated) setSession(updated);
    }
  }, [session?.id]);

  // ─── Load Result ───────────────────────────────────────────────────────────

  const loadResult = useCallback(async () => {
    if (!productId) return;
    const res = await getResearchResult(productId);
    if (res) setResult(res);
  }, [productId]);

  // ─── Regenerate Tab ─────────────────────────────────────────────────────────

  const regenerateTab = useCallback(
    async (tabKey: string): Promise<boolean> => {
      if (!session?.id || !productId) {
        setError("No hay sesión activa");
        return false;
      }

      try {
        // Use provided organizationId or get from session
        let orgId = organizationId;
        if (!orgId) {
          const { data: userData } = await supabase.auth.getUser();
          const { data: memberData } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", userData?.user?.id)
            .limit(1)
            .single();
          orgId = memberData?.organization_id;
        }

        if (!orgId) {
          throw new Error("No se encontró la organización");
        }

        // Import regenerateTab from service
        const { regenerateTab: regenService } = await import("@/lib/services/adn-research-v3.service");
        const response = await regenService(session.id, tabKey, orgId);

        if (!response.success) {
          throw new Error(response.error || "Error regenerando tab");
        }

        toast({
          title: "Regenerando sección",
          description: `Regenerando ${tabKey}...`,
        });

        // Reload result after regeneration
        setTimeout(() => loadResult(), 3000);

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        setError(msg);
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
        return false;
      }
    },
    [session?.id, productId, organizationId, toast, loadResult]
  );

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Auto-load session on mount
  useEffect(() => {
    if (shouldAutoLoad && productId) {
      loadActiveSession();
    }
  }, [shouldAutoLoad, productId, loadActiveSession]);

  // Poll while running
  useEffect(() => {
    if (!isRunning || !session?.id) return;

    const cancelPoll = pollResearchProgress(
      session.id,
      (updated) => {
        setSession(updated);

        if (updated.status === "completed") {
          toast({
            title: "Research completado",
            description: "Tu ADN Recargado está listo para revisar.",
          });
          // Load result
          if (productId) {
            getResearchResult(productId).then(setResult);
          }
        } else if (updated.status === "error") {
          toast({
            title: "Error en el research",
            description: updated.error_message || "Ocurrió un error durante el análisis.",
            variant: "destructive",
          });
        }
      },
      3000
    );

    return cancelPoll;
  }, [isRunning, session?.id, productId, toast]);

  // Realtime subscription
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`adn_research_session:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "adn_research_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const updated = payload.new as unknown as AdnResearchV3Session;
          setSession(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  return {
    session,
    result,
    isLoading,
    isStarting,
    error,
    isRunning,
    isCompleted,
    hasError,
    progress,
    currentStepName,
    tokensUsed,
    progressState,
    start,
    cancel,
    refresh,
    loadResult,
    regenerateTab,
    clearError,
  };
}

export default useAdnResearchV3;
