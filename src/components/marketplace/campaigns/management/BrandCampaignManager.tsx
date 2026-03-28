import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Users, Calendar, DollarSign, Gift, Layers, Megaphone, Gavel, ArrowUpDown, Loader2, Radio, UserSearch, Shield, Briefcase, CreditCard, Star, Trophy, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMarketplaceCampaigns, CAMPAIGN_STATUS_COLORS, CAMPAIGN_STATUS_LABELS } from '@/hooks/useMarketplaceCampaigns';
import { CampaignApplicationsReview } from './CampaignApplicationsReview';
import { CampaignProgress } from './CampaignProgress';
import { BrandPublicationReview } from '../activation/BrandPublicationReview';
import { SuggestedCreators } from '../SuggestedCreators';
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
  const [viewMode, setViewMode] = useState<'list' | 'applications' | 'progress' | 'activations' | 'smart_match'>('list');

  const { toast } = useToast();
  const { user } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Only show campaigns created by the current user
  const { campaigns, loading, activateCampaign, createCampaignCheckout, deleteCampaign } = useMarketplaceCampaigns({
    createdBy: user?.id,
  });

  const handleActivate = async (campaignId: string) => {
    const result = await activateCampaign(campaignId);
    if (result?.success) {
      toast({ title: 'Campana activada exitosamente' });
    } else {
      toast({ title: result?.error || 'Error al activar la campana', variant: 'destructive' });
    }
  };

  const handleCompletePayment = async (campaignId: string) => {
    const url = await createCampaignCheckout(campaignId, 'create-publish-checkout');
    if (url) {
      window.location.href = url;
    } else {
      toast({ title: 'Error al crear la sesion de pago', variant: 'destructive' });
    }
  };

  const handleEdit = (campaignId: string) => {
    navigate(`/marketplace/campaigns/${campaignId}/edit`);
  };

  const handleDelete = async (campaignId: string) => {
    const ok = await deleteCampaign(campaignId);
    if (ok) {
      toast({ title: 'Borrador eliminado exitosamente' });
      setDeletingId(null);
    } else {
      toast({ title: 'Error al eliminar el borrador', variant: 'destructive' });
    }
  };

  const filtered = useMemo(() => {
    if (activeTab === 'all') return campaigns;
    return campaigns.filter(c => c.status === activeTab);
  }, [campaigns, activeTab]);

  if (viewMode === 'applications' && selectedCampaignId) {
    return (
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background">
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

  if (viewMode === 'activations' && selectedCampaignId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <BrandPublicationReview
            campaignId={selectedCampaignId}
            onBack={() => { setViewMode('list'); setSelectedCampaignId(null); }}
          />
        </div>
      </div>
    );
  }

  if (viewMode === 'smart_match' && selectedCampaignId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <button
            onClick={() => { setViewMode('list'); setSelectedCampaignId(null); }}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a mis campanas
          </button>
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            Creadores Sugeridos
          </h2>
          <SuggestedCreators campaignId={selectedCampaignId} limit={20} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/10 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
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
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-sm transition-colors"
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
                onViewActivations={() => { setSelectedCampaignId(campaign.id); setViewMode('activations'); }}
                onViewSmartMatch={() => { setSelectedCampaignId(campaign.id); setViewMode('smart_match'); }}
                onViewDetail={() => navigate(`/marketplace/campaigns/${campaign.id}`)}
                onActivate={() => handleActivate(campaign.id)}
                onCompletePayment={() => handleCompletePayment(campaign.id)}
                onEdit={() => handleEdit(campaign.id)}
                onDelete={() => setDeletingId(campaign.id)}
                isDeleting={deletingId === campaign.id}
                onConfirmDelete={() => handleDelete(campaign.id)}
                onCancelDelete={() => setDeletingId(null)}
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
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-sm transition-colors"
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
  onViewActivations,
  onViewSmartMatch,
  onViewDetail,
  onActivate,
  onCompletePayment,
  onEdit,
  onDelete,
  isDeleting,
  onConfirmDelete,
  onCancelDelete,
}: {
  campaign: Campaign;
  onViewApplications: () => void;
  onViewProgress: () => void;
  onViewActivations: () => void;
  onViewSmartMatch: () => void;
  onViewDetail: () => void;
  onActivate: () => void;
  onCompletePayment: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const { formatPrice } = useCurrency();
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
        : `${formatPrice(campaign.min_bid ?? 0)}-${formatPrice(campaign.max_bid ?? 0)}`
      : formatPrice(campaign.budget_per_video ?? campaign.total_budget ?? 0)
    : 'Canje';

  return (
    <div className="bg-card/80 border border-white/5 rounded-sm p-5 hover:border-white/10 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold text-sm truncate">{campaign.title}</h3>
            <span className={cn('text-xs px-2 py-0.5 rounded-full flex-shrink-0', CAMPAIGN_STATUS_COLORS[campaign.status])}>
              {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </span>
            {campaign.campaign_purpose === 'activation' && (
              <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-0.5 bg-green-500/15 text-green-300">
                <Radio className="h-3 w-3" />
                Activación
              </span>
            )}
            {campaign.campaign_purpose === 'talent' && (
              <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-0.5 bg-blue-500/15 text-blue-300">
                <UserSearch className="h-3 w-3" />
                Talento
              </span>
            )}
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
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
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
            {campaign.commission_rate != null && (
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                {campaign.commission_rate}% comision
              </span>
            )}
            {campaign.requires_agency_support && (
              <span className="flex items-center gap-1 text-amber-400">
                <Briefcase className="h-3.5 w-3.5" />
                Agency
              </span>
            )}
            {campaign.payment_status && campaign.payment_status !== 'unpaid' && (
              <span className={cn('flex items-center gap-1', {
                'text-yellow-400': campaign.payment_status === 'pending_payment',
                'text-blue-400': campaign.payment_status === 'in_escrow',
                'text-green-400': campaign.payment_status === 'fully_released',
                'text-orange-400': campaign.payment_status === 'partially_released',
              })}>
                <CreditCard className="h-3.5 w-3.5" />
                {campaign.payment_status === 'in_escrow' ? 'En escrow' :
                 campaign.payment_status === 'pending_payment' ? 'Pendiente pago' :
                 campaign.payment_status === 'fully_released' ? 'Pagado' :
                 campaign.payment_status === 'partially_released' ? 'Pago parcial' :
                 campaign.payment_status}
              </span>
            )}
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

        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          {campaign.status === 'draft' && campaign.payment_status === 'pending_payment' && (
            <button
              onClick={onCompletePayment}
              className="text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 px-3 py-2 rounded-sm transition-colors font-medium flex items-center gap-1"
            >
              <CreditCard className="h-3 w-3" />
              Completar pago
            </button>
          )}
          {campaign.status === 'draft' && campaign.payment_status !== 'pending_payment' && (
            <button
              onClick={onActivate}
              className="text-xs bg-green-600/20 hover:bg-green-600/30 text-green-300 px-3 py-2 rounded-sm transition-colors font-medium"
            >
              Activar
            </button>
          )}
          {campaign.status === 'draft' && (
            <>
              <button
                onClick={onEdit}
                className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-2 rounded-sm transition-colors flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />
                Editar
              </button>
              {isDeleting ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={onConfirmDelete}
                    className="text-xs bg-red-600/20 hover:bg-red-600/30 text-red-300 px-3 py-2 rounded-sm transition-colors font-medium"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={onCancelDelete}
                    className="text-xs bg-white/5 hover:bg-white/10 text-gray-400 px-3 py-2 rounded-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={onDelete}
                  className="text-xs bg-red-600/10 hover:bg-red-600/20 text-red-400 px-3 py-2 rounded-sm transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Eliminar
                </button>
              )}
            </>
          )}
          <button
            onClick={onViewApplications}
            className="text-xs bg-white/5 hover:bg-white/10 text-foreground/80 px-3 py-2 rounded-sm transition-colors"
          >
            Aplicaciones
          </button>
          <button
            onClick={onViewSmartMatch}
            className="text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 px-3 py-2 rounded-sm transition-colors flex items-center gap-1"
          >
            <Star className="h-3 w-3" />
            Match
          </button>
          <button
            onClick={onViewProgress}
            className="text-xs bg-white/5 hover:bg-white/10 text-foreground/80 px-3 py-2 rounded-sm transition-colors"
          >
            Progreso
          </button>
          {campaign.is_brand_activation && (
            <button
              onClick={onViewActivations}
              className="text-xs bg-green-600/20 hover:bg-green-600/30 text-green-300 px-3 py-2 rounded-sm transition-colors flex items-center gap-1"
            >
              <Radio className="h-3 w-3" />
              Activaciones
            </button>
          )}
          <button
            onClick={onViewDetail}
            className="text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-3 py-2 rounded-sm transition-colors"
          >
            Ver
          </button>
        </div>
      </div>
    </div>
  );
}
