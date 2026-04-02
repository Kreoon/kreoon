import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain, Zap, Heart, Lightbulb, Eye, Target, Megaphone, Users,
  TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Sparkles,
  Layers, Trophy, Gift, Star, Shield, Clock, DollarSign, Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== INTERFACES ====================

interface EsferaPhase {
  marketDominance?: string;
  saturated?: string;
  opportunities?: string[];
  hookTypes?: string;
  currentPromises?: string;
  unresolvedObjections?: string;
  trustOpportunities?: string[];
  positioning?: string;
  existingProof?: string;
  validationGaps?: string;
  decisionMessages?: string[];
  testimonialFormats?: string;
  commonErrors?: string;
  communityOpportunities?: string[];
  ambassadorStrategy?: string;
}

interface EsferaInsights {
  enganchar?: EsferaPhase;
  solucion?: EsferaPhase;
  remarketing?: EsferaPhase;
  fidelizar?: EsferaPhase;
}

interface ExecutiveSummary {
  marketSummary?: string;
  keyInsights?: Array<{ insight?: string; importance?: string; action?: string }>;
  psychologicalDrivers?: Array<{ driver?: string; why?: string; howToUse?: string }>;
  immediateActions?: Array<{ action?: string; howTo?: string; expectedResult?: string }>;
  quickWins?: Array<{ win?: string; effort?: string; impact?: string }>;
  risksToAvoid?: Array<{ risk?: string; why?: string }>;
  finalRecommendation?: string;
}

interface ContentStrategy {
  esferaInsights?: EsferaInsights;
  executiveSummary?: ExecutiveSummary;
}

interface AvatarProfile {
  name?: string;
  awarenessLevel?: string;
  drivers?: string;
  biases?: string;
  objections?: string;
}

interface SalesAngle {
  angle?: string;
  type?: string;
  avatar?: string;
  emotion?: string;
  hookExample?: string;
}

interface PUV {
  centralProblem?: string;
  tangibleResult?: string;
  marketDifference?: string;
  statement?: string;
}

interface Transformation {
  functional?: { before?: string; after?: string };
  emotional?: { before?: string; after?: string };
  identity?: { before?: string; after?: string };
  social?: { before?: string; after?: string };
  financial?: { before?: string; after?: string };
}

interface StrategicPlaybookTabProps {
  contentStrategy?: ContentStrategy | null;
  avatarProfiles?: { profiles?: AvatarProfile[] } | null;
  salesAnglesData?: {
    angles?: SalesAngle[];
    puv?: PUV;
    transformation?: Transformation;
  } | null;
  marketResearch?: {
    market_overview?: {
      awarenessLevel?: string;
    };
  } | null;
}

// ==================== CONFIGURACIONES ====================

const ESFERA_CONFIG = {
  enganchar: {
    title: 'ENGANCHAR',
    subtitle: 'Captar atención y despertar curiosidad',
    description: 'Primera impresión que detiene el scroll y genera interés inmediato',
    color: 'border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/5',
    headerColor: 'bg-red-500/20',
    icon: Zap,
    iconColor: 'text-red-500',
    schwartzLevels: ['Unaware', 'Problem Aware'],
    hormoziTip: 'Usa pattern interrupts y hooks de curiosidad',
  },
  solucion: {
    title: 'SOLUCIONAR',
    subtitle: 'Presentar y educar sobre la solución',
    description: 'Construir autoridad y demostrar que tu solución es la correcta',
    color: 'border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/5',
    headerColor: 'bg-blue-500/20',
    icon: Target,
    iconColor: 'text-blue-500',
    schwartzLevels: ['Problem Aware', 'Solution Aware'],
    hormoziTip: 'Muestra el mecanismo único y resultados específicos',
  },
  remarketing: {
    title: 'REMARKETING',
    subtitle: 'Reforzar y empujar la decisión',
    description: 'Eliminar objeciones y crear urgencia legítima',
    color: 'border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/5',
    headerColor: 'bg-purple-500/20',
    icon: Eye,
    iconColor: 'text-purple-500',
    schwartzLevels: ['Solution Aware', 'Product Aware'],
    hormoziTip: 'Stack de valor + garantías + testimonios específicos',
  },
  fidelizar: {
    title: 'FIDELIZAR',
    subtitle: 'Retener y convertir en embajadores',
    description: 'Maximizar LTV y generar referidos orgánicos',
    color: 'border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5',
    headerColor: 'bg-green-500/20',
    icon: Users,
    iconColor: 'text-green-500',
    schwartzLevels: ['Product Aware', 'Most Aware'],
    hormoziTip: 'Programa de referidos + comunidad + ascensión',
  },
};

