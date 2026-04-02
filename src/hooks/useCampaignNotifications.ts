import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ── Types matching campaign_notifications table (migration V2) ────────

type CampaignNotificationType =
  | 'new_campaign'
  | 'campaign_invitation'
  | 'application_status'
  | 'deliverable_feedback'
  | 'payment_released'
  | 'campaign_reminder'
  | 'counter_offer';

type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface CampaignNotification {
  id: string;
  user_id: string;
  creator_profile_id: string | null;
  campaign_id: string | null;
  application_id: string | null;
  invitation_id: string | null;
  notification_type: CampaignNotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  status: NotificationStatus;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_reason: string | null;
  send_push: boolean;
  send_email: boolean;
  send_in_app: boolean;
  match_score: number | null;
  match_reasons: Record<string, any>[] | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  notify_new_campaigns: boolean;
  notify_invitations: boolean;
  notify_application_updates: boolean;
  notify_payments: boolean;
  notify_reminders: boolean;
  min_budget_notification: number | null;
  preferred_categories: string[];
  preferred_campaign_types: string[];
  instant_notifications: boolean;
  daily_digest_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  notify_new_campaigns: true,
  notify_invitations: true,
  notify_application_updates: true,
  notify_payments: true,
  notify_reminders: true,
  min_budget_notification: null,
  preferred_categories: [],
  preferred_campaign_types: [],
  instant_notifications: true,
  daily_digest_enabled: false,
  push_enabled: true,
  email_enabled: true,
};

// ── Hook ──────────────────────────────────────────────────────────────

export function useCampaignNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CampaignNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // ── Fetch notifications ────────────────────────────────────────────

  const fetchNotifications = useCallback(async (limit = 20) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaign_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter((n: any) => !n.read_at).length);
    } catch (err) {
      console.error('[useCampaignNotifications] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── Mark single as read ────────────────────────────────────────────

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('campaign_notifications')
        .update({
          read_at: new Date().toISOString(),
          status: 'read',
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString(), status: 'read' as NotificationStatus }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[useCampaignNotifications] Mark read error:', err);
    }
  }, [user]);

  // ── Mark all as read ───────────────────────────────────────────────

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('campaign_notifications')
        .update({
          read_at: new Date().toISOString(),
          status: 'read',
        })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      const now = new Date().toISOString();
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          read_at: n.read_at || now,
          status: (n.read_at ? n.status : 'read') as NotificationStatus,
        }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('[useCampaignNotifications] Mark all read error:', err);
    }
  }, [user]);

  // ── Notification preferences ───────────────────────────────────────

  const fetchPreferences = useCallback(async (creatorProfileId: string) => {
    try {
      const { data, error } = await supabase
        .from('creator_notification_preferences')
        .select('*')
        .eq('creator_profile_id', creatorProfileId)
        .maybeSingle();

      if (error) throw error;

      setPreferences(data || { ...DEFAULT_PREFERENCES });
    } catch (err) {
      console.error('[useCampaignNotifications] Preferences fetch error:', err);
      setPreferences({ ...DEFAULT_PREFERENCES });
    }
  }, []);

  const updatePreferences = useCallback(async (
    creatorProfileId: string,
    newPreferences: Partial<NotificationPreferences>,
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('creator_notification_preferences')
        .upsert(
          {
            creator_profile_id: creatorProfileId,
            ...newPreferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'creator_profile_id' },
        );

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...newPreferences } : null);
      return true;
    } catch (err) {
      console.error('[useCampaignNotifications] Preferences update error:', err);
      return false;
    }
  }, []);

  // ── Realtime: new notifications ────────────────────────────────────
  // Notifications are push-based by nature, so realtime is appropriate here
  // (unlike content/dashboard which use manual refetch only).

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`campaign-notif-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as CampaignNotification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ── Initial fetch ──────────────────────────────────────────────────

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    preferences,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    fetchPreferences,
    updatePreferences,
  };
}
