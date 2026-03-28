/**
 * AdnResearchV3Progress
 * Visualización premium del progreso del research en tiempo real
 * Glassmorphism + Framer Motion + animaciones fluidas
 */

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Check,
  X,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Globe,
  Brain,
  Target,
  TrendingUp,
  BarChart2,
  FileText,
  Megaphone,
  Layout,
  Rocket,
  BookOpen,
  Mail,
  Video,
  Calendar,
  Users,
  Star,
  ShoppingBag,
  Search,
  MousePointer,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdnResearchV3Session, AdnResearchV3Progress as ProgressType } from "@/types/adn-research-v3";

// ─── TIPOS ────────────────────────────────────────────────

interface StepInfo {
  id: string;
  name: string;
  tab_key: string;
  status: "pending" | "running" | "completed" | "error";
  tokens_used?: number;
  duration_ms?: number;
  error?: string;
}

export interface AdnResearchProgressState {
  progressPct: number;
  currentStepName: string | null;
  elapsedMinutes: number;
  estimatedRemainingMinutes: number;
  completedSteps: StepInfo[];
  runningStep: StepInfo | null;
  pendingSteps: StepInfo[];
  errorSteps: StepInfo[];
  isRunning: boolean;
  isCompleted: boolean;
  isError: boolean;
  session: AdnResearchV3Session | null;
}

interface AdnResearchV3ProgressProps {
  progressState: AdnResearchProgressState;
  productName: string;
  onDismiss?: () => void;
  onViewResults?: () => void;
  onRestart?: () => void;
  className?: string;
}

// ─── MAPA DE ÍCONOS POR TAB_KEY ───────────────────────────

const TAB_ICONS: Record<string, typeof Brain> = {
  gathering_intelligence: Globe,
  market_overview: BarChart2,
  competition: Users,
  jtbd: Target,
  avatars: Brain,
  psychology: Brain,
  neuromarketing: Zap,
  positioning: Star,
  copy_angles: FileText,
  offer: ShoppingBag,
  video_creatives: Video,
  calendar: Calendar,
  lead_magnets: MousePointer,
  social_media: Megaphone,
  meta_ads: TrendingUp,
  tiktok_ads: TrendingUp,
  google_ads: Search,
  email_marketing: Mail,
  landing_pages: Layout,
  launch_strategy: Rocket,
  kpis: BarChart2,
  organic_content: BookOpen,
  executive_summary: Sparkles,
};

// Mensajes motivacionales que rotan mientras carga
const LOADING_MESSAGES = [
  "Analizando comportamiento del mercado en LATAM...",
  "Mapeando objeciones reales de compradores...",
  "Construyendo perfiles psicológicos del avatar...",
  "Extrayendo hooks ganadores de la competencia...",
  "Diseñando estrategia ESFERA personalizada...",
  "Generando banco de 30 hooks y headlines...",
  "Estructurando calendario de contenido 30 días...",
  "Construyendo arquitectura de campañas Meta...",
  "Analizando oportunidades en TikTok Ads...",
  "Diseñando landing pages de alta conversión...",
  "KIRO está destilando los insights más valiosos...",
  "Casi listo — preparando tu plan de 90 días...",
];

// ─── SUB-COMPONENTES ──────────────────────────────────────

// Anillo de progreso SVG
function ProgressRing({
  pct,
  size = 120,
  stroke = 8,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={pct}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-bold text-white"
        >
          {pct}%
        </motion.span>
        <span className="text-[10px] text-white/40 mt-0.5">completado</span>
      </div>
    </div>
  );
}

