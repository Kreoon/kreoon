// ============================================================
// KAE Config Hook - Admin CRUD for Ad Platforms & Logs
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { KaeAdPlatformConfig, KaePlatformLog, KaeFunnelStep } from '@/types/analytics';

export function useKaeConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platforms, setPlatforms] = useState<KaeAdPlatformConfig[]>([]);
  const [logs, setLogs] = useState<KaePlatformLog[]>([]);

  // ── Fetch platforms ──────────────────────────────────────

  const fetchPlatforms = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kae_ad_platforms')
        .select('*')
        .order('platform');

      if (error) throw error;
      setPlatforms((data || []) as unknown as KaeAdPlatformConfig[]);
    } catch (err) {
      console.error('[KAE] Fetch platforms error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch logs ───────────────────────────────────────────

  const fetchLogs = useCallback(async (limit = 100) => {
    try {
      const { data, error } = await supabase
        .from('kae_platform_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setLogs((data || []) as unknown as KaePlatformLog[]);
    } catch (err) {
      console.error('[KAE] Fetch logs error:', err);
    }
  }, []);

  // ── Save platform ────────────────────────────────────────

  const savePlatform = useCallback(async (platform: Partial<KaeAdPlatformConfig> & { platform: string }) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('kae_ad_platforms')
        .update({
          enabled: platform.enabled ?? false,
          pixel_id: platform.pixel_id || null,
          access_token: platform.access_token || null,
          dataset_id: platform.dataset_id || null,
          api_version: platform.api_version || null,
          test_mode: platform.test_mode ?? true,
          test_event_code: platform.test_event_code || null,
          event_mapping: platform.event_mapping || {},
          config: platform.config || {},
          updated_at: new Date().toISOString(),
        })
        .eq('platform', platform.platform);

      if (error) throw error;

      toast({ title: 'Plataforma actualizada', description: `${platform.platform} configurada correctamente` });
      await fetchPlatforms();
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [fetchPlatforms, toast]);

  // ── Funnel stats ─────────────────────────────────────────

  const fetchFunnelStats = useCallback(async (
    startDate: string,
    endDate: string,
    utmSource?: string
  ): Promise<KaeFunnelStep[]> => {
    try {
      const { data, error } = await supabase
        .rpc('kae_funnel_stats', {
          p_start_date: startDate,
          p_end_date: endDate,
          p_utm_source: utmSource || null,
        });

      if (error) throw error;
      return (data || []) as KaeFunnelStep[];
    } catch (err) {
      console.error('[KAE] Funnel stats error:', err);
      return [];
    }
  }, []);

  // ── Send test event ──────────────────────────────────────

  const sendTestEvent = useCallback(async (platformName: string, eventName: string) => {
    setSaving(true);
    try {
      const testAnonymousId = `test-${Date.now()}`;
      const testSessionId = `test-session-${Date.now()}`;
      const testContext = {
        anonymous_id: testAnonymousId,
        session_id: testSessionId,
        utms: { utm_source: 'test', utm_medium: 'test', utm_campaign: 'kae-test' },
        click_ids: {},
        referrer: '',
        landing_page: '/test',
      };

      // Send via kae-conversion for immediate ad platform forwarding
      const response = await supabase.functions.invoke('kae-conversion', {
        body: {
          conversion_type: eventName,
          properties: { test: true, platform: platformName },
          context: testContext,
          page_url: 'https://kreoon.com/test',
          page_path: '/test',
          device_type: 'desktop',
          browser: 'Test',
          os: 'Test',
        },
      });

      if (response.error) throw response.error;

      toast({ title: 'Evento de prueba enviado', description: `${eventName} enviado a ${platformName}` });
      await fetchLogs();
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [fetchLogs, toast]);

  // ── Init ─────────────────────────────────────────────────

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  return {
    loading,
    saving,
    platforms,
    logs,
    savePlatform,
    fetchPlatforms,
    fetchLogs,
    fetchFunnelStats,
    sendTestEvent,
  };
}
