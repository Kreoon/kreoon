import { useRef, useState } from 'react';
import * as tus from 'tus-js-client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BunnyVideoUploaderProps {
  lessonId: string;
  onUploaded: (videoId: string) => void;
}

// Sube el archivo directo del navegador a Bunny Stream via TUS (resumable),
// sin pasar los bytes por nuestro servidor. academy-video-upload-init crea
// el objeto de video en Bunny y firma las credenciales de la sesion TUS.
export function BunnyVideoUploader({ lessonId, onUploaded }: BunnyVideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setProgress(0);
    setError(null);
    setDone(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('academy-video-upload-init', {
        body: { lesson_id: lessonId, title: file.name },
      });

      if (fnError || !data?.videoId) {
        throw new Error(fnError?.message || 'No se pudo iniciar el upload en Bunny');
      }

      const upload = new tus.Upload(file, {
        endpoint: data.tusEndpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
        headers: {
          AuthorizationSignature: data.signature,
          AuthorizationExpire: String(data.expirationTime),
          VideoId: data.videoId,
          LibraryId: String(data.libraryId),
        },
        metadata: { filetype: file.type, title: file.name },
        onError: (err) => {
          setError(err.message || 'Error subiendo el video');
          setUploading(false);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        },
        onSuccess: () => {
          setUploading(false);
          setDone(true);
          onUploaded(data.videoId);
        },
      });

      const previousUploads = await upload.findPreviousUploads();
      if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error subiendo el video');
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-white/10 gap-2"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? `Subiendo... ${progress}%` : 'Subir video a Bunny'}
      </Button>

      {done && (
        <p className="text-xs text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Video subido, procesando en Bunny (puede tardar unos minutos en estar listo para reproducir).
        </p>
      )}
      {error && (
        <p className="text-xs text-rose-400 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}
