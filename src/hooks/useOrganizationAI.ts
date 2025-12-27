import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AIProvider {
  id: string;
  organization_id: string;
  provider_key: string;
  is_enabled: boolean;
  api_key_encrypted: string | null;
  available_models: string[];
  created_at: string;
  updated_at: string;
  configured_by: string | null;
}

export interface AIDefaults {
  id: string;
  organization_id: string;
  default_provider: string;
  default_model: string;
  scripts_provider: string | null;
  scripts_model: string | null;
  thumbnails_provider: string | null;
  thumbnails_model: string | null;
  sistema_up_provider: string | null;
  sistema_up_model: string | null;
  live_assistant_provider: string | null;
  live_assistant_model: string | null;
}

export interface AIUsageLog {
  id: string;
  organization_id: string;
  user_id: string;
  provider: string;
  model: string;
  module: string;
  action: string;
  tokens_input: number | null;
  tokens_output: number | null;
  estimated_cost: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

// Available providers with their models
export const AI_PROVIDERS_CONFIG = {
  lovable: {
    key: 'lovable',
    label: 'Lovable AI',
    description: 'Sin API Key requerida',
    requiresApiKey: false,
    models: [
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado)', default: true },
      { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Rápido)' },
      { value: 'openai/gpt-5', label: 'GPT-5' },
      { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
    ]
  },
  openai: {
    key: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o, GPT-5, DALL-E',
    requiresApiKey: true,
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Recomendado)', default: true },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido)' },
      { value: 'gpt-5', label: 'GPT-5' },
      { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ]
  },
  gemini: {
    key: 'gemini',
    label: 'Google Gemini',
    description: 'Gemini Pro, Flash',
    requiresApiKey: true,
    models: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado)', default: true },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.0-pro', label: 'Gemini 2.0 Pro' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    ]
  },
  anthropic: {
    key: 'anthropic',
    label: 'Anthropic Claude',
    description: 'Claude 3.5, Claude 4',
    requiresApiKey: true,
    models: [
      { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Recomendado)', default: true },
      { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku (Rápido)' },
    ]
  }
};

export const AI_MODULES = [
  { key: 'scripts', label: 'Generación de Guiones' },
  { key: 'thumbnails', label: 'Miniaturas' },
  { key: 'sistema_up', label: 'Sistema UP' },
  { key: 'live_assistant', label: 'Asistente Live' },
];

export function useOrganizationAI(organizationId?: string) {
  const { user } = useAuth();
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [defaults, setDefaults] = useState<AIDefaults | null>(null);
  const [usageLogs, setUsageLogs] = useState<AIUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch providers
      const { data: providersData, error: providersError } = await supabase
        .from('organization_ai_providers')
        .select('*')
        .eq('organization_id', organizationId);

      if (providersError) throw providersError;
      setProviders((providersData as any[]) || []);

      // Fetch defaults
      const { data: defaultsData, error: defaultsError } = await supabase
        .from('organization_ai_defaults')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (defaultsError) throw defaultsError;
      setDefaults(defaultsData as AIDefaults | null);

      // Fetch usage logs (last 100)
      const { data: logsData, error: logsError } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;
      setUsageLogs((logsData as any[]) || []);

    } catch (error) {
      console.error('Error fetching AI config:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Enable/disable a provider
  const toggleProvider = async (providerKey: string, enabled: boolean) => {
    if (!organizationId) return;
    setSaving(true);

    try {
      const existing = providers.find(p => p.provider_key === providerKey);

      if (existing) {
        const { error } = await supabase
          .from('organization_ai_providers')
          .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const defaultModels = AI_PROVIDERS_CONFIG[providerKey as keyof typeof AI_PROVIDERS_CONFIG]?.models.map(m => m.value) || [];
        const { error } = await supabase
          .from('organization_ai_providers')
          .insert({
            organization_id: organizationId,
            provider_key: providerKey,
            is_enabled: enabled,
            available_models: defaultModels,
            configured_by: user?.id
          });
        if (error) throw error;
      }

      await fetchData();
    } catch (error) {
      console.error('Error toggling provider:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Update provider API key
  const updateProviderApiKey = async (providerKey: string, apiKey: string) => {
    if (!organizationId) return;
    setSaving(true);

    try {
      const existing = providers.find(p => p.provider_key === providerKey);

      if (existing) {
        const { error } = await supabase
          .from('organization_ai_providers')
          .update({ 
            api_key_encrypted: apiKey, // In production, encrypt this!
            updated_at: new Date().toISOString(),
            configured_by: user?.id
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const defaultModels = AI_PROVIDERS_CONFIG[providerKey as keyof typeof AI_PROVIDERS_CONFIG]?.models.map(m => m.value) || [];
        const { error } = await supabase
          .from('organization_ai_providers')
          .insert({
            organization_id: organizationId,
            provider_key: providerKey,
            is_enabled: true,
            api_key_encrypted: apiKey,
            available_models: defaultModels,
            configured_by: user?.id
          });
        if (error) throw error;
      }

      await fetchData();
    } catch (error) {
      console.error('Error updating API key:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Update defaults
  const updateDefaults = async (updates: Partial<AIDefaults>) => {
    if (!organizationId) return;
    setSaving(true);

    try {
      if (defaults) {
        const { error } = await supabase
          .from('organization_ai_defaults')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', defaults.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_ai_defaults')
          .insert({
            organization_id: organizationId,
            ...updates
          });
        if (error) throw error;
      }

      await fetchData();
    } catch (error) {
      console.error('Error updating defaults:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Get effective provider/model for a module
  const getModuleConfig = (module: string): { provider: string; model: string } => {
    if (!defaults) {
      return { provider: 'lovable', model: 'google/gemini-2.5-flash' };
    }

    const moduleProvider = defaults[`${module}_provider` as keyof AIDefaults] as string | null;
    const moduleModel = defaults[`${module}_model` as keyof AIDefaults] as string | null;

    return {
      provider: moduleProvider || defaults.default_provider,
      model: moduleModel || defaults.default_model
    };
  };

  // Get available (enabled) providers
  const getEnabledProviders = () => {
    // Lovable AI is always available
    const enabled = [AI_PROVIDERS_CONFIG.lovable];
    
    providers.forEach(p => {
      if (p.is_enabled && p.provider_key !== 'lovable') {
        const config = AI_PROVIDERS_CONFIG[p.provider_key as keyof typeof AI_PROVIDERS_CONFIG];
        if (config) {
          enabled.push(config);
        }
      }
    });

    return enabled;
  };

  // Check if a provider has a valid API key configured
  const hasValidApiKey = (providerKey: string): boolean => {
    if (providerKey === 'lovable') return true; // No key needed
    const provider = providers.find(p => p.provider_key === providerKey);
    return !!(provider?.api_key_encrypted);
  };

  // Mask API key for display
  const getMaskedApiKey = (providerKey: string): string => {
    const provider = providers.find(p => p.provider_key === providerKey);
    if (!provider?.api_key_encrypted) return '';
    const key = provider.api_key_encrypted;
    if (key.length <= 8) return '****';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  };

  return {
    providers,
    defaults,
    usageLogs,
    loading,
    saving,
    toggleProvider,
    updateProviderApiKey,
    updateDefaults,
    getModuleConfig,
    getEnabledProviders,
    hasValidApiKey,
    getMaskedApiKey,
    refetch: fetchData
  };
}
