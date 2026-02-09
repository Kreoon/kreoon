import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import { useKiroChat } from './hooks/useKiroChat';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './chat/TypingIndicator';
import { ChatInput } from './chat/ChatInput';
import { cn } from '@/lib/utils';
import type { KiroState } from './Kiro3D';
import { useKiro } from '@/contexts/KiroContext';
import type { KiroZone, SuggestedAction } from '@/contexts/KiroContext';
import { getZoneConfig } from './config/zoneActions';
import { kiroSounds } from './sounds/KiroSounds';
import type { AwardResult } from './hooks/useKiroGamification';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
// Phase 9: Intent detection
import { ActionSuggestions, useActionSuggestions } from './agentic/ActionSuggestions';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface KiroChatProps {
  onStateChange: (state: KiroState) => void;
  currentZone?: KiroZone;
  /** Función para otorgar puntos por feedback */
  awardPoints?: (sourceKey: string, description?: string) => Promise<AwardResult>;
  /** Función para que KIRO hable su respuesta en voz alta */
  speak?: (text: string) => Promise<void>;
  /** Mensaje pendiente de acciones rápidas para enviar automáticamente */
  pendingMessage?: string | null;
  /** Callback cuando el mensaje pendiente fue consumido */
  onPendingMessageConsumed?: () => void;
}

interface ChatFeedback {
  messageId: string;
  type: 'positive' | 'negative';
  reason?: string;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const FEEDBACK_STORAGE_KEY = 'kreoon_kiro_feedback';
const SCROLL_THRESHOLD = 100; // Píxeles para considerar "cerca del fondo"

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES DE PERSISTENCIA DE FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════

function loadFeedbackFromStorage(): Record<string, ChatFeedback> {
  try {
    const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function saveFeedbackToStorage(feedbackMap: Record<string, ChatFeedback>): void {
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbackMap));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[KiroChat] Error guardando feedback:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function KiroChat({ onStateChange, currentZone = 'general', awardPoints, speak, pendingMessage, onPendingMessageConsumed }: KiroChatProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // Estado y hooks
  // ─────────────────────────────────────────────────────────────────────────
  const { messages, isLoading, sendMessage, clearMessages } = useKiroChat(speak);
  const { chatHistory, addChatMessage, clearChatHistory, notifications, markAsRead, agentic } = useKiro();
  const { user, profile } = useAuth();

  // Intent detection (Phase 9)
  const { intentResult, isVisible: showSuggestions, analyzeText, dismiss: dismissSuggestions, clear: clearSuggestions } = useActionSuggestions();

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageCount = useRef(0);
  const processedTipIds = useRef<Set<string>>(new Set());

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-send pending messages from quick actions
  // Uses a ref guard to prevent double-send (React StrictMode double-mount)
  // ─────────────────────────────────────────────────────────────────────────
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;
  const processedPendingRef = useRef<string | null>(null);

  useEffect(() => {
    if (pendingMessage && pendingMessage !== processedPendingRef.current) {
      processedPendingRef.current = pendingMessage;
      sendMessageRef.current(pendingMessage);
      onPendingMessageConsumed?.();
    }
    if (!pendingMessage) {
      processedPendingRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMessage]);
  const isUserScrolling = useRef(false);

  // Estado de feedback
  const [feedbackMap, setFeedbackMap] = useState<Record<string, ChatFeedback>>(() =>
    loadFeedbackFromStorage()
  );

  // Estado de UI
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);

  // Estado de feedback toast
  const [feedbackToast, setFeedbackToast] = useState<{
    show: boolean;
    points: number;
    key: number;
  } | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Filtrar notificaciones de tipo kiro_tip no leídas
  // ─────────────────────────────────────────────────────────────────────────
  const pendingKiroTips = useMemo(() => {
    return notifications.filter(
      (n) => n.type === 'kiro_tip' && !n.read && !n.dismissed && !processedTipIds.current.has(n.id)
    );
  }, [notifications]);

  // Auto-agregar kiro_tips al chat
  useEffect(() => {
    if (pendingKiroTips.length === 0) return;

    pendingKiroTips.forEach((tip) => {
      processedTipIds.current.add(tip.id);

      addChatMessage({
        text: `💡 **Tip**: ${tip.message}`,
        isKiro: true,
        zone: tip.zone,
      });

      markAsRead(tip.id);
    });
  }, [pendingKiroTips, addChatMessage, markAsRead]);

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-scroll inteligente
  // ─────────────────────────────────────────────────────────────────────────

  const isNearBottom = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((playSound = false) => {
    if (playSound) {
      kiroSounds.play('action_click');
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMessagesButton(false);
  }, []);

  // Detectar cuando el usuario hace scroll
  const handleScroll = useCallback(() => {
    if (!isNearBottom()) {
      isUserScrolling.current = true;
    } else {
      isUserScrolling.current = false;
      setShowNewMessagesButton(false);
    }
  }, [isNearBottom]);

  // Auto-scroll cuando hay nuevos mensajes (solo si está cerca del fondo)
  useEffect(() => {
    if (isNearBottom() && !isUserScrolling.current) {
      scrollToBottom();
    } else if (messages.length > 0) {
      // Mostrar botón de nuevos mensajes si el usuario scrolleó arriba
      setShowNewMessagesButton(true);
    }
  }, [messages, chatHistory, isNearBottom, scrollToBottom]);

  // ─────────────────────────────────────────────────────────────────────────
  // Sincronizar mensajes del hook de IA con el historial persistido
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > lastMessageCount.current) {
      const newMessages = messages.slice(lastMessageCount.current);
      newMessages.forEach((msg) => {
        addChatMessage({
          text: msg.content,
          isKiro: msg.role === 'assistant',
          zone: currentZone,
        });
      });
      lastMessageCount.current = messages.length;
    }
  }, [messages, addChatMessage, currentZone]);

