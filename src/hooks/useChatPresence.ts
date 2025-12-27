import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserPresenceData {
  user_id: string;
  is_online: boolean;
  last_seen: string | null;
  current_page: string | null;
  last_activity: string | null;
}

export function useChatPresence(userIds: string[]) {
  const [presenceData, setPresenceData] = useState<Map<string, UserPresenceData>>(new Map());

  const fetchPresence = useCallback(async () => {
    if (userIds.length === 0) return;

    const { data } = await supabase
      .from('user_presence')
      .select('user_id, is_online, last_seen, current_page, last_activity')
      .in('user_id', userIds);

    if (data) {
      const map = new Map<string, UserPresenceData>();
      data.forEach(p => map.set(p.user_id, p));
      setPresenceData(map);
    }
  }, [userIds]);

  useEffect(() => {
    fetchPresence();

    // Subscribe to presence changes
    const channel = supabase
      .channel('chat-presence-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        (payload) => {
          const newData = payload.new as UserPresenceData;
          if (userIds.includes(newData.user_id)) {
            setPresenceData(prev => {
              const updated = new Map(prev);
              updated.set(newData.user_id, newData);
              return updated;
            });
          }
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPresence, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userIds, fetchPresence]);

  const getPresence = useCallback((userId: string): UserPresenceData | null => {
    return presenceData.get(userId) || null;
  }, [presenceData]);

  const isOnline = useCallback((userId: string): boolean => {
    const p = presenceData.get(userId);
    if (!p) return false;
    
    // Consider online if is_online=true AND last_activity within 2 minutes
    if (!p.is_online) return false;
    if (!p.last_activity) return p.is_online;
    
    const lastActivity = new Date(p.last_activity).getTime();
    const now = Date.now();
    return (now - lastActivity) < 2 * 60 * 1000; // 2 minutes
  }, [presenceData]);

  const getLastSeen = useCallback((userId: string): string | null => {
    const p = presenceData.get(userId);
    return p?.last_seen || p?.last_activity || null;
  }, [presenceData]);

  return {
    presenceData,
    getPresence,
    isOnline,
    getLastSeen,
    refresh: fetchPresence
  };
}
