/**
 * AdnResearchV3Section
 * Componente de integración que orquesta el flujo completo de ADN Recargado v3
 * Máquina de estados: idle -> configuring -> running -> completed | error
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, AlertCircle, ChevronLeft, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdnResearchV3Configurator } from "@/components/product-dna/adn-v3/AdnResearchV3Configurator";
import { AdnResearchV3Progress } from "@/components/product-dna/adn-v3/AdnResearchV3Progress";
import { AdnResearchV3Dashboard } from "@/components/product-dna/adn-v3/AdnResearchV3Dashboard";
import { useAdnResearchV3 } from "@/hooks/use-adn-research-v3";
import type { ProductDnaSummary, ClientDnaSummary, TokenBalance } from "@/components/product-dna/adn-v3/AdnResearchV3Configurator";
import type { AdnResearchProgressState } from "@/components/product-dna/adn-v3/AdnResearchV3Progress";
import type { StartResearchParams } from "@/lib/services/adn-research-v3.service";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface AdnResearchV3SectionProps {
  productId: string;
  organizationId: string;
  productDna: ProductDnaSummary;
  clientDna?: ClientDnaSummary | null;
  tokenBalance?: TokenBalance;
  onPushToContentBoard?: (items: unknown[]) => void;
  useLiteMode?: boolean; // Usar orchestrator-lite con n8n webhook
}

type SectionState =
  | "loading"
  | "idle"
  | "configuring"
  | "running"
  | "completed"
  | "error";

// ─── SUB-COMPONENTE: Estado idle (sin research) ──────────────────────────────

function IdleState({
  productName,
  onStart,
  isStarting = false,
}: {
  productName: string;
  onStart: () => void;
  isStarting?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-lg mx-auto"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-20 h-20 rounded-sm bg-gradient-to-br from-violet-500/20 to-pink-600/20 border border-white/10 flex items-center justify-center mb-6"
      >
        <Sparkles className="w-9 h-9 text-violet-400" />
      </motion.div>

      <h3 className="text-xl font-bold text-foreground mb-2">
        ADN Recargado v3
      </h3>
      <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
        Estrategia 360 para{" "}
        <span className="text-foreground font-medium">{productName}</span>
      </p>
      <p className="text-xs text-muted-foreground/60 mb-8 leading-relaxed">
        22 secciones: psicologia del cliente, copy, calendarios, Meta Ads,
        TikTok, landing pages, KIRO Insights y plan de 90 dias.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {[
          "30 hooks listos",
          "Plan 90 dias",
          "Meta Ads completo",
          "KIRO Insights",
          "Calendario 30 dias",
          "Landing pages",
        ].map((feat) => (
          <span
            key={feat}
            className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground"
          >
            {feat}
          </span>
        ))}
      </div>

      <Button
        onClick={onStart}
        disabled={isStarting}
        className="h-12 px-8 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 font-semibold shadow-lg shadow-violet-500/30 relative overflow-hidden disabled:opacity-70"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
        <span className="relative flex items-center gap-2">
          {isStarting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Iniciando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generar ahora
            </>
          )}
        </span>
      </Button>

      <p className="text-[11px] text-muted-foreground/40 mt-4">
        ~2,400 tokens - ~8-12 minutos
      </p>
    </motion.div>
  );
}

// ─── SUB-COMPONENTE: Error con tokens insuficientes ──────────────────────────

function InsufficientTokensState({
  shortfall,
  onBack,
}: {
  shortfall: number;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-sm mx-auto"
    >
      <div className="w-14 h-14 rounded-sm bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mb-5">
        <Zap className="w-7 h-7 text-amber-400" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">
        Tokens insuficientes
      </h3>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        Necesitas{" "}
        <span className="text-amber-400 font-semibold">
          {shortfall.toLocaleString()}
        </span>{" "}
        tokens mas para generar el ADN Recargado v3.
      </p>
      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          className="border border-border text-muted-foreground hover:text-foreground"
        >
          Volver
        </Button>
        <Button className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500">
          Comprar tokens
        </Button>
      </div>
    </motion.div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function AdnResearchV3Section({
  productId,
  organizationId,
  productDna,
  clientDna,
  tokenBalance: externalTokenBalance,
  useLiteMode = false,
}: AdnResearchV3SectionProps) {
  // Estado local del flujo UI
  const [uiState, setUiState] = useState<SectionState>("loading");
  const [tokenShortfall, setTokenShortfall] = useState(0);

  // Token balance (usar externo si viene, sino mock)
  const tokenBalance: TokenBalance = externalTokenBalance || {
    balance: 5000,
    isLoading: false,
  };

  // Hook principal
  const {
    session,
    result,
    progressState: hookProgressState,
    isLoading,
    isStarting,
    isRunning,
    isCompleted,
    hasError,
    error,
    start,
    startLite,
    regenerateTab,
    clearError,
  } = useAdnResearchV3({
    productId,
    organizationId,
    autoLoad: true,
  });

  // Mapear progressState del hook al formato que espera Progress component
  const progressState: AdnResearchProgressState = useMemo(() => {
    const steps = session?.progress?.steps || [];
    const completedSteps = steps
      .filter((s) => s.status === "completed")
      .map((s) => ({
        id: `step-${s.step}`,
        name: s.name,
        tab_key: s.name.toLowerCase().replace(/ /g, "_"),
        status: s.status as "completed",
        tokens_used: s.tokens_used,
      }));

    const runningStep = steps.find((s) => s.status === "running");
    const pendingSteps = steps
      .filter((s) => s.status === "pending")
      .map((s) => ({
        id: `step-${s.step}`,
        name: s.name,
        tab_key: s.name.toLowerCase().replace(/ /g, "_"),
        status: s.status as "pending",
      }));

    const errorSteps = steps
      .filter((s) => s.status === "error")
      .map((s) => ({
        id: `step-${s.step}`,
        name: s.name,
        tab_key: s.name.toLowerCase().replace(/ /g, "_"),
        status: s.status as "error",
      }));

    return {
      progressPct: hookProgressState.percentage,
      currentStepName: hookProgressState.currentStepName,
      elapsedMinutes: 0, // TODO: calcular desde session.started_at
      estimatedRemainingMinutes: Math.max(
        0,
        (22 - hookProgressState.currentStep) * 0.5
      ),
      completedSteps,
      runningStep: runningStep
        ? {
            id: `step-${runningStep.step}`,
            name: runningStep.name,
            tab_key: runningStep.name.toLowerCase().replace(/ /g, "_"),
            status: "running" as const,
          }
        : null,
      pendingSteps,
      errorSteps,
      isRunning,
      isCompleted,
      isError: hasError,
      session,
    };
  }, [session, hookProgressState, isRunning, isCompleted, hasError]);

  // Determinar estado inicial basado en el hook
  // PRIORIDAD: Si hay datos (result), mostrar dashboard aunque haya sesión en progreso
  useEffect(() => {
    if (isLoading) {
      setUiState("loading");
      return;
    }

    // Si hay resultado con tabs, mostrar dashboard (prioridad máxima)
    // Esto maneja el caso donde n8n insertó datos directamente
    if (result && result.tabs && Object.keys(result.tabs).length > 0) {
      console.log("[AdnResearchV3Section] Mostrando dashboard - tabs encontrados:", Object.keys(result.tabs));
      setUiState("completed");
      return;
    }

    if (isCompleted) {
      setUiState("completed");
      return;
    }

    if (isRunning) {
      setUiState("running");
      return;
    }

    if (hasError) {
      setUiState("error");
      return;
    }

    setUiState("idle");
  }, [isLoading, isCompleted, isRunning, hasError, result]);

  // Sincronizar cuando el proceso termina
  useEffect(() => {
    if (isCompleted && result && uiState === "running") {
      setUiState("completed");
    }
  }, [isCompleted, result, uiState]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleStartFromIdle = async () => {
    // Siempre ir a configuración primero para poder ajustar inputs
    console.log("[ADN Section] handleStartFromIdle - abriendo configuración");
    setUiState("configuring");
  };

  const handleCancelConfig = () => {
    setUiState("idle");
  };

  const handleStartResearch = async (
    params: StartResearchParams
  ): Promise<{ sessionId: string } | null> => {
    try {
      let success: boolean;

      if (useLiteMode) {
        // Modo lite: usar n8n webhook con la configuración
        console.log("[ADN Section] Iniciando en modo LITE con config:", params.config);
        success = await startLite(params.config);
      } else {
        // Modo estándar
        success = await start(params);
      }

      if (success) {
        setUiState("running");
        return { sessionId: session?.id || "" };
      }
      // Si no fue exitoso pero no hubo excepción, verificar el error actual
      if (error && (error.includes("insuficientes") || error.includes("tokens"))) {
        setTokenShortfall(2400);
        setUiState("error");
      }
      return null;
    } catch (err) {
      console.log("[ADN Section] Catch error:", err);
      const errObj = err as Error & {
        code?: string;
        shortfall?: number;
        required_tokens?: number;
        current_balance?: number;
      };
      if (errObj.code === "INSUFFICIENT_TOKENS") {
        const shortfall = errObj.shortfall ||
          (errObj.required_tokens ? errObj.required_tokens - (errObj.current_balance || 0) : 2400);
        setTokenShortfall(shortfall);
        setUiState("error");
      } else {
        // Error genérico
        setUiState("error");
      }
      return null;
    }
  };

  const handleDismissProgress = () => {
    if (hookProgressState.hasPartialResults || result) {
      setUiState("completed");
    } else {
      setUiState("idle");
    }
  };

  const handleViewResults = () => {
    setUiState("completed");
  };

  const handleBackFromDashboard = () => {
    setUiState("idle");
  };

  const handleRegenerateTab = async (tabKey: string) => {
    return regenerateTab(tabKey);
  };

  const handleRegenerateAll = async () => {
    // Siempre ir a configuración primero para poder ajustar inputs
    console.log("[ADN Section] handleRegenerateAll - abriendo configuración");
    setUiState("configuring");
  };

  const handleRestart = async () => {
    // Cancelar sesión actual si existe
    if (session?.id) {
      try {
        const { cancelResearchSession } = await import("@/lib/services/adn-research-v3.service");
        await cancelResearchSession(session.id);
        console.log("[ADN Section] Sesión cancelada:", session.id);
      } catch (err) {
        console.warn("[ADN Section] Error cancelando sesión:", err);
      }
    }
    // Volver a configuración para reiniciar
    setUiState("configuring");
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  // Loading
  if (isLoading || uiState === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-violet-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
          </div>
          <p className="text-xs text-muted-foreground">
            Cargando estado del ADN Recargado...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {/* IDLE */}
        {uiState === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <IdleState
              productName={productDna.product_name}
              onStart={handleStartFromIdle}
              isStarting={isStarting}
            />
          </motion.div>
        )}

        {/* CONFIGURING */}
        {uiState === "configuring" && (
          <motion.div
            key="configuring"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="px-4 py-6"
          >
            <button
              onClick={handleCancelConfig}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Cancelar
            </button>

            <AdnResearchV3Configurator
              productId={productId}
              productDna={productDna}
              clientDna={clientDna}
              organizationId={organizationId}
              tokenBalance={tokenBalance}
              onStart={handleStartResearch}
              onCancel={handleCancelConfig}
              isStarting={isStarting}
            />
          </motion.div>
        )}

        {/* RUNNING */}
        {(uiState === "running" ||
          (isRunning && uiState !== "configuring")) && (
          <motion.div
            key="running"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 py-6"
          >
            <AdnResearchV3Progress
              progressState={progressState}
              productName={productDna.product_name}
              onDismiss={handleDismissProgress}
              onViewResults={handleViewResults}
              onRestart={handleRestart}
            />
          </motion.div>
        )}

        {/* COMPLETED */}
        {(uiState === "completed" || isCompleted) && result && (
          <motion.div
            key="completed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AdnResearchV3Dashboard
              result={result}
              productName={productDna.product_name}
              sessionId={session?.id}
              organizationId={organizationId}
              onRegenerate={(tabKey) => handleRegenerateTab(tabKey)}
              onRegenerateAll={handleRegenerateAll}
              onBack={handleBackFromDashboard}
            />
          </motion.div>
        )}

        {/* ERROR - Tokens insuficientes */}
        {uiState === "error" && tokenShortfall > 0 && (
          <motion.div
            key="tokens-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <InsufficientTokensState
              shortfall={tokenShortfall}
              onBack={() => {
                clearError();
                setTokenShortfall(0);
                setUiState("idle");
              }}
            />
          </motion.div>
        )}

        {/* ERROR - Generico */}
        {uiState === "error" && !tokenShortfall && (
          <motion.div
            key="generic-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-sm mx-auto"
          >
            <div className="w-14 h-14 rounded-sm bg-red-500/15 border border-red-500/20 flex items-center justify-center mb-5">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              Error inesperado
            </h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {error ||
                session?.error_message ||
                "Ocurrio un error. Los tokens no fueron consumidos."}
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  clearError();
                  setUiState("idle");
                }}
                className="border border-border text-muted-foreground"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  clearError();
                  setUiState("configuring");
                }}
                className="bg-gradient-to-r from-violet-600 to-pink-600"
              >
                Reintentar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdnResearchV3Section;
