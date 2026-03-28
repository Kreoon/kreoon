import { useState, useRef, useCallback } from 'react';
import { Dna, ChevronRight, Loader2, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { LocationSelector } from './LocationSelector';
import { DNA_QUESTIONS } from '@/lib/dna-questions';
import type { AudienceLocation } from '@/lib/locations-data';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAIAnalytics } from '@/analytics';

interface ClientDNAWizardProps {
  clientId: string;
  onComplete: () => void;
}

type ProcessingStep = 'idle' | 'transcribing' | 'generating' | 'complete' | 'error';

// Background transcription result cached between audio ready → submit
interface TranscriptionResult {
  transcription: string;
  emotional_analysis: Record<string, unknown>;
}

// Extract actual error message from Supabase FunctionsHttpError or data (async)
async function extractErrorMessage(data: unknown, fnError: unknown, fallback: string): Promise<string> {
  // Try data.error first (when SDK passes response body in data)
  if (data && typeof data === 'object' && 'error' in data) {
    const msg = (data as Record<string, unknown>).error;
    if (typeof msg === 'string' && msg) return msg;
  }
  // Try fnError.context — FunctionsHttpError stores the Response object there
  if (fnError && typeof fnError === 'object' && 'context' in fnError) {
    try {
      const ctx = (fnError as { context: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error && typeof body.error === 'string') return body.error;
      }
    } catch { /* response already consumed or not JSON */ }
  }
  // Try fnError.message
  if (fnError instanceof Error && fnError.message) return fnError.message;
  return fallback;
}

