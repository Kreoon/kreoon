// ============================================================
// KAE Dashboard - Analytics Overview
// ============================================================

import { RefreshCw, BarChart3 } from 'lucide-react';
import { useAnalyticsDashboard } from '@/analytics/hooks/useAnalyticsDashboard';
import { KPICard } from './KPICard';
import { DateRangePresetPicker } from '@/components/ui/date-range-preset-picker';
import { ConversionFunnel } from './ConversionFunnel';
import { SourceDistribution } from './SourceDistribution';
import { TrendChart } from './TrendChart';
import { SourceMetricsTable } from './SourceMetricsTable';
import { TopCampaignsCard } from './TopCampaignsCard';
import { DeviceBreakdown } from './DeviceBreakdown';
import { GeoMap } from './GeoMap';

export function KAEDashboard() {
  const {
    data,
    loading,
    error,
    dateRangeValue,
    changeDateRange,
    refresh,
  } = useAnalyticsDashboard();

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
          <p className="text-sm text-gray-500">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <p className="text-red-400">Error: {error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <BarChart3 className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-gray-400 text-sm">Kreoon Analytics Engine (KAE)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DateRangePresetPicker
            value={dateRangeValue}
            onChange={changeDateRange}
          />
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard {...kpis.visitors} />
          <KPICard {...kpis.signups} />
          <KPICard {...kpis.trials} />
          <KPICard {...kpis.subscriptions} />
          <KPICard {...kpis.revenue} />
        </div>
      )}

      {/* Funnel + Source Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionFunnel data={data?.funnel || []} />
        <SourceDistribution data={data?.sourceMetrics || []} />
      </div>

      {/* Trend Chart */}
      <TrendChart data={data?.dailyMetrics || []} />

      {/* Source Table */}
      <SourceMetricsTable data={data?.sourceMetrics || []} />

      {/* Bottom row: Campaigns + Device + Geo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopCampaignsCard data={data?.campaignMetrics || []} />
        <DeviceBreakdown data={data?.deviceBreakdown || []} />
        <GeoMap data={data?.geoMetrics || []} />
      </div>
    </div>
  );
}

export default KAEDashboard;
