import { Megaphone } from 'lucide-react';
import type { CampaignMetrics } from '@/analytics/types/dashboard';

interface TopCampaignsCardProps {
  data: CampaignMetrics[];
}

export function TopCampaignsCard({ data }: TopCampaignsCardProps) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-sm p-6 border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Top Campañas UTM</h3>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
          Sin campañas con UTM en este periodo
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((campaign, index) => (
            <div
              key={campaign.campaignId}
              className="flex items-center justify-between p-3 rounded-sm bg-gray-800/40 border border-gray-700/30 hover:bg-gray-800/60 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-gray-500 w-5 text-right shrink-0">
                  #{index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {campaign.campaignName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {campaign.source}/{campaign.medium}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-right">
                <div>
                  <p className="text-xs text-gray-500">Visitors</p>
                  <p className="text-sm text-white tabular-nums">{campaign.visitors.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Conv.</p>
                  <p className="text-sm text-white tabular-nums">{campaign.subscriptions}</p>
                </div>
                {campaign.revenue > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-sm text-green-400 font-medium tabular-nums">${campaign.revenue.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
