// ============================================================
// KAE Dashboard Data Hook
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import type {
  DateRange,
  DatePreset,
  KPIData,
  FunnelStage,
  SourceMetrics,
  DailyMetrics,
  CampaignMetrics,
  DeviceData,
  GeoMetrics,
  DashboardData,
} from '../types/dashboard';

const FUNNEL_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'];

function getPresetRange(preset: DatePreset): DateRange {
  const to = new Date();
  switch (preset) {
    case '7d':  return { from: subDays(to, 7), to };
    case '14d': return { from: subDays(to, 14), to };
    case '30d': return { from: subDays(to, 30), to };
    case '90d': return { from: subDays(to, 90), to };
    default:    return { from: subDays(to, 30), to };
  }
}

export function useAnalyticsDashboard() {
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('30d'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw data
  const [data, setData] = useState<DashboardData | null>(null);

  // Computed date strings
  const fromISO = useMemo(() => startOfDay(dateRange.from).toISOString(), [dateRange.from]);
  const toISO = useMemo(() => endOfDay(dateRange.to).toISOString(), [dateRange.to]);

  // Previous period for comparison
  const daysDiff = useMemo(() => {
    return Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
  }, [dateRange]);

  const prevFromISO = useMemo(() => startOfDay(subDays(dateRange.from, daysDiff)).toISOString(), [dateRange.from, daysDiff]);
  const prevToISO = useMemo(() => endOfDay(subDays(dateRange.from, 1)).toISOString(), [dateRange.from]);

  const changePreset = useCallback((p: DatePreset) => {
    setPreset(p);
    if (p !== 'custom') {
      setDateRange(getPresetRange(p));
    }
  }, []);

  const changeCustomRange = useCallback((range: DateRange) => {
    setPreset('custom');
    setDateRange(range);
  }, []);

  // ── Main data loader ──
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Run all queries in parallel
      const [
        visitorsRes,
        prevVisitorsRes,
        conversionsRes,
        prevConversionsRes,
        visitorSourcesRes,
        campaignVisitorsRes,
        deviceRes,
        geoRes,
        dailyConversionsRes,
      ] = await Promise.all([
        // 1. Current period visitors
        supabase
          .from('kae_visitors')
          .select('*', { count: 'exact', head: true })
          .gte('first_seen_at', fromISO)
          .lte('first_seen_at', toISO),

        // 2. Previous period visitors (for comparison)
        supabase
          .from('kae_visitors')
          .select('*', { count: 'exact', head: true })
          .gte('first_seen_at', prevFromISO)
          .lte('first_seen_at', prevToISO),

        // 3. Current period conversions
        supabase
          .from('kae_conversions')
          .select('conversion_type, value_usd, attributed_source, attributed_medium, attributed_campaign')
          .gte('converted_at', fromISO)
          .lte('converted_at', toISO),

        // 4. Previous period conversions
        supabase
          .from('kae_conversions')
          .select('conversion_type, value_usd')
          .gte('converted_at', prevFromISO)
          .lte('converted_at', prevToISO),

        // 5. Visitor sources
        supabase
          .from('kae_visitors')
          .select('first_utm_source')
          .gte('first_seen_at', fromISO)
          .lte('first_seen_at', toISO),

        // 6. Campaign-level visitors
        supabase
          .from('kae_visitors')
          .select('first_utm_source, first_utm_medium, first_utm_campaign')
          .gte('first_seen_at', fromISO)
          .lte('first_seen_at', toISO)
          .not('first_utm_campaign', 'is', null),

        // 7. Device breakdown
        supabase
          .from('kae_visitors')
          .select('device_type')
          .gte('first_seen_at', fromISO)
          .lte('first_seen_at', toISO),

        // 8. Geo breakdown
        supabase
          .from('kae_visitors')
          .select('country')
          .gte('first_seen_at', fromISO)
          .lte('first_seen_at', toISO),

        // 9. Daily conversions for trend
        supabase
          .from('kae_conversions')
          .select('converted_at, conversion_type, value_usd')
          .gte('converted_at', fromISO)
          .lte('converted_at', toISO)
          .order('converted_at', { ascending: true }),
      ]);

      // ── Process KPIs ──
      const visitors = visitorsRes.count || 0;
      const prevVisitors = prevVisitorsRes.count || 0;
      const conversions = conversionsRes.data || [];
      const prevConversions = prevConversionsRes.data || [];

      const signups = conversions.filter(c => c.conversion_type === 'signup').length;
      const trials = conversions.filter(c => c.conversion_type === 'trial_start').length;
      const subscriptions = conversions.filter(c => c.conversion_type === 'subscription').length;
      const revenue = conversions
        .filter(c => c.conversion_type === 'subscription')
        .reduce((sum, c) => sum + (c.value_usd || 0), 0);

      const prevSignups = prevConversions.filter(c => c.conversion_type === 'signup').length;
      const prevTrials = prevConversions.filter(c => c.conversion_type === 'trial_start').length;
      const prevSubscriptions = prevConversions.filter(c => c.conversion_type === 'subscription').length;
      const prevRevenue = prevConversions
        .filter(c => c.conversion_type === 'subscription')
        .reduce((sum, c) => sum + (c.value_usd || 0), 0);

      const kpis = {
        visitors: {
          label: 'Visitantes',
          value: visitors,
          previousValue: prevVisitors,
          format: 'number' as const,
          color: 'purple' as const,
        },
        signups: {
          label: 'Signups',
          value: signups,
          previousValue: prevSignups,
          format: 'number' as const,
          color: 'blue' as const,
        },
        trials: {
          label: 'Trials',
          value: trials,
          previousValue: prevTrials,
          format: 'number' as const,
          color: 'cyan' as const,
        },
        subscriptions: {
          label: 'Suscripciones',
          value: subscriptions,
          previousValue: prevSubscriptions,
          format: 'number' as const,
          color: 'green' as const,
        },
        revenue: {
          label: 'Revenue',
          value: revenue,
          previousValue: prevRevenue,
          format: 'currency' as const,
          color: 'amber' as const,
        },
      };

      // ── Funnel ──
      const funnel: FunnelStage[] = [
        { stage: 'Visitantes', count: visitors, conversionRate: 100, color: FUNNEL_COLORS[0] },
        { stage: 'Signups', count: signups, conversionRate: visitors ? (signups / visitors * 100) : 0, color: FUNNEL_COLORS[1] },
        { stage: 'Trials', count: trials, conversionRate: signups ? (trials / signups * 100) : 0, color: FUNNEL_COLORS[2] },
        { stage: 'Suscripciones', count: subscriptions, conversionRate: trials ? (subscriptions / trials * 100) : 0, color: FUNNEL_COLORS[3] },
      ];

      // ── Source Metrics ──
      const sourceMap = new Map<string, SourceMetrics>();
      const visitorSources = visitorSourcesRes.data || [];

      visitorSources.forEach(v => {
        const source = v.first_utm_source || 'direct';
        if (!sourceMap.has(source)) {
          sourceMap.set(source, { source, visitors: 0, signups: 0, trials: 0, subscriptions: 0, revenue: 0, conversionRate: 0 });
        }
        sourceMap.get(source)!.visitors++;
      });

      conversions.forEach(c => {
        const source = c.attributed_source || 'direct';
        if (!sourceMap.has(source)) {
          sourceMap.set(source, { source, visitors: 0, signups: 0, trials: 0, subscriptions: 0, revenue: 0, conversionRate: 0 });
        }
        const m = sourceMap.get(source)!;
        if (c.conversion_type === 'signup') m.signups++;
        if (c.conversion_type === 'trial_start') m.trials++;
        if (c.conversion_type === 'subscription') {
          m.subscriptions++;
          m.revenue += c.value_usd || 0;
        }
      });

      sourceMap.forEach(m => {
        m.conversionRate = m.visitors > 0 ? (m.subscriptions / m.visitors * 100) : 0;
      });

      const sourceMetrics = Array.from(sourceMap.values()).sort((a, b) => b.revenue - a.revenue);

      // ── Campaign Metrics ──
      const campaignMap = new Map<string, CampaignMetrics>();
      const campaignVisitors = campaignVisitorsRes.data || [];

      campaignVisitors.forEach(v => {
        const key = `${v.first_utm_source || 'direct'}|${v.first_utm_medium || ''}|${v.first_utm_campaign || ''}`;
        if (!campaignMap.has(key)) {
          campaignMap.set(key, {
            campaignId: key,
            campaignName: v.first_utm_campaign || 'unknown',
            source: v.first_utm_source || 'direct',
            medium: v.first_utm_medium || '',
            visitors: 0, signups: 0, trials: 0, subscriptions: 0, revenue: 0, conversionRate: 0,
          });
        }
        campaignMap.get(key)!.visitors++;
      });

      conversions.filter(c => c.attributed_campaign).forEach(c => {
        const key = `${c.attributed_source || 'direct'}|${c.attributed_medium || ''}|${c.attributed_campaign || ''}`;
        if (!campaignMap.has(key)) {
          campaignMap.set(key, {
            campaignId: key,
            campaignName: c.attributed_campaign || 'unknown',
            source: c.attributed_source || 'direct',
            medium: c.attributed_medium || '',
            visitors: 0, signups: 0, trials: 0, subscriptions: 0, revenue: 0, conversionRate: 0,
          });
        }
        const m = campaignMap.get(key)!;
        if (c.conversion_type === 'signup') m.signups++;
        if (c.conversion_type === 'trial_start') m.trials++;
        if (c.conversion_type === 'subscription') {
          m.subscriptions++;
          m.revenue += c.value_usd || 0;
        }
      });

      campaignMap.forEach(m => {
        m.conversionRate = m.visitors > 0 ? (m.subscriptions / m.visitors * 100) : 0;
      });

      const campaignMetrics = Array.from(campaignMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // ── Device Breakdown ──
      const deviceCount = new Map<string, number>();
      const devices = deviceRes.data || [];
      devices.forEach(d => {
        const device = d.device_type || 'unknown';
        deviceCount.set(device, (deviceCount.get(device) || 0) + 1);
      });

      const totalDevices = devices.length || 1;
      const deviceBreakdown: DeviceData[] = Array.from(deviceCount.entries())
        .map(([device, count]) => ({
          device,
          count,
          percentage: (count / totalDevices) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      // ── Geo Metrics ──
      const geoCount = new Map<string, { visitors: number; signups: number }>();
      const geoVisitors = geoRes.data || [];

      geoVisitors.forEach(g => {
        const country = g.country || 'Unknown';
        if (!geoCount.has(country)) {
          geoCount.set(country, { visitors: 0, signups: 0 });
        }
        geoCount.get(country)!.visitors++;
      });

      const geoMetrics: GeoMetrics[] = Array.from(geoCount.entries())
        .map(([country, data]) => ({
          country,
          countryCode: country,
          visitors: data.visitors,
          signups: data.signups,
          conversionRate: data.visitors > 0 ? (data.signups / data.visitors * 100) : 0,
        }))
        .sort((a, b) => b.visitors - a.visitors)
        .slice(0, 15);

      // ── Daily Metrics ──
      const dailyMap = new Map<string, DailyMetrics>();

      // Initialize all days in range
      for (let d = new Date(dateRange.from); d <= dateRange.to; d = new Date(d.getTime() + 86400000)) {
        const dateKey = format(d, 'yyyy-MM-dd');
        dailyMap.set(dateKey, { date: dateKey, visitors: 0, signups: 0, trials: 0, subscriptions: 0, revenue: 0 });
      }

      const dailyConversions = dailyConversionsRes.data || [];
      dailyConversions.forEach(c => {
        const dateKey = format(new Date(c.converted_at), 'yyyy-MM-dd');
        if (dailyMap.has(dateKey)) {
          const day = dailyMap.get(dateKey)!;
          if (c.conversion_type === 'signup') day.signups++;
          if (c.conversion_type === 'trial_start') day.trials++;
          if (c.conversion_type === 'subscription') {
            day.subscriptions++;
            day.revenue += c.value_usd || 0;
          }
        }
      });

      const dailyMetrics = Array.from(dailyMap.values());

      setData({
        kpis,
        funnel,
        sourceMetrics,
        dailyMetrics,
        campaignMetrics,
        deviceBreakdown,
        geoMetrics,
      });
    } catch (err) {
      console.error('[KAE Dashboard] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Error loading analytics data');
    } finally {
      setLoading(false);
    }
  }, [fromISO, toISO, prevFromISO, prevToISO, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    dateRange,
    preset,
    changePreset,
    changeCustomRange,
    refresh: loadData,
  };
}
