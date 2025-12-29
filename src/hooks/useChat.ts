import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useChatRBAC } from '@/hooks/useChatRBAC';
import { AI_USER_PREFIX, getAIUserId, isAIUser } from '@/hooks/useAIChat';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
  delivered_at?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  sender?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface ChatConversation {
  id: string;
  name: string | null;
  is_group: boolean;
  chat_type: 'direct' | 'group' | 'ai_assistant';
  organization_id: string | null;
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
  can_chat?: boolean;
  can_add_to_group?: boolean;
}

export function useChat() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { visibleUsers, canChatWith, canAddToGroup, userRole } = useChatRBAC();
  
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [orgMemberIds, setOrgMemberIds] = useState<string[]>([]);

  const orgId = profile?.current_organization_id;
  const isAdmin = userRole === 'admin';

  // Fetch organization members for chat filtering
  useEffect(() => {
    const fetchOrgMembers = async () => {
      if (!orgId) {
        setOrgMemberIds([]);
        return;
      }
      
      const { data } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId);
      
      if (data) {
        setOrgMemberIds(data.map(m => m.user_id));
      }
    };
    
    fetchOrgMembers();
  }, [orgId]);

  // Fetch all conversations for the current user (filtered by org)
  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data: participations } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      let convsWithDetails: any[] = [];

      if (participations?.length) {
        const conversationIds = participations.map(p => p.conversation_id);

        let query = supabase
          .from('chat_conversations')
          .select('*')
          .in('id', conversationIds)
          .order('updated_at', { ascending: false });

        // Filter by org if user has one
        if (orgId) {
          query = query.or(`organization_id.eq.${orgId},organization_id.is.null`);
        }

        const { data: convs } = await query;

        if (convs) {
          // Fetch participants for each conversation
          convsWithDetails = await Promise.all(convs.map(async (conv) => {
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

            // Count unread messages
            const { data: participant } = await supabase
              .from('chat_participants')
              .select('last_read_at')
              .eq('conversation_id', conv.id)
              .eq('user_id', user.id)
              .maybeSingle();

            const { count: unreadCount } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', user.id)
              .gt('created_at', participant?.last_read_at || '1970-01-01');

            return {
              ...conv,
              chat_type: conv.chat_type || 'direct',
              participants: participants?.map(p => ({
                user_id: p.user_id,
                profile: profiles?.find(pr => pr.id === p.user_id)
              })),
              last_message: lastMessage || undefined,
              unread_count: unreadCount || 0
            };
          }));
        }
      }

      // Add virtual AI assistant conversation if org has it enabled
      // This should happen even if user has no other conversations
      if (orgId) {
        // Fetch organization name
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', orgId)
          .single();

        const orgName = orgData?.name || 'IA';
        const aiAssistantName = `Asistente ${orgName}`;
        
        const aiUserId = getAIUserId(orgId);
        
        // Check if AI conversation already exists
        const existingAIConv = convsWithDetails.find(c => c.chat_type === 'ai_assistant');
        
        if (!existingAIConv) {
          // Create virtual AI conversation entry (at the start of the list)
          const aiConversation = {
            id: `ai-${orgId}`,
            name: aiAssistantName,
            is_group: false,
            chat_type: 'ai_assistant' as const,
            organization_id: orgId,
            created_by: null,
            content_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            participants: [{
              user_id: aiUserId,
              profile: {
                id: aiUserId,
                full_name: aiAssistantName,
                avatar_url: null as string | null
              }
            }],
            unread_count: 0
          };
          convsWithDetails.unshift(aiConversation as any);
        }
      }

      setConversations(convsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, orgId]);

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

        // Mark messages as read
        await supabase.rpc('mark_messages_read', {
          _conversation_id: conversationId,
          _user_id: user?.id
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [user?.id]);

  // Fetch available users to chat with (filtered by RBAC)
  const fetchAvailableUsers = useCallback(async () => {
    if (!user?.id) return;

    try {
      let profilesQuery = supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .neq('id', user.id);
      
      // Filter by organization members
      if (orgMemberIds.length > 0) {
        profilesQuery = profilesQuery.in('id', orgMemberIds);
      }

      const { data: allProfiles } = await profilesQuery;

      if (!allProfiles) return;

      // Get roles from organization_member_roles for org context
      const { data: allRoles } = await supabase
        .from('organization_member_roles')
        .select('user_id, role');

      // Get presence data
      const { data: presenceData } = await supabase
        .from('user_presence')
        .select('user_id, is_online, current_page');

      const usersWithRoles = allProfiles.map(profile => {
        const userRoles = allRoles?.filter(r => r.user_id === profile.id).map(r => r.role) || [];
        const presence = presenceData?.find(p => p.user_id === profile.id);
        const visibleUser = visibleUsers.find(v => v.user_id === profile.id);
        
        return {
          ...profile,
          roles: userRoles,
          is_online: presence?.is_online || false,
          current_page: presence?.current_page,
          can_chat: visibleUser?.can_chat ?? canChatWith(profile.id),
          can_add_to_group: visibleUser?.can_add_to_group ?? canAddToGroup(profile.id)
        };
      });

      // Filter to only show users that can be seen in list
      const filteredUsers = usersWithRoles.filter(u => u.can_chat);

      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [user?.id, orgMemberIds, visibleUsers, canChatWith, canAddToGroup]);

  // Send a message with optional attachment
  const sendMessage = useCallback(async (
    content: string,
    attachment?: {
      url: string;
      type: string;
      name: string;
      size: number;
    }
  ) => {
    if (!user?.id || !activeConversation) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: activeConversation.id,
          sender_id: user.id,
          content,
          attachment_url: attachment?.url || null,
          attachment_type: attachment?.type || null,
          attachment_name: attachment?.name || null,
          attachment_size: attachment?.size || null
        });

      if (error) throw error;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive'
      });
    }
  }, [user?.id, activeConversation, toast]);

  // Start a new conversation (with org context)
  const startConversation = useCallback(async (
    participantIds: string[], 
    name?: string, 
    isGroup = false,
    chatType: 'direct' | 'group' | 'ai_assistant' = isGroup ? 'group' : 'direct'
  ) => {
    if (!user?.id) return null;

    // Validate RBAC for 1:1 chats
    if (!isGroup && participantIds.length === 1) {
      if (!canChatWith(participantIds[0])) {
        toast({
          title: 'No permitido',
          description: 'No tienes permiso para chatear con este usuario',
          variant: 'destructive'
        });
        return null;
      }

      // Check if conversation already exists
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

    // Validate RBAC for groups
    if (isGroup) {
      const invalidUsers = participantIds.filter(id => !canAddToGroup(id));
      if (invalidUsers.length > 0) {
        toast({
          title: 'No permitido',
          description: 'Algunos usuarios no pueden ser agregados a grupos',
          variant: 'destructive'
        });
        return null;
      }
    }

    try {
      // Create conversation with org context
      const { data: newConv, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          name: isGroup ? name : null,
          is_group: isGroup,
          chat_type: chatType,
          organization_id: orgId,
          created_by: user.id
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add creator as participant
      await supabase
        .from('chat_participants')
        .insert({
          conversation_id: newConv.id,
          user_id: user.id
        });

      // Add other participants
      for (const participantId of participantIds) {
        await supabase
          .from('chat_participants')
          .insert({
            conversation_id: newConv.id,
            user_id: participantId
          });
      }

      await fetchConversations();
      
      const fullConv = conversations.find(c => c.id === newConv.id) || {
        ...newConv,
        chat_type: chatType
      };
      setActiveConversation(fullConv as ChatConversation);
      
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
  }, [user?.id, orgId, conversations, fetchConversations, toast, canChatWith, canAddToGroup]);

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

          // Mark as delivered if not from current user
          if (newMessage.sender_id !== user?.id) {
            await supabase.rpc('mark_message_delivered', { _message_id: newMessage.id });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation, user?.id]);

  // Subscribe to read receipt updates
  useEffect(() => {
    if (!activeConversation) return;

    const channel = supabase
      .channel(`read-receipts-${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id 
              ? { ...msg, read_at: updatedMessage.read_at, delivered_at: updatedMessage.delivered_at }
              : msg
          ));
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

  // Delete a conversation (admin only)
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!isAdmin) {
      toast({
        title: 'Error',
        description: 'No tienes permisos para eliminar conversaciones',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      await fetchConversations();
      
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
      }

      toast({
        title: 'Conversación eliminada',
        description: 'La conversación se ha eliminado correctamente'
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la conversación',
        variant: 'destructive'
      });
      return false;
    }
  }, [isAdmin, activeConversation, fetchConversations, toast]);

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
    fetchAvailableUsers,
    deleteConversation,
    isAdmin,
    userRole
  };
}
