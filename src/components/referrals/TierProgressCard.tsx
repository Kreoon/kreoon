import { Card } from '@/components/ui/card';
import { TierBadge } from './TierBadge';
import { REFERRAL_TIERS, REFERRAL_TIER_ORDER, type ReferralTierKey } from '@/lib/finance/constants';

interface TierProgressCardProps {
  currentTierKey: ReferralTierKey;
  activeReferrals: number;
  effectiveRate: number;
}

export function TierProgressCard({ currentTierKey, activeReferrals, effectiveRate }: TierProgressCardProps) {
  const currentTier = REFERRAL_TIERS[currentTierKey] || REFERRAL_TIERS.starter;
  const currentIndex = REFERRAL_TIER_ORDER.indexOf(currentTierKey);
  const isMaxTier = currentIndex >= REFERRAL_TIER_ORDER.length - 1;

  const nextTierKey = !isMaxTier ? REFERRAL_TIER_ORDER[currentIndex + 1] : null;
  const nextTier = nextTierKey ? REFERRAL_TIERS[nextTierKey] : null;

  // Progress calculation
  const currentMin = currentTier.minReferrals;
  const nextMin = nextTier ? nextTier.minReferrals : currentTier.minReferrals;
  const range = nextMin - currentMin;
  const progress = range > 0
    ? Math.min(100, ((activeReferrals - currentMin) / range) * 100)
    : 100;

  const referralsToNext = nextTier ? Math.max(0, nextTier.minReferrals - activeReferrals) : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Tu Nivel de Referidos</h3>
          <p className="text-white/40 text-xs">Comision efectiva: {effectiveRate}%</p>
        </div>
        <TierBadge tierKey={currentTierKey} size="lg" />
      </div>

      {/* Progress bar */}
      {!isMaxTier && nextTier && (
        <div className="space-y-2">
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: nextTier.badgeColor,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">
              {activeReferrals} / {nextTier.minReferrals} referidos
            </span>
            <span className="text-white/50">
              Siguiente: <TierBadge tierKey={nextTierKey as ReferralTierKey} size="sm" />
            </span>
          </div>
          <p className="text-center text-xs text-white/60 mt-1">
            Invita <strong className="text-purple-300">{referralsToNext} mas</strong> para ser{' '}
            <strong style={{ color: nextTier.badgeColor }}>{nextTier.label}</strong>{' '}
            y ganar {nextTier.effectiveRate}% de comision
          </p>
        </div>
      )}

      {isMaxTier && (
        <p className="text-center text-xs text-amber-400/80 mt-2">
          Has alcanzado el nivel maximo. Comision: {effectiveRate}%
        </p>
      )}

      {/* Tier benefits preview */}
      <div className="mt-4 grid grid-cols-5 gap-1">
        {REFERRAL_TIER_ORDER.map((key) => {
          const t = REFERRAL_TIERS[key];
          const isActive = REFERRAL_TIER_ORDER.indexOf(key) <= currentIndex;
          return (
            <div
              key={key}
              className="text-center p-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: isActive ? `${t.badgeColor}20` : 'rgba(255,255,255,0.03)',
                opacity: isActive ? 1 : 0.4,
              }}
            >
              <div className="text-sm">{t.badgeEmoji}</div>
              <div className="text-[9px] text-white/60 mt-0.5">{t.effectiveRate}%</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
