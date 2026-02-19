import { REFERRAL_TIERS, type ReferralTierKey } from '@/lib/finance/constants';
import { cn } from '@/lib/utils';

interface TierBadgeProps {
  tierKey: ReferralTierKey;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SIZE_MAP = {
  sm: 'text-xs px-1.5 py-0.5 gap-1',
  md: 'text-sm px-2 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
};

export function TierBadge({ tierKey, size = 'md', showLabel = true }: TierBadgeProps) {
  const tier = REFERRAL_TIERS[tierKey] || REFERRAL_TIERS.starter;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        SIZE_MAP[size],
      )}
      style={{
        backgroundColor: `${tier.badgeColor}20`,
        color: tier.badgeColor,
        border: `1px solid ${tier.badgeColor}40`,
      }}
    >
      <span>{tier.badgeEmoji}</span>
      {showLabel && <span>{tier.label}</span>}
    </span>
  );
}
