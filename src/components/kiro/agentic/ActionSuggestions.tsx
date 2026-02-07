/**
 * ActionSuggestions.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 * Componente UI para mostrar sugerencias de acciones detectadas por KIRO.
 * Aparece debajo del input del chat cuando KIRO detecta una intención.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SuggestedAction, IntentDetectionResult, KiroIntent } from './KiroIntentDetector';
import { getDetectionExplanation } from './KiroIntentDetector';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface ActionSuggestionsProps {
  /** Resultado de la detección de intención */
  intentResult: IntentDetectionResult | null;
  /** Callback cuando el usuario selecciona una acción */
  onActionSelect: (action: SuggestedAction) => void;
  /** Callback cuando el usuario descarta las sugerencias */
  onDismiss: () => void;
  /** Si el componente está visible */
  isVisible?: boolean;
  /** Variante de visualización */
  variant?: 'inline' | 'floating' | 'compact';
  /** Máximo de acciones a mostrar */
  maxActions?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE COLORES POR INTENCIÓN
// ═══════════════════════════════════════════════════════════════════════════

const INTENT_COLORS: Record<KiroIntent, string> = {
  create_brief: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
  find_creator: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
  check_status: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  generate_hook: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30',
  analyze_metrics: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30',
  schedule_content: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30',
  review_content: 'from-orange-500/20 to-amber-500/20 border-orange-500/30',
  assign_task: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30',
  navigate: 'from-slate-500/20 to-gray-500/20 border-slate-500/30',
  help: 'from-sky-500/20 to-blue-500/20 border-sky-500/30',
  play_game: 'from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/30',
  greeting: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
  unknown: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
};

// ═══════════════════════════════════════════════════════════════════════════
// ANIMACIONES
// ═══════════════════════════════════════════════════════════════════════════

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.15,
    },
  },
};

const actionVariants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE DE BOTÓN DE ACCIÓN
// ═══════════════════════════════════════════════════════════════════════════

interface ActionButtonProps {
  action: SuggestedAction;
  onSelect: (action: SuggestedAction) => void;
  variant: 'inline' | 'floating' | 'compact';
}

const ActionButton = memo(function ActionButton({
  action,
  onSelect,
  variant,
}: ActionButtonProps) {
  const handleClick = useCallback(() => {
    onSelect(action);
  }, [action, onSelect]);

  if (variant === 'compact') {
    return (
      <motion.button
        variants={actionVariants}
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
          'bg-violet-500/10 border border-violet-500/20',
          'text-violet-300 text-xs font-medium',
          'hover:bg-violet-500/20 hover:border-violet-500/30',
          'active:scale-95 transition-all duration-150'
        )}
      >
        <span>{action.icon}</span>
        <span>{action.label}</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      variants={actionVariants}
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-3 w-full p-3 rounded-xl',
        'bg-white/5 border border-white/10',
        'hover:bg-white/10 hover:border-violet-500/30',
        'active:scale-[0.98] transition-all duration-150'
      )}
    >
      {/* Icono */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center text-xl">
        {action.icon}
      </div>

      {/* Texto */}
      <div className="flex-grow text-left min-w-0">
        <div className="text-sm font-medium text-white truncate">
          {action.label}
        </div>
        <div className="text-xs text-gray-400 truncate">
          {action.description}
        </div>
      </div>

      {/* Flecha */}
      <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
    </motion.button>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// INDICADOR DE CONFIANZA
// ═══════════════════════════════════════════════════════════════════════════

interface ConfidenceIndicatorProps {
  confidence: number;
}

function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  const percentage = Math.round(confidence * 100);
  const barCount = Math.ceil(confidence * 4);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            'w-1 h-2 rounded-full transition-colors',
            i <= barCount ? 'bg-violet-400' : 'bg-gray-600'
          )}
        />
      ))}
      <span className="text-[10px] text-gray-500 ml-1">{percentage}%</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const ActionSuggestions = memo(function ActionSuggestions({
  intentResult,
  onActionSelect,
  onDismiss,
  isVisible = true,
  variant = 'inline',
  maxActions = 3,
}: ActionSuggestionsProps) {
  // No mostrar si no hay resultado o no hay acciones
  const shouldShow =
    isVisible &&
    intentResult &&
    intentResult.suggestedActions.length > 0 &&
    intentResult.confidence >= 0.5 &&
    intentResult.intent !== 'greeting' &&
    intentResult.intent !== 'unknown';

  if (!shouldShow || !intentResult) {
    return null;
  }

  const actions = intentResult.suggestedActions.slice(0, maxActions);
  const explanation = getDetectionExplanation(intentResult);
  const intentColor = INTENT_COLORS[intentResult.intent];

  // ─────────────────────────────────────────────────────────────────────────
  // Variante Compact (chips horizontales)
  // ─────────────────────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <AnimatePresence>
        <motion.div
          key="action-suggestions-compact"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex flex-wrap items-center gap-2 px-3 py-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          {actions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              onSelect={onActionSelect}
              variant="compact"
            />
          ))}
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Variante Inline / Floating (panel completo)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        key="action-suggestions"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={cn(
          'rounded-xl border overflow-hidden',
          'bg-gradient-to-br',
          intentColor,
          variant === 'floating' && 'shadow-xl shadow-black/20'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-white">
              KIRO sugiere
            </span>
            <ConfidenceIndicator confidence={intentResult.confidence} />
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Descartar sugerencias"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Explicación */}
        <div className="px-4 py-2 bg-white/5">
          <p className="text-xs text-gray-300">{explanation}</p>
        </div>

        {/* Acciones */}
        <div className="p-3 space-y-2">
          {actions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              onSelect={onActionSelect}
              variant={variant}
            />
          ))}
        </div>

        {/* Footer con keywords (solo en desarrollo) */}
        {process.env.NODE_ENV === 'development' && intentResult.matchedKeywords.length > 0 && (
          <div className="px-4 py-2 border-t border-white/5">
            <div className="flex flex-wrap gap-1">
              {intentResult.matchedKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-violet-500/20 text-violet-300"
                >
                  {kw}
                </span>
              ))}
            </div>
            <div className="text-[10px] text-gray-600 mt-1">
              Procesado en {intentResult.processingTime.toFixed(2)}ms
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE DE SUGERENCIA INLINE PARA CHAT
// ═══════════════════════════════════════════════════════════════════════════

