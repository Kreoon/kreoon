import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useExchangeRates } from '@/modules/wallet/hooks/useCurrency';
import {
  formatCurrencyAmount,
  type CurrencyCode,
  CURRENCY_SYMBOLS,
  CURRENCY_FLAGS,
  CURRENCY_LABELS,
} from '@/modules/wallet/types/currency.types';

interface CurrencyContextValue {
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (code: CurrencyCode) => Promise<void>;
  convertFromUsd: (usdAmount: number) => number;
  convertToUsd: (localAmount: number, fromCurrency?: CurrencyCode) => number;
  formatPrice: (usdAmount: number, opts?: { compact?: boolean; showOriginal?: boolean }) => string;
  getRate: (currency: CurrencyCode) => number | null;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { data: rates = [], isLoading: ratesLoading } = useExchangeRates();
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyCode>('USD');

  // Build a rates map: toCurrency -> rate (USD -> X)
  const ratesMap = useMemo(() => {
    const map: Partial<Record<CurrencyCode, number>> = { USD: 1 };
    for (const r of rates) {
      map[r.to_currency as CurrencyCode] = r.rate;
    }
    return map;
  }, [rates]);

  // Initialize from profile
  useEffect(() => {
    if (profile?.display_currency) {
      setDisplayCurrencyState(profile.display_currency as CurrencyCode);
    }
  }, [profile?.display_currency]);

  const setDisplayCurrency = useCallback(async (code: CurrencyCode) => {
    setDisplayCurrencyState(code);
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ display_currency: code })
        .eq('id', user.id);
    }
  }, [user?.id]);

  const getRate = useCallback((currency: CurrencyCode): number | null => {
    if (currency === 'USD') return 1;
    return ratesMap[currency] ?? null;
  }, [ratesMap]);

  const convertFromUsd = useCallback((usdAmount: number): number => {
    if (displayCurrency === 'USD') return usdAmount;
    const rate = ratesMap[displayCurrency];
    if (!rate) return usdAmount;
    return usdAmount * rate;
  }, [displayCurrency, ratesMap]);

  const convertToUsd = useCallback((localAmount: number, fromCurrency?: CurrencyCode): number => {
    const from = fromCurrency || displayCurrency;
    if (from === 'USD') return localAmount;
    const rate = ratesMap[from];
    if (!rate || rate === 0) return localAmount;
    return localAmount / rate;
  }, [displayCurrency, ratesMap]);

  const formatPrice = useCallback((usdAmount: number, opts?: { compact?: boolean; showOriginal?: boolean }): string => {
    const converted = convertFromUsd(usdAmount);
    const formatted = formatCurrencyAmount(converted, displayCurrency);
    if (opts?.showOriginal && displayCurrency !== 'USD') {
      const usdFormatted = formatCurrencyAmount(usdAmount, 'USD');
      return `${formatted} (≈ ${usdFormatted})`;
    }
    return formatted;
  }, [displayCurrency, convertFromUsd]);

  const value = useMemo<CurrencyContextValue>(() => ({
    displayCurrency,
    setDisplayCurrency,
    convertFromUsd,
    convertToUsd,
    formatPrice,
    getRate,
    loading: ratesLoading,
  }), [displayCurrency, setDisplayCurrency, convertFromUsd, convertToUsd, formatPrice, getRate, ratesLoading]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Fallback for components outside the provider (e.g., public pages)
    return {
      displayCurrency: 'USD',
      setDisplayCurrency: async () => {},
      convertFromUsd: (amount) => amount,
      convertToUsd: (amount) => amount,
      formatPrice: (amount) => formatCurrencyAmount(amount, 'USD'),
      getRate: () => null,
      loading: false,
    };
  }
  return ctx;
}

export { CURRENCY_SYMBOLS, CURRENCY_FLAGS, CURRENCY_LABELS };
export type { CurrencyCode };
