import { Megaphone } from 'lucide-react';
import type { CampaignMetrics } from '@/analytics/types/dashboard';

interface TopCampaignsCardProps {
  data: CampaignMetrics[];
}

export function TopCampaignsCard({ data }: TopCampaignsCardProps) {
  return (
    <div className="bg-card/50 rounded-sm p-6 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-foreground">Top Campañas UTM</h3>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Sin campañas con UTM en este periodo
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((campaign, index) => (
            <div
              key={campaign.campaignId}
              className="flex items-center justify-between p-3 rounded-sm bg-card/40 border border-border hover:bg-card/60 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                  #{index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">
                    {campaign.campaignName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {campaign.source}/{campaign.medium}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-right">
                <div>
                  <p className="text-xs text-muted-foreground">Visitors</p>
                  <p className="text-sm text-foreground tabular-nums">{campaign.visitors.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conv.</p>
                  <p className="text-sm text-foreground tabular-nums">{campaign.subscriptions}</p>
                </div>
                {campaign.revenue > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
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