const SCHWARTZ_LEVELS = [
  {
    level: 1,
    name: 'Unaware',
    spanish: 'Inconsciente',
    description: 'No saben que tienen un problema',
    strategy: 'Contenido educativo, storytelling, hooks de curiosidad',
    color: 'bg-zinc-500',
    icon: Eye,
  },
  {
    level: 2,
    name: 'Problem Aware',
    spanish: 'Consciente del Problema',
    description: 'Saben que tienen un problema pero no conocen soluciones',
    strategy: 'Agitar el dolor, mostrar consecuencias, empatizar',
    color: 'bg-red-500',
    icon: AlertTriangle,
  },
  {
    level: 3,
    name: 'Solution Aware',
    spanish: 'Consciente de la Solución',
    description: 'Conocen que existen soluciones pero no la tuya',
    strategy: 'Diferenciación, mecanismo único, autoridad',
    color: 'bg-yellow-500',
    icon: Lightbulb,
  },
  {
    level: 4,
    name: 'Product Aware',
    spanish: 'Consciente del Producto',
    description: 'Conocen tu producto pero no han comprado',
    strategy: 'Prueba social, garantías, urgencia, bonos',
    color: 'bg-blue-500',
    icon: Target,
  },
  {
    level: 5,
    name: 'Most Aware',
    spanish: 'Totalmente Consciente',
    description: 'Conocen todo, solo necesitan el empujón final',
    strategy: 'Ofertas directas, descuentos, recordatorios',
    color: 'bg-green-500',
    icon: CheckCircle,
  },
];

const HORMOZI_VALUE_EQUATION = {
  title: 'Ecuación de Valor de Hormozi',
  formula: 'Valor = (Resultado Soñado × Probabilidad Percibida) ÷ (Tiempo × Esfuerzo)',
  components: [
    {
      name: 'Resultado Soñado',
      icon: Star,
      color: 'text-yellow-500',
      question: '¿Qué quiere lograr realmente el cliente?',
      tip: 'Maximiza: Pinta el estado ideal con detalle emocional',
    },
    {
      name: 'Probabilidad Percibida',
      icon: Shield,
      color: 'text-green-500',
      question: '¿Qué tan probable creen que es lograrlo contigo?',
      tip: 'Maximiza: Testimonios, garantías, credenciales, casos de éxito',
    },
    {
      name: 'Tiempo de Espera',
      icon: Clock,
      color: 'text-red-500',
      question: '¿Cuánto tardarán en ver resultados?',
      tip: 'Minimiza: Quick wins, resultados tempranos, roadmap claro',
    },
    {
      name: 'Esfuerzo / Sacrificio',
      icon: Flame,
      color: 'text-orange-500',
      question: '¿Qué tienen que hacer/dejar de hacer?',
      tip: 'Minimiza: Done-for-you, sistemas, automatización, soporte',
    },
  ],
};

// ==================== COMPONENTE PRINCIPAL ====================

