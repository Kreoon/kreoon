import { CheckCircle, Gift, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreatorPackage, ProjectPaymentMethod } from '../types/marketplace';

interface HiringStepPackageProps {
  packages: CreatorPackage[];
  selectedPackageId: string;
  onSelectPackage: (id: string) => void;
  paymentMethod: ProjectPaymentMethod;
  onPaymentMethodChange: (method: ProjectPaymentMethod) => void;
  acceptsExchange: boolean;
  exchangeConditions?: string;
  hasPaidPlan: boolean;
}

export function HiringStepPackage({
  packages,
  selectedPackageId,
  onSelectPackage,
  paymentMethod,
  onPaymentMethodChange,
  acceptsExchange,
  exchangeConditions,
  hasPaidPlan,
}: HiringStepPackageProps) {
  const selected = packages.find(p => p.id === selectedPackageId);

  return (
    <div className="space-y-6">
      {/* Exchange option */}
      {acceptsExchange && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">Metodo de pago</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onPaymentMethodChange('payment')}
              className={cn(
                'text-left border rounded-xl p-4 transition-all',
                paymentMethod === 'payment'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 hover:border-purple-500/50',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    paymentMethod === 'payment' ? 'border-purple-500' : 'border-gray-600',
                  )}
                >
                  {paymentMethod === 'payment' && (
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                  )}
                </div>
                <span className="text-white text-sm font-semibold">Pago con Escrow</span>
              </div>
              <p className="text-gray-500 text-xs pl-6">
                Tu dinero se libera solo cuando apruebes el contenido
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                if (hasPaidPlan) onPaymentMethodChange('exchange');
              }}
              className={cn(
                'text-left border rounded-xl p-4 transition-all relative',
                paymentMethod === 'exchange'
                  ? 'border-green-500/50 bg-green-500/10'
                  : hasPaidPlan
                    ? 'border-white/10 hover:border-green-500/30'
                    : 'border-white/10 opacity-50 cursor-not-allowed',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    paymentMethod === 'exchange' ? 'border-green-500' : 'border-gray-600',
                  )}
                >
                  {paymentMethod === 'exchange' && (
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  )}
                </div>
                <Gift className={cn('h-4 w-4', hasPaidPlan ? 'text-green-400' : 'text-gray-500')} />
                <span className={cn('text-sm font-semibold', hasPaidPlan ? 'text-green-400' : 'text-gray-400')}>
                  Canje de producto
                </span>
                {!hasPaidPlan && <Lock className="h-3.5 w-3.5 text-gray-500" />}
              </div>
              <p className="text-gray-500 text-xs pl-6">
                {exchangeConditions || 'Envia tu producto a cambio de contenido'}
              </p>
              {!hasPaidPlan && (
                <p className="text-gray-600 text-xs mt-2 text-center">
                  Disponible con plan pagado
                </p>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Package selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Elige un paquete</h3>
        {packages.map(pkg => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => onSelectPackage(pkg.id)}
            className={cn(
              'w-full text-left border rounded-xl p-4 transition-all',
              selectedPackageId === pkg.id
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-white/10 hover:border-purple-500/50',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                  selectedPackageId === pkg.id ? 'border-purple-500' : 'border-gray-600',
                )}
              >
                {selectedPackageId === pkg.id && (
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-semibold">{pkg.name}</span>
                  {pkg.is_popular && (
                    <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{pkg.description}</p>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-white font-bold">
                    ${pkg.price.toLocaleString()} {pkg.currency}
                  </span>
                  {pkg.discount_pct && (
                    <span className="text-green-400 text-xs">(ahorra {pkg.discount_pct}%)</span>
                  )}
                </div>
                <span className="text-gray-500 text-xs">Entrega: {pkg.delivery_days}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected package details */}
      {selected && (
        <div className="bg-white/5 rounded-lg p-4 space-y-2">
          <p className="text-gray-400 text-xs font-medium">Incluye:</p>
          {selected.includes.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-gray-300 text-xs">
              <CheckCircle className="h-3.5 w-3.5 text-green-400 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
