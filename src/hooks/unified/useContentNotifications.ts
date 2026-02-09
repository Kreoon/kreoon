import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ContentStatus } from '@/types/database';

export interface ContentNotification {
  id: string;
  type: 'content_delivered' | 'content_approved' | 'content_rejected' | 'content_published' | 'content_shared';
  title: string;
  message: string;
  contentId: string;
  contentTitle: string;
  createdAt: Date;
  read: boolean;
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    feedback?: string;
    creatorId?: string;
    clientId?: string;
  };
}

interface UseContentNotificationsOptions {
  enabled?: boolean;
  showToasts?: boolean;
  clientId?: string;
  creatorId?: string;
}

interface UseContentNotificationsReturn {
  notifications: ContentNotification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export function useContentNotifications(options: UseContentNotificationsOptions = {}): UseContentNotificationsReturn {
  const { user } = useAuth();
  const { enabled = true, showToasts = true, clientId, creatorId } = options;

  const [notifications, setNotifications] = useState<ContentNotification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (!user?.id) return;

    const stored = localStorage.getItem(`content_notifications_${user.id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        })));
      } catch (e) {
        console.error('[useContentNotifications] Error parsing stored notifications:', e);
      }
    }
  }, [user?.id]);

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (!user?.id || notifications.length === 0) return;

    localStorage.setItem(
      `content_notifications_${user.id}`,
      JSON.stringify(notifications)
    );
  }, [notifications, user?.id]);

  // Create a notification
  const createNotification = useCallback((notification: Omit<ContentNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: ContentNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep max 50 notifications

    if (showToasts) {
      toast(notification.title, {
        description: notification.message,
        action: {
          label: 'Ver',
          onClick: () => {
            window.location.href = `/content/${notification.contentId}`;
          }
        }
      });
    }
  }, [showToasts]);

  // Subscribe to content changes
  useEffect(() => {
    if (!enabled || !user?.id) return;

    // Subscribe to content table changes
    const channel = supabase
      .channel('content_notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content'
        },
        async (payload) => {
          const { old: oldRecord, new: newRecord } = payload;

          // Skip if no status change
          if (oldRecord.status === newRecord.status) return;

          // Get content details
          const { data: content } = await supabase
            .from('content')
            .select(`
              id,
              title,
              creator_id,
              client_id,
              clients:client_id(name)
            `)
            .eq('id', newRecord.id)
            .single();

          if (!content) return;

          // Determine if user should receive notification
          const isCreator = content.creator_id === user.id;
          const isClient = clientId && content.client_id === clientId;

          // Content delivered - notify client
          if (newRecord.status === 'delivered' && oldRecord.status !== 'delivered') {
            if (isClient) {
              createNotification({
                type: 'content_delivered',
                title: 'Nuevo contenido entregado',
                message: `"${content.title}" está listo para tu revisión`,
                contentId: content.id,
                contentTitle: content.title,
                metadata: {
                  oldStatus: oldRecord.status,
                  newStatus: newRecord.status,
                  creatorId: content.creator_id
                }
              });
            }
          }

          // Content approved - notify creator
          if (newRecord.status === 'approved' && oldRecord.status !== 'approved') {
            if (isCreator) {
              createNotification({
                type: 'content_approved',
                title: 'Contenido aprobado',
                message: `"${content.title}" fue aprobado por ${(content as any).clients?.name || 'el cliente'}`,
                contentId: content.id,
                contentTitle: content.title,
                metadata: {
                  oldStatus: oldRecord.status,
                  newStatus: newRecord.status,
                  clientId: content.client_id || undefined
                }
              });
            }
          }

          // Content rejected (issue) - notify creator
          if (newRecord.status === 'issue' && oldRecord.status !== 'issue') {
            if (isCreator) {
              createNotification({
                type: 'content_rejected',
                title: 'Novedad reportada',
                message: `"${content.title}" requiere correcciones`,
                contentId: content.id,
                contentTitle: content.title,
                metadata: {
                  oldStatus: oldRecord.status,
                  newStatus: newRecord.status,
                  clientId: content.client_id || undefined,
                  feedback: newRecord.notes
                }
              });
            }
          }

          // Content published - notify both
          if (newRecord.is_published && !oldRecord.is_published) {
            if (isCreator || isClient) {
              createNotification({
                type: 'content_published',
                title: 'Contenido publicado',
                message: `"${content.title}" ahora está publicado en el Marketplace`,
                contentId: content.id,
                contentTitle: content.title,
                metadata: {
                  newStatus: 'published'
                }
              });
            }
          }

          // Content shared on Kreoon - notify both
          if (newRecord.shared_on_kreoon && !oldRecord.shared_on_kreoon) {
            if (isCreator || isClient) {
              createNotification({
                type: 'content_shared',
                title: 'Contenido compartido',
                message: `"${content.title}" fue compartido en el Marketplace como colaboración`,
                contentId: content.id,
                contentTitle: content.title,
                metadata: {
                  newStatus: 'shared'
                }
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, user?.id, clientId, creatorId, createNotification]);

  // Mark a notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    if (user?.id) {
      localStorage.removeItem(`content_notifications_${user.id}`);
    }
  }, [user?.id]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
}
