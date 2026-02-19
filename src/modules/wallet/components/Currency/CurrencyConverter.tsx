import { useState, useEffect } from 'react';
import { ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CurrencySelector } from './CurrencySelector';
import { useConversionQuote, useCurrencyHelpers } from '../../hooks/useCurrency';
import type { CurrencyCode, ConversionQuote } from '../../types';
import { CURRENCY_FLAGS, formatCurrencyAmount } from '../../types';

interface CurrencyConverterProps {
  fromAmount?: number;
  fromCurrency?: CurrencyCode;
  toCurrency?: CurrencyCode;
  onQuoteChange?: (quote: ConversionQuote | null) => void;
  readOnly?: boolean;
  showFromInput?: boolean;
  className?: string;
}

export function CurrencyConverter({
  fromAmount: initialAmount,
  fromCurrency: initialFromCurrency = 'USD',
  toCurrency: initialToCurrency = 'COP',
  onQuoteChange,
  readOnly = false,
  showFromInput = true,
  className,
}: CurrencyConverterProps) {
  const [fromAmount, setFromAmount] = useState<number | undefined>(initialAmount);
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>(initialFromCurrency);
  const [toCurrency, setToCurrency] = useState<CurrencyCode>(initialToCurrency);

  const { formatAmount } = useCurrencyHelpers();
  const { data: quote, isLoading, error, refetch } = useConversionQuote(
    fromAmount,
    fromCurrency,
    toCurrency
  );

  // Notificar cambios de cotización
  useEffect(() => {
    onQuoteChange?.(quote || null);
  }, [quote, onQuoteChange]);

  // Sincronizar props externos
  useEffect(() => {
    if (initialAmount !== undefined) setFromAmount(initialAmount);
  }, [initialAmount]);

  useEffect(() => {
    setFromCurrency(initialFromCurrency);
  }, [initialFromCurrency]);

  useEffect(() => {
    setToCurrency(initialToCurrency);
  }, [initialToCurrency]);

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  return (
    <Card className={cn('bg-[hsl(270,40%,6%)] border-[hsl(270,30%,18%)]', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Convertir Moneda</span>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg hover:bg-[hsl(270,30%,15%)] transition-colors"
            title="Actualizar tasa"
          >
            <RefreshCw className={cn('h-4 w-4 text-muted-foreground', isLoading && 'animate-spin')} />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monto origen */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">De</Label>
          <div className="flex gap-2">
            {showFromInput ? (
              <div className="flex-1">
                <Input
                  type="number"
                  value={fromAmount || ''}
                  onChange={(e) => setFromAmount(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="0.00"
                  disabled={readOnly}
                  className="bg-[hsl(270,40%,8%)] border-[hsl(270,30%,20%)] text-lg font-medium"
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center px-3 py-2 bg-[hsl(270,40%,8%)] border border-[hsl(270,30%,20%)] rounded-md">
                <span className="text-lg font-medium">
                  {fromAmount ? formatAmount(fromAmount, fromCurrency) : '$0.00'}
                </span>
              </div>
            )}
            <div className="w-[140px]">
              <CurrencySelector
                value={fromCurrency}
                onChange={setFromCurrency}
                showRate={false}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>

        {/* Flecha de conversión */}
        <div className="flex items-center justify-center">
          <button
            onClick={swapCurrencies}
            disabled={readOnly}
            className="p-2 rounded-full bg-[hsl(270,50%,30%)]/20 hover:bg-[hsl(270,50%,40%)]/30 transition-colors disabled:opacity-50"
          >
            <ArrowRight className="h-5 w-5 text-[hsl(270,80%,70%)]" />
          </button>
        </div>

        {/* Monto destino */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">A</Label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center px-3 py-2 bg-[hsl(270,30%,12%)] border border-[hsl(270,30%,20%)] rounded-md min-h-[42px]">
              {isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : quote ? (
                <span className="text-lg font-semibold text-[hsl(270,80%,75%)]">
                  {formatAmount(quote.toAmount, toCurrency)}
                </span>
              ) : fromCurrency === toCurrency ? (
                <span className="text-lg font-medium">
                  {fromAmount ? formatAmount(fromAmount, toCurrency) : '-'}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
            <div className="w-[140px]">
              <CurrencySelector
                value={toCurrency}
                onChange={setToCurrency}
                showRate={false}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>

        {/* Detalles de la conversión */}
        {quote && fromCurrency !== toCurrency && (
          <div className="pt-3 border-t border-[hsl(270,30%,15%)] space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Tasa de cambio</span>
              <span>
                1 {fromCurrency} = {formatCurrencyAmount(quote.rate, toCurrency)} {toCurrency}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Spread ({(quote.spread * 100).toFixed(1)}%)</span>
              <span className="text-amber-400">
                -{formatCurrencyAmount(quote.spreadAmount, toCurrency)}
              </span>
            </div>
            <div className="flex justify-between font-medium text-white pt-2 border-t border-[hsl(270,30%,15%)]">
              <span>Recibirás</span>
              <span className="text-[hsl(150,60%,50%)]">
                {formatCurrencyAmount(quote.toAmount, toCurrency)}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>No se pudo obtener la tasa de cambio</span>
          </div>
        )}

        {/* Última actualización */}
        {quote?.expiresAt && (
          <p className="text-xs text-[hsl(270,30%,45%)] text-center">
            Tasa válida hasta: {new Date(quote.expiresAt).toLocaleTimeString('es-CO')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
