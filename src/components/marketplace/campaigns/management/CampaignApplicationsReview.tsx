import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceCampaigns, CAMPAIGN_STATUS_LABELS } from '@/hooks/useMarketplaceCampaigns';
import { ApplicationCard } from './ApplicationCard';
import { BidAnalytics } from './BidAnalytics';
import { CounterOfferModal } from './CounterOfferModal';
import type { ApplicationStatus, CampaignApplication, CounterOffer } from '../../types/marketplace';

interface CampaignApplicationsReviewProps {
  campaignId: string;
  onBack: () => void;
}

const TABS: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
];

export function CampaignApplicationsReview({ campaignId, onBack }: CampaignApplicationsReviewProps) {
  const { getCampaignById, getApplicationsForCampaign, updateApplicationStatus } = useMarketplaceCampaigns();

  const campaign = useMemo(() => getCampaignById(campaignId), [campaignId, getCampaignById]);

  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('all');
  const [counterOfferTargetId, setCounterOfferTargetId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getApplicationsForCampaign(campaignId).then(apps => {
      if (!cancelled) setApplications(apps);
    });
    return () => { cancelled = true; };
  }, [campaignId, getApplicationsForCampaign]);

  const pricingMode = campaign?.pricing_mode ?? 'fixed';
  const isBidMode = pricingMode === 'auction' || pricingMode === 'range';

  const filtered = useMemo(() => {
    let result = activeTab === 'all' ? applications : applications.filter(a => a.status === activeTab);
    // Sort by bid_amount desc for auction/range
    if (isBidMode) {
      result = [...result].sort((a, b) => (b.bid_amount ?? 0) - (a.bid_amount ?? 0));
    }
    return result;
  }, [applications, activeTab, isBidMode]);

  const handleApprove = async (appId: string) => {
    const success = await updateApplicationStatus(appId, 'approved');
    if (success) {
      setApplications(prev =>
        prev.map(a => (a.id === appId ? { ...a, status: 'approved' as ApplicationStatus, updated_at: new Date().toISOString() } : a)),
      );
    }
  };

  const handleReject = async (appId: string) => {
    const success = await updateApplicationStatus(appId, 'rejected');
    if (success) {
      setApplications(prev =>
        prev.map(a => (a.id === appId ? { ...a, status: 'rejected' as ApplicationStatus, updated_at: new Date().toISOString() } : a)),
      );
    }
  };

  const handleCounterOffer = (amount: number, message: string) => {
    if (!counterOfferTargetId) return;
    const counterOffer: CounterOffer = {
      id: `co-${Date.now()}`,
      application_id: counterOfferTargetId,
      brand_amount: amount,
      brand_message: message || undefined,
      created_at: new Date().toISOString(),
    };
    setApplications(prev =>
      prev.map(a => (a.id === counterOfferTargetId ? { ...a, counter_offer: counterOffer } : a)),
    );
    setCounterOfferTargetId(null);
  };

  const counterOfferTarget = counterOfferTargetId
    ? applications.find(a => a.id === counterOfferTargetId)
    : null;

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mis campanas
        </button>
        <h2 className="text-lg font-bold text-white">Aplicaciones</h2>
        {campaign && <p className="text-gray-500 text-sm">{campaign.title}</p>}
      </div>

      {/* Bid analytics (auction/range only) */}
      {isBidMode && campaign && (
        <BidAnalytics applications={applications} campaign={campaign} />
      )}

      {/* Summary */}
      <div className="flex gap-4">
        <div className="bg-yellow-500/10 rounded-lg px-4 py-2">
          <p className="text-yellow-300 text-lg font-bold">{pendingCount}</p>
          <p className="text-gray-500 text-xs">Pendientes</p>
        </div>
        <div className="bg-green-500/10 rounded-lg px-4 py-2">
          <p className="text-green-300 text-lg font-bold">{approvedCount}</p>
          <p className="text-gray-500 text-xs">Aprobadas</p>
        </div>
        <div className="bg-white/5 rounded-lg px-4 py-2">
          <p className="text-white text-lg font-bold">{applications.length}</p>
          <p className="text-gray-500 text-xs">Total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
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

      {/* Application list */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map(app => (
            <ApplicationCard
              key={app.id}
              application={app}
              onApprove={handleApprove}
              onReject={handleReject}
              showActions={true}
              pricingMode={pricingMode}
              onCounterOffer={setCounterOfferTargetId}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay aplicaciones {activeTab !== 'all' ? 'en esta categoria' : ''}</p>
        </div>
      )}

      {/* Counter offer modal */}
      {counterOfferTarget && (
        <CounterOfferModal
          application={counterOfferTarget}
          onClose={() => setCounterOfferTargetId(null)}
          onSubmit={handleCounterOffer}
        />
      )}
    </div>
  );
}
