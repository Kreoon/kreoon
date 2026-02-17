// ============================================================
// KAE Ad Platforms Config Hook
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AdPlatformConfig, ConnectionTestResult } from '../types/platforms';

export function useAdPlatformsConfig() {
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<AdPlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);

  // ── Fetch all platforms ──

  const fetchPlatforms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('kae_ad_platforms')
        .select('*')
        .order('platform');

      if (error) throw error;
      setPlatforms((data || []) as unknown as AdPlatformConfig[]);
    } catch (err) {
      console.error('[KAE Platforms] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  // ── Save platform config ──

  const savePlatform = useCallback(async (config: Partial<AdPlatformConfig> & { platform: string }) => {
    setSaving(true);
    try {
      // Build update payload, only include fields that are provided
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (config.enabled !== undefined) updatePayload.enabled = config.enabled;
      if (config.pixel_id !== undefined) updatePayload.pixel_id = config.pixel_id || null;
      // Only update access_token if a new one was provided (non-empty)
      if (config.access_token && config.access_token.trim().length > 0) {
        updatePayload.access_token = config.access_token;
      }
      if (config.dataset_id !== undefined) updatePayload.dataset_id = config.dataset_id || null;
      if (config.test_mode !== undefined) updatePayload.test_mode = config.test_mode;
      if (config.test_event_code !== undefined) updatePayload.test_event_code = config.test_event_code || null;
      if (config.event_mapping) updatePayload.event_mapping = config.event_mapping;
      if (config.config) updatePayload.config = config.config;

      const { error } = await supabase
        .from('kae_ad_platforms')
        .update(updatePayload)
        .eq('platform', config.platform);

      if (error) throw error;

      toast({ title: 'Configuración guardada', description: `${config.platform} actualizado correctamente` });
      await fetchPlatforms();
    } catch (err) {
      toast({ title: 'Error al guardar', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [fetchPlatforms, toast]);

  // ── Delete platform config ──

  const deletePlatform = useCallback(async (platformId: string) => {
    setSaving(true);
    try {
      // Don't actually delete - just reset to disabled with no credentials
      const { error } = await supabase
        .from('kae_ad_platforms')
        .update({
          enabled: false,
          pixel_id: null,
          access_token: null,
          dataset_id: null,
          test_event_code: null,
          test_mode: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', platformId);

      if (error) throw error;

      toast({ title: 'Credenciales eliminadas', description: 'La plataforma ha sido reseteada' });
      await fetchPlatforms();
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [fetchPlatforms, toast]);

  // ── Toggle enabled/disabled ──

  const togglePlatform = useCallback(async (platformId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('kae_ad_platforms')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', platformId);

      if (error) throw error;

      // Optimistic update
      setPlatforms(prev => prev.map(p =>
        p.id === platformId ? { ...p, enabled } : p
      ));

      toast({
        title: enabled ? 'Plataforma activada' : 'Plataforma desactivada',
        description: enabled
          ? 'Las conversiones se enviarán a esta plataforma'
          : 'Se detuvo el envío de conversiones',
      });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
      await fetchPlatforms(); // Revert optimistic update
    }
  }, [fetchPlatforms, toast]);

  // ── Test connection ──

  const testConnection = useCallback(async (platform: string): Promise<ConnectionTestResult> => {
    setTestingPlatform(platform);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/kae-test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ platform }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.error || `HTTP ${response.status}`,
          details: result,
        };
      }

      return {
        success: result.success ?? false,
        message: result.message || (result.success ? 'Conexión exitosa' : 'Error de conexión'),
        details: result.details,
      };
    } catch (err) {
      return {
        success: false,
        message: (err as Error).message || 'Error de red',
      };
    } finally {
      setTestingPlatform(null);
    }
  }, []);

  // ── Helpers ──

  const getPlatformConfig = useCallback((platform: string): AdPlatformConfig | undefined => {
    return platforms.find(p => p.platform === platform);
  }, [platforms]);

  const isConfigured = useCallback((platform: string): boolean => {
    const config = platforms.find(p => p.platform === platform);
    return !!(config?.pixel_id && config?.access_token);
  }, [platforms]);

  return {
    platforms,
    loading,
    saving,
    testingPlatform,
    savePlatform,
    deletePlatform,
    togglePlatform,
    testConnection,
    getPlatformConfig,
    isConfigured,
    refresh: fetchPlatforms,
  };
}
