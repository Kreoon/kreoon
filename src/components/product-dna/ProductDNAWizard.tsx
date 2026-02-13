import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Sparkles, Loader2,
  CheckCircle2, Wand2, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

import { SERVICE_GROUPS, type ServiceGroupConfig, type ServiceConfig } from '@/config/service-catalog';
import {
  AUDIENCE_QUESTIONS,
  type GoalType,
  type ServiceGroup,
  getGoalsForServiceGroup,
  getGoalQuestions,
  getGoalColor,
  getGoalIcon,
  getPathSummary,
} from '@/config/wizard-questions';

import { ServiceGroupSelector } from './steps/ServiceGroupSelector';
import { ServiceTypeSelector } from './steps/ServiceTypeSelector';
import { QuestionStep } from './steps/QuestionStep';
import { AudioStep } from './steps/AudioStep';
import { ReferencesStep } from './steps/ReferencesStep';
import { ReviewStep } from './steps/ReviewStep';
import { KIROAssistant } from './KIROAssistant';

interface ProductDNAWizardProps {
  clientId: string;
  onComplete: (productDnaId: string) => void;
  onCancel?: () => void;
}

export type WizardStep =
  | 'group_selection'
  | 'service_selection'
  | 'goal_selection'
  | 'goal_questions'
  | 'audience'
  | 'audio'
  | 'references'
  | 'review'
  | 'analyzing';

export interface WizardState {
  selectedGroup: ServiceGroupConfig | null;
  selectedServices: ServiceConfig[];
  selectedGoal: GoalType | null;
  responses: Record<string, any>;
  audioUrl: string | null;
  audioDuration: number;
  referenceLinks: Array<{ url: string; type: string; notes?: string }>;
  competitorLinks: Array<{ url: string; type: string; notes?: string }>;
  inspirationLinks: Array<{ url: string; type: string; notes?: string }>;
}

const STEP_ORDER: WizardStep[] = [
  'group_selection',
  'service_selection',
  'goal_selection',
  'goal_questions',
  'audience',
  'audio',
  'references',
  'review',
];

