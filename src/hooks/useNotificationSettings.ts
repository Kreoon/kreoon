import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface NotificationPreferences {
  // Push notifications
  pushEnabled: boolean;
  pushChat: boolean;
  pushContent: boolean;
  pushAssignments: boolean;
  pushPayments: boolean;
  pushComments: boolean;
  pushMentions: boolean;
  
  // Email notifications
  emailEnabled: boolean;
  emailDigest: 'instant' | 'daily' | 'weekly' | 'never';
  emailChat: boolean;
  emailContent: boolean;
  emailAssignments: boolean;
  emailPayments: boolean;
  
  // In-app notifications
  inAppEnabled: boolean;
  inAppSound: boolean;
  inAppVibration: boolean;
  soundVolume: number;
  
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  
  // Notification grouping
  groupNotifications: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  pushChat: true,
  pushContent: true,
  pushAssignments: true,
  pushPayments: true,
  pushComments: true,
  pushMentions: true,
  
  emailEnabled: true,
  emailDigest: 'instant',
  emailChat: false,
  emailContent: true,
  emailAssignments: true,
  emailPayments: true,
  
  inAppEnabled: true,
  inAppSound: true,
  inAppVibration: true,
  soundVolume: 70,
  
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  
  groupNotifications: true,
};

export function useNotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Save to database (defined before fetchPreferences to avoid hoisting issues)
  const saveToDb = useCallback(async (prefs: NotificationPreferences) => {
    if (!user?.id) return;

    // Use any to handle new table not in types yet
    const { error } = await (supabase
      .from('user_notification_settings' as any)
      .upsert({
        user_id: user.id,
        organization_id: null,
        settings: prefs,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,organization_id',
      }) as any);

    if (error) {
      console.error('Error saving notification settings:', error);
      throw error;
    }
  }, [user?.id]);

  // Fetch preferences from DB
  const fetchPreferences = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Use any to handle new table not in types yet
      const { data, error } = await (supabase
        .from('user_notification_settings' as any)
        .select('settings')
        .eq('user_id', user.id)
        .is('organization_id', null)
        .single() as any) as { data: { settings: NotificationPreferences } | null; error: any };

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification settings:', error);
      }

      if (data?.settings) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...(data.settings as NotificationPreferences) });
      } else {
        // Migrate from localStorage if exists
        const localSettings = localStorage.getItem('notificationPreferences');
        if (localSettings) {
          try {
            const parsed = JSON.parse(localSettings);
            setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
            // Save to DB
            await saveToDb({ ...DEFAULT_PREFERENCES, ...parsed });
            // Clean up localStorage
            localStorage.removeItem('notificationPreferences');
          } catch {
            console.error('Error migrating localStorage settings');
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchPreferences:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, saveToDb]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Update a single preference
  const updatePreference = useCallback(<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  // Save all preferences
  const savePreferences = useCallback(async () => {
    setSaving(true);
    try {
      await saveToDb(preferences);
      toast({
        title: "Preferencias guardadas",
        description: "Tus preferencias de notificaciones se han actualizado.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar las preferencias.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [preferences, toast]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    setPreferences(DEFAULT_PREFERENCES);
    setSaving(true);
    try {
      await saveToDb(DEFAULT_PREFERENCES);
      toast({
        title: "Preferencias restablecidas",
        description: "Se han restablecido los valores por defecto.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron restablecer las preferencias.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [toast]);

  return {
    preferences,
    loading,
    saving,
    updatePreference,
    savePreferences,
    resetToDefaults,
    refetch: fetchPreferences,
  };
}
