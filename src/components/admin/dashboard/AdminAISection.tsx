import { Brain, Zap, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  LazyBarChart,
  LazyChartContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "@/components/ui/lazy-charts";
import { cn } from "@/lib/utils";
import type { AdminAIStats } from "@/types/admin-dashboard.types";
import { formatLargeNumber, formatCurrency } from "@/hooks/useAdminDashboard";

// =====================================================
// CONSTANTS
// =====================================================

// Colores por módulo
const MODULE_COLORS: Record<string, string> = {
  // Módulos actuales en uso
  "registration": "#8b5cf6",
  "ad_generator": "#ec4899",
  "tablero": "#3b82f6",
  "content_analysis": "#22c55e",
  "talent.reputation.ai": "#f59e0b",
  "talent.risk.ai": "#ef4444",
  "talent.ambassador.ai": "#06b6d4",
  "generate-script": "#a855f7",
  "script_generator": "#a855f7",
  "market_research": "#14b8a6",
  "portfolio-ai": "#6366f1",
  "content-ai": "#8b5cf6",
  "board-ai": "#3b82f6",
  "multi-ai": "#22c55e",
  "up-ai-copilot": "#06b6d4",
  "streaming-ai": "#f97316",
  "kiro": "#10b981",
  // Nuevos módulos
  "ai-assistant": "#7c3aed",
  "talent-ai": "#f59e0b",
  "build-image-prompt": "#ec4899",
  "ad-intelligence": "#ef4444",
  "analyze-video-content": "#14b8a6",
  "feed-recommendations": "#0ea5e9",
  "marketplace-ai-search": "#6366f1",
  "process-client-dna": "#84cc16",
  "generate-project-dna": "#22d3ee",
  unknown: "#6b7280",
};

// Labels descriptivos para módulos
const MODULE_LABELS: Record<string, string> = {
  "registration": "Registro Usuarios",
  "ad_generator": "Generador de Ads",
  "tablero": "Board IA",
  "content_analysis": "Análisis Contenido",
  "talent.reputation.ai": "Reputación Talento",
  "talent.risk.ai": "Riesgo Talento",
  "talent.ambassador.ai": "Embajador IA",
  "generate-script": "Guionizador",
  "script_generator": "Guionizador",
  "market_research": "Investigación Mercado",
  "portfolio-ai": "Portfolio IA",
  "content-ai": "Contenido IA",
  "board-ai": "Board IA",
  "multi-ai": "Multi IA",
  "up-ai-copilot": "Copilot IA",
  "streaming-ai": "Streaming IA",
  "kiro": "Kiro Chat",
  // Nuevos módulos
  "ai-assistant": "Asistente IA",
  "talent-ai": "Talento IA",
  "build-image-prompt": "Prompts Imágenes",
  "ad-intelligence": "Inteligencia Ads",
  "analyze-video-content": "Análisis Video",
  "feed-recommendations": "Recomendaciones Feed",
  "marketplace-ai-search": "Búsqueda Marketplace",
  "process-client-dna": "DNA Cliente",
  "generate-project-dna": "DNA Proyecto",
};

// =====================================================
// STAT BOX
// =====================================================

interface StatBoxProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
}

function StatBox({ label, value, icon: Icon, color, subtitle }: StatBoxProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-sm bg-white/[0.02]">
      <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/50 truncate">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-white/30">{subtitle}</p>}
      </div>
    </div>
  );
}

// =====================================================
// MODULE BAR
// =====================================================

interface ModuleBarProps {
  module: string;
  calls: number;
  tokens: number;
  cost: number;
  maxCalls: number;
}