// Invoke edge function with up to 2 retries on transient errors
async function invokeWithRetry<T>(
  fnName: string,
  options: { body: unknown },
): Promise<T> {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { data, error: fnError } = await supabase.functions.invoke(fnName, options);

    if (!fnError && data?.success) return data as T;

    const errMsg = await extractErrorMessage(data, fnError, `Error en ${fnName}`);

    // Retry on 429, rate limit, 5xx, or generic "non-2xx"
    const isRetryable = errMsg.includes('429') || errMsg.includes('rate')
      || errMsg.includes('500') || errMsg.includes('non-2xx');
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

export function ClientDNAWizard({ clientId, onComplete }: ClientDNAWizardProps) {
  const { trackDNAWizardStarted, trackDNAWizardCompleted, trackDNAAnalysisGenerated } = useAIAnalytics();
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<AudienceLocation[]>([]);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [error, setError] = useState<string | null>(null);

  // Background transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionReady, setTranscriptionReady] = useState(false);
  const transcriptionRef = useRef<TranscriptionResult | null>(null);
  const transcriptionPromiseRef = useRef<Promise<TranscriptionResult> | null>(null);

  // Start background transcription as soon as audio is ready
  const handleAudioReady = useCallback((blob: Blob | null) => {
    setAudioBlob(blob);

    // Reset transcription state if audio was cleared
    if (!blob) {
      transcriptionRef.current = null;
      transcriptionPromiseRef.current = null;
      setIsTranscribing(false);
      setTranscriptionReady(false);
      return;
    }

    // Kick off background transcription
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
        // Don't set error state here - will surface when user clicks submit
      });
  }, []);

  const canSubmit = audioBlob && selectedLocations.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const startTime = Date.now();
    trackDNAWizardStarted('audio');

    try {
      setError(null);

      // Step 1: Wait for transcription (may already be done in background)
      setProcessingStep('transcribing');

      let result: TranscriptionResult;

      if (transcriptionRef.current) {
        // Already completed in background
        result = transcriptionRef.current;
      } else if (transcriptionPromiseRef.current) {
        // Still running in background - wait for it
        result = await transcriptionPromiseRef.current;
      } else {
        // Shouldn't happen, but start fresh if needed
        const formData = new FormData();
        formData.append('audio', audioBlob);

        const data = await invokeWithRetry<{
          success: boolean;
          transcription: string;
          emotional_analysis: Record<string, unknown>;
        }>('transcribe-audio-gemini', { body: formData });

        result = {
          transcription: data.transcription,
          emotional_analysis: data.emotional_analysis || {},
        };
      }

      // Step 2: Generate DNA with Perplexity
      setProcessingStep('generating');
      await invokeWithRetry('generate-client-dna', {
        body: {
          client_id: clientId,
          transcription: result.transcription,
          emotional_analysis: result.emotional_analysis,
          locations: selectedLocations
        }
      });

      setProcessingStep('complete');
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      trackDNAAnalysisGenerated(clientId, 'client_dna', true, elapsed);
      trackDNAWizardCompleted(clientId, ['transcription', 'dna_generation']);
      toast.success('ADN del negocio generado exitosamente');

      setTimeout(() => {
        onComplete();
      }, 1500);

    } catch (err) {
      console.error('Error:', err);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      trackDNAAnalysisGenerated(clientId, 'client_dna', false, elapsed);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setProcessingStep('error');
      toast.error('Error al procesar el ADN');
    }
  };

  // Full-screen processing state
  if (processingStep !== 'idle' && processingStep !== 'error') {
    return (
      <div className="rounded-lg bg-white dark:bg-[#14141f] border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none p-4 sm:p-8">
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-6 sm:space-y-8">
          {/* Icono */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            {processingStep === 'complete' ? (
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            ) : (
              <Dna className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-pulse" />
            )}
          </div>

          {/* Steps */}
          <div className="space-y-3 sm:space-y-4 w-full max-w-sm px-4">
            <ProcessingStepItem
              label="Transcribiendo audio con Gemini"
              status={processingStep === 'transcribing' ? 'active' : ['generating', 'complete'].includes(processingStep) ? 'done' : 'pending'}
            />
            <ProcessingStepItem
              label="Analizando emociones y contexto"
              status={processingStep === 'transcribing' ? 'active' : ['generating', 'complete'].includes(processingStep) ? 'done' : 'pending'}
            />
            <ProcessingStepItem
              label="Generando ADN estratégico con IA"
              status={processingStep === 'generating' ? 'active' : processingStep === 'complete' ? 'done' : 'pending'}
            />
          </div>

          {processingStep === 'complete' && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">¡ADN generado exitosamente!</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Determine button state
  const buttonTranscribing = isTranscribing && !transcriptionReady;
  const buttonReady = canSubmit && transcriptionReady;
  const buttonWaiting = canSubmit && !transcriptionReady && !isTranscribing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
          <Dna className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">Configura el ADN de tu Negocio</h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Responde las preguntas en un solo audio</p>
        </div>
      </div>

      {/* Grid: Preguntas + Audio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Panel Izquierdo: Preguntas */}
        <div className="rounded-lg bg-white dark:bg-[#14141f] border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <span className="text-base sm:text-lg">💬</span>
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Preguntas</h3>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {DNA_QUESTIONS.map((q) => (
              <div
                key={q.id}
                className="flex gap-2 sm:gap-2.5 group"
              >
                <span className="shrink-0 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-500/20
                                 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-[10px] font-bold text-purple-600 dark:text-purple-300">
                  {q.id}
                </span>
                <p className="text-[11px] sm:text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                  {q.question}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Panel Derecho: Audio */}
        <div className="rounded-lg bg-white dark:bg-[#14141f] border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <span className="text-base sm:text-lg">🎤</span>
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Graba tu audio</h3>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-xs mb-6 sm:mb-10">
              Responde todas las preguntas en un solo audio. Entre más detalles, mejor será tu ADN.
            </p>

            <div className="py-4 sm:py-6">
              <AudioRecorder
                onAudioReady={handleAudioReady}
                disabled={processingStep !== 'idle'}
              />
            </div>

            <p className="text-[10px] sm:text-[11px] text-zinc-500 text-center mt-4 sm:mt-6">
              Intenta resumir tus respuestas en máximo 5 minutos de audio.
            </p>
          </div>
        </div>
      </div>

      {/* Panel Ubicaciones */}
      <div className="rounded-lg bg-white dark:bg-[#14141f] border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
            <span className="text-base sm:text-lg">📍</span>
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            ¿Dónde está tu audiencia?
          </h3>
        </div>

        <LocationSelector
          selectedLocations={selectedLocations}
          onChange={setSelectedLocations}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || buttonTranscribing}
        className={`w-full h-12 sm:h-14 rounded-lg font-semibold text-white transition-colors duration-150
          ${buttonTranscribing
            ? 'bg-purple-500'
            : canSubmit
              ? 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700'
              : 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed'
          } disabled:opacity-70`}
      >
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {buttonTranscribing ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
              <span className="text-sm sm:text-base">Transcribiendo...</span>
            </>
          ) : (
            <>
              <Sparkles className={`w-4 h-4 sm:w-5 sm:h-5 ${canSubmit ? 'text-white' : 'text-zinc-500'}`} />
              <span className={`text-sm sm:text-base ${canSubmit ? 'text-white' : 'text-zinc-500'}`}>
                Generar ADN de mi Negocio
              </span>
              <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 ${canSubmit ? 'text-white' : 'text-zinc-500'} hidden sm:block`} />
            </>
          )}
        </div>
      </button>
    </div>
  );
}

function ProcessingStepItem({ label, status }: { label: string; status: 'pending' | 'active' | 'done' }) {
  return (
    <div className="flex items-center gap-3">
      {status === 'done' && (
        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
      )}
      {status === 'active' && (
        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
        </div>
      )}
      {status === 'pending' && (
        <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <Circle className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
        </div>
      )}
      <span className={`text-sm font-medium ${
        status === 'done' ? 'text-green-600 dark:text-green-400' :
        status === 'active' ? 'text-zinc-900 dark:text-white' :
        'text-zinc-500'
      }`}>
        {label}
      </span>
    </div>
  );
}
