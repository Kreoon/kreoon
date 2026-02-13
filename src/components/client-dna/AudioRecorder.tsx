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
      <div className="flex flex-col items-center gap-6">
        {/* Botón Principal KIRO */}
        <div className="relative">
          {/* Anillos externos animados (decorativos, no clickeables) */}
          <div className="absolute inset-0 -m-4 pointer-events-none">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20
                            animate-ping [animation-duration:3s]" />
          </div>
          <div className="absolute inset-0 -m-2 pointer-events-none">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10
                            animate-pulse" />
          </div>

          {/* Partículas decorativas (no clickeables) */}
          <div className="absolute -top-2 -right-2 w-2 h-2 rounded-full bg-pink-400 animate-pulse pointer-events-none" />
          <div className="absolute -bottom-1 -left-3 w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse [animation-delay:0.5s] pointer-events-none" />
          <div className="absolute top-1/2 -right-4 w-1 h-1 rounded-full bg-purple-300 animate-pulse [animation-delay:1s] pointer-events-none" />

          {/* Botón real: solo el círculo */}
          <button
            onClick={startRecording}
            disabled={disabled}
            className="relative group w-28 h-28 rounded-full bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500
                       p-[3px] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.5)]"
          >
            {/* Interior oscuro con efecto glass */}
            <div className="w-full h-full rounded-full bg-black/80 backdrop-blur-xl
                            flex flex-col items-center justify-center gap-1
                            border border-white/10">

              {/* Ojo de KIRO / Icono Mic */}
              <div className="relative">
                {/* Brillo superior (simula reflejo del ojo de KIRO) */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1.5
                                bg-gradient-to-b from-white/60 to-transparent rounded-full blur-[1px]" />

                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500
                                flex items-center justify-center
                                shadow-[0_0_20px_rgba(168,85,247,0.6),inset_0_2px_4px_rgba(255,255,255,0.2)]
                                group-hover:shadow-[0_0_30px_rgba(168,85,247,0.8),inset_0_2px_4px_rgba(255,255,255,0.3)]
                                transition-all duration-300">
                  <Mic className="w-6 h-6 text-white drop-shadow-lg" />
                </div>
              </div>

              <span className="text-[10px] font-medium text-purple-300/80 uppercase tracking-wider">
                Grabar
              </span>
            </div>
          </button>
        </div>

        {/* Texto y botón subir */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-gray-500">o</p>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
                       bg-white/5 border border-white/10
                       text-sm text-gray-400 hover:text-white hover:bg-white/10
                       transition-all duration-200"
          >
            <Upload className="w-4 h-4" />
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
      <div className="flex flex-col items-center gap-6">
        {/* Visualización de grabación con KIRO */}
        <div className="relative">

          {/* Ondas de audio animadas (solo cuando graba, no clickeables) */}
          {state === 'recording' && (
            <div className="pointer-events-none">
              <div className="absolute inset-0 -m-8 flex items-center justify-center">
                <div className="w-44 h-44 rounded-full border-2 border-purple-500/30 animate-ping [animation-duration:1.5s]" />
              </div>
              <div className="absolute inset-0 -m-6 flex items-center justify-center">
                <div className="w-40 h-40 rounded-full border-2 border-pink-500/20 animate-ping [animation-duration:2s] [animation-delay:0.5s]" />
              </div>
              <div className="absolute inset-0 -m-4 flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border border-purple-400/30 animate-pulse" />
              </div>
            </div>
          )}

          {/* Círculo principal - KIRO escuchando */}
          <div className={`relative w-28 h-28 rounded-full p-[3px] transition-all duration-300 ${
            state === 'recording'
              ? 'bg-gradient-to-br from-red-500 via-pink-500 to-purple-500 shadow-[0_0_40px_rgba(239,68,68,0.4)]'
              : 'bg-gradient-to-br from-yellow-500 via-orange-500 to-pink-500'
          }`}>

            <div className="w-full h-full rounded-full bg-black/80 backdrop-blur-xl
                            flex flex-col items-center justify-center gap-1
                            border border-white/10">

              {/* Indicador de estado - Ojo KIRO */}
              <div className="relative">
                {state === 'recording' && (
                  <div className="absolute inset-0 -m-2 rounded-full bg-red-500/30 animate-pulse" />
                )}

                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  state === 'recording'
                    ? 'bg-gradient-to-br from-red-400 to-pink-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]'
                    : 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                }`}>
                  {state === 'recording' ? (
                    <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                  ) : (
                    <Pause className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>

              {/* Timer */}
              <span className="text-sm font-mono font-bold text-white">
                {formatTime(recordingTime)}
              </span>
            </div>
          </div>

          {/* Barras de audio animadas alrededor */}
          {state === 'recording' && (
            <div className="absolute inset-0 -m-3 flex items-center justify-center pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 bg-gradient-to-t from-purple-500 to-pink-400 rounded-full"
                  style={{
                    height: `${Math.random() * 20 + 10}px`,
                    transform: `rotate(${i * 45}deg) translateY(-52px)`,
                    animation: `audioBar 0.5s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="relative z-10 flex items-center gap-3">
          {/* Pause/Resume */}
          <button
            onClick={togglePause}
            className="w-12 h-12 rounded-full bg-white/10 border border-white/20
                       flex items-center justify-center
                       hover:bg-white/20 transition-all duration-200"
          >
            {state === 'recording' ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>

          {/* Stop */}
          <button
            onClick={stopRecording}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-500
                       flex items-center justify-center
                       shadow-[0_0_20px_rgba(168,85,247,0.4)]
                       hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]
                       hover:scale-105 transition-all duration-200"
          >
            <Square className="w-5 h-5 text-white fill-white" />
          </button>

          {/* Cancel */}
          <button
            onClick={reset}
            className="w-12 h-12 rounded-full bg-white/10 border border-white/20
                       flex items-center justify-center
                       hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-200"
          >
            <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-400" />
          </button>
        </div>

        <p className="text-xs text-gray-500">
          {state === 'recording' ? 'KIRO está escuchando...' : 'Grabación pausada'}
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ESTADO: READY - Audio listo
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Indicador de éxito con estilo KIRO */}
      <div className="relative">
        <div className="absolute inset-0 -m-2 rounded-full bg-green-500/20 animate-pulse" />
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-400
                        p-[3px] shadow-[0_0_30px_rgba(34,197,94,0.4)]">
          <div className="w-full h-full rounded-full bg-black/80 backdrop-blur-xl
                          flex items-center justify-center border border-white/10">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Reproductor de audio */}
      {audioUrl && (
        <div className="w-full max-w-xs">
          <audio
            src={audioUrl}
            controls
            className="w-full h-10 rounded-lg [&::-webkit-media-controls-panel]:bg-white/10"
          />
        </div>
      )}

      {/* Info y botón eliminar */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">
          Duración: {formatTime(recordingTime)}
        </span>

        <button
          onClick={reset}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                     bg-red-500/10 border border-red-500/20
                     text-sm text-red-400 hover:bg-red-500/20
                     transition-all duration-200"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </button>
      </div>
    </div>
  );
}
