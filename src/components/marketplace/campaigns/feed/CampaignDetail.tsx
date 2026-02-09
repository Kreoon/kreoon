import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, Gift, Layers, Calendar, Users, MapPin, Star,
  Globe, Video, CheckCircle2, Clock, Tag, Shield, Megaphone, Gavel, ArrowUpDown, EyeOff, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useMarketplaceCampaigns, CAMPAIGN_STATUS_COLORS, CAMPAIGN_STATUS_LABELS } from '@/hooks/useMarketplaceCampaigns';
import { MARKETPLACE_CATEGORIES, COUNTRIES } from '../../types/marketplace';
import { CampaignApplicationModal } from '../application/CampaignApplicationModal';
import type { Campaign, CampaignApplication } from '../../types/marketplace';

interface CampaignDetailProps {
  campaignId: string;
}

const TYPE_CONFIG = {
  paid: { icon: DollarSign, label: 'Campana Pagada', color: 'text-green-400', bg: 'bg-green-500/10' },
  exchange: { icon: Gift, label: 'Canje de Producto', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  hybrid: { icon: Layers, label: 'Hibrida (Pago + Canje)', color: 'text-blue-400', bg: 'bg-blue-500/10' },
} as const;

export function CampaignDetail({ campaignId }: CampaignDetailProps) {
  const navigate = useNavigate();
  const { user, isCreator } = useAuth();
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  const { getCampaignById, getApplicationsForCampaign, getApplicationsForCreator } = useMarketplaceCampaigns();

  const campaign = useMemo(() => getCampaignById(campaignId), [campaignId, getCampaignById]);

  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [myApplication, setMyApplication] = useState<CampaignApplication | null>(null);

  useEffect(() => {
    if (!campaign) return;
    let cancelled = false;
    getApplicationsForCampaign(campaign.id).then(apps => {
      if (!cancelled) setApplications(apps);
    });
    return () => { cancelled = true; };
  }, [campaign, getApplicationsForCampaign]);

  // Check if current user already applied
  useEffect(() => {
    if (!user) { setMyApplication(null); return; }
    let cancelled = false;
    // Lookup applications made by this user across campaigns
    getApplicationsForCreator(user.id).then(apps => {
      if (!cancelled) {
        setMyApplication(apps.find(a => a.campaign_id === campaignId) ?? null);
      }
    });
    return () => { cancelled = true; };
  }, [user, campaignId, getApplicationsForCreator]);

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Megaphone className="h-12 w-12 text-gray-600 mx-auto" />
          <h2 className="text-white font-semibold">Campana no encontrada</h2>
          <button
            onClick={() => navigate('/marketplace/campaigns')}
            className="text-purple-400 text-sm hover:text-purple-300"
          >
            Volver a campanas
          </button>
        </div>
      </div>
    );
  }

  const typeConfig = TYPE_CONFIG[campaign.campaign_type];
  const TypeIcon = typeConfig.icon;
  const categoryLabel = MARKETPLACE_CATEGORIES.find(c => c.id === campaign.category)?.label ?? campaign.category;
  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const pricingMode = campaign.pricing_mode ?? 'fixed';
  const isBidMode = pricingMode === 'auction' || pricingMode === 'range';

  const canApply = campaign.status === 'active' && isCreator && !myApplication;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Top nav */}
      <div className="border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/marketplace/campaigns')}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-gray-400" />
            </button>
            <span className="text-gray-500 text-sm">Campanas</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <div className="flex-1 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('text-xs px-2.5 py-1 rounded-full', CAMPAIGN_STATUS_COLORS[campaign.status])}>
                  {CAMPAIGN_STATUS_LABELS[campaign.status]}
                </span>
                <span className="bg-white/5 text-gray-400 text-xs px-2.5 py-1 rounded-full">{categoryLabel}</span>
                {isBidMode && (
                  <span className={cn(
                    'text-xs px-2.5 py-1 rounded-full flex items-center gap-1',
                    pricingMode === 'auction' ? 'bg-orange-500/15 text-orange-300' : 'bg-blue-500/15 text-blue-300',
                  )}>
                    {pricingMode === 'auction' ? <Gavel className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
                    {pricingMode === 'auction' ? 'Subasta Abierta' : 'Rango de Presupuesto'}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">{campaign.title}</h1>
              <div className="flex items-center gap-3">
                {campaign.brand_logo ? (
                  <img src={campaign.brand_logo} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold">
                    {campaign.brand_name.charAt(0)}
                  </div>
                )}
                <span className="text-gray-400 text-sm">{campaign.brand_name}</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white/5 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Descripcion</h2>
              <p className="text-gray-300 text-sm leading-relaxed">{campaign.description}</p>
            </div>

            {/* Content requirements */}
            <div className="bg-white/5 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Contenido Requerido</h2>
              <div className="space-y-3">
                {campaign.content_requirements.map((req, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                    <Video className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{req.quantity}x {req.content_type}</span>
                        {req.duration_seconds && (
                          <span className="text-gray-500 text-xs">({req.duration_seconds}s)</span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">{req.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creator requirements */}
            <div className="bg-white/5 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Perfil de Creador Buscado</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="text-gray-400 text-sm">Rating minimo: <span className="text-white">{campaign.creator_requirements.min_rating}+</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-gray-400 text-sm">Proyectos: <span className="text-white">{campaign.creator_requirements.min_completed_projects}+</span></span>
                </div>
                {campaign.creator_requirements.countries.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-400" />
                    <span className="text-gray-400 text-sm">Paises: <span className="text-white">
                      {campaign.creator_requirements.countries.map(code => COUNTRIES.find(c => c.code === code)?.label ?? code).join(', ')}
                    </span></span>
                  </div>
                )}
                {campaign.creator_requirements.languages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-cyan-400" />
                    <span className="text-gray-400 text-sm">Idiomas: <span className="text-white">{campaign.creator_requirements.languages.join(', ')}</span></span>
                  </div>
                )}
              </div>
              {campaign.creator_requirements.categories.length > 0 && (
                <div className="mt-3">
                  <span className="text-gray-500 text-xs">Categorias:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {campaign.creator_requirements.categories.map(cat => (
                      <span key={cat} className="bg-purple-500/15 text-purple-300 text-xs px-2 py-0.5 rounded-full">{cat}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {campaign.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-3.5 w-3.5 text-gray-600" />
                {campaign.tags.map(tag => (
                  <span key={tag} className="bg-white/5 text-gray-500 text-xs px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-4">
            {/* Budget card */}
            <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-xl p-5 space-y-4 sticky top-24">
              <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', typeConfig.bg)}>
                <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
                <span className={cn('text-sm font-medium', typeConfig.color)}>{typeConfig.label}</span>
              </div>

              {/* Budget / Pricing mode */}
              {campaign.campaign_type !== 'exchange' && (
                <div>
                  {pricingMode === 'auction' ? (
                    <>
                      <span className="text-gray-500 text-xs">Modo de pago</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Gavel className="h-5 w-5 text-orange-400" />
                        <p className="text-orange-300 text-lg font-bold">Subasta Abierta</p>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">Los creadores proponen su precio libremente</p>
                      {campaign.bid_deadline && (
                        <p className="text-gray-400 text-xs mt-1.5">
                          Ofertas hasta: {new Date(campaign.bid_deadline).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                        {campaign.bid_visibility === 'sealed' ? (
                          <><EyeOff className="h-3 w-3" /> Ofertas selladas</>
                        ) : (
                          <><Eye className="h-3 w-3" /> Ofertas publicas</>
                        )}
                      </div>
                    </>
                  ) : pricingMode === 'range' ? (
                    <>
                      <span className="text-gray-500 text-xs">Rango de presupuesto</span>
                      <p className="text-blue-300 text-lg font-bold mt-1">
                        ${(campaign.min_bid ?? 0).toLocaleString()} – ${(campaign.max_bid ?? 0).toLocaleString()}
                      </p>
                      <p className="text-gray-600 text-xs">{campaign.currency}</p>
                      {campaign.bid_deadline && (
                        <p className="text-gray-400 text-xs mt-1.5">
                          Ofertas hasta: {new Date(campaign.bid_deadline).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                        {campaign.bid_visibility === 'sealed' ? (
                          <><EyeOff className="h-3 w-3" /> Ofertas selladas</>
                        ) : (
                          <><Eye className="h-3 w-3" /> Ofertas publicas</>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-500 text-xs">Presupuesto</span>
                      <p className="text-white text-xl font-bold">
                        {campaign.budget_mode === 'per_video'
                          ? `$${(campaign.budget_per_video ?? 0).toLocaleString()} /video`
                          : `$${(campaign.total_budget ?? 0).toLocaleString()} total`}
                      </p>
                      <p className="text-gray-600 text-xs mt-0.5">{campaign.currency}</p>
                    </>
                  )}
                </div>
              )}

              {/* Exchange product */}
              {(campaign.campaign_type === 'exchange' || campaign.campaign_type === 'hybrid') && campaign.exchange_product_name && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="h-4 w-4 text-purple-400" />
                    <span className="text-white text-sm font-medium">{campaign.exchange_product_name}</span>
                  </div>
                  {campaign.exchange_product_value && (
                    <p className="text-gray-400 text-xs">Valor: ${campaign.exchange_product_value.toLocaleString()} {campaign.currency}</p>
                  )}
                  {campaign.exchange_product_description && (
                    <p className="text-gray-500 text-xs mt-1">{campaign.exchange_product_description}</p>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Creadores</span>
                  <span className="text-white text-sm">{campaign.approved_count}/{campaign.max_creators}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm flex items-center gap-1.5"><Megaphone className="h-3.5 w-3.5" /> Aplicaciones</span>
                  <span className="text-white text-sm">{campaign.applications_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Fecha limite</span>
                  <span className="text-white text-sm">{new Date(campaign.deadline).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {daysLeft > 0 && campaign.status === 'active' && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Quedan</span>
                    <span className="text-purple-300 text-sm font-medium">{daysLeft} dias</span>
                  </div>
                )}
              </div>

              {/* Platform fee */}
              <div className="flex items-center gap-2 text-gray-600 text-xs pt-2 border-t border-white/5">
                <Shield className="h-3.5 w-3.5" />
                <span>Comision Kreoon: {campaign.platform_fee_pct}%</span>
              </div>

              {/* CTA */}
              {canApply && (
                <button
                  onClick={() => setShowApplicationModal(true)}
                  className={cn(
                    'w-full font-semibold py-3 rounded-xl transition-colors',
                    isBidMode
                      ? 'bg-orange-600 hover:bg-orange-500 text-white'
                      : 'bg-purple-600 hover:bg-purple-500 text-white',
                  )}
                >
                  {isBidMode ? 'Hacer Oferta' : 'Aplicar a esta Campana'}
                </button>
              )}

              {myApplication && (
                <div className="text-center">
                  <span className="bg-purple-500/20 text-purple-300 text-sm px-4 py-2 rounded-lg inline-block">
                    Ya aplicaste — {myApplication.status === 'pending' ? 'Pendiente' : myApplication.status === 'approved' ? 'Aprobada' : 'En proceso'}
                  </span>
                </div>
              )}

              {!user && campaign.status === 'active' && (
                <p className="text-gray-500 text-xs text-center">Inicia sesion para aplicar a esta campana</p>
              )}

              {user && !isCreator && campaign.status === 'active' && !myApplication && (
                <p className="text-gray-500 text-xs text-center">Solo creadores pueden aplicar a campanas</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Application modal */}
      {showApplicationModal && (
        <CampaignApplicationModal
          campaign={campaign}
          onClose={() => setShowApplicationModal(false)}
          onSuccess={() => {
            setShowApplicationModal(false);
          }}
        />
      )}
    </div>
  );
}