function ModuleBar({ module, calls, tokens, cost, maxCalls }: ModuleBarProps) {
  const percentage = maxCalls > 0 ? Math.round((calls / maxCalls) * 100) : 0;
  const color = MODULE_COLORS[module] || MODULE_COLORS.unknown;
  const displayName = MODULE_LABELS[module] || module.replace(/-/g, ' ').replace(/ai/gi, 'AI').replace(/_/g, ' ');

  return (
    <div className="group hover:bg-white/[0.02] p-2 rounded-sm transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-white/80 capitalize truncate flex-1">{displayName}</span>
        <div className="flex items-center gap-3 text-xs text-white/50">
          <span>{formatLargeNumber(calls)} calls</span>
          <span>${cost.toFixed(4)}</span>
        </div>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

// =====================================================
// CHART TOOLTIP
// =====================================================

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm px-3 py-2 text-xs bg-[#0f0f14]/95 border border-purple-500/30">
      <p className="text-white/60 mb-1 capitalize">{label?.replace(/-/g, ' ')}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white">{formatLargeNumber(p.value)} llamadas</span>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// LOADING SKELETON
// =====================================================

function AISectionSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-3 animate-pulse">
            <div className="h-12 bg-white/5 rounded-sm" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="p-4 md:p-6 animate-pulse">
          <div className="h-5 w-32 bg-white/10 rounded mb-4" />
          <div className="h-[200px] bg-white/5 rounded-sm" />
        </Card>
        <Card className="p-4 md:p-6 animate-pulse">
          <div className="h-5 w-40 bg-white/10 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded-sm" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

interface AdminAISectionProps {
  aiStats?: AdminAIStats;
  isLoading?: boolean;
}

export function AdminAISection({ aiStats, isLoading }: AdminAISectionProps) {
  if (isLoading || !aiStats) {
    return <AISectionSkeleton />;
  }

  const maxCalls = aiStats.by_module.length > 0
    ? Math.max(...aiStats.by_module.map(m => m.calls))
    : 0;

  // Preparar datos para grafico de barras
  const chartData = aiStats.by_module.slice(0, 6).map(m => ({
    name: (MODULE_LABELS[m.module] || m.module.replace(/-/g, ' ').replace(/_/g, ' ')).slice(0, 15),
    calls: m.calls,
    fill: MODULE_COLORS[m.module] || MODULE_COLORS.unknown,
  }));

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPIs de IA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-0">
          <StatBox
            label="Total Llamadas"
            value={formatLargeNumber(aiStats.calls.total)}
            icon={Zap}
            color="bg-purple-500/20 text-purple-400"
            subtitle={`${aiStats.calls.success_rate}% exitosas`}
          />
        </Card>
        <Card className="p-0">
          <StatBox
            label={aiStats.tokens.total_combined > 0 ? "Tokens Usados" : "Providers"}
            value={aiStats.tokens.total_combined > 0
              ? formatLargeNumber(aiStats.tokens.total_combined)
              : aiStats.by_provider.length
            }
            icon={Brain}
            color="bg-blue-500/20 text-blue-400"
            subtitle={aiStats.tokens.total_combined > 0
              ? `${formatLargeNumber(aiStats.tokens.total_input)} in / ${formatLargeNumber(aiStats.tokens.total_output)} out`
              : aiStats.by_provider.slice(0, 3).map(p => p.provider).join(', ')
            }
          />
        </Card>
        <Card className="p-0">
          <StatBox
            label="Costo Total"
            value={`$${aiStats.costs.total_usd.toFixed(2)}`}
            icon={DollarSign}
            color="bg-green-500/20 text-green-400"
            subtitle={aiStats.costs.avg_per_call_usd ? `$${aiStats.costs.avg_per_call_usd.toFixed(6)}/call` : undefined}
          />
        </Card>
        <Card className="p-0">
          <StatBox
            label="Tasa de Exito"
            value={`${aiStats.calls.success_rate}%`}
            icon={aiStats.calls.success_rate >= 90 ? CheckCircle : XCircle}
            color={aiStats.calls.success_rate >= 90
              ? "bg-green-500/20 text-green-400"
              : "bg-yellow-500/20 text-yellow-400"
            }
            subtitle={`${aiStats.calls.failed} fallidas`}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Grafico de Uso por Modulo */}
        <Card className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-400" />
            Uso por Modulo
          </h3>
          {chartData.length > 0 ? (
            <LazyChartContainer height={200}>
              <ResponsiveContainer width="100%" height={200}>
                <LazyBarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis type="number" stroke="#666" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 10 }}
                    width={80}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="calls" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <rect key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </LazyBarChart>
              </ResponsiveContainer>
            </LazyChartContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-white/40">
              No hay datos de uso de IA
            </div>
          )}
        </Card>

        {/* Lista de Modulos */}
        <Card className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-400" />
            Detalle por Modulo
          </h3>
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {aiStats.by_module.length > 0 ? (
              aiStats.by_module.map((module, index) => (
                <ModuleBar
                  key={index}
                  module={module.module}
                  calls={module.calls}
                  tokens={module.tokens}
                  cost={module.cost_usd}
                  maxCalls={maxCalls}
                />
              ))
            ) : (
              <div className="text-center text-white/40 py-8">
                No hay datos de modulos
              </div>
            )}
          </div>
          {aiStats.by_provider.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-white/50 mb-2">Providers</p>
              <div className="flex flex-wrap gap-2">
                {aiStats.by_provider.slice(0, 4).map((p, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 bg-white/5 rounded text-white/70"
                  >
                    {p.provider}: {p.calls}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
