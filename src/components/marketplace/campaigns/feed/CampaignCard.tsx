import { memo } from 'react';
import { DollarSign, Gift, Layers, Calendar, Users, Clock, Gavel, ArrowUpDown, Globe, Lock, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CAMPAIGN_STATUS_COLORS, CAMPAIGN_STATUS_LABELS } from '@/hooks/useMarketplaceCampaigns';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Campaign } from '../../types/marketplace';
// Nova Design System styles applied directly via CSS variables

const VISIBILITY_BADGE = {
  public: { icon: Globe, label: 'Publica', bg: 'bg-[var(--nova-success-bg)]', text: 'text-[var(--nova-success)]' },
  internal: { icon: Lock, label: 'Interna', bg: 'bg-[var(--nova-warning-bg)]', text: 'text-[var(--nova-warning)]' },
  selective: { icon: Target, label: 'Selectiva', bg: 'bg-[var(--nova-accent-primary)]/15', text: 'text-[var(--nova-accent-primary)]' },
} as const;

interface CampaignCardProps {
  campaign: Campaign;
  onClick: () => void;
}

const TYPE_CONFIG = {
  paid: { icon: DollarSign, label: 'Pagada', color: 'text-[var(--nova-success)]' },
  exchange: { icon: Gift, label: 'Canje', color: 'text-[var(--nova-accent-primary)]' },
  hybrid: { icon: Layers, label: 'Hibrida', color: 'text-[var(--nova-accent-secondary)]' },
} as const;

export const CampaignCard = memo(function CampaignCard({ campaign, onClick }: CampaignCardProps) {
  const { formatPrice } = useCurrency();
  const typeConfig = TYPE_CONFIG[campaign.campaign_type];
  const TypeIcon = typeConfig.icon;
  const pricingMode = campaign.pricing_mode ?? 'fixed';
  const isBidMode = pricingMode === 'auction' || pricingMode === 'range';
  const visBadge = VISIBILITY_BADGE[campaign.visibility ?? 'public'];
  const VisIcon = visBadge.icon;
  const displayName = campaign.organization_name || campaign.brand_name;

  const budgetDisplay = campaign.campaign_type === 'exchange'
    ? 'Producto gratis'
    : isBidMode
      ? pricingMode === 'auction'
        ? 'Subasta abierta'
        : `${formatPrice(campaign.min_bid ?? 0)} - ${formatPrice(campaign.max_bid ?? 0)}`
      : campaign.budget_mode === 'per_video'
        ? `${formatPrice(campaign.budget_per_video ?? 0)}/video`
        : `${formatPrice(campaign.total_budget ?? 0)} total`;

  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <button
      onClick={onClick}
      className="w-full text-left nova-glass rounded-sm p-5 group cursor-pointer transition-all duration-200 hover:border-[var(--nova-border-accent)] hover:shadow-[var(--nova-shadow-glow)] hover:-translate-y-0.5"
    >
      {/* Header: Brand + Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {campaign.brand_logo ? (
            <img src={campaign.brand_logo} alt="" loading="lazy" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[var(--nova-accent-primary)]/20 flex items-center justify-center text-[var(--nova-accent-primary)] text-xs font-bold flex-shrink-0">
              {displayName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[var(--nova-text-muted)] text-xs truncate">{displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Visibility badge */}
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5', visBadge.bg, visBadge.text)}>
            <VisIcon className="h-3 w-3" />
            {visBadge.label}
          </span>
          {/* Urgent badge */}
          {campaign.is_urgent && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--nova-error-bg)] text-[var(--nova-error)] flex items-center gap-0.5">
              <Zap className="h-3 w-3" />
              Urgente
            </span>
          )}
          {isBidMode && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
              pricingMode === 'auction' ? 'bg-[var(--nova-warning-bg)] text-[var(--nova-warning)]' : 'bg-[var(--nova-info-bg)] text-[var(--nova-info)]',
            )}>
              {pricingMode === 'auction' ? <Gavel className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
              {pricingMode === 'auction' ? 'Subasta' : 'Rango'}
            </span>
          )}
          <span className={cn('text-xs px-2 py-0.5 rounded-full', CAMPAIGN_STATUS_COLORS[campaign.status])}>
            {CAMPAIGN_STATUS_LABELS[campaign.status]}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[var(--nova-text-bright)] font-semibold text-sm mb-2 line-clamp-2 group-hover:text-[var(--nova-accent-primary-hover)] transition-colors">
        {campaign.title}
      </h3>

      {/* Description */}
      <p className="text-[var(--nova-text-muted)] text-xs mb-3 line-clamp-2">{campaign.description}</p>

      {/* Content type tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {campaign.content_requirements.slice(0, 3).map((req, i) => (
          <span key={i} className="bg-[var(--nova-accent-primary)]/15 text-[var(--nova-accent-primary)] text-xs px-2 py-0.5 rounded-full">
            {req.quantity}x {req.content_type}
          </span>
        ))}
      </div>

      {/* Budget + Type */}
      <div className="flex items-center gap-2 mb-3">
        <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
        <span className={cn('text-sm font-medium', isBidMode ? 'text-[var(--nova-warning)]' : 'text-[var(--nova-text-bright)]')}>{budgetDisplay}</span>
        <span className={cn('text-xs', typeConfig.color)}>({typeConfig.label})</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--nova-border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[var(--nova-text-muted)] text-xs">
            <Users className="h-3 w-3" />
            <span>{campaign.applications_count} aplicaciones</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--nova-text-muted)] text-xs">
            <span>{campaign.approved_count}/{campaign.max_creators} seleccionados</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[var(--nova-text-disabled)] text-xs">
          {daysLeft > 0 ? (
            <>
              <Clock className="h-3 w-3" />
              <span>{daysLeft}d</span>
            </>
          ) : (
            <>
              <Calendar className="h-3 w-3" />
              <span>Cerrada</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
});
