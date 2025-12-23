import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UPSetting {
  id: string;
  key: string;
  value: Record<string, any>;
  label: string;
  description: string | null;
  category: string;
  updated_at: string;
  updated_by: string | null;
}

export interface LevelThresholds {
  bronze: number;
  silver: number;
  gold: number;
  diamond: number;
}

export function useUPSettings() {
  const [settings, setSettings] = useState<UPSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel('up-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'up_settings'
        },
        () => fetchSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('up_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setSettings((data as UPSetting[]) || []);
    } catch (error) {
      console.error('Error fetching UP settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: Record<string, any>) => {
    const { error } = await supabase
      .from('up_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) throw error;
    await fetchSettings();
  };

  const getSetting = (key: string): Record<string, any> | null => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || null;
  };

  const getLevelThresholds = (): LevelThresholds => {
    const setting = getSetting('level_thresholds');
    return {
      bronze: setting?.bronze ?? 0,
      silver: setting?.silver ?? 100,
      gold: setting?.gold ?? 250,
      diamond: setting?.diamond ?? 500
    };
  };

  const isSystemEnabled = (): boolean => {
    const setting = getSetting('system_enabled');
    return setting?.enabled ?? true;
  };

  return {
    settings,
    loading,
    updateSetting,
    getSetting,
    getLevelThresholds,
    isSystemEnabled,
    refetch: fetchSettings
  };
}