interface InlineSuggestionProps {
  /** Acción sugerida */
  action: SuggestedAction;
  /** Callback al seleccionar */
  onSelect: (action: SuggestedAction) => void;
}

/**
 * Versión mínima de sugerencia para mostrar dentro del chat
 */
export const InlineSuggestion = memo(function InlineSuggestion({
  action,
  onSelect,
}: InlineSuggestionProps) {
  const handleClick = useCallback(() => {
    onSelect(action);
  }, [action, onSelect]);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'bg-violet-500/20 border border-violet-500/30',
        'text-violet-300 text-sm font-medium',
        'hover:bg-violet-500/30 hover:border-violet-500/40',
        'active:scale-95 transition-all duration-150'
      )}
    >
      <span>{action.icon}</span>
      <span>{action.label}</span>
      <ArrowRight className="w-3 h-3 ml-0.5" />
    </motion.button>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PARA GESTIONAR SUGERENCIAS
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { detectIntent } from './KiroIntentDetector';

export interface UseActionSuggestionsReturn {
  /** Resultado de intención actual */
  intentResult: IntentDetectionResult | null;
  /** Si las sugerencias están visibles */
  isVisible: boolean;
  /** Analizar texto y actualizar sugerencias */
  analyzeText: (text: string) => void;
  /** Descartar sugerencias */
  dismiss: () => void;
  /** Limpiar resultado */
  clear: () => void;
}

/**
 * Hook para gestionar el estado de las sugerencias de acciones
 */
export function useActionSuggestions(): UseActionSuggestionsReturn {
  const [intentResult, setIntentResult] = useState<IntentDetectionResult | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const analyzeText = useCallback((text: string) => {
    if (!text || text.trim().length < 3) {
      setIntentResult(null);
      setIsVisible(false);
      return;
    }

    const result = detectIntent(text);

    // Solo mostrar si hay confianza suficiente y acciones
    if (
      result.confidence >= 0.5 &&
      result.suggestedActions.length > 0 &&
      result.intent !== 'greeting' &&
      result.intent !== 'unknown'
    ) {
      setIntentResult(result);
      setIsVisible(true);
    } else {
      setIntentResult(result);
      setIsVisible(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  const clear = useCallback(() => {
    setIntentResult(null);
    setIsVisible(false);
  }, []);

  return {
    intentResult,
    isVisible,
    analyzeText,
    dismiss,
    clear,
  };
}
