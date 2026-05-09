import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Rocket, RefreshCw, ArrowRight, AlertTriangle, Coins,
  CheckCircle2, Globe, Target, Heart, Swords, Users, Lightbulb,
  Brain, Trophy, Gift, Calendar, Megaphone, Mail, DollarSign,
  BarChart3, Search, Handshake, MessageCircle, FileText, Dna,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdnRecargadoBannerProps {
  tokenCost: number;
  hasEnoughTokens: boolean;
  balanceLoading: boolean;
  isClient: boolean;
  isAdmin?: boolean;
  monthlyUsageCount: number;
  monthlyLimit?: number | null;
  limitReached: boolean;
  isRegenerate?: boolean;
  onActivate: (includeClientDna: boolean, forceRegenerate: boolean) => void;
  onViewDetails?: () => void;
  completedTabs?: number;
  totalTabs?: number;
  isGenerating?: boolean;
}

const TAB_ICONS = [
  Globe, Target, Heart, Swords, Users, Lightbulb, Sparkles, Trophy,
  Gift, Sparkles, Calendar, Rocket, Globe, MessageCircle, Megaphone,
  Mail, DollarSign, BarChart3, Search, Handshake, FileText,
];

export function AdnRecargadoBanner({
  tokenCost,
  hasEnoughTokens,
  balanceLoading,
  isClient,
  isAdmin,
  monthlyUsageCount,
  monthlyLimit,
  limitReached,
  isRegenerate = false,
  onActivate,
  onViewDetails,
  completedTabs = 0,
  totalTabs = 21,
  isGenerating = false,
}: AdnRecargadoBannerProps) {
  const [includeClientDna, setIncludeClientDna] = useState(true);

  const canActivate = isAdmin || isClient;
  const disabled = !canActivate || !hasEnoughTokens || limitReached || balanceLoading;
  const tooltipMessage = balanceLoading
    ? "Verificando Tokens IA..."
    : !canActivate
      ? "Solo administradores o clientes pueden activar"
      : limitReached
        ? monthlyLimit === 0 ? "Tu plan no incluye ADN Recargado" : `Límite mensual alcanzado (${monthlyUsageCount}/${monthlyLimit})`
        : !hasEnoughTokens
          ? `Tokens IA insuficientes (necesitas ${tokenCost.toLocaleString()})`
          : "";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#0a0a1a] via-[#1a0a2e] to-[#0a0a1a] shadow-2xl shadow-violet-500/20">
      {/* Glow ambient layers */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {/* Violet glow top-left */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-violet-600/30 rounded-full blur-3xl animate-pulse-slow" />
        {/* Pink glow bottom-right */}
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-pink-500/30 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
        {/* Center orange glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

        {/* Star particles */}
        <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none">
          <defs>
            <radialGradient id="star-gradient">
              <stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {Array.from({ length: 40 }).map((_, i) => {
            const x = (i * 137.5) % 100;
            const y = (i * 89.3) % 100;
            const r = 1 + (i % 3) * 0.5;
            const delay = (i * 0.3) % 4;
            return (
              <circle
                key={i}
                cx={`${x}%`}
                cy={`${y}%`}
                r={r}
                fill="url(#star-gradient)"
                className="animate-twinkle"
                style={{ animationDelay: `${delay}s` }}
              />
            );
          })}
        </svg>
      </div>

      {/* Animated DNA Helix in background (centered) */}
      <div aria-hidden className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-64 opacity-40 pointer-events-none">
        <DnaHelixSvg />
      </div>

      {/* Floating data nodes (21 entregables) */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {TAB_ICONS.map((Icon, i) => {
          const angle = (i / TAB_ICONS.length) * Math.PI * 2;
          const radius = 40 + (i % 3) * 8;
          const x = 50 + Math.cos(angle) * radius;
          const y = 50 + Math.sin(angle) * radius * 0.4;
          return (
            <div
              key={i}
              className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/40 to-pink-500/40 backdrop-blur-sm border border-white/10 flex items-center justify-center animate-float"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
                animationDelay: `${i * 0.15}s`,
                animationDuration: `${4 + (i % 3)}s`,
              }}
            >
              <Icon className="w-3 h-3 text-white/70" />
            </div>
          );
        })}
      </div>

      {/* Content layer */}
      <div className="relative z-10 p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
          {/* Left: branding + texto */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 via-purple-500 to-pink-500 p-[2px]">
                  <div className="w-full h-full rounded-full bg-[#0a0a1a] flex items-center justify-center">
                    <Dna className="w-5 h-5 text-white animate-pulse" />
                  </div>
                </div>
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-full bg-violet-500 blur-xl opacity-50 animate-pulse-slow" />
              </div>
              <div className="flex flex-col">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-violet-300 uppercase">
                  <Sparkles className="w-3 h-3" />
                  Método C·O·N·V·E·R·T
                </span>
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-violet-100 to-pink-100 bg-clip-text text-transparent">
                  ADN Recargado
                </h2>
              </div>
            </div>

            <p className="text-sm text-violet-100/70 max-w-xl leading-relaxed">
              Estrategia de marketing 360° en 21 entregables ejecutables.
              Mercado, avatares, ángulos, parrilla, landing pages, WhatsApp, paid ads, email, precios, KPIs y más.
            </p>

            {/* Stats chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Chip icon={<Sparkles className="w-3 h-3" />} label={`${totalTabs} entregables`} />
              <Chip icon={<Brain className="w-3 h-3" />} label="22 skills IA" />
              <Chip icon={<Coins className="w-3 h-3" />} label={`${tokenCost.toLocaleString()} tokens`} highlight />
              {isClient && monthlyLimit !== null && monthlyLimit !== undefined && (
                <Chip
                  icon={<CheckCircle2 className="w-3 h-3" />}
                  label={`${monthlyUsageCount}/${monthlyLimit === 0 ? 0 : monthlyLimit} este mes`}
                  variant={limitReached ? "danger" : "success"}
                />
              )}
            </div>

            {/* Checkbox Client DNA */}
            <label className="inline-flex items-center gap-2 cursor-pointer group pt-1">
              <input
                type="checkbox"
                checked={includeClientDna}
                onChange={(e) => setIncludeClientDna(e.target.checked)}
                className="w-4 h-4 rounded border-violet-400/50 bg-violet-900/40 text-violet-500 focus:ring-violet-500/50 focus:ring-offset-0"
              />
              <span className="text-xs text-violet-200/80 group-hover:text-violet-100 transition-colors">
                Incluir ADN de Marca (Client DNA)
              </span>
            </label>
          </div>

          {/* Right: CTAs */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      onClick={disabled ? undefined : () => onActivate(includeClientDna, isRegenerate)}
                      disabled={disabled || isGenerating}
                      size="lg"
                      className={`w-full gap-2 transition-all ${
                        disabled
                          ? "bg-zinc-700/50 text-zinc-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-[1.02]"
                      }`}
                    >
                      {disabled ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isGenerating ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : isRegenerate ? (
                        <RefreshCw className="w-5 h-5" />
                      ) : (
                        <Rocket className="w-5 h-5" />
                      )}
                      <span className="font-semibold">
                        {isGenerating
                          ? `Generando ${completedTabs}/${totalTabs}`
                          : isRegenerate
                            ? "Recrear"
                            : "Activar"}
                      </span>
                    </Button>
                  </div>
                </TooltipTrigger>
                {disabled && tooltipMessage && (
                  <TooltipContent side="top" className="bg-zinc-900 text-zinc-200 border-zinc-700">
                    <p>{tooltipMessage}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            {onViewDetails && (
              <Button
                onClick={onViewDetails}
                variant="ghost"
                size="sm"
                className="w-full gap-1 text-violet-300 hover:text-violet-200 hover:bg-violet-500/10"
              >
                <Sparkles className="w-3 h-3" />
                Ver detalle 360°
                <ArrowRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar (solo cuando está generando) */}
        {isGenerating && (
          <div className="mt-5 space-y-2">
            <div className="h-1.5 bg-violet-950/50 rounded-full overflow-hidden border border-violet-500/20">
              <div
                className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 transition-all duration-500 shadow-lg shadow-violet-500/50"
                style={{ width: `${(completedTabs / totalTabs) * 100}%` }}
              />
            </div>
            <p className="text-xs text-violet-300/80">
              KIRO está generando: paso {completedTabs} de {totalTabs}
            </p>
          </div>
        )}
      </div>

      {/* Bottom edge gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />

      {/* Inline animations + helpers (no requires tailwind config changes) */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-8px); }
        }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }
        .animate-float { animation: float 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ── Helper: Stat chip ────────────────────────────────────────────────
function Chip({
  icon,
  label,
  highlight = false,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
  variant?: "danger" | "success";
}) {
  let className = "bg-white/5 text-violet-100/90 border-white/10";
  if (highlight) className = "bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-white border-violet-400/40";
  if (variant === "danger") className = "bg-red-500/20 text-red-200 border-red-400/30";
  if (variant === "success") className = "bg-emerald-500/20 text-emerald-200 border-emerald-400/30";

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border backdrop-blur-sm ${className}`}>
      {icon}
      {label}
    </span>
  );
}

// ── DNA Helix SVG animado (vertical, centered) ──────────────────────
function DnaHelixSvg() {
  const points = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29;
    const angle = t * Math.PI * 4;
    const y = t * 100;
    const x1 = 50 + Math.sin(angle) * 30;
    const x2 = 50 - Math.sin(angle) * 30;
    return { y, x1, x2, t };
  });

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id="strand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#c026d3" stopOpacity="1" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.9" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Strand 1 (left) */}
      <path
        d={points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x1} ${p.y}`).join(" ")}
        fill="none"
        stroke="url(#strand-gradient)"
        strokeWidth="0.6"
        filter="url(#glow)"
        className="animate-pulse-slow"
      />
      {/* Strand 2 (right) */}
      <path
        d={points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x2} ${p.y}`).join(" ")}
        fill="none"
        stroke="url(#strand-gradient)"
        strokeWidth="0.6"
        filter="url(#glow)"
        className="animate-pulse-slow"
        style={{ animationDelay: "1s" }}
      />
      {/* Connecting bars (rungs) */}
      {points.filter((_, i) => i % 3 === 0).map((p, i) => (
        <line
          key={i}
          x1={p.x1}
          y1={p.y}
          x2={p.x2}
          y2={p.y}
          stroke="#fff"
          strokeWidth="0.3"
          opacity="0.4"
          className="animate-twinkle"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
      {/* Glow nodes on strands */}
      {points.filter((_, i) => i % 4 === 0).map((p, i) => (
        <g key={`nodes-${i}`}>
          <circle cx={p.x1} cy={p.y} r="0.8" fill="#fff" opacity="0.9" filter="url(#glow)" />
          <circle cx={p.x2} cy={p.y} r="0.8" fill="#fff" opacity="0.9" filter="url(#glow)" />
        </g>
      ))}
    </svg>
  );
}
