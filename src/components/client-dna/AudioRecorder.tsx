import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Pause, Play, Trash2, Upload, CheckCircle2 } from 'lucide-react';

interface AudioRecorderProps {
  onAudioReady: (blob: Blob | null) => void;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'ready';

export function AudioRecorder({ onAudioReady, disabled }: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatear tiempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Iniciar grabación
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onAudioReady(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setState('recording');

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  // Pausar/Reanudar
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setState('paused');
    } else if (state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setState('recording');
    }
  };

  // Detener
  const stopRecording = () => {
    if (mediaRecorderRef.current && state !== 'idle') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setState('ready');
    }
  };

  // Resetear
  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
    setState('idle');
    onAudioReady(null);
  };

  // Subir archivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      onAudioReady(file);
      setState('ready');
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // ═══════════════════════════════════════════════════════════════
  // ESTADO: IDLE - Botón KIRO para grabar
  // ═══════════════════════════════════════════════════════════════
  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center gap-4 sm:gap-6">
        {/* Botón Principal KIRO */}
        <button
          onClick={startRecording}
          disabled={disabled}
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500
                     flex flex-col items-center justify-center gap-1
                     transition-colors duration-150 hover:brightness-110 hover:shadow-lg disabled:opacity-50"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-medium text-white/80 uppercase tracking-wider">
            Grabar
          </span>
        </button>

        {/* Texto y botón subir */}
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <p className="text-[10px] sm:text-xs text-zinc-500">o</p>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg
                       bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                       text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700
                       active:bg-zinc-300 dark:active:bg-zinc-600 transition-colors duration-150"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Subir archivo de audio
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ESTADO: RECORDING / PAUSED - KIRO escuchando
  // ═══════════════════════════════════════════════════════════════
  if (state === 'recording' || state === 'paused') {
    return (
      <div className="flex flex-col items-center gap-4 sm:gap-6">
        {/* Círculo principal */}
        <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${
          state === 'recording'
            ? 'bg-gradient-to-br from-red-500 via-pink-500 to-purple-500'
            : 'bg-gradient-to-br from-yellow-500 via-orange-500 to-pink-500'
        }`}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/20">
            {state === 'recording' ? (
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white animate-pulse" />
            ) : (
              <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            )}
          </div>

          {/* Timer */}
          <span className="text-xs sm:text-sm font-mono font-bold text-white">
            {formatTime(recordingTime)}
          </span>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pause/Resume */}
          <button
            onClick={togglePause}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                       flex items-center justify-center
                       hover:bg-zinc-200 dark:hover:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600 transition-colors duration-150"
          >
            {state === 'recording' ? (
              <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700 dark:text-white" />
            ) : (
              <Play className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700 dark:text-white ml-0.5" />
            )}
          </button>

          {/* Stop */}
          <button
            onClick={stopRecording}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700
                       flex items-center justify-center
                       transition-colors duration-150"
          >
            <Square className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
          </button>

          {/* Cancel */}
          <button
            onClick={reset}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                       flex items-center justify-center
                       hover:bg-red-100 dark:hover:bg-red-500/20 hover:border-red-200 dark:hover:border-red-500/30
                       active:bg-red-200 dark:active:bg-red-500/30 transition-colors duration-150"
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 hover:text-red-500 dark:hover:text-red-400" />
          </button>
        </div>

        <p className="text-[10px] sm:text-xs text-zinc-500">
          {state === 'recording' ? 'KIRO está escuchando...' : 'Grabación pausada'}
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ESTADO: READY - Audio listo
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
      {/* Indicador de éxito */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-400
                      flex items-center justify-center">
        <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
      </div>

      {/* Reproductor de audio */}
      {audioUrl && (
        <div className="w-full max-w-[280px] sm:max-w-xs">
          <audio
            src={audioUrl}
            controls
            className="w-full h-9 sm:h-10 rounded-lg"
          />
        </div>
      )}

      {/* Info y botón eliminar */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
        <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          Duración: {formatTime(recordingTime)}
        </span>

        <button
          onClick={reset}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg
                     bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20
                     text-xs sm:text-sm text-red-600 dark:text-red-400
                     hover:bg-red-100 dark:hover:bg-red-500/20 active:bg-red-200 dark:active:bg-red-500/30
                     transition-colors duration-150"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Eliminar
        </button>
      </div>
    </div>
  );
}
