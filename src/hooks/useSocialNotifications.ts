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
      // Use any to bypass type checking for new table
      const { data, error } = await (supabase as any)
        .from('social_notifications')
        .select(`
          *,
          actor:profiles!social_notifications_actor_id_fkey(
            id, full_name, avatar_url, username
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n: SocialNotification) => !n.is_read).length || 0);
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
          // Fetch the new notification with actor info
          const { data } = await (supabase as any)
            .from('social_notifications')
            .select(`
              *,
              actor:profiles!social_notifications_actor_id_fkey(
                id, full_name, avatar_url, username
              )
            `)
            .eq('id', (payload.new as any).id)
            .single();

          if (data) {
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
