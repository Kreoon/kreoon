import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface ChatConversation {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string | null;
  content_id: string | null;
  created_at: string;
  updated_at: string;
  participants?: {
    user_id: string;
    profile?: {
      full_name: string;
      avatar_url: string | null;
    };
  }[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ChatUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  roles: string[];
  is_online?: boolean;
  current_page?: string;
}

export function useChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Fetch all conversations for the current user
  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data: participations } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!participations?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participations.map(p => p.conversation_id);

      const { data: convs } = await supabase
        .from('chat_conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (!convs) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Fetch participants for each conversation
      const convsWithDetails = await Promise.all(convs.map(async (conv) => {
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('conversation_id', conv.id);

        const participantIds = participants?.map(p => p.user_id) || [];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', participantIds);

        const { data: lastMessage } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...conv,
          participants: participants?.map(p => ({
            user_id: p.user_id,
            profile: profiles?.find(pr => pr.id === p.user_id)
          })),
          last_message: lastMessage || undefined
        };
      }));

      setConversations(convsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (data) {
        // Fetch sender profiles
        const senderIds = [...new Set(data.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', senderIds);

        const messagesWithSenders = data.map(msg => ({
          ...msg,
          sender: profiles?.find(p => p.id === msg.sender_id)
        }));

        setMessages(messagesWithSenders);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Fetch available users to chat with
  const fetchAvailableUsers = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .neq('id', user.id);

      if (!allProfiles) return;

      // Get roles for all users
      const { data: allRoles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Get presence data
      const { data: presenceData } = await supabase
        .from('user_presence')
        .select('user_id, is_online, current_page');

      const usersWithRoles = allProfiles.map(profile => {
        const userRoles = allRoles?.filter(r => r.user_id === profile.id).map(r => r.role) || [];
        const presence = presenceData?.find(p => p.user_id === profile.id);
        return {
          ...profile,
          roles: userRoles,
          is_online: presence?.is_online || false,
          current_page: presence?.current_page
        };
      });

      setAvailableUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [user?.id]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!user?.id || !activeConversation) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: activeConversation.id,
          sender_id: user.id,
          content
        });

      if (error) throw error;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive'
      });
    }
  }, [user?.id, activeConversation, toast]);

  // Start a new conversation
  const startConversation = useCallback(async (participantIds: string[], name?: string, isGroup = false) => {
    if (!user?.id) return null;

    try {
      // For 1-on-1 chats, check if conversation already exists
      if (!isGroup && participantIds.length === 1) {
        const existingConv = conversations.find(c => 
          !c.is_group && 
          c.participants?.length === 2 &&
          c.participants?.some(p => p.user_id === participantIds[0])
        );
        if (existingConv) {
          setActiveConversation(existingConv);
          return existingConv;
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          name: isGroup ? name : null,
          is_group: isGroup,
          created_by: user.id
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const allParticipants = [user.id, ...participantIds];
      const { error: partError } = await supabase
        .from('chat_participants')
        .insert(allParticipants.map(userId => ({
          conversation_id: newConv.id,
          user_id: userId
        })));

      if (partError) throw partError;

      await fetchConversations();
      return newConv;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la conversación',
        variant: 'destructive'
      });
      return null;
    }
  }, [user?.id, conversations, fetchConversations, toast]);

  // Subscribe to new messages
  useEffect(() => {
    if (!activeConversation) return;

    const channel = supabase
      .channel(`chat-${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          setMessages(prev => [...prev, { ...newMessage, sender: profile || undefined }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
    fetchAvailableUsers();
  }, [fetchConversations, fetchAvailableUsers]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation, fetchMessages]);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    availableUsers,
    loading,
    loadingMessages,
    sendMessage,
    startConversation,
    fetchConversations,
    fetchAvailableUsers
  };
}
