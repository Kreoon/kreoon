import { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface MessageFeedbackProps {
  /** ID único del mensaje */
  messageId: string;
  /** Texto del mensaje (para copiar) */
  messageText: string;
  /** Callback cuando el usuario da feedback */
  onFeedback: (messageId: string, type: 'positive' | 'negative', reason?: string) => void;
  /** Si ya se dio feedback a este mensaje */
  feedbackGiven?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// RAZONES DE FEEDBACK NEGATIVO
// ═══════════════════════════════════════════════════════════════════════════

const NEGATIVE_REASONS = [
  { id: 'wrong_request', label: 'No es lo que pedí' },
  { id: 'incorrect_info', label: 'Información incorrecta' },
  { id: 'not_useful', label: 'Poco útil' },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Componente de feedback por mensaje individual.
 * Muestra botones de thumbs up/down y copiar.
 * El feedback negativo expande opciones de razón.
 */
export function MessageFeedback({
  messageId,
  messageText,
  onFeedback,
  feedbackGiven = false,
}: MessageFeedbackProps) {
  // Estados
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [showReasons, setShowReasons] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  const [showNoted, setShowNoted] = useState(false);
  const [copied, setCopied] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handlePositive = useCallback(() => {
    setFeedback('positive');
    setShowThanks(true);
    onFeedback(messageId, 'positive');

    // Ocultar después de 1.5 segundos
    setTimeout(() => {
      setShowThanks(false);
    }, 1500);
  }, [messageId, onFeedback]);

  const handleNegative = useCallback(() => {
    setFeedback('negative');
    setShowReasons(true);
  }, []);

  const handleSelectReason = useCallback(
    (reason: string) => {
      setShowReasons(false);
      setShowNoted(true);
      onFeedback(messageId, 'negative', reason);

      // Ocultar después de 1.5 segundos
      setTimeout(() => {
        setShowNoted(false);
      }, 1500);
    },
    [messageId, onFeedback]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn('[MessageFeedback] Error copiando mensaje:', error);
    }
  }, [messageText]);

  // ─────────────────────────────────────────────────────────────────────────
  // Renderizado condicional según estado
  // ─────────────────────────────────────────────────────────────────────────

  // Si ya se dio feedback previamente, no mostrar nada
  if (feedbackGiven && !feedback) {
    return null;
  }

  // Mostrar mensaje de agradecimiento
  if (showThanks) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 animate-fade-in">
        <span className="text-[10px] text-green-400">¡Gracias!</span>
      </div>
    );
  }

  // Mostrar mensaje de "anotado"
  if (showNoted) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 animate-fade-in">
        <span className="text-[10px] text-violet-400">Anotado, mejoraré 📝</span>
      </div>
    );
  }

  // Mostrar selector de razones (feedback negativo)
  if (showReasons) {
    return (
      <div className="flex flex-col gap-1.5 mt-2 animate-fade-in">
        <span className="text-[9px] text-gray-500">¿Qué estuvo mal?</span>
        <div className="flex flex-wrap gap-1">
          {NEGATIVE_REASONS.map((reason) => (
            <button
              key={reason.id}
              onClick={() => handleSelectReason(reason.id)}
              className={cn(
                'px-2 py-1 rounded-md',
                'text-[9px] font-medium',
                'bg-red-500/10 border border-red-500/20',
                'text-red-400 hover:bg-red-500/20',
                'transition-colors duration-150'
              )}
              aria-label={`Razón: ${reason.label}`}
            >
              {reason.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Estado normal: mostrar botones de feedback
  return (
    <div
      className={cn(
        'flex items-center gap-2 mt-1.5',
        'transition-opacity duration-200',
        // Siempre visible pero con opacidad reducida
        feedback ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'
      )}
    >
      {/* Thumbs Up */}
      {(!feedback || feedback === 'positive') && (
        <button
          onClick={handlePositive}
          disabled={!!feedback}
          className={cn(
            'p-1 rounded transition-all duration-150',
            feedback === 'positive'
              ? 'text-violet-400 bg-violet-500/20'
              : 'text-gray-500 hover:text-violet-400 hover:bg-violet-500/10'
          )}
          aria-label="Me gusta esta respuesta"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Thumbs Down */}
      {(!feedback || feedback === 'negative') && (
        <button
          onClick={handleNegative}
          disabled={!!feedback}
          className={cn(
            'p-1 rounded transition-all duration-150',
            feedback === 'negative'
              ? 'text-red-400 bg-red-500/20'
              : 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
          )}
          aria-label="No me gusta esta respuesta"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Separador */}
      {!feedback && <div className="w-px h-3 bg-gray-700" />}

      {/* Copiar */}
      <button
        onClick={handleCopy}
        className={cn(
          'p-1 rounded transition-all duration-150',
          copied
            ? 'text-green-400 bg-green-500/20'
            : 'text-gray-500 hover:text-foreground hover:bg-violet-500/10'
        )}
        aria-label={copied ? 'Copiado' : 'Copiar mensaje'}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
