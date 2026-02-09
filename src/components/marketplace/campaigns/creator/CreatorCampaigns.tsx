import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Megaphone, DollarSign, Gift, Layers, Calendar, Clock, Search, Gavel, ArrowLeftRight, Loader2, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMarketplaceCampaigns,
  APPLICATION_STATUS_COLORS,
  APPLICATION_STATUS_LABELS,
  CAMPAIGN_STATUS_LABELS,
} from '@/hooks/useMarketplaceCampaigns';
import { useCampaignInvitations } from '@/hooks/useCampaignInvitations';
import { useAuth } from '@/hooks/useAuth';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import type { CampaignApplication, ApplicationStatus, Campaign, CampaignInvitation } from '../../types/marketplace';

type TabId = 'available' | 'invitations' | 'applications' | 'active' | 'completed';

const TABS: { id: TabId; label: string }[] = [
  { id: 'available', label: 'Disponibles' },
  { id: 'invitations', label: 'Invitaciones' },
  { id: 'applications', label: 'Mis Aplicaciones' },
  { id: 'active', label: 'En Progreso' },
  { id: 'completed', label: 'Completadas' },
];

const ACTIVE_STATUSES: ApplicationStatus[] = ['approved', 'assigned', 'delivered'];
const COMPLETED_STATUSES: ApplicationStatus[] = ['completed'];

