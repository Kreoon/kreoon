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
  perplexity_model: string | null;
  perplexity_features: Record<string, boolean> | null;
}

export const PERPLEXITY_MODELS = [
  { value: 'llama-3.1-sonar-small-128k-online', label: 'Sonar Small (Rápido, económico)' },
  { value: 'llama-3.1-sonar-large-128k-online', label: 'Sonar Large (Recomendado)' },
  { value: 'llama-3.1-sonar-huge-128k-online', label: 'Sonar Huge (Máxima calidad)' },
];

export const PERPLEXITY_FEATURES = [
  { key: 'scripts', label: 'Generación de guiones', description: 'Investigar tendencias antes de crear guiones' },
  { key: 'research', label: 'Investigación de mercado', description: 'Enriquecer briefs con datos actuales' },
  { key: 'board', label: 'Análisis de tablero', description: 'Contexto de tendencias en tarjetas' },
  { key: 'talent', label: 'Matching de talento', description: 'Sugerir tipo de creador por tendencias' },
  { key: 'live', label: 'Live Shopping', description: 'Tendencias para eventos en vivo' },
] as const;

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

// Available providers with their models (Direct API)
export const AI_PROVIDERS_CONFIG = {
  gemini: {
    key: 'gemini',
    label: 'Google Gemini',
    description: 'Gemini Pro, Flash - API Directa',
    requiresApiKey: true,
    models: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado)', default: true },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.0-pro', label: 'Gemini 2.0 Pro' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    ]
  },
  openai: {
    key: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o, GPT-5, DALL-E - API Directa',
    requiresApiKey: true,
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Recomendado)', default: true },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido)' },
      { value: 'gpt-5', label: 'GPT-5' },
      { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
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
  },
  xai: {
    key: 'xai',
    label: 'xAI Grok',
    description: 'Grok 2 - API Directa',
    requiresApiKey: true,
    models: [
      { value: 'grok-2-1212', label: 'Grok 2 (Recomendado)', default: true },
      { value: 'grok-2-vision-1212', label: 'Grok 2 Vision' },
      { value: 'grok-2-1212-fast', label: 'Grok 2 Fast' },
    ]
  }
};

export const AI_MODULES = [
  { key: 'tablero', label: 'Tablero (Kanban)', description: 'Análisis de tarjetas, detección de cuellos de botella, recomendaciones' },
  { key: 'scripts', label: 'Generación de Guiones', description: 'Creación y mejora de guiones para contenido' },
  { key: 'thumbnails', label: 'Miniaturas', description: 'Generación de prompts para thumbnails' },
  { key: 'sistema_up', label: 'Sistema UP', description: 'Copiloto de puntos y logros' },
  { key: 'live_assistant', label: 'Asistente Live', description: 'Asistente en tiempo real para transmisiones' },
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

    } catch (error: any) {
      // Silently handle permission errors - use defaults
      if (error?.code !== '42501') {
        console.error('Error fetching AI config:', error);
      }
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

      // Use upsert to handle both insert and update cases (avoids 409 duplicate key error)
      const defaultModels = providerKey === 'perplexity'
        ? PERPLEXITY_MODELS.map(m => m.value)
        : (AI_PROVIDERS_CONFIG[providerKey as keyof typeof AI_PROVIDERS_CONFIG]?.models.map(m => m.value) || []);

      const { error } = await supabase
        .from('organization_ai_providers')
        .upsert({
          organization_id: organizationId,
          provider_key: providerKey,
          is_enabled: enabled,
          available_models: existing?.available_models || defaultModels,
          configured_by: user?.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id,provider_key'
        });
      if (error) throw error;

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

      // Use upsert to handle both insert and update cases (avoids 409 duplicate key error)
      const defaultModels = providerKey === 'perplexity'
        ? PERPLEXITY_MODELS.map(m => m.value)
        : (AI_PROVIDERS_CONFIG[providerKey as keyof typeof AI_PROVIDERS_CONFIG]?.models.map(m => m.value) || []);

      const { error } = await supabase
        .from('organization_ai_providers')
        .upsert({
          organization_id: organizationId,
          provider_key: providerKey,
          is_enabled: existing?.is_enabled ?? true,
          api_key_encrypted: apiKey,
          available_models: existing?.available_models || defaultModels,
          configured_by: user?.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id,provider_key'
        });
      if (error) throw error;

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
      return { provider: 'gemini', model: 'gemini-2.5-flash' };
    }

    const moduleProvider = defaults[`${module}_provider` as keyof AIDefaults] as string | null;
    const moduleModel = defaults[`${module}_model` as keyof AIDefaults] as string | null;

    return {
      provider: moduleProvider || defaults.default_provider || 'gemini',
      model: moduleModel || defaults.default_model || 'gemini-2.5-flash'
    };
  };

  // Get available (enabled) providers
  const getEnabledProviders = () => {
    const enabled: typeof AI_PROVIDERS_CONFIG[keyof typeof AI_PROVIDERS_CONFIG][] = [];
    
    providers.forEach(p => {
      if (p.is_enabled) {
        const config = AI_PROVIDERS_CONFIG[p.provider_key as keyof typeof AI_PROVIDERS_CONFIG];
        if (config) {
          enabled.push(config);
        }
      }
    });

    // If no providers enabled, default to gemini
    if (enabled.length === 0) {
      enabled.push(AI_PROVIDERS_CONFIG.gemini);
    }

    return enabled;
  };

  // Check if a provider has a valid API key configured
  const hasValidApiKey = (providerKey: string): boolean => {
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

  // Perplexity
  const perplexityConnected = hasValidApiKey('perplexity');
  const perplexityModel = defaults?.perplexity_model || 'llama-3.1-sonar-large-128k-online';
  const perplexityFeatures: Record<string, boolean> = (defaults?.perplexity_features as Record<string, boolean>) ?? {
    scripts: true, research: true, board: false, talent: false, live: false
  };

  const savePerplexityKey = async (key: string) => {
    await updateProviderApiKey('perplexity', key);
  };

  const savePerplexityModel = async (model: string) => {
    await updateDefaults({ perplexity_model: model } as any);
  };

  const updatePerplexityFeature = async (featureKey: string, enabled: boolean) => {
    const next = { ...perplexityFeatures, [featureKey]: enabled };
    await updateDefaults({ perplexity_features: next } as any);
  };

  const testPerplexityConnection = async (): Promise<boolean> => {
    const provider = providers.find(p => p.provider_key === 'perplexity');
    const apiKey = provider?.api_key_encrypted;
    if (!apiKey) return false;
    try {
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: perplexityModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
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
    refetch: fetchData,
    // Perplexity
    perplexityConnected,
    perplexityModel,
    perplexityFeatures,
    savePerplexityKey,
    savePerplexityModel,
    updatePerplexityFeature,
    testPerplexityConnection,
  };
}
