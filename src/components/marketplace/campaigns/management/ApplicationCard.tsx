import { Star, MapPin, CheckCircle2, XCircle, ExternalLink, Gavel, ArrowLeftRight, DollarSign, FolderOpen, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APPLICATION_STATUS_COLORS, APPLICATION_STATUS_LABELS } from '@/hooks/useMarketplaceCampaigns';
import type { CampaignApplication, CampaignPricingMode } from '../../types/marketplace';

const PROJECT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  briefing: 'En Brief',
  in_progress: 'En Produccion',
  revision: 'En Revision',
  approved: 'Aprobado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

interface ApplicationCardProps {
  application: CampaignApplication;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  showActions: boolean;
  pricingMode?: CampaignPricingMode;
  onCounterOffer?: (id: string) => void;
  projectInfo?: { id: string; status: string } | null;
}

export function ApplicationCard({ application, onApprove, onReject, showActions, pricingMode, onCounterOffer, projectInfo }: ApplicationCardProps) {
  const creator = application.creator;
  const isBidMode = pricingMode === 'auction' || pricingMode === 'range';
  const hasBid = !!application.bid_amount;
  const hasCounterOffer = !!application.counter_offer;
  const priceLabel = isBidMode ? 'Oferta' : 'Precio propuesto';
  const priceValue = hasBid ? application.bid_amount : application.proposed_price;

  return (
    <div className="bg-card/80 border border-white/5 rounded-sm p-5 space-y-4">
      {/* Creator info */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {creator.avatar_url ? (
            <img src={creator.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold">
              {creator.display_name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-white font-medium text-sm">{creator.display_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1 text-xs">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <span className="text-white">{creator.rating_avg.toFixed(1)}</span>
                <span className="text-gray-500">({creator.rating_count})</span>
              </div>
              {creator.location_city && (
                <div className="flex items-center gap-0.5 text-gray-500 text-xs">
                  <MapPin className="h-3 w-3" />
                  {creator.location_city}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={cn('text-xs px-2 py-0.5 rounded-full', APPLICATION_STATUS_COLORS[application.status])}>
            {APPLICATION_STATUS_LABELS[application.status]}
          </span>
          {projectInfo && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              {PROJECT_STATUS_LABELS[projectInfo.status] || projectInfo.status}
            </span>
          )}
        </div>
      </div>

      {/* Cover letter */}
      <div>
        <p className="text-gray-500 text-xs mb-1">Carta de presentacion</p>
        <p className="text-foreground/80 text-sm leading-relaxed">{application.cover_letter}</p>
      </div>

      {/* Bid message (auction/range) */}
      {application.bid_message && (
        <div className="bg-orange-500/5 border border-orange-500/10 rounded-sm p-3">
          <p className="text-orange-400 text-xs mb-1 flex items-center gap-1">
            <Gavel className="h-3 w-3" />
            Mensaje de oferta
          </p>
          <p className="text-foreground/80 text-sm leading-relaxed">{application.bid_message}</p>
        </div>
      )}

      {/* Details row */}
      <div className="flex flex-wrap gap-4 text-sm">
        {priceValue && (
          <div>
            <span className="text-gray-500 text-xs">{priceLabel}</span>
            <p className={cn('font-medium', isBidMode ? 'text-orange-300' : 'text-white')}>
              ${priceValue.toLocaleString()}
            </p>
          </div>
        )}
        {application.agreed_price != null && application.agreed_price > 0 && (
          <div>
            <span className="text-gray-500 text-xs">Precio acordado</span>
            <p className="text-green-300 font-medium">${application.agreed_price.toLocaleString()}</p>
          </div>
        )}
        <div>
          <span className="text-gray-500 text-xs">Disponible desde</span>
          <p className="text-white font-medium">{new Date(application.availability_date).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Proyectos completados</span>
          <p className="text-white font-medium">{creator.completed_projects}</p>
        </div>
        {application.payment_status && application.payment_status !== 'unpaid' && (
          <div>
            <span className="text-gray-500 text-xs flex items-center gap-1"><CreditCard className="h-3 w-3" />Pago</span>
            <p className={cn('font-medium text-xs', {
              'text-blue-300': application.payment_status === 'in_escrow',
              'text-green-300': application.payment_status === 'released',
              'text-red-300': application.payment_status === 'refunded',
            })}>
              {application.payment_status === 'in_escrow' ? 'En escrow' :
               application.payment_status === 'released' ? 'Liberado' :
               application.payment_status === 'refunded' ? 'Reembolsado' :
               application.payment_status}
            </p>
          </div>
        )}
      </div>

      {/* Counter offer section */}
      {hasCounterOffer && application.counter_offer && (
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-sm p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-blue-400 text-xs font-medium flex items-center gap-1">
              <ArrowLeftRight className="h-3 w-3" />
              Contraoferta enviada
            </p>
            {application.counter_offer.creator_response ? (
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                application.counter_offer.creator_response === 'accepted'
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-red-500/20 text-red-300',
              )}>
                {application.counter_offer.creator_response === 'accepted' ? 'Aceptada' : 'Rechazada'}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">Pendiente</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400">Monto:</span>
            <span className="text-white font-medium">${application.counter_offer.brand_amount.toLocaleString()}</span>
          </div>
          {application.counter_offer.brand_message && (
            <p className="text-gray-400 text-xs">{application.counter_offer.brand_message}</p>
          )}
        </div>
      )}

      {/* Portfolio links */}
      {application.portfolio_links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {application.portfolio_links.map(link => (
            <a
              key={link}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-purple-400 text-xs hover:text-purple-300 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {link.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          ))}
        </div>
      )}

      {/* Brand notes */}
      {application.brand_notes && (
        <div className="bg-white/5 rounded-sm p-3">
          <p className="text-gray-500 text-xs">Nota:</p>
          <p className="text-gray-400 text-xs">{application.brand_notes}</p>
        </div>
      )}

      {/* Action buttons */}
      {showActions && application.status === 'pending' && (
        <div className="flex gap-2 pt-2 border-t border-white/5">
          <button
            onClick={() => onApprove(application.id)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-300 py-2.5 rounded-sm text-sm font-medium transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Aprobar
          </button>
          {/* Counter offer button for auction/range */}
          {isBidMode && onCounterOffer && !hasCounterOffer && (
            <button
              onClick={() => onCounterOffer(application.id)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 py-2.5 rounded-sm text-sm font-medium transition-colors"
            >
              <DollarSign className="h-4 w-4" />
              Contraoferta
            </button>
          )}
          <button
            onClick={() => onReject(application.id)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 py-2.5 rounded-sm text-sm font-medium transition-colors"
          >
            <XCircle className="h-4 w-4" />
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