// Fila de un paso individual
function StepRow({
  step,
  index,
  isExpanded,
  onToggle,
}: {
  step: StepInfo;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = TAB_ICONS[step.tab_key] || FileText;

  const statusConfig = {
    pending: {
      iconBg: "bg-white/5",
      iconColor: "text-white/20",
      label: "",
    },
    running: {
      iconBg: "bg-violet-500/20",
      iconColor: "text-violet-400",
      label: "Generando...",
    },
    completed: {
      iconBg: "bg-green-500/15",
      iconColor: "text-green-400",
      label: step.duration_ms ? `${(step.duration_ms / 1000).toFixed(1)}s` : "",
    },
    error: {
      iconBg: "bg-red-500/15",
      iconColor: "text-red-400",
      label: "Error",
    },
  };

  const cfg = statusConfig[step.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: step.status === "pending" ? 0.4 : 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`
        rounded-sm border transition-colors duration-200
        ${
          step.status === "running"
            ? "border-violet-500/30 bg-violet-500/5"
            : step.status === "completed"
            ? "border-white/[0.08] bg-white/[0.02]"
            : step.status === "error"
            ? "border-red-500/20 bg-red-500/5"
            : "border-transparent"
        }
      `}
    >
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
        onClick={step.status !== "pending" ? onToggle : undefined}
      >
        <span className="text-[11px] font-bold text-white/20 w-5 flex-shrink-0 text-right">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className={`w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
          {step.status === "completed" ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : step.status === "error" ? (
            <X className="w-3.5 h-3.5 text-red-400" />
          ) : step.status === "running" ? (
            <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
          ) : (
            <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
          )}
        </div>

        <span
          className={`flex-1 text-xs font-medium truncate ${
            step.status === "pending" ? "text-white/30" : "text-white/80"
          }`}
        >
          {step.name}
        </span>

        {cfg.label && (
          <span
            className={`text-[11px] flex-shrink-0 ${
              step.status === "running"
                ? "text-violet-400"
                : step.status === "completed"
                ? "text-white/30"
                : "text-red-400"
            }`}
          >
            {cfg.label}
          </span>
        )}

        {step.status === "error" && (
          <button className="text-white/30 hover:text-white/60">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && step.status === "error" && step.error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 pt-0 ml-14">
              <p className="text-[11px] text-red-300/70 leading-relaxed">{step.error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Partículas flotantes decorativas
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-violet-500/30"
          style={{
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -12, 0],
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: 2.5 + i * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        />
      ))}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────

export function AdnResearchV3Progress({
  progressState,
  productName,
  onDismiss,
  onViewResults,
  onRestart,
  className = "",
}: AdnResearchV3ProgressProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCompletedRef = useRef(0);

  const {
    progressPct,
    currentStepName,
    elapsedMinutes,
    estimatedRemainingMinutes,
    completedSteps,
    errorSteps,
    isRunning,
    isCompleted,
    isError,
    session,
  } = progressState;

  const allSteps: StepInfo[] = useMemo(() => {
    const progressData = session?.progress as ProgressType | null;
    return (progressData?.steps || []).map((s) => ({
      id: String(s.step),
      name: s.name,
      tab_key: s.name.toLowerCase().replace(/\s+/g, "_"),
      status: s.status,
      tokens_used: s.tokens_used,
    }));
  }, [session?.progress]);

  const visibleSteps = showAllSteps ? allSteps : allSteps.slice(0, 8);
  const hasMoreSteps = allSteps.length > 8;

  // Rotar mensajes de loading cada 4s
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Detectar cuando se completa
  useEffect(() => {
    if (isCompleted && !justCompleted) {
      setJustCompleted(true);
    }
  }, [isCompleted, justCompleted]);

  // Auto-scroll al paso activo
  useEffect(() => {
    const newCompleted = completedSteps.length;
    if (newCompleted > prevCompletedRef.current && scrollRef.current) {
      const runningEl = scrollRef.current.querySelector('[data-running="true"]');
      runningEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    prevCompletedRef.current = newCompleted;
  }, [completedSteps.length]);

  const toggleStep = (stepId: string) => {
    setExpandedStep((prev) => (prev === stepId ? null : stepId));
  };

  // ── Estado: Completado ─────────────────────────────────
  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          w-full max-w-2xl mx-auto rounded-sm border border-green-500/30
          bg-gradient-to-b from-green-500/[0.08] to-white/[0.02]
          backdrop-blur-xl overflow-hidden text-center
          ${className}
        `}
      >
        <div className="relative px-6 pt-10 pb-8">
          <FloatingParticles />

          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-sm bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-violet-500/40"
          >
            <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white mb-2"
          >
            ¡ADN Recargado completado!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-white/50 text-sm mb-1"
          >
            {productName}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-white/30 text-xs mb-8"
          >
            22 secciones generadas en {elapsedMinutes} min
            {errorSteps.length > 0 && (
              <span className="text-amber-400/70"> · {errorSteps.length} sección(es) con error</span>
            )}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="grid grid-cols-3 gap-3 mb-8"
          >
            {[
              { label: "Secciones", value: `${completedSteps.length + 2}/24` },
              { label: "Tokens usados", value: session?.tokens_consumed?.toLocaleString() || "—" },
              { label: "Tiempo", value: `${elapsedMinutes} min` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-sm bg-white/5 border border-white/[0.08] py-3 px-2">
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <Button
              onClick={onViewResults}
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 font-semibold shadow-lg shadow-violet-500/30"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Ver las 22 secciones
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // ── Estado: Error fatal ────────────────────────────────
  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`
          w-full max-w-2xl mx-auto rounded-sm border border-red-500/30
          bg-red-500/5 backdrop-blur-xl p-8 text-center
          ${className}
        `}
      >
        <div className="w-16 h-16 rounded-sm bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Error en el proceso</h3>
        <p className="text-sm text-white/50 mb-6 leading-relaxed">
          {session?.error_message || "Ocurrió un error inesperado. Los tokens no fueron consumidos."}
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onDismiss} className="flex-1 border border-white/10">
            Cerrar
          </Button>
          <Button onClick={onDismiss} className="flex-1 bg-gradient-to-r from-violet-600 to-pink-600">
            Reintentar
          </Button>
        </div>
      </motion.div>
    );
  }

  // ── Estado: En progreso ────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        w-full max-w-2xl mx-auto rounded-sm border border-white/10
        bg-gradient-to-b from-white/[0.06] to-white/[0.02]
        backdrop-blur-xl overflow-hidden
        ${className}
      `}
    >
      {/* Header */}
      <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.08]">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/[0.08] via-transparent to-pink-500/[0.08] pointer-events-none" />
        <FloatingParticles />

        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">ADN Recargado en progreso</span>
            </div>
            <p className="text-xs text-white/40">{productName}</p>
          </div>

          <div className="flex items-center gap-2">
            {onRestart && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRestart}
                className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300 text-xs h-8 px-3"
              >
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Reiniciar
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-white/30 hover:text-white/60 text-xs h-8 px-3"
              >
                Cerrar ventana
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progreso central */}
      <div className="px-6 py-6 flex items-center gap-6">
        <div className="flex-shrink-0">
          <ProgressRing pct={progressPct} size={110} stroke={7} />
        </div>

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStepName}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-semibold text-white mb-1 leading-tight"
            >
              {currentStepName || "Inicializando..."}
            </motion.p>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.p
              key={loadingMessageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-xs text-white/40 mb-4 leading-relaxed"
            >
              {LOADING_MESSAGES[loadingMessageIndex]}
            </motion.p>
          </AnimatePresence>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-white/30" />
              <span className="text-xs text-white/40">{elapsedMinutes}min transcurridos</span>
            </div>
            {estimatedRemainingMinutes > 0 && (
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-violet-400/60" />
                <span className="text-xs text-violet-300/60">~{estimatedRemainingMinutes}min restantes</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de progreso lineal */}
      <div className="px-6 pb-2">
        <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-white/25">
            {completedSteps.length} de {allSteps.length} pasos completados
          </span>
          {errorSteps.length > 0 && (
            <span className="text-[10px] text-amber-400/60">
              {errorSteps.length} con error (el proceso continúa)
            </span>
          )}
        </div>
      </div>

      {/* Lista de pasos */}
      <div className="px-4 pb-4 mt-2" ref={scrollRef}>
        <div
          className="space-y-1 max-h-72 overflow-y-auto pr-1
          [&::-webkit-scrollbar]:w-1
          [&::-webkit-scrollbar-track]:bg-white/5
          [&::-webkit-scrollbar-thumb]:bg-white/20
          [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          <AnimatePresence initial={false}>
            {visibleSteps.map((step, i) => (
              <div key={step.id} data-running={step.status === "running" ? "true" : undefined}>
                <StepRow
                  step={step}
                  index={i}
                  isExpanded={expandedStep === step.id}
                  onToggle={() => toggleStep(step.id)}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>

        {hasMoreSteps && (
          <button
            onClick={() => setShowAllSteps((prev) => !prev)}
            className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-sm
              text-[11px] text-white/30 hover:text-white/60 hover:bg-white/5
              transition-all duration-200"
          >
            {showAllSteps ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Ver todos los pasos ({allSteps.length - 8} más)
              </>
            )}
          </button>
        )}
      </div>

      {/* Footer informativo */}
      <div className="px-6 py-4 border-t border-white/[0.08] flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm bg-violet-500/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-violet-400" />
        </div>
        <p className="text-[11px] text-white/30 leading-relaxed">
          Puedes cerrar esta ventana — el proceso continúa en background y los resultados quedarán
          guardados automáticamente.
        </p>
      </div>
    </motion.div>
  );
}

export default AdnResearchV3Progress;
