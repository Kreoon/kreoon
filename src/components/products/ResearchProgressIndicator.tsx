import { useEffect, useState, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const RESEARCH_SECTIONS = [
  { key: 'market_overview', label: 'Panorama del Mercado' },
  { key: 'jtbd', label: 'Análisis JTBD' },
  { key: 'pains_desires', label: 'Dolores y Deseos' },
  { key: 'competitors', label: 'Análisis de Competencia' },
  { key: 'avatars', label: 'Avatares Estratégicos' },
  { key: 'differentiation', label: 'Diferenciación y ESFERA' },
  { key: 'sales_angles', label: 'Ángulos de Venta' },
  { key: 'puv_transformation', label: 'Propuesta Única de Valor' },
  { key: 'lead_magnets', label: 'Lead Magnets' },
  { key: 'video_creatives', label: 'Creativos de Video' },
  { key: 'content_calendar', label: 'Parrilla de Contenido' },
  { key: 'launch_strategy', label: 'Estrategia de Lanzamiento' },
] as const;

type SectionStatus = 'pending' | 'generating' | 'completed';

interface ResearchProgressIndicatorProps {
  productId: string;
  isGenerating: boolean;
}

export function ResearchProgressIndicator({ productId, isGenerating }: ResearchProgressIndicatorProps) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isGenerating || !productId) return;

    startTimeRef.current = Date.now();

    const pollProgress = async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('research_progress')
          .eq('id', productId)
          .single();

        const progress = (data as any)?.research_progress;
        if (progress?.completed_steps) {
          const steps: string[] = progress.completed_steps;
          setCompletedSteps(steps);

          // Determine which step is currently generating
          const nextStep = RESEARCH_SECTIONS.find(s => !steps.includes(s.key));
          setCurrentStep(nextStep?.key || null);
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    // Poll immediately, then every 3 seconds
    pollProgress();
    pollRef.current = setInterval(pollProgress, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isGenerating, productId]);

  if (!isGenerating) return null;

  const completed = completedSteps.length;
  const total = RESEARCH_SECTIONS.length;
  const percentage = Math.round((completed / total) * 100);

  const remaining = total - completed;
  const elapsed = (Date.now() - startTimeRef.current) / 1000;
  const avgPerStep = completed > 0 ? elapsed / completed : 15;
  const estimatedMinutes = Math.max(1, Math.ceil((remaining * avgPerStep) / 60));

  const getStatus = (key: string): SectionStatus => {
    if (completedSteps.includes(key)) return 'completed';
    if (key === currentStep) return 'generating';
    return 'pending';
  };

  return (
    <div className="w-full rounded-xl border border-purple-500/30 bg-card/95 backdrop-blur-sm p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">
              Generando Investigación de Mercado
            </h3>
            {currentStep && (
              <p className="text-xs text-muted-foreground">
                {RESEARCH_SECTIONS.find(s => s.key === currentStep)?.label}...
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-purple-400">
            {percentage}%
          </span>
          {remaining > 0 && (
            <p className="text-muted-foreground text-[10px] flex items-center gap-1 justify-end">
              <Clock className="h-3 w-3" />
              ~{estimatedMinutes} min
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={percentage} className="h-2 mb-4" />

      {/* Sections list */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
        {RESEARCH_SECTIONS.map((section) => {
          const status = getStatus(section.key);
          return (
            <div
              key={section.key}
              className={`flex items-center justify-between py-1.5 px-2 rounded-md text-xs transition-all duration-300 ${
                status === 'generating' ? 'bg-purple-500/10 border border-purple-500/20' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {status === 'completed' && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                )}
                {status === 'generating' && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400 shrink-0" />
                )}
                {status === 'pending' && (
                  <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                )}
                <span className={`${
                  status === 'completed' ? 'text-muted-foreground' :
                  status === 'generating' ? 'font-medium' :
                  'text-muted-foreground/50'
                }`}>
                  {section.label}
                </span>
              </div>
              <span className={`text-[10px] ${
                status === 'completed' ? 'text-green-500/70' :
                status === 'generating' ? 'text-purple-400 animate-pulse' :
                'text-muted-foreground/30'
              }`}>
                {status === 'completed' && 'completado'}
                {status === 'generating' && 'generando...'}
                {status === 'pending' && 'pendiente'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-muted-foreground/50 text-[10px] text-center mt-3">
        Perplexity AI investigando en tiempo real. No cierres esta ventana.
      </p>
    </div>
  );
}
