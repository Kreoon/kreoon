import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MarketplaceNotification } from '@/types/marketplace';

export function useMarketplaceNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['marketplace-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from('marketplace_notifications')
        .select(`
          *,
          actor:profiles!actor_id (id, full_name, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as MarketplaceNotification[];
    },
    enabled: !!user?.id,
  });

  // Unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Mark as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('No autenticado');

      const { error } = await (supabase as any)
        .from('marketplace_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-notifications', user?.id] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No autenticado');

      const { error } = await (supabase as any)
        .from('marketplace_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-notifications', user?.id] });
    },
  });

  // Delete notification
  const deleteMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('No autenticado');

      const { error } = await (supabase as any)
        .from('marketplace_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-notifications', user?.id] });
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('marketplace-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  // Get notification icon
  const getNotificationIcon = (type: MarketplaceNotification['notification_type']): string => {
    const icons: Record<string, string> = {
      new_proposal: '📥',
      proposal_accepted: '✅',
      proposal_declined: '❌',
      proposal_expired: '⏰',
      new_message: '💬',
      new_review: '⭐',
      availability_reminder: '🔔',
      contract_started: '🚀',
      contract_completed: '🎉',
      payment_received: '💰',
    };
    return icons[type] || '📣';
  };

  // Get notification color
  const getNotificationColor = (type: MarketplaceNotification['notification_type']): string => {
    const colors: Record<string, string> = {
      new_proposal: 'bg-blue-500/20 text-blue-500',
      proposal_accepted: 'bg-green-500/20 text-green-500',
      proposal_declined: 'bg-red-500/20 text-red-500',
      proposal_expired: 'bg-yellow-500/20 text-yellow-500',
      new_message: 'bg-purple-500/20 text-purple-500',
      new_review: 'bg-amber-500/20 text-amber-500',
      availability_reminder: 'bg-blue-500/20 text-blue-500',
      contract_started: 'bg-green-500/20 text-green-500',
      contract_completed: 'bg-green-600/20 text-green-600',
      payment_received: 'bg-emerald-500/20 text-emerald-500',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-500';
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    deleteNotification: deleteMutation.mutateAsync,
    getNotificationIcon,
    getNotificationColor,
  };
}
