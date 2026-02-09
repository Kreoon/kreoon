import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Users, Calendar, DollarSign, Gift, Layers, Megaphone, Gavel, ArrowUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceCampaigns, CAMPAIGN_STATUS_COLORS, CAMPAIGN_STATUS_LABELS } from '@/hooks/useMarketplaceCampaigns';
import { CampaignApplicationsReview } from './CampaignApplicationsReview';
import { CampaignProgress } from './CampaignProgress';
import type { Campaign, CampaignStatus } from '../../types/marketplace';

type TabFilter = 'all' | 'active' | 'draft' | 'in_progress' | 'completed';

const TABS: { value: TabFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'draft', label: 'Borradores' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'completed', label: 'Completadas' },
];

const TYPE_ICONS = {
  paid: DollarSign,
  exchange: Gift,
  hybrid: Layers,
} as const;

export function BrandCampaignManager() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'applications' | 'progress'>('list');

  const { campaigns, loading } = useMarketplaceCampaigns();

  const filtered = useMemo(() => {
    if (activeTab === 'all') return campaigns;
    return campaigns.filter(c => c.status === activeTab);
  }, [campaigns, activeTab]);

  if (viewMode === 'applications' && selectedCampaignId) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <CampaignApplicationsReview
            campaignId={selectedCampaignId}
            onBack={() => { setViewMode('list'); setSelectedCampaignId(null); }}
          />
        </div>
      </div>
    );
  }

  if (viewMode === 'progress' && selectedCampaignId) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <button
            onClick={() => { setViewMode('list'); setSelectedCampaignId(null); }}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a mis campanas
          </button>
          <CampaignProgress campaignId={selectedCampaignId} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/marketplace/dashboard')}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-gray-400" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">Mis Campanas</h1>
                <p className="text-gray-500 text-xs">{campaigns.length} campanas creadas</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/marketplace/campaigns/create')}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nueva Campana
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                activeTab === tab.value
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Campaign list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(campaign => (
              <CampaignRow
                key={campaign.id}
                campaign={campaign}
                onViewApplications={() => { setSelectedCampaignId(campaign.id); setViewMode('applications'); }}
                onViewProgress={() => { setSelectedCampaignId(campaign.id); setViewMode('progress'); }}
                onViewDetail={() => navigate(`/marketplace/campaigns/${campaign.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-4">
            <Megaphone className="h-12 w-12 text-gray-600 mx-auto" />
            <div>
              <h3 className="text-white font-semibold">No hay campanas</h3>
              <p className="text-gray-500 text-sm mt-1">Crea tu primera campana para encontrar creadores</p>
            </div>
            <button
              onClick={() => navigate('/marketplace/campaigns/create')}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Crear Campana
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignRow({
  campaign,
  onViewApplications,
  onViewProgress,
  onViewDetail,
}: {
  campaign: Campaign;
  onViewApplications: () => void;
  onViewProgress: () => void;
  onViewDetail: () => void;
}) {
  const TypeIcon = TYPE_ICONS[campaign.campaign_type];
  const pricingMode = campaign.pricing_mode ?? 'fixed';
  const isBidMode = pricingMode === 'auction' || pricingMode === 'range';
  const progressPct = campaign.max_creators > 0
    ? Math.min(100, (campaign.approved_count / campaign.max_creators) * 100)
    : 0;

  const budgetText = campaign.campaign_type === 'paid'
    ? isBidMode
      ? pricingMode === 'auction'
        ? 'Subasta'
        : `$${(campaign.min_bid ?? 0).toLocaleString()}-${(campaign.max_bid ?? 0).toLocaleString()}`
      : `$${(campaign.budget_per_video ?? campaign.total_budget ?? 0).toLocaleString()}`
    : 'Canje';

  return (
    <div className="bg-[#1a1a2e]/80 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold text-sm truncate">{campaign.title}</h3>
            <span className={cn('text-xs px-2 py-0.5 rounded-full flex-shrink-0', CAMPAIGN_STATUS_COLORS[campaign.status])}>
              {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </span>
            {isBidMode && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-0.5',
                pricingMode === 'auction' ? 'bg-orange-500/15 text-orange-300' : 'bg-blue-500/15 text-blue-300',
              )}>
                {pricingMode === 'auction' ? <Gavel className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
                {pricingMode === 'auction' ? 'Subasta' : 'Rango'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <TypeIcon className="h-3.5 w-3.5" />
              {budgetText}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {campaign.applications_count} aplicaciones
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(campaign.deadline).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-white/5 rounded-full h-1.5 max-w-[200px]">
              <div
                className="bg-purple-500 h-full rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-gray-600 text-xs">{campaign.approved_count}/{campaign.max_creators}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onViewApplications}
            className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-2 rounded-lg transition-colors"
          >
            Aplicaciones
          </button>
          <button
            onClick={onViewProgress}
            className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-2 rounded-lg transition-colors"
          >
            Progreso
          </button>
          <button
            onClick={onViewDetail}
            className="text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-3 py-2 rounded-lg transition-colors"
          >
            Ver
          </button>
        </div>
      </div>
    </div>
  );
}
