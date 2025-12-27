import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: 'helpful' | 'not_helpful' | 'incorrect' | 'offensive';
}

// Virtual AI user ID - deterministic per organization
export const AI_USER_PREFIX = 'ai-assistant';

export function getAIUserId(orgId: string): string {
  return `${AI_USER_PREFIX}-${orgId.slice(0, 8)}`;
}

export function isAIUser(userId: string): boolean {
  return userId.startsWith(AI_USER_PREFIX);
}

export function useAIChat() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const orgId = profile?.current_organization_id;
  
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assistantConfig, setAssistantConfig] = useState<{
    name: string;
    isEnabled: boolean;
  } | null>(null);

  // Fetch AI assistant config
  useEffect(() => {
    const fetchConfig = async () => {
      if (!orgId) return;
      
      const { data } = await supabase
        .from('ai_assistant_config')
        .select('assistant_name, is_enabled')
        .eq('organization_id', orgId)
        .single();
      
      if (data) {
        setAssistantConfig({
          name: data.assistant_name,
          isEnabled: data.is_enabled
        });
      }
    };

    fetchConfig();
  }, [orgId]);

  // Load conversation history from AI logs
  const loadHistory = useCallback(async (conversationId?: string) => {
    if (!orgId || !user?.id) return;

    const query = supabase
      .from('ai_assistant_logs')
      .select('id, user_message, assistant_response, created_at')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (conversationId) {
      query.eq('conversation_id', conversationId);
    }

    const { data } = await query;

    if (data) {
      const historyMessages: AIMessage[] = [];
      for (const log of data) {
        historyMessages.push({
          id: `${log.id}-user`,
          role: 'user',
          content: log.user_message,
          timestamp: new Date(log.created_at)
        });
        historyMessages.push({
          id: `${log.id}-assistant`,
          role: 'assistant',
          content: log.assistant_response,
          timestamp: new Date(log.created_at)
        });
      }
      setMessages(historyMessages);
    }
  }, [orgId, user?.id]);

  // Send message to AI
  const sendMessage = useCallback(async (content: string, conversationId?: string) => {
    if (!orgId || !user?.id || !content.trim()) return null;

    const userMessage: AIMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { 
          message: content.trim(), 
          organizationId: orgId,
          conversationId
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: 'Error del asistente',
          description: data.error,
          variant: 'destructive'
        });
        return null;
      }

      const assistantMessage: AIMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      return assistantMessage;
    } catch (err) {
      console.error('AI chat error:', err);
      toast({
        title: 'Error',
        description: 'No se pudo conectar con el asistente',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [orgId, user?.id, toast]);

  // Submit feedback for a message
  const submitFeedback = useCallback(async (
    messageId: string, 
    rating: 'helpful' | 'not_helpful' | 'incorrect' | 'offensive',
    comment?: string
  ) => {
    if (!orgId || !user?.id) return;

    // Find the message pair
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex < 0 || messages[msgIndex].role !== 'assistant') return;

    const assistantMsg = messages[msgIndex];
    const userMsg = messages[msgIndex - 1];

    try {
      await supabase.from('ai_chat_feedback').insert({
        organization_id: orgId,
        user_id: user.id,
        rating,
        comment,
        ai_response: assistantMsg.content,
        user_question: userMsg?.content
      });

      // Update local state
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, feedback: rating } : m
      ));

      toast({
        title: 'Gracias',
        description: 'Tu feedback nos ayuda a mejorar'
      });
    } catch (err) {
      console.error('Feedback error:', err);
    }
  }, [orgId, user?.id, messages, toast]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    assistantConfig,
    sendMessage,
    loadHistory,
    submitFeedback,
    clearMessages,
    orgId
  };
}
