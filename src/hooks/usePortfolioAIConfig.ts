import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface PortfolioAIFeatures {
  ai_search: boolean;
  ai_feed_ranking: boolean;
  ai_caption_helper: boolean;
  ai_bio_helper: boolean;
  ai_moderation: boolean;
  ai_insights: boolean;
  ai_recommendations: boolean;
}

export interface PortfolioAIConfig {
  enabled: boolean;
  provider: 'gemini' | 'openai' | 'anthropic';
  model: string;
  features: PortfolioAIFeatures;
}

const DEFAULT_CONFIG: PortfolioAIConfig = {
  enabled: false,
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  features: {
    ai_search: false,
    ai_feed_ranking: false,
    ai_caption_helper: true,
    ai_bio_helper: true,
    ai_moderation: false,
    ai_insights: false,
    ai_recommendations: false,
  },
};

export interface PortfolioAIConfigHook {
  config: PortfolioAIConfig;
  loading: boolean;
  saving: boolean;
  updateConfig: (config: Partial<PortfolioAIConfig>) => Promise<boolean>;
  toggleFeature: (feature: keyof PortfolioAIFeatures) => Promise<boolean>;
  isFeatureEnabled: (feature: keyof PortfolioAIFeatures) => boolean;
  refetch: () => Promise<void>;
}

export function usePortfolioAIConfig(): PortfolioAIConfigHook {
  const { user, profile } = useAuth();
  const organizationId = profile?.current_organization_id;
  const [config, setConfig] = useState<PortfolioAIConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!organizationId) {
      setConfig(DEFAULT_CONFIG);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profile_ai_config')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[usePortfolioAIConfig] Error:', error);
      }

      if (data) {
        const featuresData = data.features as unknown;
        const parsedFeatures: PortfolioAIFeatures = 
          typeof featuresData === 'object' && featuresData !== null
            ? { ...DEFAULT_CONFIG.features, ...(featuresData as Partial<PortfolioAIFeatures>) }
            : DEFAULT_CONFIG.features;
        
        setConfig({
          enabled: data.enabled ?? false,
          provider: (data.provider as PortfolioAIConfig['provider']) ?? 'gemini',
          model: data.model ?? 'gemini-2.5-flash',
          features: parsedFeatures,
        });
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    } catch (error) {
      console.error('[usePortfolioAIConfig] Error:', error);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback(async (updates: Partial<PortfolioAIConfig>): Promise<boolean> => {
    if (!organizationId || !user?.id) return false;

    setSaving(true);
    try {
      const newConfig = { ...config, ...updates };
      
      // First check if record exists
      const { data: existing } = await supabase
        .from('profile_ai_config')
        .select('id')
        .eq('organization_id', organizationId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('profile_ai_config')
          .update({
            enabled: newConfig.enabled,
            provider: newConfig.provider,
            model: newConfig.model,
            features: newConfig.features as unknown as Json,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profile_ai_config')
          .insert({
            organization_id: organizationId,
            enabled: newConfig.enabled,
            provider: newConfig.provider,
            model: newConfig.model,
            features: newConfig.features as unknown as Json,
            updated_by: user.id,
          });
        if (error) throw error;
      }

      setConfig(newConfig);
      return true;
    } catch (error) {
      console.error('[usePortfolioAIConfig] Update error:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [config, organizationId, user?.id]);

  const toggleFeature = useCallback(async (feature: keyof PortfolioAIFeatures): Promise<boolean> => {
    const newFeatures = {
      ...config.features,
      [feature]: !config.features[feature],
    };
    return updateConfig({ features: newFeatures });
  }, [config.features, updateConfig]);

  const isFeatureEnabled = useCallback((feature: keyof PortfolioAIFeatures): boolean => {
    return config.enabled && config.features[feature];
  }, [config]);

  return {
    config,
    loading,
    saving,
    updateConfig,
    toggleFeature,
    isFeatureEnabled,
    refetch: fetchConfig,
  };
}
