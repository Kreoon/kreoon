import { useState, useCallback } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AudioRecorder } from '@/components/client-dna/AudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { PROJECT_DNA_QUESTIONS } from '@/config/project-dna-questions';
import {
  ChevronDown, Mic, Loader2, CheckCircle2, RotateCcw, Dna,
  Sparkles, Target, Users, Lightbulb, ListOrdered, BarChart3,
  AlertTriangle, Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectType } from '@/types/unifiedProject.types';

// ============================================================
// TYPES
// ============================================================

export interface ProjectDNAAnalysis {
  project_summary: string;
  target_audience: string;
  key_objectives: string[];
  recommended_approach: string;
  action_plan: Array<{ step: number; action: string; why: string }>;
  success_metrics: string[];
  risks_and_considerations: string[];
  estimated_complexity: string;
  complexity_justification: string;
  generated_at?: string;
  ai_provider?: string;
  ai_model?: string;
}

export interface DNAData {
  responses: Record<string, string>;
  audio_url: string | null;
  audio_duration: number | null;
  ai_analysis?: ProjectDNAAnalysis | null;
}

interface ProjectDNASectionProps {
  projectType: ProjectType;
  projectId?: string;
  dnaData: DNAData;
  onUpdate: (dna: DNAData) => void;
  editing: boolean;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ProjectDNASection({ projectType, projectId, dnaData, onUpdate, editing }: ProjectDNASectionProps) {
  const config = PROJECT_DNA_QUESTIONS[projectType];
  if (!config) return null;

  const hasResponses = Object.values(dnaData.responses).some(v => v?.trim());
  const hasAudio = !!dnaData.audio_url;
  const isComplete = hasResponses || hasAudio;

  const [isOpen, setIsOpen] = useState(!isComplete);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const updateResponse = (key: string, value: string) => {
    onUpdate({
      ...dnaData,
      responses: { ...dnaData.responses, [key]: value },
    });
  };

  const handleAudioComplete = (url: string, duration: number) => {
    onUpdate({
      ...dnaData,
      audio_url: url,
      audio_duration: duration,
    });
  };

  const handleAnalyze = async () => {
    if (!projectId) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-project-dna', {
        body: { project_id: projectId },
      });

      if (error) throw error;

