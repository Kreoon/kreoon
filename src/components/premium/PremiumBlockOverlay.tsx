import { memo } from 'react';
import { Lock, Sparkles, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BlockType } from '@/components/profile-builder/types/profile-builder';
import type { CreatorTier } from '@/hooks/useCreatorPlanFeatures';

interface PremiumBlockOverlayProps {
  blockType: BlockType;
  requiredPlan: CreatorTier;
  onUpgrade: () => void;
  className?: string;
}

const PLAN_LABELS: Record<CreatorTier, string> = {
  creator_free: 'Free',
  creator_pro: 'Pro',
  creator_premium: 'Premium',
};

const PLAN_COLORS: Record<CreatorTier, string> = {
  creator_free: 'text-zinc-400',
  creator_pro: 'text-purple-400',
  creator_premium: 'text-amber-400',
};

function PremiumBlockOverlayComponent({
  requiredPlan,
  onUpgrade,
  className,
}: PremiumBlockOverlayProps) {
  const isPremium = requiredPlan === 'creator_premium';

  return (
    <div
      className={cn(
        'absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10',
        'transition-all duration-200',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {isPremium ? (
          <Crown className="h-6 w-6 text-amber-400" />
        ) : (
          <Lock className="h-6 w-6 text-purple-400" />
        )}
      </div>

      <p className="text-white font-semibold text-sm mb-1">
        Bloque {isPremium ? 'Premium' : 'Pro'}
      </p>

      <p className={cn('text-xs mb-3', PLAN_COLORS[requiredPlan])}>
        Disponible en Creator {PLAN_LABELS[requiredPlan]}
      </p>

      <Button
        size="sm"
        variant={isPremium ? 'default' : 'secondary'}
        onClick={(e) => {
          e.stopPropagation();
          onUpgrade();
        }}
        className={cn(
          'gap-1.5',
          isPremium && 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Upgrade
      </Button>
    </div>
  );
}

export const PremiumBlockOverlay = memo(PremiumBlockOverlayComponent);