export function CreatorCampaigns() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile: creatorProfile } = useCreatorProfile();
  const { campaigns, loading: campaignsLoading, getCampaignById, getApplicationsForCreator } = useMarketplaceCampaigns();
  const { getMyInvitations, respondToInvitation, loading: invLoading } = useCampaignInvitations();
  const [activeTab, setActiveTab] = useState<TabId>('available');
  const [allApplications, setAllApplications] = useState<CampaignApplication[]>([]);
  const [invitations, setInvitations] = useState<CampaignInvitation[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  // Fetch applications (needs creator_profiles.id, not auth user id)
  useEffect(() => {
    if (!creatorProfile?.id) { setAllApplications([]); setLoadingApps(false); return; }
    let cancelled = false;
    setLoadingApps(true);
    getApplicationsForCreator(creatorProfile.id).then(apps => {
      if (!cancelled) { setAllApplications(apps); setLoadingApps(false); }
    });
    return () => { cancelled = true; };
  }, [creatorProfile?.id, getApplicationsForCreator]);

  // Fetch invitations
  useEffect(() => {
    if (!user) { setInvitations([]); return; }
    let cancelled = false;
    getMyInvitations().then(inv => {
      if (!cancelled) setInvitations(inv);
    });
    return () => { cancelled = true; };
  }, [user, getMyInvitations]);

  // Available campaigns (public + campaigns user hasn't applied to)
  const appliedCampaignIds = useMemo(() => new Set(allApplications.map(a => a.campaign_id)), [allApplications]);
  const availableCampaigns = useMemo(
    () => campaigns.filter(c =>
      c.status === 'active' && !appliedCampaignIds.has(c.id)
    ),
    [campaigns, appliedCampaignIds],
  );

  const pendingInvitations = useMemo(
    () => invitations.filter(inv => inv.status === 'pending'),
    [invitations],
  );
  const applicationsTab = useMemo(
    () => allApplications.filter(a => a.status === 'pending' || a.status === 'rejected' || a.status === 'withdrawn'),
    [allApplications],
  );
  const activeTab_ = useMemo(
    () => allApplications.filter(a => ACTIVE_STATUSES.includes(a.status)),
    [allApplications],
  );
  const completedTab = useMemo(
    () => allApplications.filter(a => COMPLETED_STATUSES.includes(a.status)),
    [allApplications],
  );

  const handleInvitationResponse = async (invitationId: string, response: 'accepted' | 'declined') => {
    const success = await respondToInvitation(invitationId, response);
    if (success) {
      setInvitations(prev => prev.map(inv =>
        inv.id === invitationId ? { ...inv, status: response } : inv
      ));
    }
  };

  const currentList = activeTab === 'applications' ? applicationsTab
    : activeTab === 'active' ? activeTab_
    : activeTab === 'completed' ? completedTab
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
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
                <p className="text-gray-500 text-xs">{allApplications.length} aplicaciones totales</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/marketplace/campaigns')}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Search className="h-4 w-4" />
              Explorar Campanas
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map(tab => {
            const count = tab.id === 'invitations' ? pendingInvitations.length
              : tab.id === 'applications' ? applicationsTab.length
              : tab.id === 'available' ? availableCampaigns.length
              : tab.id === 'active' ? activeTab_.length
              : completedTab.length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-gray-500 hover:text-gray-300',
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                    tab.id === 'invitations' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-gray-400',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Available campaigns tab */}
        {activeTab === 'available' && (
          campaignsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            </div>
          ) : availableCampaigns.length > 0 ? (
            <div className="space-y-3">
              {availableCampaigns.map(campaign => (
                <AvailableCampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  onClick={() => navigate(`/marketplace/campaigns/${campaign.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No hay campanas disponibles"
              subtitle="Vuelve pronto, las marcas publican campanas constantemente"
            />
          )
        )}

        {/* Invitations tab */}
        {activeTab === 'invitations' && (
          invLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            </div>
          ) : pendingInvitations.length > 0 ? (
            <div className="space-y-3">
              {pendingInvitations.map(inv => (
                <InvitationRow
                  key={inv.id}
                  invitation={inv}
                  getCampaignById={getCampaignById}
                  onAccept={() => handleInvitationResponse(inv.id, 'accepted')}
                  onDecline={() => handleInvitationResponse(inv.id, 'declined')}
                  onClick={() => navigate(`/marketplace/campaigns/${inv.campaign_id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No tienes invitaciones pendientes"
              subtitle="Las marcas pueden invitarte a campanas selectivas"
            />
          )
        )}

        {/* Applications / Active / Completed tabs */}
        {(activeTab === 'applications' || activeTab === 'active' || activeTab === 'completed') && (
          loadingApps ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            </div>
          ) : currentList.length > 0 ? (
            <div className="space-y-3">
              {currentList.map(app => (
                <CreatorCampaignRow
                  key={app.id}
                  application={app}
                  getCampaignById={getCampaignById}
                  onClick={() => navigate(`/marketplace/campaigns/${app.campaign_id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                activeTab === 'applications' ? 'No tienes aplicaciones pendientes'
                  : activeTab === 'active' ? 'No tienes campanas en progreso'
                  : 'No tienes campanas completadas'
              }
              subtitle="Explora las campanas disponibles y aplica"
              showExploreButton
              onExplore={() => navigate('/marketplace/campaigns')}
            />
          )
        )}
      </div>
    </div>
  );
}

function CreatorCampaignRow({
  application,
  getCampaignById,
  onClick,
}: {
  application: CampaignApplication;
  getCampaignById: (id: string) => Campaign | undefined;
  onClick: () => void;
}) {
  const campaign = getCampaignById(application.campaign_id);
  if (!campaign) return null;

  const TypeIcon = campaign.campaign_type === 'paid' ? DollarSign : campaign.campaign_type === 'exchange' ? Gift : Layers;
  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const isBidMode = campaign.pricing_mode === 'auction' || campaign.pricing_mode === 'range';
  const hasBid = !!application.bid_amount;
  const hasCounterOffer = !!application.counter_offer;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#1a1a2e]/80 border border-white/5 rounded-xl p-5 hover:border-purple-500/30 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {campaign.brand_logo ? (
            <img src={campaign.brand_logo} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold flex-shrink-0">
              {campaign.brand_name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">{campaign.title}</h3>
            <p className="text-gray-500 text-xs">{campaign.brand_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isBidMode && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300 flex items-center gap-0.5">
              <Gavel className="h-3 w-3" />
              {campaign.pricing_mode === 'auction' ? 'Subasta' : 'Rango'}
            </span>
          )}
          <span className={cn('text-xs px-2 py-0.5 rounded-full', APPLICATION_STATUS_COLORS[application.status])}>
            {APPLICATION_STATUS_LABELS[application.status]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
        <span className="flex items-center gap-1">
          <TypeIcon className="h-3.5 w-3.5" />
          {campaign.campaign_type === 'paid'
            ? isBidMode
              ? (campaign.pricing_mode === 'range' ? `$${(campaign.min_bid ?? 0).toLocaleString()} - $${(campaign.max_bid ?? 0).toLocaleString()}` : 'Subasta abierta')
              : `$${(campaign.budget_per_video ?? campaign.total_budget ?? 0).toLocaleString()}`
            : 'Canje'
          }
        </span>
        {/* Show bid amount or proposed price */}
        {hasBid ? (
          <span className="text-orange-300 flex items-center gap-1">
            <Gavel className="h-3 w-3" />
            Tu oferta: ${application.bid_amount!.toLocaleString()}
          </span>
        ) : application.proposed_price ? (
          <span className="text-purple-300">Tu precio: ${application.proposed_price.toLocaleString()}</span>
        ) : null}
        {/* Counter offer indicator */}
        {hasCounterOffer && (
          <span className={cn(
            'flex items-center gap-1',
            application.counter_offer?.creator_response === 'accepted' ? 'text-green-300'
              : application.counter_offer?.creator_response === 'rejected' ? 'text-red-300'
              : 'text-yellow-300',
          )}>
            <ArrowLeftRight className="h-3 w-3" />
            {application.counter_offer?.creator_response === 'accepted' ? 'Contraoferta aceptada'
              : application.counter_offer?.creator_response === 'rejected' ? 'Contraoferta rechazada'
              : 'Contraoferta pendiente'}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(campaign.deadline).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
        </span>
        {daysLeft > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {daysLeft}d restantes
          </span>
        )}
      </div>
    </button>
  );
}

function AvailableCampaignRow({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const TypeIcon = campaign.campaign_type === 'paid' ? DollarSign : campaign.campaign_type === 'exchange' ? Gift : Layers;
  const displayName = campaign.organization_name || campaign.brand_name;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#1a1a2e]/80 border border-white/5 rounded-xl p-5 hover:border-purple-500/30 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {campaign.brand_logo ? (
            <img src={campaign.brand_logo} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold flex-shrink-0">
              {displayName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">{campaign.title}</h3>
            <p className="text-gray-500 text-xs">{displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1 text-xs">
            <TypeIcon className="h-3.5 w-3.5 text-green-400" />
            <span className="text-white">
              {campaign.campaign_type === 'exchange'
                ? 'Canje'
                : `$${(campaign.budget_per_video ?? campaign.total_budget ?? 0).toLocaleString()}`}
            </span>
          </span>
        </div>
      </div>
      <p className="text-gray-500 text-xs line-clamp-2">{campaign.description}</p>
      <div className="flex items-center gap-3 text-xs text-gray-600 mt-2">
        <span>{campaign.applications_count}/{campaign.max_creators} creadores</span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(campaign.deadline).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </button>
  );
}

function InvitationRow({
  invitation,
  getCampaignById,
  onAccept,
  onDecline,
  onClick,
}: {
  invitation: CampaignInvitation;
  getCampaignById: (id: string) => Campaign | undefined;
  onAccept: () => void;
  onDecline: () => void;
  onClick: () => void;
}) {
  const campaign = getCampaignById(invitation.campaign_id);

  return (
    <div className="bg-[#1a1a2e]/80 border border-amber-500/20 rounded-xl p-5">
      <div className="flex items-start justify-between mb-2">
        <button onClick={onClick} className="flex items-center gap-2.5 min-w-0 text-left">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 flex-shrink-0">
            <Mail className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">{campaign?.title ?? 'Campana'}</h3>
            <p className="text-gray-500 text-xs">{campaign?.brand_name ?? 'Marca'}</p>
          </div>
        </button>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 flex-shrink-0">
          Invitacion
        </span>
      </div>
      {invitation.message && (
        <p className="text-gray-400 text-xs mb-3 bg-white/5 rounded-lg p-2">{invitation.message}</p>
      )}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onAccept}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Aceptar
        </button>
        <button
          onClick={onDecline}
          className="flex items-center gap-1.5 border border-white/10 text-gray-400 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <XCircle className="h-3.5 w-3.5" />
          Rechazar
        </button>
        <button
          onClick={onClick}
          className="ml-auto text-purple-400 hover:text-purple-300 text-xs transition-colors"
        >
          Ver campana
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
  showExploreButton,
  onExplore,
}: {
  title: string;
  subtitle: string;
  showExploreButton?: boolean;
  onExplore?: () => void;
}) {
  return (
    <div className="text-center py-16 space-y-4">
      <Megaphone className="h-12 w-12 text-gray-600 mx-auto" />
      <div>
        <h3 className="text-white font-semibold">{title}</h3>
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
      </div>
      {showExploreButton && onExplore && (
        <button
          onClick={onExplore}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Explorar Campanas
        </button>
      )}
    </div>
  );
}