      if (data?.analysis) {
        onUpdate({ ...dnaData, ai_analysis: data.analysis });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('[ProjectDNA] AI analysis error:', err);
      const msg = err?.message || 'Error al analizar el proyecto';
      setAnalyzeError(
        msg.includes('insufficient_tokens')
          ? 'No tienes tokens suficientes para este analisis.'
          : msg
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="rounded-xl border bg-card">
          {/* Header */}
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:bg-accent/50 rounded-xl transition-colors">
            <div className="flex items-center gap-2">
              <Dna className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">ADN del Proyecto</span>
              {isComplete && (
                <span className="flex h-2 w-2 rounded-full bg-green-500" />
              )}
              {dnaData.ai_analysis && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 text-purple-600 border-purple-300">
                  <Sparkles className="h-2.5 w-2.5" />
                  IA
                </Badge>
              )}
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180',
            )} />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-6">
              {/* Written questions */}
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Responde estas preguntas clave para definir el proyecto.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.writtenQuestions.map(q => {
                    const isFullWidth = q.type === 'textarea';
                    return (
                      <div key={q.key} className={isFullWidth ? 'md:col-span-2' : ''}>
                        <label className="text-sm font-medium text-muted-foreground">
                          {q.label}
                          {q.required && <span className="text-destructive ml-0.5">*</span>}
                        </label>
                        {editing ? (
                          <div className="mt-1">
                            {q.type === 'textarea' ? (
                              <Textarea
                                value={dnaData.responses[q.key] || ''}
                                onChange={e => updateResponse(q.key, e.target.value)}
                                placeholder={q.placeholder}
                                rows={3}
                              />
                            ) : (
                              <Input
                                value={dnaData.responses[q.key] || ''}
                                onChange={e => updateResponse(q.key, e.target.value)}
                                placeholder={q.placeholder}
                              />
                            )}
                          </div>
                        ) : (
                          <p className="mt-1 text-sm">
                            {dnaData.responses[q.key] || <span className="text-muted-foreground">-</span>}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Audio section */}
              <AudioDNASection
                config={config}
                audioUrl={dnaData.audio_url}
                onAudioComplete={handleAudioComplete}
                editing={editing}
              />

              {/* AI Analysis Button */}
              {isComplete && projectId && editing && (
                <div className="pt-2">
                  {isAnalyzing ? (
                    <div className="rounded-xl border bg-muted/50 p-6 text-center space-y-3">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                      <p className="text-sm font-medium">Analizando proyecto...</p>
                      <p className="text-xs text-muted-foreground">
                        {hasAudio
                          ? 'Transcribiendo audio y generando analisis estrategico...'
                          : 'Generando analisis estrategico...'}
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleAnalyze}
                      variant="outline"
                      className="gap-2 w-full border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950/30"
                    >
                      <Sparkles className="h-4 w-4" />
                      {dnaData.ai_analysis ? 'Re-analizar con IA' : 'Analizar con IA'}
                    </Button>
                  )}

                  {analyzeError && (
                    <p className="text-sm text-destructive text-center mt-2">{analyzeError}</p>
                  )}
                </div>
              )}

              {/* AI Analysis Button (read-only mode, for triggering if no analysis yet) */}
              {isComplete && projectId && !editing && !dnaData.ai_analysis && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Activa el modo edicion para analizar con IA.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* AI Analysis Results (outside collapsible for visibility) */}
      {dnaData.ai_analysis && (
        <AIAnalysisDisplay analysis={dnaData.ai_analysis} />
      )}
    </div>
  );
}

// ============================================================
// AI ANALYSIS DISPLAY
// ============================================================

function AIAnalysisDisplay({ analysis }: { analysis: ProjectDNAAnalysis }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const complexityColor = analysis.estimated_complexity === 'Baja'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : analysis.estimated_complexity === 'Media'
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="rounded-xl border bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:bg-accent/30 rounded-xl transition-colors">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span className="font-semibold text-sm">Analisis Estrategico</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-purple-600 border-purple-300">IA</Badge>
          </div>
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isExpanded && 'rotate-180',
          )} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-5">
            {/* 1. Project Summary */}
            <AnalysisSection icon={Target} title="Resumen del Proyecto">
              <p className="text-sm">{analysis.project_summary}</p>
            </AnalysisSection>

            {/* 2. Target Audience */}
            <AnalysisSection icon={Users} title="Audiencia Objetivo">
              <p className="text-sm">{analysis.target_audience}</p>
            </AnalysisSection>

            {/* 3. Key Objectives */}
            {analysis.key_objectives?.length > 0 && (
              <AnalysisSection icon={CheckCircle2} title="Objetivos Clave">
                <ul className="space-y-1.5">
                  {analysis.key_objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </AnalysisSection>
            )}

            {/* 4. Recommended Approach */}
            <AnalysisSection icon={Lightbulb} title="Enfoque Recomendado">
              <p className="text-sm">{analysis.recommended_approach}</p>
            </AnalysisSection>

            {/* 5. Action Plan */}
            {analysis.action_plan?.length > 0 && (
              <AnalysisSection icon={ListOrdered} title="Plan de Inicio">
                <div className="space-y-2.5">
                  {analysis.action_plan.map((item) => (
                    <div key={item.step} className="flex gap-3 p-3 bg-background/80 rounded-lg border">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {item.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.why}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AnalysisSection>
            )}

            {/* 6. Success Metrics */}
            {analysis.success_metrics?.length > 0 && (
              <AnalysisSection icon={BarChart3} title="Metricas de Exito">
                <ul className="space-y-1">
                  {analysis.success_metrics.map((metric, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary mt-0.5">&#8226;</span>
                      {metric}
                    </li>
                  ))}
                </ul>
              </AnalysisSection>
            )}

            {/* 7. Risks */}
            {analysis.risks_and_considerations?.length > 0 && (
              <AnalysisSection icon={AlertTriangle} title="Consideraciones y Riesgos">
                <ul className="space-y-1.5">
                  {analysis.risks_and_considerations.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </AnalysisSection>
            )}

            {/* 8. Complexity */}
            <AnalysisSection icon={Gauge} title="Complejidad Estimada">
              <div className="flex items-center gap-3">
                <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', complexityColor)}>
                  {analysis.estimated_complexity}
                </span>
                <p className="text-sm text-muted-foreground">{analysis.complexity_justification}</p>
              </div>
            </AnalysisSection>

            {/* Footer */}
            {analysis.generated_at && (
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t">
                <span>Generado: {new Date(analysis.generated_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                {analysis.ai_model && <span className="font-mono">{analysis.ai_model}</span>}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function AnalysisSection({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-medium text-sm text-purple-700 dark:text-purple-400">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

// ============================================================
// AUDIO SUB-SECTION
// ============================================================

function AudioDNASection({
  config,
  audioUrl,
  onAudioComplete,
  editing,
}: {
  config: (typeof PROJECT_DNA_QUESTIONS)[ProjectType];
  audioUrl: string | null;
  onAudioComplete: (url: string, duration: number) => void;
  editing: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showReRecord, setShowReRecord] = useState(false);

  const handleAudioReady = useCallback(async (blob: Blob | null) => {
    if (!blob) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const filename = `project-dna/${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;
      const { data, error } = await supabase.storage
        .from('audio-recordings')
        .upload(filename, blob, { contentType: 'audio/webm', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(data.path);

      const estimatedDuration = Math.round(blob.size / 2000);
      onAudioComplete(urlData.publicUrl, estimatedDuration);
      setShowReRecord(false);
    } catch (err: any) {
      console.error('[ProjectDNA] Audio upload error:', err);
      setUploadError(err.message || 'Error al subir el audio');
    } finally {
      setIsUploading(false);
    }
  }, [onAudioComplete]);

  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Cuentanos tu vision</span>
      </div>

      <p className="text-xs text-muted-foreground">
        {config.audioDescription}
      </p>

      {/* Guide points */}
      <div className="rounded-lg bg-background/50 border p-3">
        <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">
          Puntos a cubrir en tu audio
        </p>
        <ul className="space-y-1.5">
          {config.audioGuidePoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary font-mono text-xs mt-0.5">{i + 1}.</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Recorder / Player */}
      {audioUrl && !showReRecord && !isUploading ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <audio controls src={audioUrl} className="flex-1 h-8" />
          </div>
          {editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReRecord(true)}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Re-grabar
            </Button>
          )}
        </div>
      ) : isUploading ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Subiendo audio...</p>
        </div>
      ) : editing ? (
        <div>
          <AudioRecorder onAudioReady={handleAudioReady} />
          {showReRecord && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReRecord(false)}
              className="mt-2 text-xs"
            >
              Cancelar re-grabacion
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No se ha grabado audio para este proyecto.
        </p>
      )}

      {uploadError && (
        <p className="text-sm text-destructive text-center">{uploadError}</p>
      )}
    </div>
  );
}
