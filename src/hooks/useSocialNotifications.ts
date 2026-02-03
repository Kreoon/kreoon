import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SocialNotification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'follow' | 'like' | 'comment' | 'mention' | 'share';
  content_id: string | null;
  content_type: 'post' | 'story' | 'content' | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    username: string | null;
  };
}

export function useSocialNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: raw, error } = await supabase
        .from('social_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notificationsData = raw || [];
      if (notificationsData.length > 0) {
        const actorIds = [...new Set(notificationsData.map((n: SocialNotification) => n.actor_id).filter(Boolean))];
        const { data: actors } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', actorIds);
        const actorMap = new Map((actors ?? []).map(a => [a.id, a]));
        notificationsData.forEach((n: SocialNotification) => {
          (n as any).actor = actorMap.get(n.actor_id) ?? null;
        });
      }

      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter((n: SocialNotification) => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      await (supabase as any)
        .from('social_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      await (supabase as any)
        .from('social_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user?.id]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      await (supabase as any)
        .from('social_notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    const channel = supabase
      .channel('social-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const newNotif = payload.new as SocialNotification;
          const { data } = await supabase
            .from('social_notifications')
            .select('*')
            .eq('id', newNotif.id)
            .single();

          if (data && newNotif.actor_id) {
            const { data: actor } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, username')
              .eq('id', newNotif.actor_id)
              .single();
            (data as any).actor = actor ?? null;
            setNotifications(prev => [data as SocialNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications
  };
}
