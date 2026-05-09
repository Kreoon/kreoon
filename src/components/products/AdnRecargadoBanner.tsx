import { Button } from "@/components/ui/button";
import {
  Sparkles, ArrowRight, Brain, Coins,
  Globe, Target, Heart, Swords, Users, Lightbulb, Trophy,
  Gift, Calendar, Rocket, Megaphone, Mail, DollarSign,
  BarChart3, Search, Handshake, MessageCircle, FileText, Dna,
} from "lucide-react";

interface AdnRecargadoBannerProps {
  tokenCost: number;
  onViewDetails: () => void;
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
  onViewDetails,
  completedTabs = 0,
  totalTabs = 21,
  isGenerating = false,
}: AdnRecargadoBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-br from-[#03000a] via-[#0d0418] to-[#03000a] shadow-2xl shadow-violet-500/30">
      {/* Glow ambient layers (atenuados para no aclarar el fondo) */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-violet-600/25 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-pink-500/25 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-64 bg-fuchsia-500/10 rounded-full blur-3xl" />

        {/* Star particles */}
        <svg className="absolute inset-0 w-full h-full opacity-60" preserveAspectRatio="none">
          <defs>
            <radialGradient id="star-grad-v2">
              <stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {Array.from({ length: 50 }).map((_, i) => {
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
                fill="url(#star-grad-v2)"
                className="animate-twinkle"
                style={{ animationDelay: `${delay}s` }}
              />
            );
          })}
        </svg>
      </div>

      {/* DNA Helix de fondo (centered, behind text) */}
      <div aria-hidden className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-80 opacity-25 pointer-events-none">
        <DnaHelixSvg />
      </div>

      {/* 21 nodos orbitando */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {TAB_ICONS.map((Icon, i) => {
          const angle = (i / TAB_ICONS.length) * Math.PI * 2;
          const radius = 38 + (i % 3) * 6;
          const x = 50 + Math.cos(angle) * radius;
          const y = 50 + Math.sin(angle) * radius * 0.55;
          return (
            <div
              key={i}
              className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/50 to-pink-500/50 backdrop-blur-sm border border-white/20 flex items-center justify-center animate-float shadow-lg shadow-violet-500/20"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
                animationDelay: `${i * 0.15}s`,
                animationDuration: `${4 + (i % 3)}s`,
              }}
            >
              <Icon className="w-3 h-3 text-white" />
            </div>
          );
        })}
      </div>

      {/* Contenido — TODO CENTRADO */}
      <div className="relative z-10 px-6 py-10 md:py-14 flex flex-col items-center text-center">
        {/* Badge de método arriba */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-400/40 backdrop-blur-md mb-4">
          <Sparkles className="w-3.5 h-3.5 text-violet-200" />
          <span className="text-[11px] font-bold tracking-wider text-violet-100 uppercase">
            Método C·O·N·V·E·R·T
          </span>
        </div>

        {/* Logo + Título */}
        <div className="flex items-center gap-4 mb-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-[3px] shadow-2xl shadow-violet-500/50">
              <div className="w-full h-full rounded-full bg-[#03000a] flex items-center justify-center">
                <Dna className="w-6 h-6 text-white animate-pulse" />
              </div>
            </div>
            <div className="absolute inset-0 rounded-full bg-violet-500 blur-2xl opacity-60 animate-pulse-slow" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]">
            ADN Recargado
          </h2>
        </div>

        {/* Subtítulo con alto contraste */}
        <p className="text-base md:text-lg text-white/95 max-w-2xl leading-relaxed font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          Estrategia de marketing 360° en{" "}
          <span className="text-pink-300 font-bold">21 entregables ejecutables</span>
        </p>
        <p className="text-sm text-white/75 max-w-2xl mt-2 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          Mercado · Avatares · Ángulos · Parrilla · Landing Pages · WhatsApp · Paid Ads · Email · Precios · KPIs · SEO · Alianzas · Comunidad
        </p>

        {/* Stats chips centrados */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <Chip icon={<Sparkles className="w-3.5 h-3.5" />} label={`${totalTabs} entregables`} />
          <Chip icon={<Brain className="w-3.5 h-3.5" />} label="22 skills IA" />
          <Chip icon={<Coins className="w-3.5 h-3.5" />} label={`${tokenCost.toLocaleString()} tokens`} highlight />
        </div>

        {/* CTA único — Ver detalle */}
        <Button
          onClick={onViewDetails}
          size="lg"
          className="mt-8 gap-2 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-500 text-white border-0 shadow-2xl shadow-violet-500/50 hover:shadow-violet-500/70 hover:scale-105 transition-all duration-300 px-8 py-6 text-base font-semibold"
        >
          <Sparkles className="w-5 h-5" />
          {isGenerating ? `Ver progreso · ${completedTabs}/${totalTabs}` : "Ver detalle 360° y activar"}
          <ArrowRight className="w-5 h-5" />
        </Button>

        {/* Progress bar (solo cuando genera) */}
        {isGenerating && (
          <div className="w-full max-w-md mt-6 space-y-2">
            <div className="h-2 bg-violet-950/60 rounded-full overflow-hidden border border-violet-400/30">
              <div
                className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-500 shadow-lg shadow-violet-500/60"
                style={{ width: `${(completedTabs / totalTabs) * 100}%` }}
              />
            </div>
            <p className="text-xs text-white/80 font-medium">
              KIRO está generando: paso {completedTabs} de {totalTabs}
            </p>
          </div>
        )}
      </div>

      {/* Bottom edge gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-60" />

      {/* Animations */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-10px); }
        }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }
        .animate-float { animation: float 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ── Helper: Stat chip ───────────────────────────────────────────────
function Chip({
  icon,
  label,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}) {
  const className = highlight
    ? "bg-gradient-to-r from-violet-500/40 to-pink-500/40 text-white border-violet-300/60 font-semibold"
    : "bg-white/10 text-white/95 border-white/20 font-medium";

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border backdrop-blur-md shadow-md ${className}`}>
      {icon}
      {label}
    </span>
  );
}

// ── DNA Helix SVG animado ──────────────────────────────────────────
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
        <linearGradient id="strand-gradient-v2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#c026d3" stopOpacity="1" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.9" />
        </linearGradient>
        <filter id="glow-v2">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x1} ${p.y}`).join(" ")}
        fill="none"
        stroke="url(#strand-gradient-v2)"
        strokeWidth="0.6"
        filter="url(#glow-v2)"
      />
      <path
        d={points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x2} ${p.y}`).join(" ")}
        fill="none"
        stroke="url(#strand-gradient-v2)"
        strokeWidth="0.6"
        filter="url(#glow-v2)"
      />
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
      {points.filter((_, i) => i % 4 === 0).map((p, i) => (
        <g key={`nodes-${i}`}>
          <circle cx={p.x1} cy={p.y} r="0.8" fill="#fff" opacity="0.9" filter="url(#glow-v2)" />
          <circle cx={p.x2} cy={p.y} r="0.8" fill="#fff" opacity="0.9" filter="url(#glow-v2)" />
        </g>
      ))}
    </svg>
  );
}
