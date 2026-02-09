import { Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CampaignCard } from '../campaigns/feed/CampaignCard';
import type { Campaign } from '../types/marketplace';

interface OrgCampaignsSectionProps {
  campaigns: Campaign[];
  accentColor: string;
}

export function OrgCampaignsSection({ campaigns, accentColor }: OrgCampaignsSectionProps) {
  const navigate = useNavigate();

  const active = campaigns.filter(c => c.status === 'active' || c.status === 'in_progress');
  const completed = campaigns.filter(c => c.status === 'completed');

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <Megaphone className="h-12 w-12 mx-auto text-gray-600 mb-3" />
        <p className="text-gray-500">Esta organización aún no tiene campañas activas</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Megaphone className="h-5 w-5" style={{ color: accentColor }} />
            Campañas Activas
            <span className="text-sm text-gray-500 font-normal">({active.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onClick={() => navigate(`/marketplace/campaigns/${campaign.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-400 flex items-center gap-2">
            Campañas Anteriores
            <span className="text-sm text-gray-500 font-normal">({completed.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
            {completed.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onClick={() => navigate(`/marketplace/campaigns/${campaign.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
