import { motion } from 'framer-motion';
import {
  Building2,
  Globe,
  CreditCard,
  Wallet,
  Smartphone,
  Bitcoin,
  Zap,
  Send,
  Plus,
  Check,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PaymentMethodDisplay } from '../../hooks/usePaymentMethods';
import type { PaymentMethodType, Currency } from '../../types';
import { WITHDRAWAL_FEES, formatCurrency } from '../../types';

const METHOD_ICONS: Record<PaymentMethodType, React.ComponentType<{ className?: string }>> = {
  bank_transfer_colombia: Building2,
  bank_transfer_international: Globe,
  paypal: CreditCard,
  payoneer: Wallet,
  nequi: Smartphone,
  daviplata: Smartphone,
  crypto: Bitcoin,
  zelle: Zap,
  wise: Send,
};

interface PaymentMethodSelectorProps {
  selectedId: string | null;
  onChange: (id: string | null) => void;
  onAddNew: () => void;
  methods: PaymentMethodDisplay[];
  isLoading: boolean;
  currency?: Currency;
}

export function PaymentMethodSelector({
  selectedId,
  onChange,
  onAddNew,
  methods,
  isLoading,
  currency = 'USD',
}: PaymentMethodSelectorProps) {
  const getFeeDescription = (methodType: PaymentMethodType): string => {
    const fee = WITHDRAWAL_FEES[methodType];
    if (fee.fixed === 0 && fee.percentage === 0) {
      return 'Gratis';
    }
    const parts: string[] = [];
    if (fee.percentage > 0) {
      parts.push(`${fee.percentage}%`);
    }
    if (fee.fixed > 0) {
      parts.push(formatCurrency(fee.fixed, currency));
    }
    return parts.join(' + ');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Label>Método de Pago</Label>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)]">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label>Método de Pago</Label>

      {methods.length === 0 ? (
        <div className="p-6 rounded-xl bg-[hsl(270,100%,60%,0.05)] text-center">
          <Wallet className="h-10 w-10 mx-auto mb-3 text-[hsl(270,100%,60%,0.3)]" />
          <p className="text-[hsl(270,30%,60%)] mb-3">
            No tienes métodos de pago configurados
          </p>
          <Button variant="outline" onClick={onAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar método de pago
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((method, index) => {
            const Icon = METHOD_ICONS[method.method_type];
            const isSelected = selectedId === method.id;

            return (
              <motion.button
                key={method.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onChange(isSelected ? null : method.id)}
                className={cn(
                  'w-full p-4 rounded-xl text-left transition-all',
                  'border-2',
                  isSelected
                    ? 'border-[hsl(270,100%,60%)] bg-[hsl(270,100%,60%,0.1)]'
                    : 'border-transparent bg-[hsl(270,100%,60%,0.05)] hover:bg-[hsl(270,100%,60%,0.08)]'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Radio indicator */}
                  <div
                    className={cn(
                      'mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
                      isSelected
                        ? 'border-[hsl(270,100%,60%)] bg-[hsl(270,100%,60%)]'
                        : 'border-[hsl(270,30%,40%)]'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>

                  {/* Icon */}
                  <div
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      isSelected
                        ? 'bg-[hsl(270,100%,60%,0.2)]'
                        : 'bg-[hsl(270,100%,60%,0.1)]'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        isSelected ? 'text-[hsl(270,100%,70%)]' : 'text-[hsl(270,30%,60%)]'
                      )}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white truncate">{method.label}</p>
                      {method.is_verified && (
                        <Shield className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                      )}
                      {method.is_default && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[hsl(270,30%,60%)] truncate">
                      {method.summary}
                    </p>
                    <p className="text-xs text-[hsl(270,30%,50%)] mt-1">
                      Comisión: {getFeeDescription(method.method_type)}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}

          {/* Add new button */}
          <Button
            type="button"
            variant="outline"
            onClick={onAddNew}
            className="w-full h-12 border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar nuevo método
          </Button>
        </div>
      )}

      {/* Fee info */}
      {methods.length > 0 && (
        <div className="p-3 rounded-lg bg-[hsl(270,100%,60%,0.03)] border border-[hsl(270,100%,60%,0.1)]">
          <p className="text-xs text-[hsl(270,30%,60%)]">
            <strong className="text-[hsl(270,30%,70%)]">Comisiones por método:</strong>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[hsl(270,30%,50%)]">
            <span>• Bancolombia: Gratis</span>
            <span>• Nequi: Gratis</span>
            <span>• PayPal: 2.5%</span>
            <span>• Payoneer: $3</span>
            <span>• Wise: 0.5% + $1</span>
            <span>• Crypto: $5</span>
          </div>
        </div>
      )}
    </div>
  );
}
