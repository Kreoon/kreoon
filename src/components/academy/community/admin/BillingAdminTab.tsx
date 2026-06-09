import { Crown, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BillingAdminTabProps {
  isPro: boolean;
  accentColor?: string;
}

const PLAN_FEATURES = {
  hobby: {
    name: 'Academia Hobby',
    price: 9,
    fee: '10%',
    perks: [
      '1 space activo',
      'Live calls ilimitados',
      'Affiliates',
      'URL personalizada',
      'Soporte por email',
    ],
    locked: [
      'Webhooks propios',
      'Zapier integration',
      'Meta Pixel + Google Ads',
      'Hyros attribution',
      'White-label completo',
    ],
  },
  pro: {
    name: 'Academia Pro',
    price: 99,
    fee: '2.9%',
    perks: [
      'Spaces ilimitados',
      'Live calls ilimitados',
      'Affiliates con comisión 2.9% transactional',
      'URL personalizada',
      'Webhooks propios + Zapier',
      'Meta Pixel + Google Ads + Hyros',
      'White-label completo',
      'Soporte prioritario',
    ],
    locked: [],
  },
};

export function BillingAdminTab({ isPro, accentColor = '#8B5CF6' }: BillingAdminTabProps) {
  const current = isPro ? PLAN_FEATURES.pro : PLAN_FEATURES.hobby;

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-kreoon-bg-card border-white/10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}26` }}
            >
              <Crown className="h-6 w-6" style={{ color: accentColor }} aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-300">Plan actual</div>
              <h3 className="text-xl font-bold">{current.name}</h3>
              <p className="text-xs text-zinc-300 mt-0.5">
                ${current.price}/mes · Comisión {current.fee} por venta
              </p>
            </div>
          </div>
          {!isPro && (
            <Button
              className="text-white"
              style={{ backgroundColor: accentColor }}
              aria-label="Mejorar a Academia Pro"
            >
              <ArrowUpRight className="h-4 w-4 mr-1.5" aria-hidden="true" /> Mejorar a Pro
            </Button>
          )}
        </div>

        <ul className="space-y-1.5">
          {current.perks.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm text-zinc-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </Card>

      {/* Comparativa de planes solo si está en Hobby */}
      {!isPro && (
        <Card className="p-5 bg-kreoon-bg-card border-purple-500/30">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Crown className="h-5 w-5" style={{ color: accentColor }} aria-hidden="true" />
                Lo que desbloqueas con Pro
              </h3>
              <p className="text-xs text-zinc-300 mt-1">
                ${PLAN_FEATURES.pro.price}/mes con comisión reducida del 2.9%
              </p>
            </div>
            <Button
              className="text-white flex-shrink-0"
              style={{ backgroundColor: accentColor }}
              aria-label="Mejorar plan ahora"
            >
              Mejorar ahora
            </Button>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {PLAN_FEATURES.hobby.locked.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-zinc-200">
                <Crown className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
          <div
            className={cn(
              'mt-4 p-3 rounded-lg border text-xs',
              'border-amber-500/30 bg-amber-500/5 text-amber-200'
            )}
          >
            <strong>Cálculo de retorno:</strong> Si vendes más de $250/mes en cursos, Pro se paga
            solo gracias a la diferencia de comisión (10% → 2.9%).
          </div>
        </Card>
      )}

      {/* Método de pago */}
      <Card className="p-5 bg-kreoon-bg-card border-white/10">
        <h3 className="font-semibold mb-3">Método de pago</h3>
        <p className="text-sm text-zinc-300">
          Tu suscripción se cobra mensualmente vía Stripe. Para gestionar tu método de pago,
          actualizar la tarjeta o cancelar, ve al portal de cliente de Stripe.
        </p>
        <Button variant="outline" className="mt-3" aria-label="Abrir portal de facturación">
          Portal de facturación →
        </Button>
      </Card>
    </div>
  );
}
