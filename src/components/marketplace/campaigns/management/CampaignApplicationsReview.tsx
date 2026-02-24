import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Users, CreditCard, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceCampaigns, CAMPAIGN_STATUS_LABELS } from '@/hooks/useMarketplaceCampaigns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useCampaignAnalytics } from '@/analytics';
import { useMarketplaceProjects } from '@/hooks/useMarketplaceProjects';
import { useBrandActivation } from '@/hooks/useBrandActivation';
import { ApplicationCard } from './ApplicationCard';
import { BidAnalytics } from './BidAnalytics';
import { CounterOfferModal } from './CounterOfferModal';
import type { ApplicationStatus, CampaignApplication, CounterOffer } from '../../types/marketplace';
import type { BrandActivationConfig, SocialPlatform } from '../../types/brandActivation';

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
  const { formatPrice } = useCurrency();
  const { getCampaignById, getApplicationsForCampaign, updateApplicationStatus, approveApplication, createCampaignCheckout } = useMarketplaceCampaigns();
  const { createProject, getProjectsByCampaign } = useMarketplaceProjects();
  const { createPublication } = useBrandActivation();
  const { trackCreatorAccepted, trackCreatorRejected } = useCampaignAnalytics();

  const campaign = useMemo(() => getCampaignById(campaignId), [campaignId, getCampaignById]);

  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('all');
  const [counterOfferTargetId, setCounterOfferTargetId] = useState<string | null>(null);
  // Map of application_id → project info
  const [projectsMap, setProjectsMap] = useState<Map<string, { id: string; status: string }>>(new Map());

  useEffect(() => {
    let cancelled = false;
    getApplicationsForCampaign(campaignId).then(apps => {
      if (!cancelled) setApplications(apps);
    });
    getProjectsByCampaign(campaignId).then(projects => {
      if (!cancelled) {
        const map = new Map<string, { id: string; status: string }>();
        for (const p of projects) {
          if (p.application_id) map.set(p.application_id, { id: p.id, status: p.status });
        }
        setProjectsMap(map);
      }
    });
    return () => { cancelled = true; };
  }, [campaignId, getApplicationsForCampaign, getProjectsByCampaign]);

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
    const app = applications.find(a => a.id === appId);
    const agreedPrice = app?.bid_amount ?? app?.proposed_price ?? campaign?.budget_per_video ?? undefined;

    // Use the new RPC that auto-creates project + sets agreed_price
    const result = await approveApplication(appId, agreedPrice);
    if (result) {
      trackCreatorAccepted({
        campaign_id: campaignId,
        creator_id: app?.creator?.user_id || appId,
        action: 'accepted',
      });
      setApplications(prev =>
        prev.map(a => (a.id === appId ? { ...a, status: 'approved' as ApplicationStatus, agreed_price: agreedPrice ?? null, updated_at: new Date().toISOString() } : a)),
      );

      // Track the auto-created project
      if (result.project_id) {
        setProjectsMap(prev => new Map(prev).set(appId, { id: result.project_id, status: 'in_progress' }));
      }

      // Auto-create activation publications for brand activation campaigns
      if (campaign?.is_brand_activation && app) {
        const config = campaign.activation_requirements as BrandActivationConfig | undefined;
        const platforms = config?.required_platforms ?? [];
        if (platforms.length > 0) {
          for (const platform of platforms) {
            await createPublication(campaignId, appId, app.creator_id, platform as SocialPlatform);
          }
        }
      }
    } else {
      // Fallback to old method
      const success = await updateApplicationStatus(appId, 'approved');
      if (success) {
        setApplications(prev =>
          prev.map(a => (a.id === appId ? { ...a, status: 'approved' as ApplicationStatus, updated_at: new Date().toISOString() } : a)),
        );
      }
    }
  };

  const handleReject = async (appId: string) => {
    const success = await updateApplicationStatus(appId, 'rejected');
    if (success) {
      const app = applications.find(a => a.id === appId);
      trackCreatorRejected({
        campaign_id: campaignId,
        creator_id: app?.creator?.user_id || appId,
        action: 'rejected',
      });
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

  const [isPayingBid, setIsPayingBid] = useState(false);

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;

  // Payment summary for auction/range
  const approvedApps = useMemo(
    () => applications.filter(a => a.status === 'approved' || a.status === 'assigned'),
    [applications],
  );
  const totalAgreedPrice = useMemo(
    () => approvedApps.reduce((sum, a) => sum + (a.bid_amount ?? a.proposed_price ?? 0), 0),
    [approvedApps],
  );
  const commissionRate = campaign?.commission_rate ?? 30;
  const platformFee = totalAgreedPrice * commissionRate / 100;
  const grandTotal = totalAgreedPrice + platformFee;

  const handlePayAndStart = async () => {
    if (!campaignId) return;
    setIsPayingBid(true);
    try {
      const url = await createCampaignCheckout(campaignId, 'create-bid-checkout');
      if (url) {
        window.location.href = url;
        return;
      }
    } catch {
      // ignore
    }
    setIsPayingBid(false);
  };

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
              projectInfo={projectsMap.get(app.id) || null}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay aplicaciones {activeTab !== 'all' ? 'en esta categoria' : ''}</p>
        </div>
      )}

      {/* Payment Summary for Auction/Range */}
      {isBidMode && campaign?.payment_status !== 'in_escrow' && approvedApps.length > 0 && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-green-400" />
            Resumen de Pago
          </h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Creadores aprobados</span>
              <span className="text-white">{approvedApps.length}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Total creadores</span>
              <span className="text-white">{formatPrice(totalAgreedPrice)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Comision plataforma ({commissionRate}%)</span>
              <span className="text-white">{formatPrice(platformFee)}</span>
            </div>
            <div className="border-t border-white/10 pt-1.5 flex justify-between font-semibold">
              <span className="text-white">Total a pagar</span>
              <span className="text-green-400">{formatPrice(grandTotal)}</span>
            </div>
          </div>
          <button
            onClick={handlePayAndStart}
            disabled={isPayingBid}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isPayingBid ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirigiendo a pago...
              </>
            ) : (
              'Pagar y comenzar proyectos'
            )}
          </button>
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
