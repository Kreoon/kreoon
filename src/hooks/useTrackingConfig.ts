import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  TrackingConfig, 
  TrackingIntegration, 
  AIInsightsConfig,
  TrackingProvider,
  EventCategory,
  AnalysisFrequency
} from '@/types/tracking';

interface UseTrackingConfigProps {
  organizationId: string | null;
}

export function useTrackingConfig({ organizationId }: UseTrackingConfigProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<TrackingConfig | null>(null);
  const [integrations, setIntegrations] = useState<TrackingIntegration[]>([]);
  const [aiConfig, setAIConfig] = useState<AIInsightsConfig | null>(null);

  // Fetch all tracking configuration
  const fetchConfig = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch tracking config
      const { data: configData, error: configError } = await supabase
        .from('organization_tracking_config')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (configError) throw configError;

      if (configData) {
        setConfig({
          id: configData.id,
          organizationId: configData.organization_id,
          trackingEnabled: configData.tracking_enabled,
          externalTrackingEnabled: configData.external_tracking_enabled,
          anonymizeSensitiveData: configData.anonymize_sensitive_data,
          requireConsent: configData.require_consent,
          debugMode: configData.debug_mode,
          retentionDays: configData.retention_days,
          allowedEventCategories: configData.allowed_event_categories as EventCategory[],
          createdAt: configData.created_at,
          updatedAt: configData.updated_at,
        });
      }

      // Fetch integrations
      const { data: integrationsData, error: integrationsError } = await supabase
        .from('organization_tracking_integrations')
        .select('*')
        .eq('organization_id', organizationId);

      if (integrationsError) throw integrationsError;

      if (integrationsData) {
        setIntegrations(integrationsData.map(i => ({
          id: i.id,
          organizationId: i.organization_id,
          provider: i.provider as TrackingProvider,
          providerId: i.provider_id,
          apiKey: i.api_key,
          enabled: i.enabled,
          eventsAllowed: i.events_allowed || [],
          config: (i.config as Record<string, unknown>) || {},
          createdAt: i.created_at,
          updatedAt: i.updated_at,
        })));
      }

      // Fetch AI insights config
      const { data: aiData, error: aiError } = await supabase
        .from('organization_ai_insights_config')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (aiError) throw aiError;

      if (aiData) {
        setAIConfig({
          id: aiData.id,
          organizationId: aiData.organization_id,
          enabled: aiData.enabled,
          provider: aiData.provider as 'kreoon' | 'openai' | 'google',
          model: aiData.model,
          analysisFrequency: aiData.analysis_frequency as AnalysisFrequency,
          autoAlertsEnabled: aiData.auto_alerts_enabled,
          autoRecommendationsEnabled: aiData.auto_recommendations_enabled,
          lastAnalysisAt: aiData.last_analysis_at,
          createdAt: aiData.created_at,
          updatedAt: aiData.updated_at,
        });
      }
    } catch (error) {
      console.error('[useTrackingConfig] Error fetching config:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la configuración de tracking',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId, toast]);

  // Save tracking config
  const saveConfig = useCallback(async (updates: Partial<TrackingConfig>) => {
    if (!organizationId) return;

    setSaving(true);
    try {
      const updateData = {
        tracking_enabled: updates.trackingEnabled,
        external_tracking_enabled: updates.externalTrackingEnabled,
        anonymize_sensitive_data: updates.anonymizeSensitiveData,
        require_consent: updates.requireConsent,
        debug_mode: updates.debugMode,
        retention_days: updates.retentionDays,
        allowed_event_categories: updates.allowedEventCategories,
        updated_at: new Date().toISOString(),
      };

      if (config?.id) {
        const { error } = await supabase
          .from('organization_tracking_config')
          .update(updateData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_tracking_config')
          .insert({
            organization_id: organizationId,
            ...updateData,
          });

        if (error) throw error;
      }

      await fetchConfig();
      toast({
        title: 'Configuración guardada',
        description: 'Los cambios se aplicaron correctamente',
      });
    } catch (error) {
      console.error('[useTrackingConfig] Error saving config:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [organizationId, config?.id, fetchConfig, toast]);

  // Save integration
  const saveIntegration = useCallback(async (integration: Partial<TrackingIntegration>) => {
    if (!organizationId) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        organization_id: organizationId,
        provider: integration.provider,
        provider_id: integration.providerId,
        api_key: integration.apiKey,
        enabled: integration.enabled,
        events_allowed: integration.eventsAllowed,
        config: integration.config || {},
        updated_at: new Date().toISOString(),
      };

      if (integration.id) {
        const { error } = await supabase
          .from('organization_tracking_integrations')
          .update(updateData as any)
          .eq('id', integration.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_tracking_integrations')
          .upsert(updateData as any, { onConflict: 'organization_id,provider' });

        if (error) throw error;
      }

      await fetchConfig();
      toast({
        title: 'Integración guardada',
        description: 'La configuración de integración se actualizó correctamente',
      });
    } catch (error) {
      console.error('[useTrackingConfig] Error saving integration:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la integración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [organizationId, fetchConfig, toast]);

  // Delete integration
  const deleteIntegration = useCallback(async (integrationId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organization_tracking_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      await fetchConfig();
      toast({
        title: 'Integración eliminada',
        description: 'La integración se eliminó correctamente',
      });
    } catch (error) {
      console.error('[useTrackingConfig] Error deleting integration:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la integración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [fetchConfig, toast]);

  // Save AI config
  const saveAIConfig = useCallback(async (updates: Partial<AIInsightsConfig>) => {
    if (!organizationId) return;

    setSaving(true);
    try {
      const updateData = {
        enabled: updates.enabled,
        provider: updates.provider,
        model: updates.model,
        analysis_frequency: updates.analysisFrequency,
        auto_alerts_enabled: updates.autoAlertsEnabled,
        auto_recommendations_enabled: updates.autoRecommendationsEnabled,
        updated_at: new Date().toISOString(),
      };

      if (aiConfig?.id) {
        const { error } = await supabase
          .from('organization_ai_insights_config')
          .update(updateData)
          .eq('id', aiConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_ai_insights_config')
          .insert({
            organization_id: organizationId,
            ...updateData,
          });

        if (error) throw error;
      }

      await fetchConfig();
      toast({
        title: 'Configuración IA guardada',
        description: 'Los cambios se aplicaron correctamente',
      });
    } catch (error) {
      console.error('[useTrackingConfig] Error saving AI config:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración de IA',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [organizationId, aiConfig?.id, fetchConfig, toast]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    loading,
    saving,
    config,
    integrations,
    aiConfig,
    saveConfig,
    saveIntegration,
    deleteIntegration,
    saveAIConfig,
    refetch: fetchConfig,
  };
}
