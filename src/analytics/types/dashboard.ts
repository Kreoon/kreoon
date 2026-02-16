// ============================================================
// KAE Dashboard Types
// ============================================================

export interface DateRange {
  from: Date;
  to: Date;
}

export type DatePreset = '7d' | '14d' | '30d' | '90d' | 'custom';

// ── KPI Data ──

export interface KPIData {
  label: string;
  value: number;
  previousValue: number;
  format: 'number' | 'currency' | 'percent';
  color: 'purple' | 'blue' | 'cyan' | 'green' | 'amber';
}

// ── Funnel ──

export interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
  color: string;
}

// ── Source Metrics ──

export interface SourceMetrics {
  source: string;
  visitors: number;
  signups: number;
  trials: number;
  subscriptions: number;
  revenue: number;
  conversionRate: number;
  cac?: number;
}

// ── Daily Metrics (Trend Chart) ──

export interface DailyMetrics {
  date: string;
  visitors: number;
  signups: number;
  trials: number;
  subscriptions: number;
  revenue: number;
}

// ── Campaign Metrics ──

export interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  source: string;
  medium: string;
  visitors: number;
  signups: number;
  trials: number;
  subscriptions: number;
  revenue: number;
  conversionRate: number;
}

// ── Device Breakdown ──

export interface DeviceData {
  device: string;
  count: number;
  percentage: number;
}

// ── Geo Metrics ──

export interface GeoMetrics {
  country: string;
  countryCode: string;
  visitors: number;
  signups: number;
  conversionRate: number;
}

// ── Full Dashboard Data ──

export interface DashboardData {
  kpis: {
    visitors: KPIData;
    signups: KPIData;
    trials: KPIData;
    subscriptions: KPIData;
    revenue: KPIData;
  };
  funnel: FunnelStage[];
  sourceMetrics: SourceMetrics[];
  dailyMetrics: DailyMetrics[];
  campaignMetrics: CampaignMetrics[];
  deviceBreakdown: DeviceData[];
  geoMetrics: GeoMetrics[];
}
