import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_LEVEL_THRESHOLDS, parseThresholdsFromDB, type LevelThresholds } from '@/lib/upLevels';

export type { LevelThresholds };

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

export interface MultiCurrencyConfig {
  secondary_currency_enabled: boolean;
  secondary_currency_name: string;
  secondary_currency_icon: string;
}

export function useUPSettings() {
  const [settings, setSettings] = useState<UPSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [currencyConfig, setCurrencyConfig] = useState<MultiCurrencyConfig>({
    secondary_currency_enabled: false,
    secondary_currency_name: 'XP',
    secondary_currency_icon: '⭐'
  });

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
      
      const settingsData = (data as any[]) || [];
      setSettings(settingsData.map(s => ({
        id: s.id,
        key: s.key,
        value: s.value,
        label: s.label,
        description: s.description,
        category: s.category,
        updated_at: s.updated_at,
        updated_by: s.updated_by
      })));
      
      // Extract currency config from first row (shared across all)
      if (settingsData.length > 0) {
        setCurrencyConfig({
          secondary_currency_enabled: settingsData[0].secondary_currency_enabled ?? false,
          secondary_currency_name: settingsData[0].secondary_currency_name ?? 'XP',
          secondary_currency_icon: settingsData[0].secondary_currency_icon ?? '⭐'
        });
      }
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

  const updateCurrencyConfig = async (config: MultiCurrencyConfig) => {
    try {
      // Get all setting IDs first
      const { data: allSettings } = await supabase
        .from('up_settings')
        .select('id');
      
      if (!allSettings || allSettings.length === 0) {
        throw new Error('No settings found');
      }

      // Update each setting row individually
      const updatePromises = allSettings.map(setting => 
        supabase
          .from('up_settings')
          .update({
            secondary_currency_enabled: config.secondary_currency_enabled,
            secondary_currency_name: config.secondary_currency_name,
            secondary_currency_icon: config.secondary_currency_icon
          } as any)
          .eq('id', setting.id)
      );

      await Promise.all(updatePromises);
      setCurrencyConfig(config);
      await fetchSettings();
    } catch (error) {
      console.error('Error updating currency config:', error);
      throw error;
    }
  };

  const getSetting = (key: string): Record<string, any> | null => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || null;
  };

  const getLevelThresholds = (): LevelThresholds => {
    const setting = getSetting('level_thresholds');
    return parseThresholdsFromDB(setting);
  };

  const isSystemEnabled = (): boolean => {
    const setting = getSetting('system_enabled');
    return setting?.enabled ?? true;
  };

  const isSecondaryCurrencyEnabled = (): boolean => {
    return currencyConfig.secondary_currency_enabled;
  };

  return {
    settings,
    loading,
    updateSetting,
    getSetting,
    getLevelThresholds,
    isSystemEnabled,
    currencyConfig,
    updateCurrencyConfig,
    isSecondaryCurrencyEnabled,
    refetch: fetchSettings
  };
}
