import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths,
  startOfYear, endOfYear, format,
} from 'date-fns';

export type FinancePeriod =
  | 'today' | '7d' | '30d' | '90d'
  | 'current_month' | 'last_month'
  | 'year' | 'all' | 'custom';

export type FinanceCurrency = 'COP' | 'USD' | 'EUR' | 'MXN';

export interface FinanceFiltersState {
  period: FinancePeriod;
  startDate: string;  // YYYY-MM-DD
  endDate: string;
  currency: FinanceCurrency;
}

interface FinanceFiltersContextValue extends FinanceFiltersState {
  setPeriod: (p: FinancePeriod) => void;
  setCurrency: (c: FinanceCurrency) => void;
  setCustomRange: (start: string, end: string) => void;
  resetToDefault: () => void;
}

const FinanceFiltersContext = createContext<FinanceFiltersContextValue | null>(null);

function periodToRange(period: FinancePeriod): { startDate: string; endDate: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (period) {
    case 'today':
      return { startDate: fmt(startOfDay(today)), endDate: fmt(endOfDay(today)) };
    case '7d':
      return { startDate: fmt(subDays(today, 6)), endDate: fmt(today) };
    case '30d':
      return { startDate: fmt(subDays(today, 29)), endDate: fmt(today) };
    case '90d':
      return { startDate: fmt(subDays(today, 89)), endDate: fmt(today) };
    case 'current_month':
      return { startDate: fmt(startOfMonth(today)), endDate: fmt(endOfMonth(today)) };
    case 'last_month': {
      const last = subMonths(today, 1);
      return { startDate: fmt(startOfMonth(last)), endDate: fmt(endOfMonth(last)) };
    }
    case 'year':
      return { startDate: fmt(startOfYear(today)), endDate: fmt(endOfYear(today)) };
    case 'all':
      // Rango muy amplio para capturar todo el historial de la plataforma
      return { startDate: '2020-01-01', endDate: fmt(today) };
    case 'custom':
    default:
      return { startDate: fmt(startOfMonth(today)), endDate: fmt(endOfMonth(today)) };
  }
}

function getDefault(): FinanceFiltersState {
  const range = periodToRange('current_month');
  return {
    period: 'current_month',
    startDate: range.startDate,
    endDate: range.endDate,
    currency: 'COP',
  };
}

interface ProviderProps {
  orgId: string;
  children: ReactNode;
}

export function FinanceFiltersProvider({ orgId, children }: ProviderProps) {
  const storageKey = `finance-filters-${orgId}`;

  const [state, setState] = useState<FinanceFiltersState>(() => {
    if (typeof window === 'undefined') return getDefault();
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return getDefault();
      const parsed = JSON.parse(stored) as FinanceFiltersState;

      // Si el período no es "custom", recalcular las fechas para que estén siempre actualizadas
      if (parsed.period && parsed.period !== 'custom') {
        const range = periodToRange(parsed.period);
        return { ...parsed, ...range };
      }
      return parsed;
    } catch {
      return getDefault();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore (cuota / safari privado)
    }
  }, [state, storageKey]);

  const value = useMemo<FinanceFiltersContextValue>(() => ({
    ...state,
    setPeriod: (period) => {
      if (period === 'custom') {
        setState(prev => ({ ...prev, period: 'custom' }));
      } else {
        const range = periodToRange(period);
        setState(prev => ({ ...prev, period, ...range }));
      }
    },
    setCurrency: (currency) => setState(prev => ({ ...prev, currency })),
    setCustomRange: (startDate, endDate) =>
      setState(prev => ({ ...prev, period: 'custom', startDate, endDate })),
    resetToDefault: () => setState(getDefault()),
  }), [state]);

  return (
    <FinanceFiltersContext.Provider value={value}>
      {children}
    </FinanceFiltersContext.Provider>
  );
}

export function useFinanceFilters(): FinanceFiltersContextValue {
  const ctx = useContext(FinanceFiltersContext);
  if (!ctx) {
    throw new Error('useFinanceFilters must be used inside FinanceFiltersProvider');
  }
  return ctx;
}

export const PERIOD_LABELS: Record<FinancePeriod, string> = {
  today: 'Hoy',
  '7d': '7 días',
  '30d': '30 días',
  '90d': '90 días',
  current_month: 'Mes actual',
  last_month: 'Mes pasado',
  year: 'Año',
  all: 'Todo',
  custom: 'Personalizado',
};
