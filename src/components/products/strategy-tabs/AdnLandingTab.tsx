import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, Globe, Target, Heart, Swords, Users, Lightbulb,
  Brain, Trophy, Gift, Calendar, Rocket, MessageCircle,
  Megaphone, Mail, DollarSign, BarChart3, Search, Handshake,
  Zap, CheckCircle2, ArrowRight, Coins, Clock, TrendingUp, RefreshCw,
  Radar, Lock,
} from "lucide-react";

const INTELLIGENCE_UPGRADE_COST = 2000;

interface AdnLandingTabProps {
  product: any;
  hasEnoughTokens: boolean;
  totalTokens: number;
  researchCost: number;
  isResearchGenerating: boolean;
  onActivate: (includeClientDna: boolean, forceRegenerate: boolean, withScrapingIntelligence: boolean) => void;
  canActivate: boolean;
  isRegenerate?: boolean;
  reasonNotAllowed?: string;
}

const PHASES = [
  {
    title: "Investigación",
    color: "from-blue-500/10 to-blue-500/5 border-blue-500/30",
    iconBg: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    tabs: [
      { icon: Globe, name: "Panorama de Mercado", desc: "Tamaño, crecimiento, PESTEL, oportunidades y amenazas reales del mercado", key: "market_overview" },
      { icon: Target, name: "Jobs To Be Done", desc: "Trabajo funcional, emocional y social que el cliente intenta hacer", key: "jtbd" },
      { icon: Heart, name: "Dolores y Deseos", desc: "10 dolores, 10 deseos y 10 objeciones reales del avatar", key: "pains_desires" },
      { icon: Swords, name: "Análisis Competitivo", desc: "8-10 competidores reales con precios, debilidades y oportunidades", key: "competitors" },
    ],
  },
  {
    title: "Estrategia",
    color: "from-violet-500/10 to-violet-500/5 border-violet-500/30",
    iconBg: "bg-violet-500/20 text-violet-600 dark:text-violet-400",
    tabs: [
      { icon: Users, name: "5 Avatares Detallados", desc: "Personas reales con demografía, psicografía, frases y triggers de compra", key: "avatars" },
      { icon: Lightbulb, name: "Diferenciación + ESFERA", desc: "Mensajes saturados, gaps del mercado, posicionamiento único", key: "differentiation" },
      { icon: Brain, name: "Resumen Ejecutivo", desc: "Score de oportunidad, key insights, quick wins y riesgos a evitar", key: "summary" },
      { icon: Sparkles, name: "20 Ángulos de Venta", desc: "Educativos, emocionales, autoridad, anti-mercado, prueba social", key: "sales_angles" },
      { icon: Trophy, name: "PUV + Transformación", desc: "Propuesta única + transformación funcional/emocional/identidad/social/financiera", key: "puv" },
    ],
  },
  {
    title: "Ejecución Orgánica",
    color: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/30",
    iconBg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    tabs: [
      { icon: Gift, name: "3 Lead Magnets", desc: "Recursos gratuitos diseñados para captar leads calificados", key: "leads" },
      { icon: Sparkles, name: "25 Creativos de Video", desc: "Hooks, estructura, briefs de producción listos para grabar", key: "creatives" },
      { icon: Calendar, name: "Parrilla 4 Semanas", desc: "28-35 posts con copy completo, hashtags, plataforma y horario", key: "calendar" },
      { icon: Rocket, name: "Estrategia de Lanzamiento", desc: "Pre-launch, launch day, post-launch + presupuesto + equipo", key: "launch" },
    ],
  },
  {
    title: "Conversión Directa",
    color: "from-amber-500/10 to-amber-500/5 border-amber-500/30",
    iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    tabs: [
      { icon: Globe, name: "2 Landing Pages Completas", desc: "Variación A (Directa) + B (Educativa) con copy listo para publicar", key: "landing_pages" },
      { icon: MessageCircle, name: "Funnel WhatsApp LATAM", desc: "3 secuencias (captación, cierre, reactivación) con mensajes literales", key: "whatsapp" },
    ],
  },
  {
    title: "Paid + Retención",
    color: "from-pink-500/10 to-pink-500/5 border-pink-500/30",
    iconBg: "bg-pink-500/20 text-pink-600 dark:text-pink-400",
    tabs: [
      { icon: Megaphone, name: "Campañas Meta + TikTok", desc: "Estructura por temperatura, presupuestos LATAM, creativos referenciados", key: "paid_ads" },
      { icon: Mail, name: "Email Marketing Completo", desc: "Secuencia de bienvenida (7 emails), lanzamiento y reactivación", key: "email" },
    ],
  },
  {
    title: "Negocio + Largo Plazo",
    color: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/30",
    iconBg: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
    tabs: [
      { icon: DollarSign, name: "Estrategia de Precios", desc: "Posicionamiento, value ladder, planes de pago LATAM, proyecciones", key: "pricing" },
      { icon: BarChart3, name: "Dashboard de KPIs", desc: "North star metric + AARRR + decision triggers + tools stack", key: "kpis" },
      { icon: Search, name: "Estrategia SEO", desc: "Keywords, blog strategy, YouTube strategy, timeline realista", key: "seo" },
      { icon: Handshake, name: "Alianzas y Colaboraciones", desc: "Programa de afiliados, influencers, co-marketing, PR", key: "partnerships" },
      { icon: Heart, name: "Estrategia de Comunidad", desc: "Concepto, plataforma, onboarding, engagement, monetización", key: "community" },
    ],
  },
];