  // ─────────────────────────────────────────────────────────────────────────
  // Actualizar estado de KIRO según el loading
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) {
      onStateChange('thinking');
    } else if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      // Reproducir sonido de mensaje recibido
      kiroSounds.play('message_received');
      onStateChange('speaking');

      // Voice is handled by useKiroChat internally

      const timer = setTimeout(() => onStateChange('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, messages, onStateChange]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      // Clear any existing suggestions
      clearSuggestions();

      kiroSounds.play('message_sent');
      onStateChange('listening');
      await sendMessage(text);
    },
    [isLoading, onStateChange, sendMessage, clearSuggestions]
  );

  // Handle input change for live intent detection (Phase 9)
  const handleInputChange = useCallback((text: string) => {
    // Analyze text for intents as user types
    if (text.length >= 3) {
      analyzeText(text);
    } else {
      clearSuggestions();
    }
  }, [analyzeText, clearSuggestions]);

  // Handle suggested action selection (Phase 9)
  const handleActionSelect = useCallback(async (action: SuggestedAction) => {
    kiroSounds.play('action_click');
    dismissSuggestions();

    // Execute the action through the agentic system
    const result = await agentic.executeAction(action);

    if (result.status === 'completed') {
      onStateChange('celebrating');
      setTimeout(() => onStateChange('idle'), 1500);
    }
  }, [agentic, dismissSuggestions, onStateChange]);

  const handleClearHistory = useCallback(() => {
    kiroSounds.play('action_click');
    clearChatHistory();
    clearMessages();
    lastMessageCount.current = 0;
    setFeedbackMap({});
    saveFeedbackToStorage({});
  }, [clearChatHistory, clearMessages]);

  const handleFeedback = useCallback(
    async (messageId: string, type: 'positive' | 'negative', reason?: string) => {
      const feedback: ChatFeedback = {
        messageId,
        type,
        reason,
        timestamp: Date.now(),
      };

      setFeedbackMap((prev) => {
        const updated = { ...prev, [messageId]: feedback };
        saveFeedbackToStorage(updated);
        return updated;
      });

      // Persist feedback to server
      const orgId = profile?.current_organization_id;
      if (orgId && user?.id) {
        // Find the message to get its content for context
        const targetMsg = messages.find(m => m.id === messageId);
        const prevMsg = targetMsg
          ? messages[messages.indexOf(targetMsg) - 1]
          : undefined;

        supabase.from('ai_chat_feedback').insert({
          organization_id: orgId,
          user_id: user.id,
          rating: type === 'positive' ? 5 : 1,
          user_question: prevMsg?.role === 'user' ? prevMsg.content : null,
          ai_response: targetMsg?.content?.substring(0, 500) || null,
          comment: reason || null,
        }).then(() => {});
      }

      // Otorgar puntos por feedback
      if (awardPoints) {
        const result = await awardPoints('kiro_chat_feedback', `Feedback ${type}`);
        if (result.awarded) {
          // Mostrar mini toast
          setFeedbackToast({
            show: true,
            points: result.points,
            key: Date.now(),
          });

          // Ocultar después de 2 segundos
          setTimeout(() => {
            setFeedbackToast(null);
          }, 2000);
        }
      }
    },
    [awardPoints, profile, user, messages]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Configuración de zona
  // ─────────────────────────────────────────────────────────────────────────
  const zoneConfig = getZoneConfig(currentZone);

  // Determinar el estado para el TypingIndicator
  const typingState = useMemo((): 'thinking' | 'working' | 'listening' => {
    if (isLoading) return 'thinking';
    return 'thinking';
  }, [isLoading]);

  return (
    <div className="flex flex-col h-full">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER: Indicador de zona */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-violet-500/5">
        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full',
            'bg-violet-500/10 border border-violet-500/20',
            'text-[10px] text-violet-300'
          )}
        >
          <span>{zoneConfig.zoneEmoji}</span>
          <span>{zoneConfig.zoneName}</span>
        </div>

        {/* Botón limpiar historial */}
        {chatHistory.length > 0 && (
          <button
            onClick={handleClearHistory}
            disabled={isLoading}
            title="Limpiar historial"
            className={cn(
              'p-2 rounded-lg min-w-[44px] min-h-[44px]',
              'flex items-center justify-center',
              'text-gray-500 hover:text-red-400',
              'hover:bg-red-500/10 transition-all duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="Limpiar historial de chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MENSAJES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className={cn(
          'flex-1 overflow-y-auto p-3',
          'scrollbar-thin scrollbar-thumb-violet-500/20 scrollbar-track-transparent'
        )}
      >
        {/* Estado vacío */}
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="text-2xl mb-2">🤖</div>
            <p className="text-gray-400 text-sm">{zoneConfig.greeting}</p>
            <p className="text-gray-600 text-xs mt-2">
              Pregúntame lo que necesites sobre esta zona
            </p>
          </div>
        )}

        {/* Lista de mensajes */}
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            messageId={msg.id}
            message={msg.content}
            isKiro={msg.role === 'assistant'}
            timestamp={msg.timestamp}
            zone={currentZone}
            feedbackGiven={!!feedbackMap[msg.id]}
            onFeedback={handleFeedback}
          />
        ))}

        {/* Typing Indicator mejorado */}
        {isLoading && (
          <div className="mb-2">
            <TypingIndicator state={typingState} />
          </div>
        )}

        {/* Ref para scroll */}
        <div ref={chatEndRef} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FEEDBACK TOAST */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {feedbackToast?.show && (
        <div
          key={feedbackToast.key}
          className={cn(
            'absolute bottom-24 left-1/2 -translate-x-1/2',
            'flex items-center gap-1 px-3 py-1.5 rounded-full',
            'bg-violet-500/90 text-white text-sm font-medium',
            'shadow-lg shadow-violet-500/30',
            'animate-feedback-toast'
          )}
          style={{
            animation: 'kiro-feedback-float 2s ease-out forwards',
          }}
        >
          <span>+{feedbackToast.points} UP</span>
          <span>⭐</span>
        </div>
      )}

      {/* Estilos para la animación del toast */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes kiro-feedback-float {
            0% {
              opacity: 1;
              transform: translate(-50%, 0) scale(1);
            }
            50% {
              opacity: 1;
              transform: translate(-50%, -20px) scale(1.1);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -40px) scale(0.9);
            }
          }
        `
      }} />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOTÓN DE NUEVOS MENSAJES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showNewMessagesButton && (
        <button
          onClick={() => scrollToBottom(true)}
          className={cn(
            'absolute bottom-20 left-1/2 -translate-x-1/2',
            'flex items-center gap-1 px-3 py-1.5 rounded-full',
            'bg-violet-500/90 text-white text-[11px] font-medium',
            'shadow-lg shadow-violet-500/30',
            'hover:bg-violet-500 transition-colors',
            'animate-in fade-in slide-in-from-bottom-2 duration-200'
          )}
          aria-label="Ver nuevos mensajes"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Nuevos mensajes
        </button>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SUGERENCIAS DE ACCIONES (Phase 9) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showSuggestions && intentResult && (
        <div className="px-3 py-2 border-t border-violet-500/5">
          <ActionSuggestions
            intentResult={intentResult}
            onActionSelect={handleActionSelect}
            onDismiss={dismissSuggestions}
            isVisible={showSuggestions}
            variant="compact"
            maxActions={2}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* INPUT MEJORADO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="p-3 border-t border-violet-500/10">
        <ChatInput
          onSend={handleSend}
          onChange={handleInputChange}
          isLoading={isLoading}
          currentZone={currentZone}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
