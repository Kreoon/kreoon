import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  MarketplaceConversation,
  MarketplaceMessage,
  MessageAttachment,
} from '@/types/ai-matching';

/**
 * Hook para gestionar conversaciones del marketplace
 */
export function useMarketplaceConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener todas las conversaciones
  const {
    data: conversations = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['marketplace-conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from('marketplace_conversations')
        .select(`
          *,
          company_user:profiles!company_user_id (id, full_name, avatar_url),
          creator_user:profiles!creator_user_id (id, full_name, avatar_url),
          proposal:marketplace_proposals (id, title, status)
        `)
        .or(`company_user_id.eq.${user.id},creator_user_id.eq.${user.id}`)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return data as MarketplaceConversation[];
    },
    enabled: !!user?.id,
  });

  // Total de no leídos
  const totalUnread = conversations.reduce((sum, c) => {
    if (c.company_user_id === user?.id) {
      return sum + c.company_unread_count;
    }
    return sum + c.creator_unread_count;
  }, 0);

  // Crear o obtener conversación
  const getOrCreateConversation = useCallback(async (otherUserId: string, isCompany: boolean) => {
    if (!user?.id) throw new Error('No autenticado');

    const companyId = isCompany ? user.id : otherUserId;
    const creatorId = isCompany ? otherUserId : user.id;

    // Buscar conversación existente
    const { data: existing } = await (supabase as any)
      .from('marketplace_conversations')
      .select('*')
      .eq('company_user_id', companyId)
      .eq('creator_user_id', creatorId)
      .maybeSingle();

    if (existing) return existing as MarketplaceConversation;

    // Crear nueva
    const { data, error } = await (supabase as any)
      .from('marketplace_conversations')
      .insert({
        company_user_id: companyId,
        creator_user_id: creatorId,
      })
      .select()
      .single();

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['marketplace-conversations', user.id] });
    return data as MarketplaceConversation;
  }, [user?.id, queryClient]);

  // Archivar conversación
  const archiveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user?.id) throw new Error('No autenticado');

      const { error } = await (supabase as any)
        .from('marketplace_conversations')
        .update({ status: 'archived' })
        .eq('id', conversationId)
        .or(`company_user_id.eq.${user.id},creator_user_id.eq.${user.id}`);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-conversations', user?.id] });
      toast.success('Conversación archivada');
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('marketplace-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_conversations',
          filter: `company_user_id=eq.${user.id}`,
        },
        () => refetch()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_conversations',
          filter: `creator_user_id=eq.${user.id}`,
        },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  return {
    conversations,
    isLoading,
    totalUnread,
    refetch,
    getOrCreateConversation,
    archiveConversation: archiveConversation.mutateAsync,
  };
}

/**
 * Hook para una conversación específica
 */
export function useMarketplaceConversation(conversationId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener conversación
  const {
    data: conversation,
    isLoading: conversationLoading,
  } = useQuery({
    queryKey: ['marketplace-conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const { data, error } = await (supabase as any)
        .from('marketplace_conversations')
        .select(`
          *,
          company_user:profiles!company_user_id (id, full_name, avatar_url, username),
          creator_user:profiles!creator_user_id (id, full_name, avatar_url, username),
          proposal:marketplace_proposals (id, title, status)
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return data as MarketplaceConversation;
    },
    enabled: !!conversationId,
  });

  // Obtener mensajes
  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['marketplace-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await (supabase as any)
        .from('marketplace_messages')
        .select(`
          *,
          sender:profiles!sender_id (id, full_name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as MarketplaceMessage[];
    },
    enabled: !!conversationId,
  });

  // Enviar mensaje
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      attachments = [],
      embeddedProposalId,
    }: {
      content: string;
      attachments?: MessageAttachment[];
      embeddedProposalId?: string;
    }) => {
      if (!user?.id || !conversationId) throw new Error('No autenticado');

      const { data, error } = await (supabase as any)
        .from('marketplace_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          attachments,
          embedded_proposal_id: embeddedProposalId || null,
          message_type: embeddedProposalId ? 'proposal' : attachments.length > 0 ? 'file' : 'text',
        })
        .select(`
          *,
          sender:profiles!sender_id (id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Verificar si fue flaggeado
      if (data.flagged_external_contact) {
        toast.warning('Tu mensaje fue marcado por contener información de contacto externa. Por favor usa solo el chat de Kreoon.');
      }

      return data as MarketplaceMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-conversations', user?.id] });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Marcar como leído
  const markAsRead = useCallback(async () => {
    if (!user?.id || !conversationId || !conversation) return;

    const isCompany = conversation.company_user_id === user.id;
    const updateField = isCompany ? 'company_unread_count' : 'creator_unread_count';

    await (supabase as any)
      .from('marketplace_conversations')
      .update({ [updateField]: 0 })
      .eq('id', conversationId);

    // Marcar mensajes individuales como leídos
    await (supabase as any)
      .from('marketplace_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    queryClient.invalidateQueries({ queryKey: ['marketplace-conversations', user.id] });
  }, [user?.id, conversationId, conversation, queryClient]);

  // Realtime subscription para mensajes
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`marketplace-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refetchMessages]);

  // Determinar el "otro" usuario
  const otherUser = conversation
    ? conversation.company_user_id === user?.id
      ? conversation.creator_user
      : conversation.company_user
    : null;

  const isCompanyView = conversation?.company_user_id === user?.id;

  return {
    conversation,
    messages,
    otherUser,
    isCompanyView,
    isLoading: conversationLoading || messagesLoading,
    sendMessage: sendMessage.mutateAsync,
    markAsRead,
    isSending: sendMessage.isPending,
    refetchMessages,
  };
}

/**
 * Hook para detectar violaciones de contacto externo (preview)
 */
export function useContactDetection() {
  const detectExternalContact = useCallback((text: string): {
    hasViolation: boolean;
    violations: string[];
  } => {
    const violations: string[] = [];

    // Teléfonos
    if (/\+?\d{1,3}[-.\s]?\(?\d{2,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/.test(text)) {
      violations.push('phone_number');
    }

    // Emails
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
      violations.push('email');
    }

    // Instagram
    if (/(instagram|ig|insta|@)[\s:]*[a-zA-Z0-9._]+/i.test(text)) {
      violations.push('instagram');
    }

    // WhatsApp
    if (/(whatsapp|whats|wsp|wa\.me)[\s:/]*[\d+]+/i.test(text)) {
      violations.push('whatsapp');
    }

    // URLs externas
    if (/https?:\/\/(?!.*kreoon\.)/i.test(text)) {
      violations.push('external_url');
    }

    return {
      hasViolation: violations.length > 0,
      violations,
    };
  }, []);

  return { detectExternalContact };
}
