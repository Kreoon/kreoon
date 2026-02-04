// Currency Hooks - Manejo de monedas y tasas de cambio
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { exchangeService } from '../services/exchange.service';
import type {
  CurrencyCode,
  SupportedCurrency,
  ExchangeRate,
  ConversionQuote,
} from '../types';

/**
 * Hook para obtener monedas soportadas
 */
export function useSupportedCurrencies() {
  return useQuery({
    queryKey: ['supported-currencies'],
    queryFn: async (): Promise<SupportedCurrency[]> => {
      const { data, error } = await supabase
        .from('supported_currencies')
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 60 * 1000, // 1 hora - las monedas no cambian frecuentemente
  });
}

/**
 * Hook para obtener tasas de cambio desde USD
 */
export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      return exchangeService.getAllRatesFromUSD();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch cada 10 minutos
  });
}

/**
 * Hook para obtener tasa de cambio específica
 */
export function useExchangeRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode) {
  return useQuery({
    queryKey: ['exchange-rate', fromCurrency, toCurrency],
    queryFn: async () => {
      return exchangeService.getCurrentRate(fromCurrency, toCurrency);
    },
    enabled: fromCurrency !== toCurrency,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener cotización de conversión
 */
export function useConversionQuote(
  fromAmount: number | undefined,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
) {
  return useQuery({
    queryKey: ['conversion-quote', fromAmount, fromCurrency, toCurrency],
    queryFn: async (): Promise<ConversionQuote | null> => {
      if (!fromAmount || fromAmount <= 0) return null;
      return exchangeService.getConversionQuote(fromAmount, fromCurrency, toCurrency);
    },
    enabled: !!fromAmount && fromAmount > 0 && fromCurrency !== toCurrency,
    staleTime: 30 * 1000, // 30 segundos - las cotizaciones son más sensibles al tiempo
  });
}

/**
 * Hook para ejecutar conversión
 */
export function useExecuteConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      fromAmount: number;
      fromCurrency: CurrencyCode;
      toCurrency: CurrencyCode;
      walletId?: string;
      transactionId?: string;
      withdrawalId?: string;
    }) => {
      const result = await exchangeService.executeConversion(params);
      if (!result) {
        throw new Error('No se pudo ejecutar la conversión');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency-conversions'] });
    },
  });
}

/**
 * Hook para verificar si las tasas están actualizadas
 */
export function useRatesStatus() {
  return useQuery({
    queryKey: ['rates-status'],
    queryFn: async () => {
      const stale = await exchangeService.areRatesStale();
      return { isStale: stale, checkedAt: new Date().toISOString() };
    },
    staleTime: 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para historial de conversiones del usuario
 */
export function useConversionHistory(walletId: string | null) {
  return useQuery({
    queryKey: ['currency-conversions', walletId],
    queryFn: async () => {
      if (!walletId) return [];

      const { data, error } = await supabase
        .from('currency_conversions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!walletId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Helpers para usar en componentes
 */
export function useCurrencyHelpers() {
  const { data: currencies = [] } = useSupportedCurrencies();
  const { data: rates = [] } = useExchangeRates();

  const getCurrency = (code: CurrencyCode): SupportedCurrency | undefined => {
    return currencies.find(c => c.code === code);
  };

  const getRate = (toCurrency: CurrencyCode): ExchangeRate | undefined => {
    return rates.find(r => r.to_currency === toCurrency);
  };

  const formatAmount = (amount: number, currency: CurrencyCode): string => {
    const curr = getCurrency(currency);
    const decimals = curr?.decimal_places ?? 2;

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals === 0 ? 0 : 2,
      maximumFractionDigits: decimals === 0 ? 0 : 2,
    }).format(amount);
  };

  const convertFromUSD = (usdAmount: number, toCurrency: CurrencyCode): number | null => {
    if (toCurrency === 'USD') return usdAmount;
    const rate = getRate(toCurrency);
    if (!rate) return null;
    return usdAmount * rate.rate * (1 - rate.spread);
  };

  return {
    currencies,
    rates,
    getCurrency,
    getRate,
    formatAmount,
    convertFromUSD,
  };
}
