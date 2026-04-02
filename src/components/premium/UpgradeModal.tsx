import { memo } from 'react';
import { X, Check, Sparkles, Crown, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CreatorTier } from '@/hooks/useCreatorPlanFeatures';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan: CreatorTier;
  feature?: string;
  onSelectPlan: (plan: CreatorTier) => void;
}

interface PlanOption {
  tier: CreatorTier;
  name: string;
  price: number;
  priceYearly: number;
  icon: typeof Zap;
  color: string;
  bgColor: string;
  features: string[];
  popular?: boolean;
}

const PLANS: PlanOption[] = [
  {
    tier: 'creator_pro',
    name: 'Creator Pro',
    price: 24,
    priceYearly: 230,
    icon: Zap,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    features: [
      '25% comision (vs 30% free)',
      '6,000 tokens IA/mes',
      '12 bloques en perfil',
      'Redes sociales clickeables',
      'Generador de bio IA',
      '4 templates',
      'Preview 3 dias',
    ],
  },
  {
    tier: 'creator_premium',
    name: 'Creator Premium',
    price: 49,
    priceYearly: 470,
    icon: Crown,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    popular: true,
    features: [
      '15% comision (la mas baja)',
      '15,000 tokens IA/mes',
      'Todos los bloques',
      'Contacto completo visible',
      'Quitar branding Kreoon',
      'IA: Bio, SEO, sugerencias',
      'Analytics avanzado',
      'Badge Premium',
      'CSS personalizado',
    ],
  },
];

function UpgradeModalComponent({
  open,
  onClose,
  currentPlan,
  feature,
  onSelectPlan,
}: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 bg-background border-border">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">Desbloquea mas funciones</DialogTitle>
                {feature && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Necesitas un plan superior para usar: {feature}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = currentPlan === plan.tier;
              const isUpgrade =
                (currentPlan === 'creator_free') ||
                (currentPlan === 'creator_pro' && plan.tier === 'creator_premium');

              return (
                <div
                  key={plan.tier}
                  className={cn(
                    'relative rounded-xl border-2 p-5 transition-all',
                    plan.bgColor,
                    plan.popular && 'ring-2 ring-amber-500/50',
                    isCurrentPlan && 'opacity-50'
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Mas popular
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', plan.bgColor)}>
                      <Icon className={cn('h-5 w-5', plan.color)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className={cn('text-2xl font-bold', plan.color)}>${plan.price}</span>
                        <span className="text-sm text-muted-foreground">/mes</span>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className={cn('h-4 w-4 mt-0.5 flex-shrink-0', plan.color)} />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn(
                      'w-full',
                      plan.tier === 'creator_premium' &&
                        'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                    )}
                    variant={plan.tier === 'creator_pro' ? 'secondary' : 'default'}
                    disabled={isCurrentPlan || !isUpgrade}
                    onClick={() => onSelectPlan(plan.tier)}
                  >
                    {isCurrentPlan ? 'Plan actual' : `Elegir ${plan.name}`}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground mt-2">
                    O ${plan.priceYearly}/año (ahorra 20%)
                  </p>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Cancela cuando quieras. Sin compromisos.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const UpgradeModal = memo(UpgradeModalComponent);
