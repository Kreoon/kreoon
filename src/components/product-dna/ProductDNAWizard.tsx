import { useState, useRef, useCallback } from 'react';
import { Dna, ChevronRight, Loader2, CheckCircle2, Circle, Sparkles, Check } from 'lucide-react';
import { AudioRecorder } from '@/components/client-dna/AudioRecorder';
import {
  PRODUCT_DNA_QUESTIONS,
  SERVICE_TYPE_OPTIONS,
  GOAL_OPTIONS,
  PLATFORM_OPTIONS,
  AUDIENCE_OPTIONS,
  COUNTRY_OPTIONS,
} from '@/lib/product-dna-questions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAIAnalytics } from '@/analytics';
import { cn } from '@/lib/utils';

interface ProductDNAWizardProps {
  clientId: string;
  onComplete: (productDnaId: string) => void;
  onCancel?: () => void;
}

type ProcessingStep = 'idle' | 'uploading' | 'transcribing' | 'generating' | 'complete' | 'error';

interface TranscriptionResult {
  transcription: string;
  emotional_analysis: Record<string, unknown>;
}

// Extract actual error message from Supabase FunctionsHttpError
async function extractErrorMessage(data: unknown, fnError: unknown, fallback: string): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data) {
    const msg = (data as Record<string, unknown>).error;
    if (typeof msg === 'string' && msg) return msg;
  }
  if (fnError && typeof fnError === 'object' && 'context' in fnError) {
    try {
      const ctx = (fnError as { context: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error && typeof body.error === 'string') return body.error;
      }
    } catch { /* response already consumed or not JSON */ }
  }
  if (fnError instanceof Error && fnError.message) return fnError.message;
  return fallback;
}

