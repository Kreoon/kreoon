import { useState, useRef, useCallback } from 'react';
import { Dna, ChevronRight, Loader2, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { LocationSelector } from './LocationSelector';
import { DNA_QUESTIONS } from '@/lib/dna-questions';
import type { AudienceLocation } from '@/lib/locations-data';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      toast.success('ADN del negocio generado exitosamente');

      setTimeout(() => {
        onComplete();
      }, 1500);

    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setProcessingStep('error');
      toast.error('Error al procesar el ADN');
    }
  };

  // Full-screen processing state
  if (processingStep !== 'idle' && processingStep !== 'error') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8">
        {/* Fondo animado */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-pink-600/10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative flex flex-col items-center justify-center py-12 space-y-8">
          {/* Icono animado */}
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500
                            flex items-center justify-center">
              {processingStep === 'complete' ? (
                <CheckCircle2 className="w-10 h-10 text-white" />
              ) : (
                <Dna className="w-10 h-10 text-white animate-pulse" />
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
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
            <div className="flex items-center gap-2 text-green-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">¡ADN generado exitosamente!</span>
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
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-purple-500/30 rounded-xl blur-lg" />
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500
                          flex items-center justify-center">
            <Dna className="w-6 h-6 text-white" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Configura el ADN de tu Negocio</h2>
          <p className="text-sm text-gray-400">Responde las preguntas en un solo audio</p>
        </div>
      </div>

      {/* Grid: Preguntas + Audio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Panel Izquierdo: Preguntas */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-purple-500/10 to-pink-500/20" />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

          <div className="relative p-6 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="text-lg">💬</span>
              </div>
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Preguntas</h3>
            </div>

            <div className="space-y-3">
              {DNA_QUESTIONS.map((q) => (
                <div
                  key={q.id}
                  className="flex gap-2.5 group"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30
                                   border border-white/10 flex items-center justify-center text-[10px] font-bold text-purple-300">
                    {q.id}
                  </span>
                  <p className="text-xs text-gray-300 leading-relaxed group-hover:text-white transition-colors">
                    {q.question}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel Derecho: Audio */}
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
              <p className="text-sm text-gray-400 text-center max-w-xs mb-10">
                Responde todas las preguntas en un solo audio. Entre más detalles, mejor será tu ADN.
              </p>

              <div className="py-6">
                <AudioRecorder
                  onAudioReady={handleAudioReady}
                  disabled={processingStep !== 'idle'}
                />
              </div>

              <p className="text-[11px] text-gray-500 text-center mt-6">
                Intenta resumir tus respuestas en máximo 5 minutos de audio.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Ubicaciones */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-purple-600/20" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

        <div className="relative p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="text-lg">📍</span>
            </div>
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              ¿Dónde está tu audiencia?
            </h3>
          </div>

          <LocationSelector
            selectedLocations={selectedLocations}
            onChange={setSelectedLocations}
          />
        </div>
      </div>

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
        {/* Fondo con gradiente */}
        <div className={`absolute inset-0 transition-all duration-300 ${
          buttonTranscribing
            ? 'bg-gradient-to-r from-purple-600/80 via-pink-500/80 to-purple-600/80 bg-[length:200%_100%] animate-[shimmerBg_2s_linear_infinite]'
            : buttonReady || buttonWaiting
              ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-[length:200%_100%] group-hover:bg-right'
              : 'bg-gray-700'
        }`} />

        {/* Shimmer continuo mientras transcribe */}
        {buttonTranscribing && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                            animate-[shimmerSlide_1.5s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Brillo en hover (solo cuando no transcribe) */}
        {(buttonReady || buttonWaiting) && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                            translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
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
              <Sparkles className={`w-5 h-5 ${canSubmit ? 'text-white' : 'text-gray-500'}`} />
              <span className={`font-semibold ${canSubmit ? 'text-white' : 'text-gray-500'}`}>
                {transcriptionReady ? 'Generar ADN de mi Negocio' : 'Generar ADN de mi Negocio'}
              </span>
              <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                canSubmit ? 'text-white' : 'text-gray-500'
              }`} />
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
      <span className={`text-sm font-medium ${
        status === 'done' ? 'text-green-400' :
        status === 'active' ? 'text-white' :
        'text-gray-500'
      }`}>
        {label}
      </span>
    </div>
  );
}