const VALOR_REAL = [
  { item: "Plan estratégico de marketing", market: 800 },
  { item: "Análisis de competencia profesional", market: 400 },
  { item: "5 buyer personas detallados", market: 500 },
  { item: "20 ángulos de venta + 25 creativos", market: 600 },
  { item: "Parrilla de contenido de 1 mes", market: 800 },
  { item: "2 landing pages con copy", market: 1200 },
  { item: "Funnel de WhatsApp completo", market: 600 },
  { item: "Estrategia de Paid Ads", market: 700 },
  { item: "Secuencia de email marketing", market: 500 },
  { item: "Estrategia de precios", market: 400 },
  { item: "Dashboard de KPIs personalizado", market: 300 },
  { item: "Plan SEO + alianzas + comunidad", market: 800 },
];

export function AdnLandingTab({
  product,
  hasEnoughTokens,
  totalTokens,
  researchCost,
  isResearchGenerating,
  onActivate,
  canActivate,
  isRegenerate = false,
  reasonNotAllowed,
}: AdnLandingTabProps) {
  const [includeClientDna, setIncludeClientDna] = useState(true);
  const [withScrapingIntelligence, setWithScrapingIntelligence] = useState(false);
  const totalMarketValue = VALOR_REAL.reduce((sum, item) => sum + item.market, 0);
  const completedTabs = countCompleted(product);
  const totalTabs = 21;
  const isComplete = completedTabs >= totalTabs - 2;
  // Costo efectivo: base (1500) + upgrade opcional (2000) = 3500 con inteligencia
  const effectiveCost = withScrapingIntelligence ? researchCost + INTELLIGENCE_UPGRADE_COST : researchCost;
  const hasEnoughForEffective = totalTokens >= effectiveCost;
  const canUpgrade = totalTokens >= researchCost + INTELLIGENCE_UPGRADE_COST;
  const handleActivate = () => onActivate(includeClientDna, isRegenerate, withScrapingIntelligence);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <Card className="border-violet-500/30 bg-gradient-to-br from-violet-600/10 via-pink-500/5 to-amber-500/10">
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-violet-500" />
            <Badge variant="outline" className="border-violet-500/40 text-violet-700 dark:text-violet-300">
              ADN Recargado V2 · Método C·O·N·V·E·R·T
            </Badge>
          </div>
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
            Tu estrategia de marketing 360° en 25 minutos
          </h2>
          <p className="text-lg text-muted-foreground mb-6 max-w-3xl">
            21 entregables ejecutables: desde el análisis de mercado hasta el funnel de WhatsApp, pasando por landing pages,
            paid ads, email marketing, SEO y estrategia de comunidad. Todo listo para implementar mañana mismo.
          </p>

          {/* Stats hero */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-card/50 backdrop-blur rounded-lg p-3 border border-violet-500/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Zap className="h-3 w-3" /> Pestañas</div>
              <div className="text-2xl font-bold">21</div>
            </div>
            <div className="bg-card/50 backdrop-blur rounded-lg p-3 border border-violet-500/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Brain className="h-3 w-3" /> Skills IA</div>
              <div className="text-2xl font-bold">22</div>
            </div>
            <div className="bg-card/50 backdrop-blur rounded-lg p-3 border border-violet-500/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Tiempo</div>
              <div className="text-2xl font-bold">~25 min</div>
            </div>
            <div className="bg-card/50 backdrop-blur rounded-lg p-3 border border-violet-500/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Coins className="h-3 w-3" /> Tokens</div>
              <div className="text-2xl font-bold transition-all">
                {effectiveCost.toLocaleString()}
                {withScrapingIntelligence && (
                  <span className="text-xs text-violet-500 ml-1 line-through opacity-50">{researchCost.toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>

          {/* CTA o estado */}
          {isComplete ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">ADN Recargado completado</p>
                  <p className="text-sm text-muted-foreground">{completedTabs}/{totalTabs} pestañas generadas. Explora cada una en el menú superior.</p>
                </div>
              </div>
              <Button
                onClick={handleActivate}
                disabled={!canActivate || !hasEnoughTokens}
                variant="outline"
                size="sm"
                className="gap-2 border-violet-500/40"
              >
                <RefreshCw className="h-4 w-4" />
                Recrear desde cero
              </Button>
            </div>
          ) : isResearchGenerating ? (
            <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4">
              <p className="font-semibold text-violet-700 dark:text-violet-300 mb-2">KIRO está investigando...</p>
              <Progress value={(completedTabs / totalTabs) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{completedTabs} de {totalTabs} pestañas generadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Checkbox Incluir ADN de Marca */}
              <label className="inline-flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeClientDna}
                  onChange={(e) => setIncludeClientDna(e.target.checked)}
                  className="w-4 h-4 rounded border-violet-500/50 bg-violet-100 dark:bg-violet-900/30 text-violet-600 focus:ring-violet-500/50"
                />
                <span className="text-sm text-foreground/90 group-hover:text-foreground transition-colors">
                  Incluir <strong>ADN de Marca</strong> (Client DNA) — recomendado para mejor personalización
                </span>
              </label>

              {/* Toggle Upgrade Inteligencia Competitiva Real */}
              <ScrapingUpgradeToggle
                checked={withScrapingIntelligence}
                onChange={setWithScrapingIntelligence}
                canUpgrade={canUpgrade}
                upgradeCost={INTELLIGENCE_UPGRADE_COST}
              />

              {/* CTA principal */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={handleActivate}
                  disabled={!canActivate || !hasEnoughForEffective}
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-500 text-white border-0 gap-2 shadow-xl shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-105 transition-all px-6 py-6 text-base font-semibold"
                >
                  <Sparkles className="h-5 w-5" />
                  {hasEnoughForEffective
                    ? (isRegenerate ? "Recrear ADN Recargado" : "Activar ADN Recargado")
                    : `Faltan ${(effectiveCost - totalTokens).toLocaleString()} tokens`}
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 dark:text-violet-300 bg-violet-500/10 px-3 py-1.5 rounded-full">
                  <Coins className="h-4 w-4" />
                  {effectiveCost.toLocaleString()} tokens
                </span>
              </div>
            </div>
          )}

          {reasonNotAllowed && !isResearchGenerating && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{reasonNotAllowed}</p>
          )}
        </CardContent>
      </Card>

      {/* TRANSFORMACIÓN */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            La Transformación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-4">
              <Badge variant="destructive" className="mb-3">ANTES</Badge>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✗</span> Adivinas qué decirle a tu cliente</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✗</span> Publicas contenido sin estrategia clara</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✗</span> Pagas ads sin saber qué creativo funcionará</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✗</span> Cierres por WhatsApp improvisando cada mensaje</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✗</span> Precios definidos por intuición, no estrategia</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✗</span> Sin claridad de qué medir ni cuándo escalar</li>
              </ul>
            </div>
            <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-4">
              <Badge className="mb-3 bg-emerald-600">DESPUÉS</Badge>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Sabes exactamente qué dolor activar en cada avatar</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /> 28-35 posts del mes ya escritos y listos</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /> 25 creativos con guión, hook y brief de producción</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Funnel de WhatsApp con mensajes copy-paste</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Precio anclado al valor + value ladder completo</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Dashboard con North Star metric y triggers de decisión</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QUÉ OBTIENES — agrupado por fase */}
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
          21 Entregables · Por Fase del Método CONVERT
        </h3>
        <div className="space-y-4">
          {PHASES.map((phase, idx) => (
            <Card key={idx} className={`bg-gradient-to-br border ${phase.color}`}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-base">{phase.title}</h4>
                  <Badge variant="outline" className="text-xs">{phase.tabs.length} pestañas</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {phase.tabs.map((tab, tIdx) => {
                    const Icon = tab.icon;
                    return (
                      <div key={tIdx} className="flex items-start gap-3 p-3 rounded-lg bg-card/40">
                        <div className={`p-2 rounded-lg ${phase.iconBg} flex-shrink-0`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{tab.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tab.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* VALOR REAL */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
        <CardContent className="pt-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-500" />
            Valor real de mercado
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Si contrataras a un consultor o agencia para entregarte cada uno de estos componentes, este es el costo aproximado en USD:
          </p>
          <div className="space-y-2 mb-4">
            {VALOR_REAL.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-border/30 pb-1.5">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                  {item.item}
                </span>
                <span className="font-medium text-muted-foreground">${item.market} USD</span>
              </div>
            ))}
          </div>
          <div className="border-t border-amber-500/30 pt-3 flex items-center justify-between">
            <span className="font-bold">Valor total de mercado:</span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ${totalMarketValue.toLocaleString()} USD
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between bg-violet-500/10 -mx-4 px-4 py-3 rounded-lg">
            <span className="font-semibold text-violet-700 dark:text-violet-300">
              Tu costo en KREOON:
              {withScrapingIntelligence && (
                <span className="ml-2 text-xs font-normal text-violet-500">(con Inteligencia Competitiva)</span>
              )}
            </span>
            <span className="text-2xl font-bold text-violet-700 dark:text-violet-300">
              {effectiveCost.toLocaleString()} tokens
            </span>
          </div>
        </CardContent>
      </Card>

      {/* CÓMO FUNCIONA */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-cyan-500" />
            Cómo lo genera KIRO
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <Badge variant="outline" className="mb-2">Paso 1</Badge>
              <p className="font-semibold text-sm mb-1">Investigación web real</p>
              <p className="text-xs text-muted-foreground">Perplexity busca datos actualizados del mercado, competidores y tendencias para cada pestaña.</p>
            </div>
            <div className="border rounded-lg p-4">
              <Badge variant="outline" className="mb-2">Paso 2</Badge>
              <p className="font-semibold text-sm mb-1">Análisis con 22 skills IA</p>
              <p className="text-xs text-muted-foreground">Skills especializadas (Schwartz, Cialdini, Hormozi, Brunson) procesan cada paso con su framework.</p>
            </div>
            <div className="border rounded-lg p-4">
              <Badge variant="outline" className="mb-2">Paso 3</Badge>
              <p className="font-semibold text-sm mb-1">Output estructurado</p>
              <p className="text-xs text-muted-foreground">Gemini 2.5 (con Mistral fallback) genera cada entregable en JSON listo para visualizar.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA FINAL si no completado */}
      {!isComplete && !isResearchGenerating && (
        <Card className="border-violet-500/30 bg-gradient-to-br from-violet-600/10 to-pink-500/10">
          <CardContent className="pt-6 text-center space-y-4">
            <div>
              <h3 className="text-xl font-bold mb-2">¿Listo para tu estrategia 360°?</h3>
              <p className="text-muted-foreground">
                En ~25 minutos tendrás todo lo que necesitas para ejecutar marketing como una agencia top.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeClientDna}
                  onChange={(e) => setIncludeClientDna(e.target.checked)}
                  className="w-4 h-4 rounded border-violet-500/50 bg-violet-100 dark:bg-violet-900/30 text-violet-600 focus:ring-violet-500/50"
                />
                <span className="text-sm">
                  Incluir <strong>ADN de Marca</strong> (Client DNA)
                </span>
              </label>

              <Button
                onClick={handleActivate}
                disabled={!canActivate || !hasEnoughForEffective}
                size="lg"
                className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-500 text-white border-0 gap-2 shadow-xl shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-105 transition-all px-8 py-6 text-base font-semibold"
              >
                <Sparkles className="h-5 w-5" />
                {hasEnoughForEffective
                  ? (isRegenerate ? `Recrear · ${effectiveCost.toLocaleString()} tokens` : `Activar · ${effectiveCost.toLocaleString()} tokens`)
                  : `Faltan ${(effectiveCost - totalTokens).toLocaleString()} tokens`}
              </Button>

              {reasonNotAllowed && (
                <p className="text-xs text-amber-600 dark:text-amber-400">{reasonNotAllowed}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Toggle premium para activar Inteligencia Competitiva Real (Perplexity Deep Research)
// +2000 tokens. Activa busqueda web profunda en steps competitivos.
function ScrapingUpgradeToggle({
  checked,
  onChange,
  canUpgrade,
  upgradeCost,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  canUpgrade: boolean;
  upgradeCost: number;
}) {
  return (
    <button
      type="button"
      onClick={() => canUpgrade && onChange(!checked)}
      disabled={!canUpgrade}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
        checked
          ? "border-amber-500/60 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-pink-500/10 shadow-lg shadow-amber-500/20"
          : canUpgrade
            ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 hover:border-amber-500/50 hover:bg-amber-500/10"
            : "border-muted bg-muted/30 cursor-not-allowed opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icono y check */}
        <div
          className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
            checked
              ? "border-amber-500 bg-amber-500"
              : "border-amber-500/40 bg-transparent"
          }`}
        >
          {checked && <CheckCircle2 className="w-4 h-4 text-white" />}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Radar className={`w-4 h-4 ${checked ? "text-amber-600" : "text-amber-500/70"}`} />
            <span className="font-bold text-sm">Inteligencia Competitiva Real</span>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase tracking-wider ${
                checked
                  ? "border-amber-500/60 bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  : "border-amber-500/40 text-amber-600 dark:text-amber-400"
              }`}
            >
              <Sparkles className="w-2.5 h-2.5 mr-1" />
              Premium
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            Activa <strong>Perplexity Deep Research + Firecrawl</strong> en pasos clave. Scrapea hasta 8 landing pages de competidores reales para extraer:
            precios exactos con moneda y fecha, claims publicitarios literales, hooks de copy verificados, CTAs y testimonios. Inteligencia ejecutable, no genérica.
          </p>

          <div className="flex items-center gap-3 flex-wrap text-xs">
            <span
              className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
                checked
                  ? "bg-amber-500 text-white"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              }`}
            >
              <Coins className="w-3 h-3" />
              +{upgradeCost.toLocaleString()} tokens
            </span>
            {!canUpgrade && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Lock className="w-3 h-3" />
                Tokens insuficientes
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function countCompleted(product: any): number {
  if (!product) return 0;
  const sad = (product.sales_angles_data as any) || {};
  const mr = (product.market_research as any) || {};
  const ca = (product.competitor_analysis as any) || {};
  let count = 0;
  if (mr.market_overview) count++;
  if (mr.jtbd) count++;
  if (mr.jtbd?.pains) count++;
  if (ca.competitors) count++;
  if (product.avatar_profiles?.profiles) count++;
  if (ca.differentiation) count++;
  if (product.content_strategy) count++;
  if (sad.angles?.length > 0) count++;
  if (sad.puv) count++;
  if (sad.leadMagnets) count++;
  if (sad.videoCreatives) count++;
  if (product.content_calendar) count++;
  if (product.launch_strategy) count++;
  if (sad.landingPages?.length > 0) count++;
  if (sad.whatsappFunnels?.length > 0) count++;
  if (sad.paidAds) count++;
  if (sad.emailMarketing) count++;
  if (sad.pricingStrategy) count++;
  if (sad.kpisDashboard) count++;
  if (sad.seoStrategy) count++;
  if (sad.partnerships) count++;
  if (sad.communityStrategy) count++;
  return count;
}
