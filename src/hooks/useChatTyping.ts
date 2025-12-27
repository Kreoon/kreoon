import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TypingUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export function useChatTyping(conversationId: string | null) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Start typing indicator
  const startTyping = useCallback(async () => {
    if (!user?.id || !conversationId || isTypingRef.current) return;

    isTypingRef.current = true;

    try {
      await supabase
        .from('chat_typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          started_at: new Date().toISOString()
        }, {
          onConflict: 'conversation_id,user_id'
        });
    } catch (error) {
      console.error('Error starting typing:', error);
    }

    // Clear after 3 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [user?.id, conversationId]);

  // Stop typing indicator
  const stopTyping = useCallback(async () => {
    if (!user?.id || !conversationId) return;

    isTypingRef.current = false;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    try {
      await supabase
        .from('chat_typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error stopping typing:', error);
    }
  }, [user?.id, conversationId]);

  // Handle keypress - reset timeout
  const handleTyping = useCallback(() => {
    startTyping();
  }, [startTyping]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!conversationId || !user?.id) {
      setTypingUsers([]);
      return;
    }

    // Initial fetch
    const fetchTyping = async () => {
      const { data } = await supabase
        .from('chat_typing_indicators')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id);

      if (data && data.length > 0) {
        const userIds = data.map(t => t.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        setTypingUsers(profiles?.map(p => ({
          user_id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url
        })) || []);
      } else {
        setTypingUsers([]);
      }
    };

    fetchTyping();

    // Realtime subscription
    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          fetchTyping();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopTyping();
    };
  }, [conversationId, user?.id, stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers,
    handleTyping,
    stopTyping
  };
}
