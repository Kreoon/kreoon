import { Crown, Zap, Sparkles, TrendingDown, Users, Lock, Mail, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCreatorPlanFeatures, type CreatorTier } from '@/hooks/useCreatorPlanFeatures';

interface PlanStatusBarProps {
  currentBlockCount: number;
  onUpgradeClick: () => void;
}

const PLAN_CONFIG: Record<
  CreatorTier,
  { label: string; icon: typeof Crown; color: string; bgColor: string }
> = {
  creator_free: {
    label: 'Free',
    icon: Sparkles,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
  },
  creator_pro: {
    label: 'Pro',
    icon: Zap,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  creator_premium: {
    label: 'Premium',
    icon: Crown,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
};

export function PlanStatusBar({ currentBlockCount, onUpgradeClick }: PlanStatusBarProps) {
  const { tier, maxBlocks, commissionRate, isPremium, isFree, canHideBranding, canDeleteRecommendedTalent } = useCreatorPlanFeatures();

  const planConfig = PLAN_CONFIG[tier];
  const PlanIcon = planConfig.icon;
  const isUnlimited = !isFinite(maxBlocks);
  const blockUsagePercent = isUnlimited ? 0 : Math.min((currentBlockCount / maxBlocks) * 100, 100);
  const blocksRemaining = isUnlimited ? Infinity : maxBlocks - currentBlockCount;
  const isNearLimit = !isUnlimited && blocksRemaining <= 2 && blocksRemaining > 0;
  const isAtLimit = !isUnlimited && blocksRemaining <= 0;

  return (
    <TooltipProvider>
      <div className="h-10 bg-gradient-to-r from-zinc-900/95 via-zinc-900/90 to-zinc-900/95 border-b border-border/50 flex items-center justify-between px-4 gap-4 flex-shrink-0">
        {/* Izquierda: Plan actual */}
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5 px-2.5 py-0.5 text-xs font-medium border-0',
              planConfig.bgColor,
              planConfig.color
            )}
          >
            <PlanIcon className="h-3.5 w-3.5" />
            Plan {planConfig.label}
          </Badge>

          {/* Comision */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs">
                <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Comision:</span>
                <span
                  className={cn(
                    'font-semibold',
                    commissionRate <= 0.15
                      ? 'text-green-400'
                      : commissionRate <= 0.25
                        ? 'text-amber-400'
                        : 'text-zinc-400'
                  )}
                >
                  {(commissionRate * 100).toFixed(0)}%
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">
                Kreoon cobra {(commissionRate * 100).toFixed(0)}% de comision por cada venta.
                {commissionRate > 0.15 && (
                  <span className="block mt-1 text-amber-400">
                    Upgrade a Premium para solo 15%
                  </span>
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Centro: Contador de bloques */}
        <div className="flex items-center gap-3 flex-1 max-w-xs">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 flex-1">
                {!isUnlimited && (
                  <div className="flex-1">
                    <Progress
                      value={blockUsagePercent}
                      className={cn(
                        'h-1.5',
                        isAtLimit && '[&>div]:bg-red-500',
                        isNearLimit && !isAtLimit && '[&>div]:bg-amber-500'
                      )}
                    />
                  </div>
                )}
                <span
                  className={cn(
                    'text-xs font-medium tabular-nums text-right',
                    isAtLimit && 'text-red-400',
                    isNearLimit && !isAtLimit && 'text-amber-400',
                    !isNearLimit && !isAtLimit && 'text-muted-foreground'
                  )}
                >
                  {isUnlimited
                    ? `${currentBlockCount} bloques`
                    : `${currentBlockCount}/${maxBlocks} bloques`}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">
                {isUnlimited
                  ? 'Bloques ilimitados'
                  : isAtLimit
                    ? 'Limite alcanzado. Upgrade para mas bloques.'
                    : isNearLimit
                      ? `Solo ${blocksRemaining} bloque${blocksRemaining > 1 ? 's' : ''} restante${blocksRemaining > 1 ? 's' : ''}`
                      : `Tienes ${blocksRemaining} bloques disponibles`}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Derecha: Features Premium-only + CTA */}
        <div className="flex items-center gap-2">
          {/* Indicadores de features Premium-only */}
          {!isPremium && (
            <div className="hidden lg:flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <Lock className="h-2.5 w-2.5 text-amber-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Contacto directo: solo Premium</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Share2 className="h-3 w-3" />
                    <Lock className="h-2.5 w-2.5 text-amber-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Redes clickeables: solo Premium</p>
                </TooltipContent>
              </Tooltip>
              {isFree && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <Lock className="h-2.5 w-2.5 text-purple-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Talento recomendado: no eliminable en Free</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {!canHideBranding && (
            <span className="text-[10px] text-muted-foreground hidden xl:inline">
              Branding Kreoon visible
            </span>
          )}

          {!isPremium && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUpgradeClick}
              className="h-7 text-xs gap-1.5 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
            >
              <Crown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Upgrade</span>
            </Button>
          )}

          {isPremium && (
            <Badge
              variant="outline"
              className="gap-1 text-[10px] border-amber-500/50 text-amber-400"
            >
              <Crown className="h-3 w-3" />
              Premium activo
            </Badge>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
