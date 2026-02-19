import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { Paperclip, SendHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KiroZone } from '@/contexts/KiroContext';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface ChatInputProps {
  /** Callback cuando el usuario envía un mensaje */
  onSend: (text: string) => void;
  /** Callback cuando el texto cambia (para detección de intenciones) */
  onChange?: (text: string) => void;
  /** Si KIRO está procesando (deshabilita el input) */
  isLoading: boolean;
  /** Zona actual para placeholder contextual */
  currentZone: KiroZone;
  /** Si el input está deshabilitado */
  disabled?: boolean;
  /** Ref para controlar el focus desde afuera */
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLACEHOLDERS CONTEXTUALES POR ZONA
// ═══════════════════════════════════════════════════════════════════════════

const ZONE_PLACEHOLDERS: Record<KiroZone, string> = {
  'sala-de-control': 'Pregúntame sobre métricas y KPIs...',
  'camerino': 'Pregúntame sobre tu perfil...',
  'set-de-grabacion': '¿Qué contenido vamos a crear?',
  'sala-de-edicion': 'Pregúntame sobre tus producciones...',
  'casting': '¿Qué tipo de creador necesitas?',
  'sala-de-prensa': 'Pregúntame sobre analytics...',
  'escuela': 'Pregúntame sobre formación...',
  'live-stage': 'Pregúntame sobre streaming...',
  'general': 'Escríbele a KIRO...',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input mejorado para el chat de KIRO.
 * - Textarea autoexpandible (1-4 líneas)
 * - Botón de attachment (UI preparada para futuro)
 * - Placeholder contextual según la zona
 * - Enter para enviar, Shift+Enter para nueva línea
 */
export function ChatInput({
  onSend,
  onChange,
  isLoading,
  currentZone,
  disabled = false,
  inputRef: externalRef,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [showAttachmentTooltip, setShowAttachmentTooltip] = useState(false);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef || internalRef;

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-resize del textarea
  // ─────────────────────────────────────────────────────────────────────────

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height para medir correctamente
    textarea.style.height = 'auto';

    // Calcular nueva altura (min 1 línea ~36px, max 4 líneas ~108px)
    const scrollHeight = textarea.scrollHeight;
    const minHeight = 36;
    const maxHeight = 108;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

    textarea.style.height = `${newHeight}px`;
  }, [textareaRef]);

  // Ajustar altura cuando cambia el texto
  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    // Notify parent of text changes (for intent detection)
    onChange?.(newText);
  }, [onChange]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || disabled) return;

    onSend(trimmed);
    setText('');

    // Reset altura del textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = '36px';
    }
  }, [text, isLoading, disabled, onSend, textareaRef]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter sin Shift = enviar
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      // Shift+Enter = nueva línea (comportamiento por defecto del textarea)
    },
    [handleSend]
  );

  const handleAttachmentClick = useCallback(() => {
    // Mostrar tooltip indicando que es funcionalidad futura
    setShowAttachmentTooltip(true);
    setTimeout(() => setShowAttachmentTooltip(false), 2000);
  }, []);

  // Placeholder contextual
  const placeholder = ZONE_PLACEHOLDERS[currentZone] || ZONE_PLACEHOLDERS.general;

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        'p-2 rounded-xl',
        'bg-card/80 border border-violet-500/15',
        'transition-colors duration-150',
        'focus-within:border-violet-500/30'
      )}
    >
      {/* Botón de attachment (UI futura) */}
      <div className="relative">
        <button
          type="button"
          onClick={handleAttachmentClick}
          disabled={isLoading || disabled}
          className={cn(
            'p-2 rounded-lg transition-all duration-150',
            'text-muted-foreground opacity-50',
            'hover:bg-primary/10 hover:text-muted-foreground',
            'disabled:cursor-not-allowed'
          )}
          aria-label="Adjuntar archivo (próximamente)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Tooltip de attachment */}
        {showAttachmentTooltip && (
          <div
            className={cn(
              'absolute bottom-full left-0 mb-2',
              'px-2 py-1 rounded-md',
              'bg-card border border-violet-500/30',
              'text-[10px] text-violet-300 whitespace-nowrap',
              'shadow-lg animate-fade-in'
            )}
          >
            Próximamente: envía imágenes y archivos
          </div>
        )}
      </div>

      {/* Textarea autoexpandible */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading || disabled}
        rows={1}
        className={cn(
          'flex-1 resize-none',
          'bg-transparent border-0 outline-none',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'scrollbar-thin scrollbar-thumb-violet-500/20 scrollbar-track-transparent'
        )}
        style={{
          minHeight: '36px',
          maxHeight: '108px',
          lineHeight: '1.5',
        }}
      />

      {/* Botón de enviar */}
      <button
        type="button"
        onClick={handleSend}
        disabled={isLoading || disabled || !text.trim()}
        className={cn(
          'p-2 rounded-lg transition-all duration-150',
          text.trim() && !isLoading && !disabled
            ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
            : 'text-muted-foreground/50 cursor-not-allowed',
          'active:scale-95'
        )}
        aria-label="Enviar mensaje"
      >
        <SendHorizontal className="w-4 h-4" />
      </button>
    </div>
  );
}
