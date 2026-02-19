import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './chat/MarkdownRenderer';
import { MessageFeedback } from './chat/MessageFeedback';
import type { KiroZone } from '@/contexts/KiroContext';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface ChatBubbleProps {
  /** ID único del mensaje */
  messageId: string;
  /** Contenido del mensaje */
  message: string;
  /** Si el mensaje es de KIRO (true) o del usuario (false) */
  isKiro: boolean;
  /** Timestamp del mensaje */
  timestamp?: Date | number;
  /** Zona donde se envió el mensaje (opcional) */
  zone?: KiroZone;
  /** Si ya se dio feedback a este mensaje */
  feedbackGiven?: boolean;
  /** Callback cuando el usuario da feedback (solo para mensajes de KIRO) */
  onFeedback?: (messageId: string, type: 'positive' | 'negative', reason?: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDAD: FORMATEAR TIMESTAMP
// ═══════════════════════════════════════════════════════════════════════════

function formatTime(timestamp: Date | number): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

// ═══════════════════════════════════════════════════════════════════════════
// INFO DE ZONAS (PARA MOSTRAR EN TIMESTAMP)
// ═══════════════════════════════════════════════════════════════════════════

const ZONE_LABELS: Record<KiroZone, string> = {
  'sala-de-control': 'Control',
  'camerino': 'Camerino',
  'set-de-grabacion': 'Set',
  'sala-de-edicion': 'Edición',
  'casting': 'Casting',
  'sala-de-prensa': 'Prensa',
  'escuela': 'Escuela',
  'live-stage': 'Live',
  'general': 'General',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Burbuja de mensaje para el chat de KIRO.
 * - Mensajes de KIRO: Renderiza markdown con feedback
 * - Mensajes del usuario: Texto plano
 * - Incluye timestamp y zona opcional
 */
export function ChatBubble({
  messageId,
  message,
  isKiro,
  timestamp,
  zone,
  feedbackGiven = false,
  onFeedback,
}: ChatBubbleProps) {
  return (
    <div
      className={cn(
        'flex mb-3',
        'animate-in fade-in slide-in-from-bottom-2 duration-200',
        isKiro ? 'justify-start' : 'justify-end'
      )}
    >
      {/* Wrapper con grupo para hover effects */}
      <div
        className={cn(
          'group max-w-[85%]',
          isKiro ? 'mr-4' : 'ml-4'
        )}
      >
        {/* Burbuja principal */}
        <div
          className={cn(
            'px-3.5 py-2.5',
            isKiro
              ? 'rounded-sm rounded-tr-xl rounded-br-xl rounded-bl-xl bg-violet-500/15 border border-violet-500/20'
              : 'rounded-xl rounded-tr-sm bg-indigo-500/10 border border-indigo-500/15'
          )}
        >
          {/* Header de KIRO */}
          {isKiro && (
            <div className="text-[10px] text-violet-400 font-bold mb-1.5 font-mono tracking-wider">
              KIRO
            </div>
          )}

          {/* Contenido del mensaje */}
          {isKiro ? (
            // Mensajes de KIRO con markdown
            <MarkdownRenderer content={message} />
          ) : (
            // Mensajes del usuario: texto plano
            <span className="text-[13px] text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {message}
            </span>
          )}

          {/* Footer: timestamp y zona */}
          {timestamp && (
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-500/60">
              <span>{formatTime(timestamp)}</span>
              {zone && (
                <>
                  <span>•</span>
                  <span>{ZONE_LABELS[zone]}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Feedback (solo para mensajes de KIRO) */}
        {isKiro && onFeedback && (
          <MessageFeedback
            messageId={messageId}
            messageText={message}
            onFeedback={onFeedback}
            feedbackGiven={feedbackGiven}
          />
        )}
      </div>
    </div>
  );
}
