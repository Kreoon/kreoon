import { Check, Clock, DollarSign, Globe, Smartphone, Building2, Bitcoin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProviderSelection } from '../../hooks/useProviders';
import type { CurrencyCode, PaymentProviderDisplay } from '../../types';

interface ProviderSelectorProps {
  country: string;
  currency: CurrencyCode;
  selectedId: string | null;
  onSelect: (provider: PaymentProviderDisplay) => void;
  amount?: number;
  disabled?: boolean;
  className?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  instant: <Smartphone className="h-4 w-4" />,
  bank: <Building2 className="h-4 w-4" />,
  global: <Globe className="h-4 w-4" />,
  crypto: <Bitcoin className="h-4 w-4" />,
  other: <DollarSign className="h-4 w-4" />,
};

const PROVIDER_LOGOS: Record<string, string> = {
  nequi: '💜',
  daviplata: '🟢',
  yape: '💚',
  paypal: '🅿️',
  payoneer: '🔵',
  wise: '💚',
  bancolombia: '🏦',
  bcp: '🏦',
  spei: '🇲🇽',
  usdt_trc20: '₮',
};

export function ProviderSelector({
  country,
  currency,
  selectedId,
  onSelect,
  amount = 0,
  disabled = false,
  className,
}: ProviderSelectorProps) {
  const { groupedProviders, categoryLabels, isLoading } = useProviderSelection(country, currency);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const categories = Object.keys(groupedProviders);

  if (categories.length === 0) {
    return (
      <Card className={cn('bg-[hsl(270,40%,6%)] border-[hsl(270,30%,18%)]', className)}>
        <CardContent className="py-8 text-center">
          <Globe className="h-12 w-12 mx-auto text-[hsl(270,30%,40%)] mb-3" />
          <p className="text-[hsl(270,30%,60%)]">
            No hay métodos de retiro disponibles para {currency} en tu país.
          </p>
          <p className="text-sm text-[hsl(270,30%,50%)] mt-2">
            Contacta a soporte para más opciones.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {categories.map((category) => (
        <div key={category}>
          <h4 className="text-sm font-medium text-[hsl(270,30%,60%)] mb-3 flex items-center gap-2">
            {CATEGORY_ICONS[category]}
            {categoryLabels[category]}
          </h4>
          <div className="space-y-2">
            {groupedProviders[category].map((provider) => {
              const isSelected = selectedId === provider.id;
              const fee = amount > 0 ? provider.totalFee(amount) : 0;
              const netAmount = amount - fee;

              return (
                <button
                  key={provider.id}
                  onClick={() => !disabled && onSelect(provider)}
                  disabled={disabled}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 transition-all text-left',
                    'bg-[hsl(270,40%,6%)] hover:bg-[hsl(270,30%,10%)]',
                    isSelected
                      ? 'border-[hsl(270,80%,60%)] bg-[hsl(270,50%,15%)]/30'
                      : 'border-[hsl(270,30%,18%)] hover:border-[hsl(270,30%,30%)]',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Logo/Emoji */}
                      <div className="w-10 h-10 rounded-lg bg-[hsl(270,30%,15%)] flex items-center justify-center text-xl">
                        {PROVIDER_LOGOS[provider.id] || '💳'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{provider.name}</span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-[hsl(270,80%,70%)]" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="h-3 w-3 text-[hsl(270,30%,50%)]" />
                          <span className="text-xs text-[hsl(270,30%,50%)]">
                            {provider.processing_time}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant={provider.fixed_fee === 0 && provider.percentage_fee === 0 ? 'default' : 'secondary'}
                        className={cn(
                          'text-xs',
                          provider.fixed_fee === 0 && provider.percentage_fee === 0
                            ? 'bg-[hsl(150,60%,30%)] text-white'
                            : 'bg-[hsl(270,30%,20%)]'
                        )}
                      >
                        {provider.formattedFee}
                      </Badge>

                      {amount > 0 && fee > 0 && (
                        <p className="text-xs text-[hsl(270,30%,50%)] mt-1">
                          -${fee.toFixed(2)} fee
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Descripción */}
                  {provider.description && (
                    <p className="text-xs text-[hsl(270,30%,50%)] mt-2 pl-13">
                      {provider.description}
                    </p>
                  )}

                  {/* Monto neto si hay amount */}
                  {amount > 0 && isSelected && (
                    <div className="mt-3 pt-3 border-t border-[hsl(270,30%,15%)] flex justify-between items-center">
                      <span className="text-sm text-[hsl(270,30%,60%)]">Recibirás:</span>
                      <span className="font-semibold text-[hsl(150,60%,50%)]">
                        ${netAmount.toFixed(2)} {currency}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
