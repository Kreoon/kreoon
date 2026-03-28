/**
 * AdnResearchV3Configurator
 * Panel de configuración premium antes de lanzar el research
 * Glassmorphism + Framer Motion + diseño premium
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Brain,
  Target,
  TrendingUp,
  Globe,
  ChevronRight,
  AlertTriangle,
  Check,
  Info,
  Zap,
  Lock,
  Unlock,
  RefreshCw,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AdnResearchV3Config } from "@/types/adn-research-v3";
import type { StartResearchParams } from "@/lib/services/adn-research-v3.service";

// ─── TIPOS (exportados para uso externo) ──────────────────

export interface ProductDnaSummary {
  id: string;
  product_dna_id: string;
  product_name: string;
  product_description?: string;
  has_audio: boolean;
  has_ai_analysis: boolean;
  has_links: boolean;
  completeness_score: number;
  confidence_score: number;
}

export interface ClientDnaSummary {
  id: string;
  brand_name: string;
  has_dna_data: boolean;
  is_complete: boolean;
}

export interface TokenBalance {
  balance: number;
  isLoading: boolean;
}

export interface AdnResearchV3ConfiguratorProps {
  productId: string;
  productDna: ProductDnaSummary;
  clientDna?: ClientDnaSummary | null;
  organizationId: string;
  tokenBalance: TokenBalance;
  onStart: (params: StartResearchParams) => Promise<{ sessionId: string } | null>;
  onCancel?: () => void;
  isStarting?: boolean;
  className?: string;
}

// ─── CONSTANTES ───────────────────────────────────────────

const ESTIMATED_TOKENS = 2400;

type InputBlockKey = "product_dna" | "client_dna" | "social_intelligence" | "ad_intelligence";
type ToggleKey = "include_client_dna" | "include_social_intelligence" | "include_ad_intelligence";

interface InputBlockConfig {
  key: InputBlockKey;
  icon: typeof Brain;
  title: string;
  description: string;
  required: boolean;
  gradient: string;
  impact: string;
  toggle?: ToggleKey;
}

const INPUT_BLOCKS: InputBlockConfig[] = [
  {
    key: "product_dna",
    icon: Brain,
    title: "ADN de Producto",
    description: "Wizard completo, transcripciones, análisis de audio, links",
    required: true,
    gradient: "from-violet-500 to-purple-600",
    impact: "Fundamento del research — información del fundador",
  },
  {
    key: "client_dna",
    icon: Target,
    title: "ADN de Marca",
    description: "Identidad, propuesta de valor, cliente ideal, estrategia de marketing",
    required: false,
    gradient: "from-pink-500 to-rose-600",
    impact: "Mejora coherencia de posicionamiento y copy",
    toggle: "include_client_dna",
  },
  {
    key: "social_intelligence",
    icon: Globe,
    title: "Social Intelligence",
    description: "Reviews Amazon/ML, comentarios de competidores, Reddit en español",
    required: false,
    gradient: "from-blue-500 to-cyan-600",
    impact: "Vocabulario real del mercado, objeciones auténticas",
    toggle: "include_social_intelligence",
  },
  {
    key: "ad_intelligence",
    icon: TrendingUp,
    title: "Ad Intelligence",
    description: "Meta Ads Library, TikTok Creative Center, competidores en redes",
    required: false,
    gradient: "from-orange-500 to-amber-600",
    impact: "Hooks dominantes, ángulos fatigados, oportunidades no probadas",
    toggle: "include_ad_intelligence",
  },
];

const TABS_PREVIEW = [
  { number: "01", name: "Panorama de Mercado" },
  { number: "02", name: "Competencia Profunda" },
  { number: "03", name: "JTBD Analysis" },
  { number: "04", name: "Avatares" },
  { number: "05", name: "Psicología del Cliente" },
  { number: "06", name: "Neuromarketing" },
  { number: "07", name: "Posicionamiento + ESFERA" },
  { number: "08", name: "Copywriting (30 hooks)" },
  { number: "09", name: "PUV y Oferta Irresistible" },
  { number: "10", name: "Creativos de Video" },
  { number: "11", name: "Calendario 30 Días" },
  { number: "12", name: "Lead Magnets" },
  { number: "13", name: "Redes Sociales" },
  { number: "14", name: "Meta Ads Completo" },
  { number: "15", name: "TikTok Ads" },
  { number: "16", name: "Google Ads" },
  { number: "17", name: "Email Marketing" },
  { number: "18", name: "Landing Pages (2 diseños)" },
  { number: "19", name: "Lanzamiento 360°" },
  { number: "20", name: "Métricas y KPIs" },
  { number: "21", name: "Contenido Orgánico" },
  { number: "22", name: "Resumen + KIRO Insights" },
];

// ─── SUB-COMPONENTES ──────────────────────────────────────

function InputBlock({
  block,
  isAvailable,
  isEnabled,
  onToggle,
}: {
  block: InputBlockConfig;
  isAvailable: boolean;
  isEnabled: boolean;
  onToggle?: (value: boolean) => void;
}) {
  const Icon = block.icon;
  const isLocked = !isAvailable && !block.required;

  return (
    <motion.div
      layout
      className={`
        relative rounded-sm border p-4 transition-all duration-300
        ${
          isEnabled && isAvailable
            ? "border-white/20 bg-white/5"
            : "border-white/[0.08] bg-white/[0.02] opacity-60"
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
          flex-shrink-0 w-10 h-10 rounded-sm bg-gradient-to-br ${block.gradient}
          flex items-center justify-center shadow-lg
          ${!isEnabled || !isAvailable ? "opacity-50" : ""}
        `}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white">{block.title}</span>

            {block.required && (
              <Badge className="text-[10px] px-1.5 py-0 bg-violet-500/20 text-violet-300 border-violet-500/30">
                Requerido
              </Badge>
            )}

            {!isAvailable && !block.required && (
              <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-300 border-amber-500/30">
                No disponible
              </Badge>
            )}

            {isAvailable && !block.required && (
              <Badge
                className={`text-[10px] px-1.5 py-0 ${
                  isEnabled
                    ? "bg-green-500/20 text-green-300 border-green-500/30"
                    : "bg-white/10 text-white/40 border-white/10"
                }`}
              >
                {isEnabled ? "Incluido" : "Excluido"}
              </Badge>
            )}
          </div>

          <p className="text-xs text-white/50 leading-relaxed mb-2">{block.description}</p>

          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span className="text-[11px] text-amber-300/80">{block.impact}</span>
          </div>
        </div>

        <div className="flex-shrink-0 pt-0.5">
          {block.required ? (
            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-violet-400" />
            </div>
          ) : isLocked ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white/30" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">
                    {block.key === "client_dna"
                      ? "Genera primero el ADN de Marca"
                      : "Se genera automáticamente al iniciar"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggle}
              className="data-[state=checked]:bg-violet-500"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DnaQualityIndicator({ dna }: { dna: ProductDnaSummary }) {
  const score = dna.completeness_score || 0;
  const scoreColor =
    score >= 80 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const barColor = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-sm border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-white/70">Calidad del ADN de Producto</span>
        <span className={`text-sm font-bold ${scoreColor}`}>{score}%</span>
      </div>

      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: "Wizard completo", value: (dna.completeness_score || 0) > 0 },
          { label: "Análisis de audio", value: dna.has_audio },
          { label: "Análisis IA", value: dna.has_ai_analysis },
          { label: "Links de referencia", value: dna.has_links },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.value ? "bg-green-500/20" : "bg-white/10"
              }`}
            >
              {item.value ? (
                <Check className="w-2 h-2 text-green-400" />
              ) : (
                <div className="w-1 h-1 rounded-full bg-white/30" />
              )}
            </div>
            <span className={`text-[11px] ${item.value ? "text-white/70" : "text-white/30"}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {score < 70 && (
        <div className="mt-3 flex items-start gap-2 p-2 rounded-sm bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            Un ADN más completo produce mejores resultados. Considera completar el wizard antes de
            continuar.
          </p>
        </div>
      )}
    </div>
  );
}

function TabsPreview() {
  const [expanded, setExpanded] = useState(false);
  const visibleTabs = expanded ? TABS_PREVIEW : TABS_PREVIEW.slice(0, 6);

  return (
    <div className="rounded-sm border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs font-medium text-white/50 mb-3">
        Vas a recibir 22 secciones de estrategia
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        <AnimatePresence>
          {visibleTabs.map((tab) => (
            <motion.div
              key={tab.number}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2"
            >
              <span className="text-[10px] font-bold text-violet-400/60 w-5 flex-shrink-0">
                {tab.number}
              </span>
              <span className="text-[11px] text-white/50 truncate">{tab.name}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
        >
          + ver 16 más
        </button>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────

export function AdnResearchV3Configurator({
  productId,
  productDna,
  clientDna,
  organizationId,
  tokenBalance,
  onStart,
  onCancel,
  isStarting = false,
  className = "",
}: AdnResearchV3ConfiguratorProps) {
  const [config, setConfig] = useState<AdnResearchV3Config>({
    include_client_dna: !!clientDna?.is_complete,
    include_social_intelligence: true,
    include_ad_intelligence: true,
  });

  const hasEnoughTokens = !tokenBalance.isLoading && tokenBalance.balance >= ESTIMATED_TOKENS;
  const tokenShortfall = Math.max(0, ESTIMATED_TOKENS - tokenBalance.balance);

  const handleToggle = (key: ToggleKey) => (value: boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleStart = async () => {
    await onStart({
      productId,
      productDnaId: productDna.product_dna_id,
      clientDnaId: config.include_client_dna ? clientDna?.id : undefined,
      organizationId,
      config,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        w-full max-w-2xl mx-auto rounded-sm border border-white/10
        bg-gradient-to-b from-white/[0.06] to-white/[0.02]
        backdrop-blur-xl overflow-hidden
        ${className}
      `}
    >
      {/* Header con gradiente */}
      <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.08]">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-pink-500/10 pointer-events-none" />

        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-sm bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-white">ADN Recargado v3</h2>
              <Badge className="text-[10px] bg-violet-500/20 text-violet-300 border-violet-500/30">
                22 secciones
              </Badge>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              Estrategia 360° para{" "}
              <span className="text-white/80 font-medium">{productDna.product_name}</span> —
              psicología del cliente, copy, ads, calendario y más.
            </p>
          </div>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="p-6 space-y-5">
        {/* Calidad del ADN */}
        <DnaQualityIndicator dna={productDna} />

        {/* Inputs a configurar */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider px-0.5">
            Fuentes de información
          </p>

          {INPUT_BLOCKS.map((block) => {
            const isAvailable =
              block.key === "product_dna"
                ? true
                : block.key === "client_dna"
                ? !!clientDna?.is_complete
                : true;

            const isEnabled = block.required
              ? true
              : block.toggle
              ? config[block.toggle]
              : false;

            return (
              <InputBlock
                key={block.key}
                block={block}
                isAvailable={isAvailable}
                isEnabled={isEnabled}
                onToggle={block.toggle && isAvailable ? handleToggle(block.toggle) : undefined}
              />
            );
          })}
        </div>

        {/* Preview de pestañas */}
        <TabsPreview />

        {/* Costo en tokens */}
        <div
          className={`
          rounded-sm border p-4 flex items-center justify-between
          ${hasEnoughTokens ? "border-white/10 bg-white/[0.03]" : "border-red-500/30 bg-red-500/5"}
        `}
        >
          <div className="flex items-center gap-3">
            <div
              className={`
              w-9 h-9 rounded-sm flex items-center justify-center
              ${hasEnoughTokens ? "bg-violet-500/20" : "bg-red-500/20"}
            `}
            >
              <Zap className={`w-4 h-4 ${hasEnoughTokens ? "text-violet-400" : "text-red-400"}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {ESTIMATED_TOKENS.toLocaleString()} tokens IA
              </p>
              <p className="text-xs text-white/40">
                Saldo actual:{" "}
                <span className={hasEnoughTokens ? "text-green-400" : "text-red-400"}>
                  {tokenBalance.isLoading ? "..." : tokenBalance.balance.toLocaleString()}
                </span>
              </p>
            </div>
          </div>

          {!hasEnoughTokens && !tokenBalance.isLoading && (
            <div className="text-right">
              <p className="text-xs text-red-400 font-medium">
                Faltan {tokenShortfall.toLocaleString()}
              </p>
              <button className="text-[11px] text-violet-400 hover:text-violet-300 mt-0.5 transition-colors">
                Comprar tokens →
              </button>
            </div>
          )}

          {hasEnoughTokens && (
            <div className="flex items-center gap-1.5">
              <Unlock className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-green-400">Saldo suficiente</span>
            </div>
          )}
        </div>

        {/* Info de tiempo estimado */}
        <div className="flex items-center gap-2 px-1">
          <Info className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
          <p className="text-[11px] text-white/30 leading-relaxed">
            El proceso toma ~8-12 minutos. Puedes cerrar esta ventana — los resultados se guardan
            automáticamente.
          </p>
        </div>
      </div>

      {/* Footer con botones */}
      <div className="px-6 pb-6 flex items-center gap-3">
        {onCancel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isStarting}
            className="flex-1 border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.07]"
          >
            Cancelar
          </Button>
        )}

        <Button
          onClick={handleStart}
          disabled={isStarting || !hasEnoughTokens || tokenBalance.isLoading}
          className={`
            flex-[2] relative overflow-hidden font-semibold h-11
            bg-gradient-to-r from-violet-600 to-pink-600
            hover:from-violet-500 hover:to-pink-500
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg shadow-violet-500/30
            transition-all duration-200
          `}
        >
          {/* Shimmer animado */}
          {!isStarting && hasEnoughTokens && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          )}

          <span className="relative flex items-center justify-center gap-2">
            {isStarting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generar ADN Recargado v3
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </span>
        </Button>
      </div>
    </motion.div>
  );
}

export default AdnResearchV3Configurator;
