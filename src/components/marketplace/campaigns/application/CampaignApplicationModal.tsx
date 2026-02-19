import { useState, useMemo } from 'react';
import { X, Send, Link, Calendar, DollarSign, Gavel, ArrowUpDown, EyeOff, Loader2, Scissors, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { useMarketplaceCampaigns } from '@/hooks/useMarketplaceCampaigns';
import { useAuth } from '@/hooks/useAuth';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { ApplicationSuccess } from './ApplicationSuccess';
import type { Campaign } from '../../types/marketplace';

interface CampaignApplicationModalProps {
  campaign: Campaign;
  onClose: () => void;
  onSuccess: () => void;
}

import { COMMISSION_RATES } from '@/lib/finance/constants';

export function CampaignApplicationModal({ campaign, onClose, onSuccess }: CampaignApplicationModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile: creatorProfile } = useCreatorProfile();
  const { submitApplication } = useMarketplaceCampaigns();
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedPrice, setProposedPrice] = useState<string>('');
  const [bidMessage, setBidMessage] = useState('');
  const [portfolioInput, setPortfolioInput] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [includesEditing, setIncludesEditing] = useState(true);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState(7);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pricingMode = campaign.pricing_mode ?? 'fixed';
  const isAuction = pricingMode === 'auction';
  const isRange = pricingMode === 'range';
  const isBidMode = isAuction || isRange;
  const isPaidCampaign = campaign.campaign_type !== 'exchange';

  // Dynamic commission from campaign (30% self-service, 40% with agency)
  const campaignCommissionPct = campaign.commission_rate
    ?? (campaign.requires_agency_support ? COMMISSION_RATES.campaigns_managed.max : COMMISSION_RATES.campaigns_managed.base);
  const commissionDecimal = campaignCommissionPct / 100;

  // Payment preview calculation
  const paymentPreview = useMemo(() => {
    const rawPrice = Number(proposedPrice) || campaign.budget_per_video || 0;
    if (!rawPrice || !isPaidCampaign) return null;
    const fee = Math.round(rawPrice * commissionDecimal);
    const net = rawPrice - fee;
    if (includesEditing) {
      return { creatorPayout: net, editorPayout: 0, fee, total: rawPrice, commissionPct: campaignCommissionPct };
    }
    const creatorPayout = Math.round(net * (2 / 3));
    const editorPayout = net - creatorPayout;
    return { creatorPayout, editorPayout, fee, total: rawPrice, commissionPct: campaignCommissionPct };
  }, [proposedPrice, campaign.budget_per_video, isPaidCampaign, includesEditing, commissionDecimal, campaignCommissionPct]);

  const addPortfolioLink = () => {
    const trimmed = portfolioInput.trim();
    if (trimmed && !portfolioLinks.includes(trimmed)) {
      setPortfolioLinks(prev => [...prev, trimmed]);
      setPortfolioInput('');
    }
  };

  const removePortfolioLink = (link: string) => {
    setPortfolioLinks(prev => prev.filter(l => l !== link));
  };

  const handleSubmit = async () => {
    if (!user?.id || !creatorProfile?.id) {
      toast({ title: 'Necesitas un perfil de creador para aplicar', variant: 'destructive' });
      return;
    }
    if (!coverLetter.trim()) {
      toast({ title: 'Escribe una carta de presentacion', variant: 'destructive' });
      return;
    }
    if (!availabilityDate) {
      toast({ title: 'Selecciona tu fecha de disponibilidad', variant: 'destructive' });
      return;
    }
    // Validate bid for range mode
    if (isRange && proposedPrice) {
      const numBid = Number(proposedPrice);
      if (campaign.min_bid && numBid < campaign.min_bid) {
        toast({ title: `La oferta minima es $${campaign.min_bid.toLocaleString()}`, variant: 'destructive' });
        return;
      }
      if (campaign.max_bid && numBid > campaign.max_bid) {
        toast({ title: `La oferta maxima es $${campaign.max_bid.toLocaleString()}`, variant: 'destructive' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const applicationData: Record<string, any> = {
        campaign_id: campaign.id,
        creator_id: creatorProfile.id,
        cover_letter: coverLetter.trim(),
        portfolio_links: portfolioLinks.length > 0 ? portfolioLinks : undefined,
        availability_date: availabilityDate || undefined,
        includes_editing: includesEditing,
        estimated_delivery_days: estimatedDeliveryDays,
      };

      if (proposedPrice) {
        if (isBidMode) {
          applicationData.bid_amount = Number(proposedPrice);
          if (bidMessage.trim()) applicationData.bid_message = bidMessage.trim();
        } else {
          applicationData.proposed_price = Number(proposedPrice);
        }
      }

      const appId = await submitApplication(applicationData);
      if (appId) {
        setShowSuccess(true);
        onSuccess();
      } else {
        toast({ title: 'Error al enviar la aplicacion. Intenta de nuevo.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error al enviar la aplicacion', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return <ApplicationSuccess onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-card border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">
                {isBidMode ? 'Hacer Oferta' : 'Aplicar a Campana'}
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">{campaign.title}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <div className="px-6 py-5 space-y-5">
            {/* Pricing mode notice */}
            {isBidMode && (
              <div className={cn(
                'rounded-xl p-3 flex items-start gap-3',
                isAuction ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-blue-500/10 border border-blue-500/20',
              )}>
                {isAuction ? (
                  <Gavel className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <ArrowUpDown className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={cn('text-sm font-medium', isAuction ? 'text-orange-300' : 'text-blue-300')}>
                    {isAuction ? 'Subasta Abierta' : 'Rango de Presupuesto'}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {isAuction
                      ? 'Propone tu precio libremente. La marca evaluara todas las ofertas.'
                      : `La marca acepta ofertas entre $${(campaign.min_bid ?? 0).toLocaleString()} y $${(campaign.max_bid ?? 0).toLocaleString()} COP.`
                    }
                  </p>
                  {campaign.bid_visibility === 'sealed' && (
                    <p className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                      <EyeOff className="h-3 w-3" />
                      Oferta sellada — solo la marca ve los montos
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cover letter */}
            <div>
              <label className="text-foreground/80 text-sm font-medium block mb-1.5">
                Carta de Presentacion <span className="text-red-400">*</span>
              </label>
              <textarea
                value={coverLetter}
                onChange={e => setCoverLetter(e.target.value)}
                placeholder="Cuentale a la marca por que eres el creador ideal para esta campana..."
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 resize-none"
              />
              <p className="text-gray-600 text-xs mt-1">{coverLetter.length}/500 caracteres</p>
            </div>

            {/* Price / Bid input (only for paid campaigns) */}
            {isPaidCampaign && (
              <div>
                <label className="text-foreground/80 text-sm font-medium block mb-1.5">
                  {isBidMode ? (
                    <>Tu Oferta ({campaign.currency}) <span className="text-red-400">*</span></>
                  ) : (
                    <>Precio Propuesto ({campaign.currency})</>
                  )}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    value={proposedPrice}
                    onChange={e => setProposedPrice(e.target.value)}
                    placeholder={
                      isAuction
                        ? 'Ingresa tu oferta'
                        : isRange
                          ? `${(campaign.min_bid ?? 0).toLocaleString()} - ${(campaign.max_bid ?? 0).toLocaleString()}`
                          : `Sugerido: $${(campaign.budget_per_video ?? 0).toLocaleString()}`
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
                {/* Hints per mode */}
                {!isBidMode && campaign.budget_per_video && (
                  <p className="text-gray-600 text-xs mt-1">Presupuesto por video: ${campaign.budget_per_video.toLocaleString()}</p>
                )}
                {isRange && (
                  <p className="text-gray-600 text-xs mt-1">
                    Rango aceptado: ${(campaign.min_bid ?? 0).toLocaleString()} – ${(campaign.max_bid ?? 0).toLocaleString()} COP
                  </p>
                )}
                {isAuction && campaign.bid_deadline && (
                  <p className="text-gray-600 text-xs mt-1">
                    Ofertas hasta: {new Date(campaign.bid_deadline).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {/* Bid message (auction/range only) */}
            {isBidMode && (
              <div>
                <label className="text-foreground/80 text-sm font-medium block mb-1.5">
                  Mensaje de Oferta (opcional)
                </label>
                <textarea
                  value={bidMessage}
                  onChange={e => setBidMessage(e.target.value)}
                  placeholder="Justifica tu oferta o agrega detalles sobre tu propuesta..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            )}

            {/* Editing toggle */}
            <div className="rounded-xl p-4 bg-white/5 border border-white/5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includesEditing}
                  onChange={e => setIncludesEditing(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded bg-white/10 border-white/20 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Scissors className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-white text-sm font-medium">Yo tambien edito el contenido</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    {includesEditing
                      ? 'Recibes el 100% del pago neto (despues de comision).'
                      : 'Kreoon asignara un editor. El pago se divide: 2/3 para ti, 1/3 para el editor.'}
                  </p>
                </div>
              </label>
            </div>

            {/* Estimated delivery days */}
            <div>
              <label className="text-foreground/80 text-sm font-medium block mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  Tiempo de entrega estimado
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={estimatedDeliveryDays}
                  onChange={e => setEstimatedDeliveryDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 7)))}
                  className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm text-center focus:outline-none focus:border-purple-500"
                />
                <span className="text-gray-500 text-sm">dias despues de aprobacion</span>
              </div>
            </div>

            {/* Payment preview (paid campaigns only) */}
            {isPaidCampaign && paymentPreview && paymentPreview.total > 0 && (
              <div className="rounded-xl p-4 bg-purple-500/10 border border-purple-500/15">
                <p className="text-purple-300 text-xs font-medium mb-2">Tu pago estimado</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(paymentPreview.creatorPayout, campaign.currency || 'COP')}
                </p>
                {!includesEditing && paymentPreview.editorPayout > 0 && (
                  <p className="text-purple-300/70 text-xs mt-1">
                    Editor recibira: {formatCurrency(paymentPreview.editorPayout, campaign.currency || 'COP')}
                  </p>
                )}
                <p className="text-purple-400/50 text-[10px] mt-1.5">
                  Comision plataforma: {formatCurrency(paymentPreview.fee, campaign.currency || 'COP')} ({paymentPreview.commissionPct}%)
                </p>
              </div>
            )}

            {/* Portfolio links */}
            <div>
              <label className="text-foreground/80 text-sm font-medium block mb-1.5">
                Links de Portafolio
              </label>
              <div className="flex gap-2">
                <input
                  value={portfolioInput}
                  onChange={e => setPortfolioInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPortfolioLink(); } }}
                  placeholder="https://instagram.com/tu-perfil"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={addPortfolioLink}
                  disabled={!portfolioInput.trim()}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 px-3 rounded-xl transition-colors"
                >
                  <Link className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              {portfolioLinks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {portfolioLinks.map(link => (
                    <span key={link} className="flex items-center gap-1 bg-purple-500/15 text-purple-300 text-xs px-2 py-1 rounded-full">
                      {link.replace(/^https?:\/\//, '').slice(0, 30)}
                      <button onClick={() => removePortfolioLink(link)} className="hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Availability date */}
            <div>
              <label className="text-foreground/80 text-sm font-medium block mb-1.5">
                Disponibilidad <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="date"
                  value={availabilityDate}
                  onChange={e => setAvailabilityDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <p className="text-gray-600 text-xs mt-1">Desde cuando puedes empezar a crear contenido</p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-6 py-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={cn(
                'flex-1 py-3 rounded-xl transition-colors text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50',
                isBidMode
                  ? 'bg-orange-600 hover:bg-orange-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white',
              )}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Enviando...' : isBidMode ? 'Enviar Oferta' : 'Enviar Aplicacion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