export function ProductDNAWizard({ clientId, onComplete, onCancel }: ProductDNAWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('group_selection');
  const [state, setState] = useState<WizardState>({
    selectedGroup: null,
    selectedServices: [],
    selectedGoal: null,
    responses: {},
    audioUrl: null,
    audioDuration: 0,
    referenceLinks: [],
    competitorLinks: [],
    inspirationLinks: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [kiroSuggestion, setKiroSuggestion] = useState<string | null>(null);

  // Progreso del wizard
  const progress = useMemo(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    return ((currentIndex + 1) / STEP_ORDER.length) * 100;
  }, [currentStep]);

  // Navegación
  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
  };

  const goNext = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
    }
  };

  const goBack = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  };

  // Actualizar respuestas
  const updateResponse = useCallback((questionId: string, value: any) => {
    setState(prev => ({
      ...prev,
      responses: { ...prev.responses, [questionId]: value },
    }));
  }, []);

  // Manejar selección de grupo
  const handleGroupSelect = (group: ServiceGroupConfig) => {
    setState(prev => ({
      ...prev,
      selectedGroup: group,
      selectedServices: [],
      selectedGoal: null,
    }));
    goNext();
  };

  // Manejar selección de servicios (máx 3)
  const handleServicesSelect = (services: ServiceConfig[]) => {
    if (services.length > 3) {
      toast.error('Máximo 3 servicios permitidos');
      return;
    }
    setState(prev => ({ ...prev, selectedServices: services }));
  };

  // Manejar selección de objetivo
  const handleGoalSelect = (goalId: GoalType) => {
    setState(prev => ({
      ...prev,
      selectedGoal: goalId,
      responses: { ...prev.responses, primary_goal: goalId },
    }));
  };

  // Manejar audio
  const handleAudioComplete = (url: string, duration: number) => {
    setState(prev => ({ ...prev, audioUrl: url, audioDuration: duration }));
  };

  // Preguntas específicas del objetivo seleccionado
  const goalQuestions = useMemo(() => {
    if (!state.selectedGoal) return [];
    return getGoalQuestions(state.selectedGoal);
  }, [state.selectedGoal]);

  // Validar paso actual
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'group_selection':
        return state.selectedGroup !== null;
      case 'service_selection':
        return state.selectedServices.length > 0 && state.selectedServices.length <= 3;
      case 'goal_selection':
        return state.selectedGoal !== null;
      case 'goal_questions': {
        // Check required goal-specific questions are answered
        const requiredQs = goalQuestions.filter(q => q.required);
        return requiredQs.every(q => {
          const val = state.responses[q.id];
          if (val === undefined || val === null) return false;
          if (Array.isArray(val)) return val.length > 0;
          if (typeof val === 'string') return val.trim().length > 0;
          return true;
        });
      }
      case 'audience':
        return !!state.responses.target_age && !!state.responses.target_gender;
      case 'audio':
        return true; // Audio is optional
      case 'references':
        return true; // References are optional
      case 'review':
        return true;
      default:
        return true;
    }
  }, [currentStep, state, goalQuestions]);

  // Enviar y procesar
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setCurrentStep('analyzing');

    try {
      // product_dna table not yet in generated types — cast to any
      const { data: productDna, error: createError } = await (supabase as any)
        .from('product_dna')
        .insert({
          client_id: clientId,
          service_group: state.selectedGroup!.id,
          service_types: state.selectedServices.map(s => s.id),
          audio_url: state.audioUrl,
          audio_duration_seconds: state.audioDuration,
          reference_links: state.referenceLinks,
          competitor_links: state.competitorLinks,
          inspiration_links: state.inspirationLinks,
          wizard_responses: state.responses,
          status: 'analyzing',
        })
        .select()
        .single();

      if (createError) throw createError;

      const { error: analyzeError } = await supabase.functions.invoke('generate-product-dna', {
        body: { productDnaId: productDna.id },
      });

      if (analyzeError) throw analyzeError;

      toast.success('¡Análisis completado! Tu Product DNA está listo.');
      onComplete(productDna.id);
    } catch (error) {
      console.error('Error creating product DNA:', error);
      toast.error('Error al procesar tu solicitud');
      setCurrentStep('review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    const titles: Record<WizardStep, string> = {
      group_selection: '¿Qué tipo de servicio necesitas?',
      service_selection: 'Selecciona los servicios específicos',
      goal_selection: '¿Cuál es tu objetivo principal?',
      goal_questions: getGoalStepTitle(),
      audience: 'Tu audiencia objetivo',
      audio: 'Cuéntanos tu visión',
      references: 'Referencias y competencia',
      review: 'Revisa tu solicitud',
      analyzing: 'Analizando tu proyecto...',
    };
    return titles[currentStep];
  };

  const getGoalStepTitle = () => {
    if (!state.selectedGoal) return 'Define tu estrategia';
    const summary = getPathSummary(state.selectedGoal);
    return `Estrategia: ${summary.goalLabel}`;
  };

  return (
    <div className="relative min-h-[60vh]">
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {/* Progress Bar */}
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-6">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Step Title */}
          <div className="flex items-center justify-between">
            <div>
              <motion.h1
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold text-white"
              >
                {getStepTitle()}
              </motion.h1>
              {state.selectedGroup && currentStep !== 'group_selection' && (
                <p className="text-gray-400 mt-1">
                  {state.selectedGroup.name}
                  {state.selectedServices.length > 0 && (
                    <span className="text-purple-400">
                      {' → '}{state.selectedServices.map(s => s.name).join(', ')}
                    </span>
                  )}
                  {state.selectedGoal && currentStep !== 'goal_selection' && (
                    <span className="text-emerald-400">
                      {' → '}{getPathSummary(state.selectedGoal).goalLabel}
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500
                            flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {currentStep === 'group_selection' && (
              <ServiceGroupSelector
                groups={SERVICE_GROUPS}
                selectedGroup={state.selectedGroup}
                onSelect={handleGroupSelect}
              />
            )}

            {currentStep === 'service_selection' && state.selectedGroup && (
              <ServiceTypeSelector
                group={state.selectedGroup}
                selected={state.selectedServices}
                onSelect={handleServicesSelect}
                maxSelections={3}
              />
            )}

            {currentStep === 'goal_selection' && state.selectedGroup && (
              <GoalSelectionStep
                selectedGroup={state.selectedGroup.id as ServiceGroup}
                selectedGoal={state.selectedGoal}
                onSelect={handleGoalSelect}
              />
            )}

            {currentStep === 'goal_questions' && state.selectedGoal && (
              <QuestionStep
                questions={goalQuestions}
                responses={state.responses}
                onResponse={updateResponse}
              />
            )}

            {currentStep === 'audience' && (
              <QuestionStep
                questions={AUDIENCE_QUESTIONS}
                responses={state.responses}
                onResponse={updateResponse}
              />
            )}

            {currentStep === 'audio' && (
              <AudioStep
                audioUrl={state.audioUrl}
                onAudioComplete={handleAudioComplete}
              />
            )}

            {currentStep === 'references' && (
              <ReferencesStep
                referenceLinks={state.referenceLinks}
                competitorLinks={state.competitorLinks}
                inspirationLinks={state.inspirationLinks}
                onUpdate={(type, links) => {
                  setState(prev => ({ ...prev, [`${type}Links`]: links }));
                }}
              />
            )}

            {currentStep === 'review' && (
              <ReviewStep state={state} onEdit={goToStep} />
            )}

            {currentStep === 'analyzing' && <AnalyzingStep />}
          </motion.div>
        </AnimatePresence>

        {/* KIRO Assistant Panel */}
        {kiroSuggestion && (
          <KIROAssistant
            message={kiroSuggestion}
            onDismiss={() => setKiroSuggestion(null)}
          />
        )}

        {/* Navigation Footer */}
        {currentStep !== 'analyzing' && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={currentStep === 'group_selection' ? onCancel : goBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl
                         bg-white/5 border border-white/10 text-gray-400
                         hover:text-white hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              {currentStep === 'group_selection' ? 'Cancelar' : 'Atrás'}
            </button>

            {currentStep === 'review' ? (
              <button
                onClick={handleSubmit}
                disabled={!canProceed || isSubmitting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl
                           bg-gradient-to-r from-purple-500 to-pink-500
                           text-white font-medium
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:opacity-90 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generar Product DNA
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canProceed}
                className="flex items-center gap-2 px-6 py-3 rounded-xl
                           bg-gradient-to-r from-purple-500 to-pink-500
                           text-white font-medium
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:opacity-90 transition-all"
              >
                Continuar
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Goal Selection Step ──────────────────────────────────────────────────

// KIRO hints contextuales por grupo
function getKiroHintForGroup(group: ServiceGroup): string {
  const hints: Record<ServiceGroup, string> = {
    technology: "Para proyectos tech, el tipo de proyecto define toda la arquitectura y timeline. ¿Es un MVP para validar o una app completa?",
    content_creation: "Tu objetivo determina el estilo de contenido. ¿Buscas awareness, leads o ventas directas?",
    post_production: "El destino del video define la edición. No es lo mismo un reel de 15s que un corporativo de 3 minutos.",
    strategy_marketing: "La estrategia correcta depende de tu meta. ¿Lanzamiento puntual o crecimiento sostenido?",
    education_training: "El formato educativo ideal depende de tu audiencia y profundidad del tema.",
    general_services: "Cuéntanos qué necesitas y encontraremos la mejor forma de ayudarte.",
  };
  return hints[group];
}

const GoalSelectionStep: React.FC<{
  selectedGroup: ServiceGroup;
  selectedGoal: string | null;
  onSelect: (goalId: string) => void;
}> = ({ selectedGroup, selectedGoal, onSelect }) => {
  const goals = getGoalsForServiceGroup(selectedGroup);
  const groupLabel = SERVICE_GROUPS.find(g => g.id === selectedGroup)?.name;

  return (
    <div className="space-y-6">
      {/* Header contextual */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white/60 text-sm">Servicio seleccionado</p>
          <p className="text-white font-medium">{groupLabel}</p>
        </div>
      </div>

      {/* KIRO hint */}
      <div className="flex gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
        <img src="/kiro-avatar.png" className="w-8 h-8 rounded-full" alt="" />
        <div>
          <p className="text-white text-sm font-medium">KIRO sugiere</p>
          <p className="text-white/70 text-sm">
            {getKiroHintForGroup(selectedGroup)}
          </p>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-2 gap-4">
        {goals.map((goal) => (
          <button
            key={goal.id}
            onClick={() => onSelect(goal.id)}
            className={cn(
              "p-4 rounded-xl border text-left transition-all",
              selectedGoal === goal.id
                ? `bg-gradient-to-br ${goal.color} border-white/30`
                : "bg-white/5 border-white/10 hover:border-white/20"
            )}
          >
            <div className="text-2xl mb-2">{goal.icon}</div>
            <h3 className="text-white font-semibold mb-1">{goal.label}</h3>
            <p className="text-white/60 text-sm mb-3">{goal.description}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/50">{goal.questionCount} preguntas</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full",
                goal.complexity === 'simple' && "bg-green-500/20 text-green-400",
                goal.complexity === 'moderate' && "bg-amber-500/20 text-amber-400",
                goal.complexity === 'detailed' && "bg-purple-500/20 text-purple-400"
              )}>
                {goal.complexity === 'simple' && 'Simple'}
                {goal.complexity === 'moderate' && 'Moderado'}
                {goal.complexity === 'detailed' && 'Detallado'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Analyzing Step ─────────────────────────────────────────────────────

function AnalyzingStep() {
  const steps = [
    { label: 'Transcribiendo audio', delay: 0 },
    { label: 'Analizando respuestas', delay: 1.5 },
    { label: 'Investigando mercado', delay: 3 },
    { label: 'Analizando competencia', delay: 4.5 },
    { label: 'Generando estrategia', delay: 6 },
    { label: 'Creando brief de contenido', delay: 7.5 },
  ];

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  React.useEffect(() => {
    const timers = steps.map((step, index) =>
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, index]);
      }, step.delay * 1000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <motion.div
        animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500
                   flex items-center justify-center mb-8 shadow-xl shadow-purple-500/30"
      >
        <Sparkles className="w-12 h-12 text-white" />
      </motion.div>

      <h2 className="text-2xl font-bold text-white mb-2">KIRO está analizando</h2>
      <p className="text-gray-400 mb-8">Esto puede tomar un momento...</p>

      <div className="space-y-3 w-full max-w-sm">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isActive = !isCompleted && completedSteps.length === index;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: step.delay }}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                isCompleted
                  ? 'bg-green-500/10 border border-green-500/20'
                  : isActive
                    ? 'bg-purple-500/10 border border-purple-500/20'
                    : 'bg-white/5 border border-white/10'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : isActive ? (
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-white/20" />
              )}
              <span className={`text-sm ${
                isCompleted ? 'text-green-400' : isActive ? 'text-purple-400' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
