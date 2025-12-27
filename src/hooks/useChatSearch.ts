import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SearchResult {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender_name: string | null;
  conversation_name: string | null;
}

export function useChatSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const searchMessages = useCallback(async (query: string, conversationId?: string) => {
    if (!user?.id || !query.trim()) {
      setResults([]);
      return [];
    }

    setLoading(true);
    try {
      // Get user's conversation IDs first
      const { data: participations } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!participations?.length) {
        setResults([]);
        return [];
      }

      const conversationIds = conversationId 
        ? [conversationId]
        : participations.map(p => p.conversation_id);

      // Search messages using text search
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id, conversation_id, content, created_at, sender_id')
        .in('conversation_id', conversationIds)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!messages?.length) {
        setResults([]);
        return [];
      }

      // Get sender profiles
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds);

      // Get conversation names
      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('id, name')
        .in('id', conversationIds);

      const searchResults: SearchResult[] = messages.map(msg => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        content: msg.content,
        created_at: msg.created_at,
        sender_id: msg.sender_id,
        sender_name: profiles?.find(p => p.id === msg.sender_id)?.full_name || null,
        conversation_name: conversations?.find(c => c.id === msg.conversation_id)?.name || null
      }));

      setResults(searchResults);
      return searchResults;
    } catch (error) {
      console.error('Error searching messages:', error);
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    loading,
    searchMessages,
    clearResults
  };
}
