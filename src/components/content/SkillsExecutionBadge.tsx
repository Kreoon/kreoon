import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Zap,
  Target,
  MessageCircle,
  TrendingUp,
  Brain,
  Heart,
  Eye,
  Users,
  Shield,
  Wand2,
  CheckCircle2,
  Search,
  Smartphone,
  FileCheck,
  UserCheck,
  BarChart3,
  Clapperboard,
  PenLine,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SkillExecution {
  skill: string;
  confidence: number;
  executed_at: string;
}

interface ViralityScore {
  viralidad: number;
  humanidad: number;
  efectividad: number;
  prediccion?: string;
}

interface SkillsExecutionBadgeProps {
  skillsExecuted?: SkillExecution[];
  viralityScore?: ViralityScore;
  compact?: boolean;
}

type SkillTier = 'original' | 'critical' | 'high-value' | 'specialized' | 'output';

interface SkillInfoItem {
  icon: typeof Zap;
  label: string;
  color: string;
  bg: string;
  border: string;
  description: string;
  tier: SkillTier;
}

const SKILL_INFO: Record<string, SkillInfoItem> = {
  // ========== TIER 0: SKILLS ORIGINALES (5) ==========
  hooks_specialist: {
    icon: Zap,
    label: 'Hooks Virales',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    description: 'Generó hooks que detienen el scroll',
    tier: 'original'
  },
  cultural_adapter: {
    icon: MessageCircle,
    label: 'Adaptación Cultural',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    description: 'Adaptó el guión culturalmente',
    tier: 'original'
  },
  storytelling_specialist: {
    icon: Sparkles,
    label: 'Storytelling',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    description: 'Construyó la narrativa completa',
    tier: 'original'
  },
  cta_specialist: {
    icon: Target,
    label: 'CTA Optimizado',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    description: 'Generó call-to-action efectivo',
    tier: 'original'
  },
  virality_optimizer: {
    icon: TrendingUp,
    label: 'Optimizador Viral',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    description: 'Optimizó para viralidad máxima',
    tier: 'original'
  },

  // ========== TIER 1: CRÍTICOS (3) ==========
  ai_humanizer: {
    icon: UserCheck,
    label: 'Humanizador IA',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    description: 'Eliminó patrones IA, texto indistinguible de humano',
    tier: 'critical'
  },
  neuro_persuader: {
    icon: Brain,
    label: 'Neuro-Persuasor',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    description: 'Aplicó Cialdini, gatillos mentales y sesgos cognitivos',
    tier: 'critical'
  },
  trend_injector: {
    icon: TrendingUp,
    label: 'Inyector de Tendencias',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    description: 'Inyectó trends, sonidos virales y formatos trending',
    tier: 'critical'
  },

  // ========== TIER 2: ALTO VALOR (5) ==========
  emotion_architect: {
    icon: Heart,
    label: 'Arquitecto Emocional',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    description: 'Diseñó arco emocional con peaks y valleys',
    tier: 'high-value'
  },
  retention_engineer: {
    icon: Eye,
    label: 'Ingeniero de Retención',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    description: 'Mejoró puntos críticos de abandono (3s, 7s, 15s)',
    tier: 'high-value'
  },
  avatar_mirrorer: {
    icon: Users,
    label: 'Espejo del Avatar',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    description: 'Reflejó lenguaje exacto del avatar ideal',
    tier: 'high-value'
  },
  objection_crusher: {
    icon: Shield,
    label: 'Destructor de Objeciones',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    description: 'Anticipó y neutralizó objeciones',
    tier: 'high-value'
  },
  copy_sharpener: {
    icon: Wand2,
    label: 'Afilador de Copy',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    description: 'Pulió microcopies, ritmo y power words',
    tier: 'high-value'
  },
  social_proof_weaver: {
    icon: CheckCircle2,
    label: 'Tejedor de Prueba Social',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    description: 'Integró testimonios y números naturales',
    tier: 'high-value'
  },

  // ========== TIER 3: ESPECIALIZADOS (3) ==========
  platform_optimizer: {
    icon: Smartphone,
    label: 'Optimizador de Plataforma',
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    description: 'Ajustó para TikTok/Reels/Shorts específicos',
    tier: 'specialized'
  },
  seo_discoverer: {
    icon: Search,
    label: 'Descubridor SEO',
    color: 'text-lime-500',
    bg: 'bg-lime-500/10',
    border: 'border-lime-500/20',
    description: 'Optimizó para búsqueda interna de plataformas',
    tier: 'specialized'
  },
  ad_compliance_checker: {
    icon: FileCheck,
    label: 'Verificador Compliance',
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    description: 'Verificó políticas de Meta/TikTok Ads',
    tier: 'specialized'
  },

  // ========== TIER 4: OUTPUT STRUCTURERS (2) ==========
  scene_director: {
    icon: Clapperboard,
    label: 'Director de Escenas',
    color: 'text-fuchsia-500',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    description: 'Convirtió guión en tabla de producción con escenas de 3-5 segundos',
    tier: 'output'
  },
  caption_generator: {
    icon: PenLine,
    label: 'Generador de Captions',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    description: 'Generó 4 variaciones de captions (2 orgánico + 2 ads)',
    tier: 'output'
  }
};

