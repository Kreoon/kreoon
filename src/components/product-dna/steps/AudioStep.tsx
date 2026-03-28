import { useState, useRef, useCallback } from 'react';
import { AudioRecorder } from '@/components/client-dna/AudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface AudioStepProps {
  audioUrl: string | null;
  onAudioComplete: (url: string, duration: number) => void;
}

export function AudioStep({ audioUrl, onAudioComplete }: AudioStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const recordingStartRef = useRef<number>(0);

  const handleAudioReady = useCallback(async (blob: Blob | null) => {
    if (!blob) return;

    setIsUploading(true);
    setUploadError(null);
    recordingStartRef.current = Date.now();

    try {
      // Generate unique filename
      const filename = `product-dna/${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;

      const { data, error } = await supabase.storage
        .from('audio-recordings')
        .upload(filename, blob, {
          contentType: 'audio/webm',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(data.path);

      // Estimate duration from blob size (rough: ~16kbps for webm audio)
      const estimatedDuration = Math.round(blob.size / 2000);

      onAudioComplete(urlData.publicUrl, estimatedDuration);
    } catch (err: any) {
      console.error('Audio upload error:', err);
      setUploadError(err.message || 'Error al subir el audio');
    } finally {
      setIsUploading(false);
    }
  }, [onAudioComplete]);

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-white/10 bg-white/5 p-6">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-400 leading-relaxed max-w-lg mx-auto">
            Graba un audio de 1-3 minutos explicando tu visión, producto y expectativas.
            KIRO analizará tu mensaje para entender mejor tus necesidades.
          </p>
        </div>

        {/* Guide questions */}
        <div className="mb-8 rounded-sm bg-white/5 border border-white/10 p-4">
          <p className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-3">
            Puntos a cubrir en tu audio
          </p>
          <ul className="space-y-2">
            {AUDIO_GUIDE_POINTS.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                <span className="text-purple-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Recorder or success state */}
        {audioUrl && !isUploading ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30
                            flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-sm text-green-400 font-medium">Audio guardado correctamente</p>
            <p className="text-xs text-gray-500">Puedes continuar al siguiente paso o volver a grabar</p>
          </div>
        ) : isUploading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-sm text-gray-400">Subiendo audio...</p>
          </div>
        ) : (
          <AudioRecorder onAudioReady={handleAudioReady} />
        )}

        {uploadError && (
          <p className="mt-4 text-center text-sm text-red-400">{uploadError}</p>
        )}
      </div>
    </div>
  );
}

const AUDIO_GUIDE_POINTS = [
  '¿Qué vendes y qué lo hace único?',
  '¿Quién es tu cliente ideal?',
  '¿Qué problema resuelve tu producto/servicio?',
  '¿Qué resultado obtiene tu cliente?',
  '¿Quiénes son tus competidores y qué hacen bien/mal?',
  '¿Dónde publicas contenido actualmente?',
  '¿Qué tipo de contenido te funciona mejor?',
];
