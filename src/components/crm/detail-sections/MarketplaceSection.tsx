import {
  Star,
  ExternalLink,
  CheckCircle,
  ArrowRightLeft,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DetailSection } from '@/components/crm/DetailSection';

interface MarketplaceSectionProps {
  slug: string | null;
  level: string | null;
  basePrice: number | null;
  currency: string | null;
  ratingAvg: number | null;
  ratingCount: number | null;
  completedProjects: number | null;
  marketplaceRoles: string[] | null;
  isVerified: boolean | null;
  acceptsProductExchange: boolean | null;
  responseTimeHours: number | null;
  onTimeDeliveryPct: number | null;
  repeatClientsPct: number | null;
  totalEarned: number | null;
}

const LEVEL_COLORS: Record<string, string> = {
  bronze: 'bg-amber-700/20 text-amber-400 border-amber-600/30',
  silver: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
  gold: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  elite: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

function formatCurrency(amount: number, currency: string | null) {
  const cur = currency || 'USD';
  return new Intl.NumberFormat('es', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(amount);
}

export function MarketplaceSection({
  slug,
  level,
  basePrice,
  currency,
  ratingAvg,
  ratingCount,
  completedProjects,
  marketplaceRoles,
  isVerified,
  acceptsProductExchange,
  responseTimeHours,
  onTimeDeliveryPct,
  repeatClientsPct,
  totalEarned,
}: MarketplaceSectionProps) {
  if (!slug && !level) return null;

  const levelColor = level ? (LEVEL_COLORS[level.toLowerCase()] || LEVEL_COLORS.bronze) : '';

  return (
    <DetailSection title="Marketplace">
      <div className="space-y-3">
        {/* Slug + Level + Verified row */}
        <div className="flex items-center gap-2 flex-wrap">
          {slug && (
            <a
              href={`/marketplace/creator/${slug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-xs text-[#a855f7] hover:text-[#c084fc] transition-colors"
            >
              @{slug}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {level && (
            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize', levelColor)}>
              {level}
            </span>
          )}
          {isVerified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-300 border border-green-500/30">
              <CheckCircle className="h-3 w-3" />
              Verificado
            </span>
          )}
          {acceptsProductExchange && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <ArrowRightLeft className="h-3 w-3" />
              Canje
            </span>
          )}
        </div>

        {/* Marketplace roles */}
        {marketplaceRoles && marketplaceRoles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {marketplaceRoles.map((role) => (
              <span
                key={role}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#8b5cf6]/20 text-[#c084fc] border border-[#8b5cf6]/30"
              >
                {role}
              </span>
            ))}
          </div>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {basePrice != null && (
            <>
              <span className="text-white/40 flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" />
                Precio base
              </span>
              <span className="text-white/70 font-medium">{formatCurrency(basePrice, currency)}</span>
            </>
          )}

          {ratingAvg != null && (
            <>
              <span className="text-white/40 flex items-center gap-1.5">
                <Star className="h-3 w-3" />
                Rating
              </span>
              <span className="text-white/70 flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                {ratingAvg.toFixed(1)}
                {ratingCount != null && (
                  <span className="text-white/30">({ratingCount})</span>
                )}
              </span>
            </>
          )}

          {completedProjects != null && (
            <>
              <span className="text-white/40 flex items-center gap-1.5">
                <Briefcase className="h-3 w-3" />
                Proyectos
              </span>
              <span className="text-white/70">{completedProjects}</span>
            </>
          )}

          {responseTimeHours != null && (
            <>
              <span className="text-white/40 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Respuesta
              </span>
              <span className="text-white/70">{responseTimeHours}h</span>
            </>
          )}

          {onTimeDeliveryPct != null && (
            <>
              <span className="text-white/40 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                A tiempo
              </span>
              <span className="text-white/70">{onTimeDeliveryPct}%</span>
            </>
          )}

          {repeatClientsPct != null && (
            <>
              <span className="text-white/40 flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                Repiten
              </span>
              <span className="text-white/70">{repeatClientsPct}%</span>
            </>
          )}

          {totalEarned != null && (
            <>
              <span className="text-white/40 flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" />
                Total ganado
              </span>
              <span className="text-white/70 font-medium">{formatCurrency(totalEarned, currency)}</span>
            </>
          )}
        </div>
      </div>
    </DetailSection>
  );
}