// Invoke edge function with retries
async function invokeWithRetry<T>(fnName: string, options: { body: unknown }): Promise<T> {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { data, error: fnError } = await supabase.functions.invoke(fnName, options);
    if (!fnError && data?.success) return data as T;

    const errMsg = await extractErrorMessage(data, fnError, `Error en ${fnName}`);
    const isRetryable = errMsg.includes('429') || errMsg.includes('rate') || errMsg.includes('500') || errMsg.includes('non-2xx');

    if (attempt < MAX_ATTEMPTS - 1 && isRetryable) {
      const delay = errMsg.includes('429') ? 8000 + attempt * 5000 : 3000;
      console.warn(`[${fnName}] Attempt ${attempt + 1}/${MAX_ATTEMPTS} failed, retrying in ${delay / 1000}s: ${errMsg}`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    throw new Error(errMsg);
  }
  throw new Error(`Error en ${fnName}`);
}

export function ProductDNAWizard({ clientId, onComplete, onCancel }: ProductDNAWizardProps) {
  const { trackDNAWizardStarted, trackDNAWizardCompleted, trackDNAAnalysisGenerated } = useAIAnalytics();

  // Audio state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionReady, setTranscriptionReady] = useState(false);
  const transcriptionRef = useRef<TranscriptionResult | null>(null);
  const transcriptionPromiseRef = useRef<Promise<TranscriptionResult> | null>(null);

  // Selection state (all multi-select, max 3 each)
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [audiences, setAudiences] = useState<string[]>([]);
  const [targetCountry, setTargetCountry] = useState<string>('latam');

  // Processing state
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [error, setError] = useState<string | null>(null);

  // Handle audio ready - start background transcription
  const handleAudioReady = useCallback((blob: Blob | null) => {
    setAudioBlob(blob);

    if (!blob) {
      transcriptionRef.current = null;
      transcriptionPromiseRef.current = null;
      setIsTranscribing(false);
      setTranscriptionReady(false);
      return;
    }

    setIsTranscribing(true);
    setTranscriptionReady(false);
    transcriptionRef.current = null;

    const promise = (async (): Promise<TranscriptionResult> => {
      const formData = new FormData();
      formData.append('audio', blob);

      const data = await invokeWithRetry<{
        success: boolean;
        transcription: string;
        emotional_analysis: Record<string, unknown>;
      }>('transcribe-audio-gemini', { body: formData });

      return {
        transcription: data.transcription,
        emotional_analysis: data.emotional_analysis || {},
      };
    })();

    transcriptionPromiseRef.current = promise;

    promise
      .then((result) => {
        transcriptionRef.current = result;
        setTranscriptionReady(true);
        setIsTranscribing(false);
      })
      .catch((err) => {
        console.error('Background transcription failed:', err);
        setIsTranscribing(false);
      });
  }, []);

  // Toggle selection helpers (all max 3)
  const toggleSelection = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    id: string,
    current: string[]
  ) => {
    setter(
      current.includes(id)
        ? current.filter(x => x !== id)
        : current.length < 3 ? [...current, id] : current
    );
  };

  // Validation
  const canSubmit = audioBlob && serviceTypes.length > 0 && goals.length > 0 && platforms.length > 0;

  // Submit handler
  const handleSubmit = async () => {
    if (!canSubmit) return;
    const startTime = Date.now();
    trackDNAWizardStarted('audio');

    try {
      setError(null);

      // Step 1: Upload audio to storage
      setProcessingStep('uploading');
      const filename = `product-dna/${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(filename, audioBlob, { contentType: 'audio/webm', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(uploadData.path);

      const audioUrl = urlData.publicUrl;
      const estimatedDuration = Math.round(audioBlob.size / 2000);

      // Step 2: Wait for transcription
      setProcessingStep('transcribing');

      let transcriptionResult: TranscriptionResult;

      if (transcriptionRef.current) {
        transcriptionResult = transcriptionRef.current;
      } else if (transcriptionPromiseRef.current) {
        transcriptionResult = await transcriptionPromiseRef.current;
      } else {
        // Fallback: start transcription now
        const formData = new FormData();
        formData.append('audio', audioBlob);

        const data = await invokeWithRetry<{
          success: boolean;
          transcription: string;
          emotional_analysis: Record<string, unknown>;
        }>('transcribe-audio-gemini', { body: formData });

        transcriptionResult = {
          transcription: data.transcription,
          emotional_analysis: data.emotional_analysis || {},
        };
      }

      // Step 3: Create product DNA record
      setProcessingStep('generating');

      const wizardResponses = {
        service_types: serviceTypes,
        goals,
        platforms,
        audiences,
        target_country: targetCountry,
        transcription: transcriptionResult.transcription,
        emotional_analysis: transcriptionResult.emotional_analysis,
      };

      // product_dna table not yet in generated types — cast to any
      const { data: productDna, error: createError } = await (supabase as any)
        .from('product_dna')
        .insert({
          client_id: clientId,
          service_group: 'content_creation',
          service_types: serviceTypes,
          audio_url: audioUrl,
          audio_duration_seconds: estimatedDuration,
          wizard_responses: wizardResponses,
          status: 'analyzing',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Step 4: Generate DNA
      const { error: analyzeError } = await supabase.functions.invoke('generate-product-dna', {
        body: { productDnaId: productDna.id },
      });

      if (analyzeError) throw analyzeError;

      setProcessingStep('complete');
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      trackDNAAnalysisGenerated(productDna.id, 'product_dna', true, elapsed);
      trackDNAWizardCompleted(productDna.id, ['audio', 'selections']);
      toast.success('¡Product DNA generado exitosamente!');

      setTimeout(() => {
        onComplete(productDna.id);
      }, 1500);

    } catch (err) {
      console.error('Error:', err);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      trackDNAAnalysisGenerated(clientId, 'product_dna', false, elapsed);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setProcessingStep('error');
      toast.error('Error al procesar el Product DNA');
    }
  };

  // Full-screen processing state
  if (processingStep !== 'idle' && processingStep !== 'error') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-pink-600/10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative flex flex-col items-center justify-center py-12 space-y-8">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              {processingStep === 'complete' ? (
                <CheckCircle2 className="w-10 h-10 text-white" />
              ) : (
                <Dna className="w-10 h-10 text-white animate-pulse" />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <ProcessingStepItem
              label="Subiendo audio"
              status={processingStep === 'uploading' ? 'active' : ['transcribing', 'generating', 'complete'].includes(processingStep) ? 'done' : 'pending'}
            />
            <ProcessingStepItem
              label="Transcribiendo con Gemini"
              status={processingStep === 'transcribing' ? 'active' : ['generating', 'complete'].includes(processingStep) ? 'done' : 'pending'}
            />
            <ProcessingStepItem
              label="Generando Product DNA con IA"
              status={processingStep === 'generating' ? 'active' : processingStep === 'complete' ? 'done' : 'pending'}
            />
          </div>

          {processingStep === 'complete' && (
            <div className="flex items-center gap-2 text-green-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">¡Product DNA generado!</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const buttonTranscribing = isTranscribing && !transcriptionReady;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/30 rounded-xl blur-lg" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Dna className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Product DNA</h2>
            <p className="text-sm text-gray-400">Cuéntanos sobre tu producto en un audio</p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Grid: Preguntas + Audio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel: Questions */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-purple-500/10 to-pink-500/20" />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

          <div className="relative p-6 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="text-lg">💬</span>
              </div>
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Responde en tu audio</h3>
            </div>

            <div className="space-y-3">
              {PRODUCT_DNA_QUESTIONS.map((q) => (
                <div key={q.id} className="flex gap-2.5 group">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/10 flex items-center justify-center text-[10px] font-bold text-purple-300">
                    {q.id}
                  </span>
                  <div>
                    <p className="text-xs text-foreground/80 leading-relaxed group-hover:text-foreground transition-colors">
                      {q.question}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{q.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Audio */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 via-pink-500/10 to-purple-500/20" />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

          <div className="relative p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="text-lg">🎤</span>
              </div>
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Graba tu audio</h3>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-sm text-gray-400 text-center max-w-xs mb-8">
                Responde las preguntas en un solo audio de 2-5 minutos.
              </p>

              <div className="py-4">
                <AudioRecorder onAudioReady={handleAudioReady} disabled={processingStep !== 'idle'} />
              </div>

              {isTranscribing && (
                <div className="flex items-center gap-2 mt-4 text-purple-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Transcribiendo...</span>
                </div>
              )}
              {transcriptionReady && (
                <div className="flex items-center gap-2 mt-4 text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs">Audio listo</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selection Panels - 4 opciones, todas multi-select max 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Service Type */}
        <SelectionPanel title="¿Qué necesitas?" emoji="🎬" subtitle="Máx 3">
          <div className="flex flex-wrap gap-2">
            {SERVICE_TYPE_OPTIONS.map((opt) => (
              <ChipButton
                key={opt.id}
                label={opt.label}
                emoji={opt.emoji}
                selected={serviceTypes.includes(opt.id)}
                onClick={() => toggleSelection(setServiceTypes, opt.id, serviceTypes)}
              />
            ))}
          </div>
        </SelectionPanel>

        {/* Goal */}
        <SelectionPanel title="¿Cuál es tu objetivo?" emoji="🎯" subtitle="Máx 3">
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((opt) => (
              <ChipButton
                key={opt.id}
                label={opt.label}
                emoji={opt.emoji}
                selected={goals.includes(opt.id)}
                onClick={() => toggleSelection(setGoals, opt.id, goals)}
              />
            ))}
          </div>
        </SelectionPanel>

        {/* Platforms */}
        <SelectionPanel title="¿Dónde publicarás?" emoji="📱" subtitle="Máx 3">
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((opt) => (
              <ChipButton
                key={opt.id}
                label={opt.label}
                emoji={opt.emoji}
                selected={platforms.includes(opt.id)}
                onClick={() => toggleSelection(setPlatforms, opt.id, platforms)}
              />
            ))}
          </div>
        </SelectionPanel>

        {/* Audience */}
        <SelectionPanel title="Tu audiencia" emoji="👥" subtitle="Máx 3">
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_OPTIONS.map((opt) => (
              <ChipButton
                key={opt.id}
                label={opt.label}
                emoji={opt.emoji}
                selected={audiences.includes(opt.id)}
                onClick={() => toggleSelection(setAudiences, opt.id, audiences)}
              />
            ))}
          </div>
        </SelectionPanel>
      </div>

      {/* Country Selection - Full width single select */}
      <SelectionPanel title="¿En qué mercado vendes?" emoji="🌎" subtitle="Selecciona uno">
        <div className="flex flex-wrap gap-2">
          {COUNTRY_OPTIONS.map((opt) => (
            <ChipButton
              key={opt.id}
              label={opt.label}
              emoji={opt.emoji}
              selected={targetCountry === opt.id}
              onClick={() => setTargetCountry(opt.id)}
            />
          ))}
        </div>
      </SelectionPanel>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || buttonTranscribing}
        className="relative w-full group overflow-hidden rounded-xl"
      >
        <div className={cn(
          "absolute inset-0 transition-all duration-300",
          buttonTranscribing
            ? "bg-gradient-to-r from-purple-600/80 via-pink-500/80 to-purple-600/80 bg-[length:200%_100%] animate-[shimmerBg_2s_linear_infinite]"
            : canSubmit
              ? "bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-[length:200%_100%] group-hover:bg-right"
              : "bg-gray-700"
        )} />

        {buttonTranscribing && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmerSlide_1.5s_ease-in-out_infinite]" />
          </div>
        )}

        {canSubmit && !buttonTranscribing && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </div>
        )}

        <div className="relative flex items-center justify-center gap-3 px-6 py-4">
          {buttonTranscribing ? (
            <>
              <Loader2 className="w-5 h-5 text-white animate-spin" />
              <span className="font-semibold text-white">Transcribiendo audio...</span>
            </>
          ) : (
            <>
              <Sparkles className={cn("w-5 h-5", canSubmit ? "text-white" : "text-gray-500")} />
              <span className={cn("font-semibold", canSubmit ? "text-white" : "text-gray-500")}>
                Generar Product DNA
              </span>
              <ChevronRight className={cn(
                "w-5 h-5 transition-transform group-hover:translate-x-1",
                canSubmit ? "text-white" : "text-gray-500"
              )} />
            </>
          )}
        </div>
      </button>
    </div>
  );
}

// Selection Panel wrapper
function SelectionPanel({ title, emoji, subtitle, children }: {
  title: string;
  emoji: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 p-4">
      <div className="absolute inset-0 bg-white/5" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">{emoji}</span>
          <span className="text-xs font-medium text-white/80">{title}</span>
          {subtitle && <span className="text-[10px] text-gray-500">({subtitle})</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

// Chip button component
function ChipButton({ label, emoji, selected, onClick }: {
  label: string;
  emoji: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
        selected
          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20"
          : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
      )}
    >
      <span>{emoji}</span>
      <span>{label}</span>
      {selected && <Check className="w-3 h-3 ml-1" />}
    </button>
  );
}

// Processing step item
function ProcessingStepItem({ label, status }: { label: string; status: 'pending' | 'active' | 'done' }) {
  return (
    <div className="flex items-center gap-3">
      {status === 'done' && (
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        </div>
      )}
      {status === 'active' && (
        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
        </div>
      )}
      {status === 'pending' && (
        <div className="w-6 h-6 rounded-full bg-gray-700/50 flex items-center justify-center">
          <Circle className="w-4 h-4 text-gray-600" />
        </div>
      )}
      <span className={cn(
        "text-sm font-medium",
        status === 'done' && "text-green-400",
        status === 'active' && "text-white",
        status === 'pending' && "text-gray-500"
      )}>
        {label}
      </span>
    </div>
  );
}
