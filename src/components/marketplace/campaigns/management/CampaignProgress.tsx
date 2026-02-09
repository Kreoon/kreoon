import { useState, useEffect, useMemo } from 'react';
import { Users, CheckCircle2, Package, DollarSign, Star, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceCampaigns, APPLICATION_STATUS_COLORS, APPLICATION_STATUS_LABELS } from '@/hooks/useMarketplaceCampaigns';
import type { CampaignApplication } from '../../types/marketplace';

interface CampaignProgressProps {
  campaignId: string;
}

export function CampaignProgress({ campaignId }: CampaignProgressProps) {
  const { getCampaignById, getApplicationsForCampaign } = useMarketplaceCampaigns();

  const campaign = useMemo(() => getCampaignById(campaignId), [campaignId, getCampaignById]);

  const [applications, setApplications] = useState<CampaignApplication[]>([]);

  useEffect(() => {
    let cancelled = false;
    getApplicationsForCampaign(campaignId).then(apps => {
      if (!cancelled) setApplications(apps);
    });
    return () => { cancelled = true; };
  }, [campaignId, getApplicationsForCampaign]);

  if (!campaign) return null;

  const approvedApps = applications.filter(a => ['approved', 'assigned', 'delivered', 'completed'].includes(a.status));
  const deliveredCount = applications.filter(a => a.status === 'delivered' || a.status === 'completed').length;
  const totalBudgetUsed = approvedApps.reduce((sum, a) => sum + (a.proposed_price ?? campaign.budget_per_video ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Aplicaciones" value={applications.length} color="bg-purple-500/20 text-purple-400" />
        <KpiCard icon={CheckCircle2} label="Aprobados" value={`${approvedApps.length}/${campaign.max_creators}`} color="bg-green-500/20 text-green-400" />
        <KpiCard icon={Package} label="Entregados" value={deliveredCount} color="bg-blue-500/20 text-blue-400" />
        <KpiCard icon={DollarSign} label="Presupuesto usado" value={`$${totalBudgetUsed.toLocaleString()}`} color="bg-yellow-500/20 text-yellow-400" />
      </div>

      {/* Progress bar */}
      <div className="bg-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Progreso de creadores</span>
          <span className="text-white text-sm font-medium">{approvedApps.length}/{campaign.max_creators}</span>
        </div>
        <div className="w-full bg-white/5 rounded-full h-2">
          <div
            className="bg-purple-500 h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, (approvedApps.length / campaign.max_creators) * 100)}%` }}
          />
        </div>
      </div>

      {/* Approved creators list */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Creadores Asignados</h3>
        {approvedApps.length > 0 ? (
          <div className="space-y-3">
            {approvedApps.map(app => (
              <CreatorProgressRow key={app.id} application={app} />
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-sm">Aun no hay creadores aprobados</p>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-lg font-bold text-white">{value}</p>
          <p className="text-gray-500 text-xs">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CreatorProgressRow({ application }: { application: CampaignApplication }) {
  const creator = application.creator;
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
      <div className="flex items-center gap-3">
        {creator.avatar_url ? (
          <img src={creator.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold">
            {creator.display_name.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-white text-sm font-medium">{creator.display_name}</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-0.5 text-gray-500">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              {creator.rating_avg.toFixed(1)}
            </span>
            {creator.location_city && (
              <span className="flex items-center gap-0.5 text-gray-600">
                <MapPin className="h-3 w-3" />
                {creator.location_city}
              </span>
            )}
          </div>
        </div>
      </div>
      <span className={cn('text-xs px-2 py-0.5 rounded-full', APPLICATION_STATUS_COLORS[application.status])}>
        {APPLICATION_STATUS_LABELS[application.status]}
      </span>
    </div>
  );
}
