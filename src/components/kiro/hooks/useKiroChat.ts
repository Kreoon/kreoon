import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useKiro, ZONE_INFO } from '@/contexts/KiroContext';
import type { KiroVoiceEmotion } from '../utils/textToSpeechUtils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface KiroChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: KiroVoiceEmotion;
}

export interface UseKiroChatReturn {
  messages: KiroChatMessage[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const MAX_MESSAGES = 50;

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook that manages KIRO's chat brain.
 * Sends messages to the kiro-chat edge function and manages conversation state.
 *
 * @param speak - Optional function to speak KIRO's response aloud
 */
export function useKiroChat(speak?: (text: string, emotion?: KiroVoiceEmotion) => Promise<void>): UseKiroChatReturn {
  const { user, profile } = useAuth();
  const { currentZone, gamification } = useKiro();

  const [messages, setMessages] = useState<KiroChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Queue for messages sent while KIRO is thinking
  const messageQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  // ─── Build context for the edge function ───
  const buildContext = useCallback(() => {
    const zoneInfo = ZONE_INFO[currentZone];
    const userRoles = profile?.roles;
    const primaryRole = Array.isArray(userRoles) && userRoles.length > 0
      ? userRoles[0]
      : 'creator';

    return {
      currentZone,
      currentZoneLabel: zoneInfo?.label || 'General',
      userRole: primaryRole,
      userName: profile?.full_name || user?.email?.split('@')[0] || 'Usuario',
      userLevel: gamification.currentLevel.name,
      userPoints: gamification.userPoints,
      currentRoute: window.location.pathname,
      recentNotifications: [] as string[],
      conversationHistory: messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
  }, [currentZone, profile, user, gamification, messages]);

  // ─── Process a single message ───
  const processMessage = useCallback(
    async (text: string) => {
      // Add user message
      const userMsg: KiroChatMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => {
        const updated = [...prev, userMsg];
        return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
      });

      setIsLoading(true);

      try {
        const context = buildContext();

        const { data, error } = await supabase.functions.invoke('kiro-chat', {
          body: { message: text, context },
        });

        if (error) {
          throw error;
        }

        const reply = data?.reply || 'No pude procesar eso, intenta de nuevo.';
        const emotion: KiroVoiceEmotion = data?.emotion || 'neutral';

        // Add KIRO's response
        const kiroMsg: KiroChatMessage = {
          id: `kiro-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
          emotion,
        };

        setMessages((prev) => {
          const updated = [...prev, kiroMsg];
          return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
        });

        // Speak the response if voice is active
        if (speak) {
          speak(reply, emotion).catch(() => {
            // Silently fail voice - don't break the chat
          });
        }
      } catch (err) {
        console.warn('[useKiroChat] Error:', err);

        // Add error response as KIRO message
        const errorMsg: KiroChatMessage = {
          id: `kiro-err-${Date.now()}`,
          role: 'assistant',
          content: 'No pude procesar eso, intenta de nuevo.',
          timestamp: new Date(),
          emotion: 'neutral',
        };

        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [buildContext, speak],
  );

  // ─── Process queued messages ───
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    while (messageQueueRef.current.length > 0) {
      const nextMessage = messageQueueRef.current.shift();
      if (nextMessage) {
        await processMessage(nextMessage);
      }
    }

    isProcessingRef.current = false;
  }, [processMessage]);

  // ─── Send message (public API) ───
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      if (isLoading) {
        // Queue if KIRO is thinking
        messageQueueRef.current.push(text.trim());
        return;
      }

      await processMessage(text.trim());

      // Process any queued messages
      if (messageQueueRef.current.length > 0) {
        processQueue();
      }
    },
    [isLoading, processMessage, processQueue],
  );

  // ─── Clear messages ───
  const clearMessages = useCallback(() => {
    setMessages([]);
    messageQueueRef.current = [];
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
