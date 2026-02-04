import { TrendingUp, TrendingDown, RefreshCw, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useExchangeRates, useRatesStatus } from '../../hooks/useCurrency';
import { CURRENCY_FLAGS, formatCurrencyAmount } from '../../types';
import type { CurrencyCode } from '../../types';

interface ExchangeRatesCardProps {
  baseCurrency?: CurrencyCode;
  currencies?: CurrencyCode[];
  compact?: boolean;
  className?: string;
}

export function ExchangeRatesCard({
  baseCurrency = 'USD',
  currencies = ['COP', 'MXN', 'PEN', 'EUR'],
  compact = false,
  className,
}: ExchangeRatesCardProps) {
  const { data: rates = [], isLoading, refetch } = useExchangeRates();
  const { data: status } = useRatesStatus();

  const filteredRates = rates.filter(r =>
    currencies.includes(r.to_currency as CurrencyCode)
  );

  if (compact) {
    return (
      <div className={cn('flex items-center gap-4 text-sm', className)}>
        <span className="text-[hsl(270,30%,60%)]">Tasas USD:</span>
        {isLoading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          filteredRates.slice(0, 3).map((rate) => (
            <span key={rate.to_currency} className="flex items-center gap-1">
              <span>{CURRENCY_FLAGS[rate.to_currency as CurrencyCode]}</span>
              <span className="font-medium">
                {formatCurrencyAmount(rate.rate, rate.to_currency as CurrencyCode)}
              </span>
            </span>
          ))
        )}
      </div>
    );
  }

  return (
    <Card className={cn('bg-[hsl(270,40%,6%)] border-[hsl(270,30%,18%)]', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[hsl(270,80%,70%)]" />
            Tasas de Cambio
          </CardTitle>
          <div className="flex items-center gap-2">
            {status?.isStale && (
              <Badge variant="destructive" className="text-xs">
                Desactualizado
              </Badge>
            )}
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg hover:bg-[hsl(270,30%,15%)] transition-colors"
              title="Actualizar tasas"
            >
              <RefreshCw className={cn('h-4 w-4 text-[hsl(270,30%,60%)]', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>
        <p className="text-xs text-[hsl(270,30%,50%)]">
          Base: 1 {baseCurrency} {CURRENCY_FLAGS[baseCurrency]}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRates.map((rate) => {
              const currency = rate.to_currency as CurrencyCode;
              const spreadPercent = (rate.spread * 100).toFixed(1);

              return (
                <div
                  key={currency}
                  className="flex items-center justify-between p-3 rounded-lg bg-[hsl(270,30%,10%)] hover:bg-[hsl(270,30%,12%)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{CURRENCY_FLAGS[currency]}</span>
                    <div>
                      <p className="font-medium">{currency}</p>
                      <p className="text-xs text-[hsl(270,30%,50%)]">
                        Spread: {spreadPercent}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {formatCurrencyAmount(rate.rate, currency)}
                    </p>
                    <p className="text-xs text-[hsl(270,30%,50%)]">
                      Neto: {formatCurrencyAmount(rate.rate * (1 - rate.spread), currency)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Última actualización */}
        {filteredRates[0]?.fetched_at && (
          <div className="mt-4 pt-3 border-t border-[hsl(270,30%,15%)] flex items-center justify-center gap-2 text-xs text-[hsl(270,30%,45%)]">
            <Clock className="h-3 w-3" />
            <span>
              Actualizado: {new Date(filteredRates[0].fetched_at).toLocaleString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: 'short',
              })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
