import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface TypingIndicatorProps {
  /** Estado actual de KIRO que determina el estilo del indicador */
  state: 'thinking' | 'working' | 'listening';
  /** Mensaje personalizado para mostrar (opcional) */
  customMessage?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS CSS (ANIMACIONES PURAS)
// ═══════════════════════════════════════════════════════════════════════════

const styles = `
  /* Animación de puntos bouncing para 'thinking' */
  @keyframes kiro-dot-bounce {
    0%, 80%, 100% {
      transform: scale(1) translateY(0);
    }
    40% {
      transform: scale(1.2) translateY(-4px);
    }
  }

  .kiro-dot {
    animation: kiro-dot-bounce 1.2s ease-in-out infinite;
  }

  .kiro-dot:nth-child(1) { animation-delay: 0ms; }
  .kiro-dot:nth-child(2) { animation-delay: 200ms; }
  .kiro-dot:nth-child(3) { animation-delay: 400ms; }

  /* Animación de ojos moviéndose */
  @keyframes kiro-eye-look {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(1px); }
    50% { transform: translateX(-1px); }
    75% { transform: translateX(0.5px); }
  }

  .kiro-mini-eye {
    animation: kiro-eye-look 2s ease-in-out infinite;
  }

  /* Animación de lente girando para 'working' */
  @keyframes kiro-lens-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .kiro-lens {
    animation: kiro-lens-spin 2s linear infinite;
  }

  /* Barra de progreso indeterminada */
  @keyframes kiro-progress {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }

  .kiro-progress-bar {
    animation: kiro-progress 1.5s ease-in-out infinite;
  }

  /* Waveform para 'listening' */
  @keyframes kiro-wave {
    0%, 100% { height: 4px; }
    50% { height: 16px; }
  }

  .kiro-wave-bar {
    animation: kiro-wave 0.3s ease-in-out infinite;
  }

  .kiro-wave-bar:nth-child(1) { animation-delay: 0ms; }
  .kiro-wave-bar:nth-child(2) { animation-delay: 100ms; }
  .kiro-wave-bar:nth-child(3) { animation-delay: 200ms; }
`;

// ═══════════════════════════════════════════════════════════════════════════
// MENSAJES ROTATIVOS PARA 'THINKING'
// ═══════════════════════════════════════════════════════════════════════════

const THINKING_MESSAGES = [
  'Pensando...',
  'Analizando el contexto...',
  'Preparando respuesta...',
  'Dame un momento...',
];

// ═══════════════════════════════════════════════════════════════════════════
// MINI KIRO (SOLO LA CARA)
// ═══════════════════════════════════════════════════════════════════════════

function MiniKiroFace({ variant }: { variant: 'thinking' | 'working' }) {
  return (
    <div className="relative w-6 h-6 flex items-center justify-center">
      {/* Cara base */}
      <div
        className={cn(
          'w-6 h-6 rounded-full',
          'bg-gradient-to-br from-violet-400 to-violet-600',
          'flex items-center justify-center'
        )}
      >
        {variant === 'thinking' ? (
          // Ojos que se mueven
          <div className="flex gap-1">
            <div className="kiro-mini-eye w-1.5 h-1.5 bg-white rounded-full" />
            <div className="kiro-mini-eye w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        ) : (
          // Lente de cámara girando
          <div className="kiro-lens w-4 h-4 rounded-full border-2 border-white/50 border-t-white" />
        )}
      </div>

      {/* Antenas (pequeñas) */}
      <div className="absolute -top-1 left-1 w-1 h-2 bg-violet-400 rounded-full" />
      <div className="absolute -top-1 right-1 w-1 h-2 bg-violet-400 rounded-full" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE: THINKING INDICATOR
// ═══════════════════════════════════════════════════════════════════════════

function ThinkingIndicator() {
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotar mensajes cada 2 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Mini KIRO */}
      <MiniKiroFace variant="thinking" />

      {/* Contenido */}
      <div className="flex flex-col gap-1.5">
        {/* Puntos animados */}
        <div className="flex gap-1">
          <div className="kiro-dot w-2 h-2 bg-violet-400 rounded-full" />
          <div className="kiro-dot w-2 h-2 bg-violet-400 rounded-full" />
          <div className="kiro-dot w-2 h-2 bg-violet-400 rounded-full" />
        </div>

        {/* Mensaje rotativo */}
        <span className="text-[10px] text-violet-400/70 transition-opacity duration-300">
          {THINKING_MESSAGES[messageIndex]}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE: WORKING INDICATOR
// ═══════════════════════════════════════════════════════════════════════════

function WorkingIndicator({ customMessage }: { customMessage?: string }) {
  return (
    <div className="flex items-center gap-3">
      {/* Mini KIRO con lente */}
      <MiniKiroFace variant="working" />

      {/* Contenido */}
      <div className="flex flex-col gap-1.5">
        {/* Barra de progreso indeterminada */}
        <div className="w-24 h-1.5 bg-violet-500/20 rounded-full overflow-hidden">
          <div
            className="kiro-progress-bar w-12 h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)',
            }}
          />
        </div>

        {/* Mensaje */}
        <span className="text-[10px] text-violet-400/70">
          {customMessage || 'Ejecutando...'}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE: LISTENING INDICATOR
// ═══════════════════════════════════════════════════════════════════════════

function ListeningIndicator() {
  return (
    <div className="flex items-center gap-3">
      {/* Waveform */}
      <div className="flex items-end gap-0.5 h-5">
        <div
          className="kiro-wave-bar w-1 bg-cyan-400 rounded-full"
          style={{ minHeight: '4px' }}
        />
        <div
          className="kiro-wave-bar w-1 bg-cyan-400 rounded-full"
          style={{ minHeight: '4px' }}
        />
        <div
          className="kiro-wave-bar w-1 bg-cyan-400 rounded-full"
          style={{ minHeight: '4px' }}
        />
      </div>

      {/* Mensaje */}
      <span className="text-[10px] text-cyan-400/70">Escuchando...</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Indicador de que KIRO está procesando, con personalidad.
 * Tres variantes según el estado:
 * - thinking: Mini KIRO con ojos moviéndose + puntos bouncing + mensaje rotativo
 * - working: Mini KIRO con lente girando + barra de progreso
 * - listening: Waveform de audio (para futuro voice)
 */
export function TypingIndicator({ state, customMessage }: TypingIndicatorProps) {
  return (
    <>
      {/* Inyectar estilos CSS */}
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Container */}
      <div
        className={cn(
          'flex justify-start',
          'px-4 py-3 rounded-sm',
          'bg-violet-500/10 border border-violet-500/20',
          'max-w-[200px]'
        )}
      >
        {state === 'thinking' && <ThinkingIndicator />}
        {state === 'working' && <WorkingIndicator customMessage={customMessage} />}
        {state === 'listening' && <ListeningIndicator />}
      </div>
    </>
  );
}