export function StrategicPlaybookTab({
  contentStrategy,
  avatarProfiles,
  salesAnglesData,
  marketResearch
}: StrategicPlaybookTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('esfera');

  const esfera = contentStrategy?.esferaInsights;
  const summary = contentStrategy?.executiveSummary;
  const avatars = avatarProfiles?.profiles || [];
  const puv = salesAnglesData?.puv;
  const transformation = salesAnglesData?.transformation;
  const angles = salesAnglesData?.angles || [];

  // Detectar nivel de conciencia predominante
  const predominantAwareness = marketResearch?.market_overview?.awarenessLevel ||
    avatars.find(a => a.awarenessLevel)?.awarenessLevel ||
    'Problem Aware';

  const hasEsferaData = esfera && (
    esfera.enganchar?.marketDominance ||
    esfera.solucion?.currentPromises ||
    esfera.remarketing?.existingProof ||
    esfera.fidelizar?.commonErrors
  );

  const hasAnyData = hasEsferaData || puv || transformation || summary?.keyInsights?.length;

  if (!hasAnyData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Playbook Estratégico</p>
        <p className="text-sm mt-2">Genera la investigación de mercado para desbloquear tu estrategia personalizada</p>
        <p className="text-xs mt-4 text-muted-foreground/70">
          Combina: Método ESFERA + Niveles de Schwartz + Estrategias Hormozi
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="p-5 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              Playbook Estratégico
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tu guía maestra de marketing combinando las mejores metodologías
            </p>
          </div>
          <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30">
            {predominantAwareness}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-red-500">4</div>
            <div className="text-xs text-muted-foreground">Fases ESFERA</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-500">5</div>
            <div className="text-xs text-muted-foreground">Niveles Schwartz</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-green-500">{angles.length || 20}</div>
            <div className="text-xs text-muted-foreground">Ángulos de Venta</div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 h-auto">
          <TabsTrigger value="esfera" className="text-xs py-2 gap-1">
            <Zap className="h-3 w-3" />
            ESFERA
          </TabsTrigger>
          <TabsTrigger value="schwartz" className="text-xs py-2 gap-1">
            <TrendingUp className="h-3 w-3" />
            Conciencia
          </TabsTrigger>
          <TabsTrigger value="hormozi" className="text-xs py-2 gap-1">
            <DollarSign className="h-3 w-3" />
            Valor
          </TabsTrigger>
          <TabsTrigger value="playbook" className="text-xs py-2 gap-1">
            <Trophy className="h-3 w-3" />
            Acciones
          </TabsTrigger>
        </TabsList>

        {/* TAB: MÉTODO ESFERA */}
        <TabsContent value="esfera" className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground">
              <strong>Método ESFERA</strong> - El embudo de tráfico de Juan Ads para escalar con contenido orgánico y paid.
            </p>
          </div>

          {Object.entries(ESFERA_CONFIG).map(([key, config]) => {
            const phaseData = esfera?.[key as keyof EsferaInsights];
            const Icon = config.icon;

            return (
              <Card key={key} className={cn("overflow-hidden", config.color)}>
                <div className={cn("px-4 py-2", config.headerColor)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", config.iconColor)} />
                      <span className="font-bold text-sm">{config.title}</span>
                    </div>
                    <div className="flex gap-1">
                      {config.schwartzLevels.map(level => (
                        <Badge key={level} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {level}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{config.subtitle}</p>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Estado Actual del Mercado */}
                  {(phaseData?.marketDominance || phaseData?.currentPromises ||
                    phaseData?.existingProof || phaseData?.commonErrors) && (
                    <div className="p-3 bg-background/50 rounded-lg">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        {key === 'enganchar' && 'Qué domina el mercado'}
                        {key === 'solucion' && 'Promesas actuales'}
                        {key === 'remarketing' && 'Prueba social existente'}
                        {key === 'fidelizar' && 'Errores comunes'}
                      </p>
                      <p className="text-sm">
                        {phaseData?.marketDominance || phaseData?.currentPromises ||
                         phaseData?.existingProof || phaseData?.commonErrors}
                      </p>
                    </div>
                  )}

                  {/* Problemas / Saturación */}
                  {(phaseData?.saturated || phaseData?.unresolvedObjections || phaseData?.validationGaps) && (
                    <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                      <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-1">
                        {key === 'enganchar' && 'Saturado / Evitar'}
                        {key === 'solucion' && 'Objeciones sin resolver'}
                        {key === 'remarketing' && 'Vacíos de validación'}
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {phaseData?.saturated || phaseData?.unresolvedObjections || phaseData?.validationGaps}
                      </p>
                    </div>
                  )}

                  {/* Oportunidades */}
                  {(() => {
                    const opps = [phaseData?.opportunities, phaseData?.trustOpportunities, phaseData?.decisionMessages, phaseData?.communityOpportunities]
                      .find(arr => Array.isArray(arr) && arr.length > 0);
                    if (!opps) return null;
                    return (
                      <div>
                        <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-2">
                          Oportunidades
                        </p>
                        <div className="space-y-1.5">
                          {opps.slice(0, 4).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 p-2 bg-green-500/5 border-l-2 border-green-500 rounded-r">
                              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                              <p className="text-xs">{typeof item === 'string' ? item : (item?.opportunity || item?.message || item?.trustOpportunity || item?.decision || item?.community || item?.text || 'Oportunidad disponible')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tip de Hormozi */}
                  <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <Sparkles className="h-4 w-4 text-yellow-500 shrink-0" />
                    <p className="text-xs"><strong>Tip Hormozi:</strong> {config.hormoziTip}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* TAB: NIVELES DE CONCIENCIA SCHWARTZ */}
        <TabsContent value="schwartz" className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground">
              <strong>Eugene Schwartz - Breakthrough Advertising</strong> - Los 5 niveles de conciencia del cliente y cómo comunicarte en cada uno.
            </p>
          </div>

          {/* Visual Journey */}
          <div className="flex items-center justify-between p-4 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
            {SCHWARTZ_LEVELS.map((level, idx) => (
              <div key={level.name} className="flex items-center">
                <div className={cn(
                  "flex flex-col items-center",
                  predominantAwareness.toLowerCase().includes(level.name.toLowerCase().split(' ')[0]) && "scale-110"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold",
                    level.color,
                    predominantAwareness.toLowerCase().includes(level.name.toLowerCase().split(' ')[0]) && "ring-2 ring-offset-2 ring-primary"
                  )}>
                    {level.level}
                  </div>
                  <p className="text-[10px] mt-1 text-center max-w-[60px]">{level.spanish}</p>
                </div>
                {idx < SCHWARTZ_LEVELS.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
                )}
              </div>
            ))}
          </div>

          {/* Level Cards */}
          <div className="grid gap-3">
            {SCHWARTZ_LEVELS.map((level) => {
              const Icon = level.icon;
              const isActive = predominantAwareness.toLowerCase().includes(level.name.toLowerCase().split(' ')[0]);

              return (
                <Card key={level.name} className={cn(
                  "transition-colors duration-150",
                  isActive && "ring-2 ring-primary"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0",
                        level.color
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{level.spanish}</h4>
                          <Badge variant="outline" className="text-[10px]">{level.name}</Badge>
                          {isActive && <Badge className="text-[10px] bg-primary">Tu mercado</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{level.description}</p>
                        <div className="p-2 bg-muted/50 rounded">
                          <p className="text-xs"><strong>Estrategia:</strong> {level.strategy}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB: ECUACIÓN DE VALOR HORMOZI */}
        <TabsContent value="hormozi" className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground">
              <strong>Alex Hormozi - $100M Offers</strong> - La ecuación de valor para crear ofertas irresistibles que venden solas.
            </p>
          </div>

          {/* Formula Visual */}
          <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <Badge className="bg-yellow-500 text-black font-bold px-4 py-1">
                  {HORMOZI_VALUE_EQUATION.formula}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                {HORMOZI_VALUE_EQUATION.components.map((comp, idx) => {
                  const Icon = comp.icon;
                  const isNumerator = idx < 2;

                  return (
                    <Card key={comp.name} className={cn(
                      "border-2",
                      isNumerator ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={cn("h-5 w-5", comp.color)} />
                          <span className="font-semibold text-sm">{comp.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{comp.question}</p>
                        <div className={cn(
                          "p-2 rounded text-xs",
                          isNumerator ? "bg-green-500/10" : "bg-red-500/10"
                        )}>
                          <strong>{isNumerator ? '↑ Maximiza:' : '↓ Minimiza:'}</strong> {comp.tip}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* PUV aplicada */}
          {puv && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Tu Propuesta de Valor Aplicada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {puv.centralProblem && (
                  <div className="p-3 bg-red-500/5 rounded-lg">
                    <p className="text-[10px] font-semibold text-red-500 uppercase mb-1">Problema Central</p>
                    <p className="text-sm">{puv.centralProblem}</p>
                  </div>
                )}
                {puv.tangibleResult && (
                  <div className="p-3 bg-green-500/5 rounded-lg">
                    <p className="text-[10px] font-semibold text-green-500 uppercase mb-1">Resultado Tangible</p>
                    <p className="text-sm">{puv.tangibleResult}</p>
                  </div>
                )}
                {puv.statement && (
                  <div className="p-4 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
                    <p className="text-[10px] font-semibold text-purple-500 uppercase mb-1">Tu PUV</p>
                    <p className="text-base font-medium">{puv.statement}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Transformación */}
          {transformation && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  Transformación del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {Object.entries(transformation).map(([key, value]) => {
                    if (!value?.before && !value?.after) return null;
                    const labels: Record<string, string> = {
                      functional: '⚙️ Funcional',
                      emotional: '❤️ Emocional',
                      identity: '🪞 Identidad',
                      social: '👥 Social',
                      financial: '💰 Financiero',
                    };
                    return (
                      <div key={key} className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 p-2 bg-muted/30 rounded">
                        <div className="text-xs">
                          <span className="text-red-500 font-medium">Antes:</span> {value?.before || '-'}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="text-xs">
                          <span className="text-green-500 font-medium">Después:</span> {value?.after || '-'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: PLAYBOOK DE ACCIONES */}
        <TabsContent value="playbook" className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground">
              <strong>Tu Playbook de Acciones</strong> - Acciones prioritarias basadas en tu investigación y las metodologías aplicadas.
            </p>
          </div>

          {/* Acciones Inmediatas */}
          {summary?.immediateActions && summary.immediateActions.length > 0 && (
            <Card className="border-green-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  Acciones Inmediatas (Próximos 7 días)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.immediateActions.map((action, idx) => (
                  <div key={idx} className="p-3 bg-green-500/5 border-l-4 border-green-500 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-green-500 text-white text-[10px]">{idx + 1}</Badge>
                      <span className="font-medium text-sm">{action.action}</span>
                    </div>
                    {action.howTo && (
                      <p className="text-xs text-muted-foreground ml-6">
                        <strong>Cómo:</strong> {action.howTo}
                      </p>
                    )}
                    {action.expectedResult && (
                      <p className="text-xs text-green-600 dark:text-green-400 ml-6">
                        <strong>Resultado:</strong> {action.expectedResult}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Wins */}
          {summary?.quickWins && summary.quickWins.length > 0 && (
            <Card className="border-yellow-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Quick Wins (Bajo esfuerzo, Alto impacto)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {summary.quickWins.map((win, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-yellow-500/5 rounded-lg">
                      <span className="text-sm">{win.win}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[10px] bg-green-500/10">
                          Esfuerzo: {win.effort || 'Bajo'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-blue-500/10">
                          Impacto: {win.impact || 'Alto'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Riesgos a Evitar */}
          {summary?.risksToAvoid && summary.risksToAvoid.length > 0 && (
            <Card className="border-red-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Riesgos a Evitar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.risksToAvoid.map((risk, idx) => (
                    <div key={idx} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">{risk.risk}</p>
                      {risk.why && (
                        <p className="text-xs text-muted-foreground mt-1">Por qué: {risk.why}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drivers Psicológicos */}
          {summary?.psychologicalDrivers && summary.psychologicalDrivers.length > 0 && (
            <Card className="border-purple-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  Drivers Psicológicos a Explotar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {summary.psychologicalDrivers.map((driver, idx) => (
                    <div key={idx} className="p-3 bg-purple-500/5 rounded-lg">
                      <p className="font-medium text-sm">{driver.driver}</p>
                      {driver.why && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <strong>Por qué funciona:</strong> {driver.why}
                        </p>
                      )}
                      {driver.howToUse && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          <strong>Cómo usarlo:</strong> {driver.howToUse}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recomendación Final */}
          {summary?.finalRecommendation && (
            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Recomendación Estratégica Final</h4>
                    <p className="text-sm">{summary.finalRecommendation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
