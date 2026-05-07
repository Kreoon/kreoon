import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkillsLoadingStateProps {
  isGenerating: boolean;
}

interface SkillStep {
  name: string;
  label: string;
  icon: typeof Zap;
  color: string;
}

const SKILL_SEQUENCE: SkillStep[] = [
  { name: 'trend_injector', label: 'Inyectando tendencias virales...', icon: TrendingUp, color: 'text-rose-500' },
  { name: 'hooks_specialist', label: 'Generando hooks que detienen el scroll...', icon: Zap, color: 'text-yellow-500' },
  { name: 'avatar_mirrorer', label: 'Adaptando al avatar ideal...', icon: Users, color: 'text-indigo-500' },
  { name: 'emotion_architect', label: 'Diseñando arco emocional...', icon: Heart, color: 'text-red-500' },
  { name: 'cultural_adapter', label: 'Adaptando culturalmente...', icon: MessageCircle, color: 'text-blue-500' },
  { name: 'retention_engineer', label: 'Optimizando retención...', icon: Eye, color: 'text-cyan-500' },
  { name: 'neuro_persuader', label: 'Aplicando neuromarketing...', icon: Brain, color: 'text-violet-500' },
  { name: 'storytelling_specialist', label: 'Construyendo narrativa...', icon: Sparkles, color: 'text-purple-500' },
  { name: 'social_proof_weaver', label: 'Integrando prueba social...', icon: CheckCircle2, color: 'text-teal-500' },
  { name: 'objection_crusher', label: 'Neutralizando objeciones...', icon: Shield, color: 'text-orange-500' },
  { name: 'cta_specialist', label: 'Optimizando call-to-action...', icon: Target, color: 'text-green-500' },
  { name: 'copy_sharpener', label: 'Puliendo copy...', icon: Wand2, color: 'text-amber-500' },
  { name: 'virality_optimizer', label: 'Maximizando viralidad...', icon: TrendingUp, color: 'text-pink-500' },
  { name: 'ai_humanizer', label: 'Humanizando texto...', icon: UserCheck, color: 'text-emerald-500' },
  { name: 'seo_discoverer', label: 'Optimizando búsqueda...', icon: Search, color: 'text-lime-500' },
  { name: 'platform_optimizer', label: 'Ajustando plataforma...', icon: Smartphone, color: 'text-slate-500' },
  { name: 'ad_compliance_checker', label: 'Verificando compliance...', icon: FileCheck, color: 'text-sky-500' }
];

export function SkillsLoadingState({ isGenerating }: SkillsLoadingStateProps) {
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isGenerating) {
      let index = 0;
      const totalSkills = SKILL_SEQUENCE.length;

      const interval = setInterval(() => {
        index = (index + 1) % totalSkills;
        setCurrentSkillIndex(index);
        setProgress(((index + 1) / totalSkills) * 100);
      }, 2500);

      return () => {
        clearInterval(interval);
        setCurrentSkillIndex(0);
        setProgress(0);
      };
    }
  }, [isGenerating]);

  if (!isGenerating) {
    return null;
  }

  const currentSkill = SKILL_SEQUENCE[currentSkillIndex];
  const CurrentIcon = currentSkill?.icon || Sparkles;

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-card/50 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="font-medium text-sm">Generando con IA Avanzada</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {Math.round(progress)}%
        </Badge>
      </div>

      {/* Current Skill */}
      <div className="flex items-center gap-3 p-3 rounded-md bg-primary/5 border border-primary/10">
        <CurrentIcon className={cn('h-5 w-5 animate-pulse', currentSkill?.color || 'text-primary')} />
        <span className="text-sm font-medium">
          {currentSkill?.label || 'Iniciando generación...'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">
          Ejecutando {SKILL_SEQUENCE.length} skills especializados
        </p>
      </div>

      {/* Skills Preview */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {SKILL_SEQUENCE.slice(0, 8).map((skill, idx) => {
          const Icon = skill.icon;
          const isActive = idx === currentSkillIndex;
          const isCompleted = idx < currentSkillIndex;

          return (
            <div
              key={skill.name}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all duration-300',
                isActive
                  ? 'bg-primary/20 text-primary scale-105'
                  : isCompleted
                  ? 'bg-muted text-foreground'
                  : 'bg-background text-muted-foreground/50'
              )}
            >
              <Icon className={cn('h-3 w-3', isActive && 'animate-pulse')} />
            </div>
          );
        })}
        {SKILL_SEQUENCE.length > 8 && (
          <div className="flex items-center px-2 py-1 rounded-md text-xs bg-muted text-muted-foreground">
            +{SKILL_SEQUENCE.length - 8}
          </div>
        )}
      </div>
    </div>
  );
}

export default SkillsLoadingState;
