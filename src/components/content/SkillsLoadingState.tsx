import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles, Zap, Target, MessageCircle, TrendingUp, Brain, Heart, Eye, Users,
  Shield, Wand2, CheckCircle2, Search, Smartphone, FileCheck, UserCheck, Loader2, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SkillsRealProgress {
  phase: number;
  totalPhases: number;
  currentSkillNames: string[];
  pct: number;
}

interface SkillsLoadingStateProps {
  isGenerating: boolean;
  realProgress?: SkillsRealProgress | null;
}

const SKILL_META: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  consciousness_mapper:   { label: 'Mapeando nivel de consciencia...', icon: Brain,        color: 'text-violet-500' },
  trend_injector:         { label: 'Inyectando tendencias virales...', icon: TrendingUp,   color: 'text-rose-500' },
  avatar_mirrorer:        { label: 'Adaptando al avatar ideal...',     icon: Users,        color: 'text-indigo-500' },
  hooks_specialist:       { label: 'Generando hooks que detienen el scroll...', icon: Zap, color: 'text-yellow-500' },
  emotion_architect:      { label: 'Diseñando arco emocional...',      icon: Heart,        color: 'text-red-500' },
  storytelling_specialist:{ label: 'Construyendo narrativa...',        icon: Sparkles,     color: 'text-purple-500' },
  neuro_persuader:        { label: 'Aplicando neuromarketing...',      icon: Brain,        color: 'text-pink-500' },
  cultural_adapter:       { label: 'Adaptando culturalmente...',       icon: MessageCircle,color: 'text-blue-500' },
  retention_engineer:     { label: 'Optimizando retención...',         icon: Eye,          color: 'text-cyan-500' },
  social_proof_weaver:    { label: 'Integrando prueba social...',      icon: CheckCircle2, color: 'text-teal-500' },
  objection_crusher:      { label: 'Neutralizando objeciones...',      icon: Shield,       color: 'text-orange-500' },
  cta_specialist:         { label: 'Optimizando call-to-action...',    icon: Target,       color: 'text-green-500' },
  storybrand_architect:   { label: 'Aplicando StoryBrand...',          icon: Sparkles,     color: 'text-amber-500' },
  copy_sharpener:         { label: 'Puliendo copy...',                 icon: Wand2,        color: 'text-amber-500' },
  virality_optimizer:     { label: 'Maximizando viralidad...',         icon: TrendingUp,   color: 'text-pink-500' },
  ai_humanizer:           { label: 'Humanizando texto...',             icon: UserCheck,    color: 'text-emerald-500' },
  duration_adjuster:      { label: 'Ajustando duración del video...',  icon: Clock,        color: 'text-sky-500' },
  scene_director:         { label: 'Generando tabla de producción...', icon: FileCheck,    color: 'text-slate-500' },
  production_director:    { label: 'Dirigiendo producción...',         icon: FileCheck,    color: 'text-slate-400' },
  broll_generator:        { label: 'Creando ideas de B-Roll...',       icon: Smartphone,   color: 'text-lime-500' },
  caption_generator:      { label: 'Generando captions...',            icon: MessageCircle,color: 'text-sky-400' },
  seo_discoverer:         { label: 'Optimizando búsqueda...',          icon: Search,       color: 'text-lime-500' },
  platform_optimizer:     { label: 'Ajustando por plataforma...',      icon: Smartphone,   color: 'text-slate-500' },
};

const PHASE_LABELS = [
  'Analizando contexto',
  'Generando contenido',
  'Enriqueciendo y persuadiendo',
  'Refinando estructura',
  'Humanizando',
  'Ajustando duración',
];

export function SkillsLoadingState({ isGenerating, realProgress }: SkillsLoadingStateProps) {
  if (!isGenerating) return null;

  const pct = realProgress?.pct ?? 0;
  const phase = realProgress?.phase ?? 0;
  const totalPhases = realProgress?.totalPhases ?? 6;
  const currentSkillNames = realProgress?.currentSkillNames ?? [];

  const phaseLabel = phase > 0
    ? (PHASE_LABELS[phase - 1] ?? `Fase ${phase}`)
    : 'Iniciando...';

  const activeSkills = currentSkillNames
    .map(name => SKILL_META[name])
    .filter(Boolean);

  const primarySkill = activeSkills[0];
  const PrimaryIcon = primarySkill?.icon ?? Sparkles;

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card/50 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="font-medium text-sm">Generando con IA Avanzada</span>
        </div>
        <Badge variant="secondary" className="text-xs font-mono">
          {pct}%
        </Badge>
      </div>

      {/* Current phase + skill */}
      <div className="flex items-center gap-3 p-3 rounded-md bg-primary/5 border border-primary/10">
        <PrimaryIcon className={cn('h-5 w-5 animate-pulse shrink-0', primarySkill?.color ?? 'text-primary')} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-none mb-0.5">
            {phase > 0 ? `Fase ${phase}/${totalPhases} — ${phaseLabel}` : 'Preparando...'}
          </p>
          <p className="text-sm font-medium truncate">
            {primarySkill?.label ?? 'Procesando...'}
          </p>
          {activeSkills.length > 1 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              +{activeSkills.length - 1} skills en paralelo
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress value={pct} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {phase > 0 ? `Fase ${phase} de ${totalPhases}` : 'Conectando...'}
          </span>
          <span>{pct}% completado</span>
        </div>
      </div>

      {/* Phase dots */}
      {totalPhases > 0 && (
        <div className="flex items-center gap-1.5 justify-center">
          {Array.from({ length: totalPhases }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'h-1.5 rounded-full transition-all duration-500',
                idx < phase
                  ? 'bg-primary w-4'
                  : idx === phase - 1
                  ? 'bg-primary/70 w-3 animate-pulse'
                  : 'bg-muted w-1.5',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SkillsLoadingState;
