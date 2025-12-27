import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

export interface ReactionSummary {
  reaction: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

// Available reactions
export const AVAILABLE_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export function useMessageReactions(conversationId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<Map<string, MessageReaction[]>>(new Map());

  const fetchReactions = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length) return;

    const { data } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);

    if (data) {
      const map = new Map<string, MessageReaction[]>();
      data.forEach(r => {
        const existing = map.get(r.message_id) || [];
        existing.push(r);
        map.set(r.message_id, existing);
      });
      setReactions(map);
    }
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new as MessageReaction;
            setReactions(prev => {
              const updated = new Map(prev);
              const existing = updated.get(newReaction.message_id) || [];
              updated.set(newReaction.message_id, [...existing, newReaction]);
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldReaction = payload.old as MessageReaction;
            setReactions(prev => {
              const updated = new Map(prev);
              const existing = updated.get(oldReaction.message_id) || [];
              updated.set(
                oldReaction.message_id,
                existing.filter(r => r.id !== oldReaction.id)
              );
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const addReaction = useCallback(async (messageId: string, reaction: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction
        });

      if (error) {
        if (error.code === '23505') {
          // Already reacted, remove instead
          await removeReaction(messageId, reaction);
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar la reacción',
        variant: 'destructive'
      });
    }
  }, [user?.id, toast]);

  const removeReaction = useCallback(async (messageId: string, reaction: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction', reaction);
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }, [user?.id]);

  const toggleReaction = useCallback(async (messageId: string, reaction: string) => {
    if (!user?.id) return;

    const messageReactions = reactions.get(messageId) || [];
    const hasReacted = messageReactions.some(
      r => r.reaction === reaction && r.user_id === user.id
    );

    if (hasReacted) {
      await removeReaction(messageId, reaction);
    } else {
      await addReaction(messageId, reaction);
    }
  }, [user?.id, reactions, addReaction, removeReaction]);

  const getReactionSummary = useCallback((messageId: string): ReactionSummary[] => {
    const messageReactions = reactions.get(messageId) || [];
    const summaryMap = new Map<string, ReactionSummary>();

    messageReactions.forEach(r => {
      const existing = summaryMap.get(r.reaction);
      if (existing) {
        existing.count++;
        existing.users.push(r.user_id);
        if (r.user_id === user?.id) existing.hasReacted = true;
      } else {
        summaryMap.set(r.reaction, {
          reaction: r.reaction,
          count: 1,
          users: [r.user_id],
          hasReacted: r.user_id === user?.id
        });
      }
    });

    return Array.from(summaryMap.values());
  }, [reactions, user?.id]);

  return {
    reactions,
    fetchReactions,
    addReaction,
    removeReaction,
    toggleReaction,
    getReactionSummary,
    AVAILABLE_REACTIONS
  };
}