const TIER_LABELS: Record<SkillTier, { label: string; color: string }> = {
  original: { label: 'Core', color: 'text-slate-400' },
  critical: { label: 'Crítico', color: 'text-red-400' },
  'high-value': { label: 'Alto Valor', color: 'text-blue-400' },
  specialized: { label: 'Especializado', color: 'text-purple-400' },
  output: { label: 'Output', color: 'text-fuchsia-400' }
};

export function SkillsExecutionBadge({
  skillsExecuted,
  viralityScore,
  compact = false
}: SkillsExecutionBadgeProps) {
  if (!skillsExecuted || skillsExecuted.length === 0) {
    return null;
  }

  // Agrupar skills por tier
  const groupedSkills = skillsExecuted.reduce((acc, skill) => {
    const info = SKILL_INFO[skill.skill];
    if (info) {
      const tier = info.tier;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(skill);
    }
    return acc;
  }, {} as Record<SkillTier, SkillExecution[]>);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1 cursor-help">
              <Sparkles className="h-3 w-3" />
              {skillsExecuted.length} Skills
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium mb-1">Skills ejecutados:</p>
            <div className="flex flex-wrap gap-1">
              {skillsExecuted.slice(0, 8).map((skill) => {
                const info = SKILL_INFO[skill.skill];
                if (!info) return null;
                return (
                  <span key={skill.skill} className={`text-xs ${info.color}`}>
                    {info.label}
                  </span>
                );
              })}
              {skillsExecuted.length > 8 && (
                <span className="text-xs text-muted-foreground">
                  +{skillsExecuted.length - 8} más
                </span>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-card/50">
      {/* Header con total de skills */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">
            {skillsExecuted.length} Skills Ejecutados
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          Generación IA Avanzada
        </Badge>
      </div>

      {/* Skills por Tier */}
      {(Object.entries(groupedSkills) as [SkillTier, SkillExecution[]][]).map(([tier, skills]) => {
        const tierInfo = TIER_LABELS[tier];

        return (
          <div key={tier} className="space-y-2">
            {/* Tier Label */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className={`text-xs font-medium ${tierInfo.color}`}>
                {tierInfo.label}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Skills Badges */}
            <div className="flex flex-wrap gap-1.5">
              <TooltipProvider>
                {skills.map((skill) => {
                  const info = SKILL_INFO[skill.skill];
                  if (!info) return null;

                  const Icon = info.icon;
                  const confidencePercent = Math.round(skill.confidence * 100);

                  return (
                    <Tooltip key={skill.skill}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`gap-1.5 cursor-help ${info.bg} ${info.border} hover:opacity-80 transition-opacity`}
                        >
                          <Icon className={`h-3 w-3 ${info.color}`} />
                          <span className="text-xs">{info.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {confidencePercent}%
                          </span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="font-medium">{info.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {info.description}
                        </p>
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className="text-muted-foreground">
                            Confianza: {confidencePercent}%
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(skill.executed_at).toLocaleTimeString('es', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>
          </div>
        );
      })}

      {/* Scores de Viralidad */}
      {viralityScore && (
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Análisis de Performance</span>
          </div>

          <div className="space-y-2">
            {/* Viralidad */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Viralidad</span>
                <span className="font-medium text-pink-500">
                  {viralityScore.viralidad}/10
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all"
                  style={{ width: `${(viralityScore.viralidad / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Humanidad */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Humanidad</span>
                <span className="font-medium text-emerald-500">
                  {viralityScore.humanidad}/10
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${(viralityScore.humanidad / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Efectividad */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Efectividad</span>
                <span className="font-medium text-blue-500">
                  {viralityScore.efectividad}/10
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                  style={{ width: `${(viralityScore.efectividad / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Predicción */}
          {viralityScore.prediccion && (
            <div className="mt-3 p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-primary mb-1">
                    Predicción IA
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {viralityScore.prediccion}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SkillsExecutionBadge;
