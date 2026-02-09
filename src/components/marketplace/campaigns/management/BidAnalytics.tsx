import { useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CampaignApplication, Campaign } from '../../types/marketplace';

interface BidAnalyticsProps {
  applications: CampaignApplication[];
  campaign: Campaign;
}

export function BidAnalytics({ applications, campaign }: BidAnalyticsProps) {
  const bids = useMemo(
    () => applications.filter(a => a.bid_amount && a.bid_amount > 0).map(a => a.bid_amount!),
    [applications],
  );

  if (bids.length === 0) {
    return (
      <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-xl p-5 text-center">
        <BarChart3 className="h-8 w-8 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Aun no hay ofertas para analizar</p>
      </div>
    );
  }

  const totalBids = bids.length;
  const avgBid = Math.round(bids.reduce((s, b) => s + b, 0) / bids.length);
  const minBid = Math.min(...bids);
  const maxBid = Math.max(...bids);

  // Distribution ranges
  const range = maxBid - minBid || 1;
  const bucketSize = Math.ceil(range / 4);
  const buckets = Array.from({ length: 4 }, (_, i) => {
    const lo = minBid + i * bucketSize;
    const hi = i === 3 ? maxBid : lo + bucketSize - 1;
    const count = bids.filter(b => b >= lo && b <= (i === 3 ? Infinity : hi)).length;
    return { lo, hi, count };
  });
  const maxBucketCount = Math.max(...buckets.map(b => b.count), 1);

  // Bid deadline countdown
  const bidDeadline = campaign.bid_deadline ? new Date(campaign.bid_deadline) : null;
  const daysUntilDeadline = bidDeadline
    ? Math.max(0, Math.ceil((bidDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-orange-400" />
          Analisis de Ofertas
        </h3>
        {daysUntilDeadline !== null && (
          <span className={cn(
            'text-xs px-2.5 py-1 rounded-full flex items-center gap-1',
            daysUntilDeadline > 3
              ? 'bg-green-500/15 text-green-300'
              : daysUntilDeadline > 0
                ? 'bg-yellow-500/15 text-yellow-300'
                : 'bg-red-500/15 text-red-300',
          )}>
            <Clock className="h-3 w-3" />
            {daysUntilDeadline > 0 ? `${daysUntilDeadline}d restantes` : 'Cerrada'}
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Total ofertas" value={String(totalBids)} color="text-purple-400" bg="bg-purple-500/10" />
        <KpiCard icon={DollarSign} label="Promedio" value={`$${avgBid.toLocaleString()}`} color="text-white" bg="bg-white/5" />
        <KpiCard icon={TrendingDown} label="Minima" value={`$${minBid.toLocaleString()}`} color="text-green-400" bg="bg-green-500/10" />
        <KpiCard icon={TrendingUp} label="Maxima" value={`$${maxBid.toLocaleString()}`} color="text-orange-400" bg="bg-orange-500/10" />
      </div>

      {/* Distribution */}
      <div>
        <p className="text-gray-500 text-xs mb-3">Distribucion de ofertas</p>
        <div className="space-y-2">
          {buckets.map((bucket, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-gray-500 text-xs w-32 text-right flex-shrink-0">
                ${bucket.lo.toLocaleString()} – ${bucket.hi.toLocaleString()}
              </span>
              <div className="flex-1 bg-white/5 rounded-full h-5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-600/60 to-orange-500/40 h-full rounded-full transition-all flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(8, (bucket.count / maxBucketCount) * 100)}%` }}
                >
                  <span className="text-white text-xs font-medium">{bucket.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={cn('rounded-lg p-3', bg)}>
      <Icon className={cn('h-4 w-4 mb-1', color)} />
      <p className={cn('text-lg font-bold', color)}>{value}</p>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  );
}
