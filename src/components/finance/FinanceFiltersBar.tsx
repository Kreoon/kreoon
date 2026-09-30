import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useFinanceFilters,
  PERIOD_LABELS,
  type FinancePeriod,
  type FinanceCurrency,
} from '@/contexts/FinanceFiltersContext';

const PERIOD_CHIPS: FinancePeriod[] = [
  'today', '7d', '30d', 'current_month', 'last_month', '90d', 'year', 'all', 'custom',
];

const CURRENCIES: FinanceCurrency[] = ['COP', 'USD', 'EUR', 'MXN'];

interface Props {
  availableCurrencies?: FinanceCurrency[];
  connected: boolean;
  lastUpdated: Date | null;
}

export function FinanceFiltersBar({
  availableCurrencies = ['COP'],
  connected,
  lastUpdated,
}: Props) {
  const {
    period, startDate, endDate, currency,
    setPeriod, setCurrency, setCustomRange,
  } = useFinanceFilters();

  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  function applyCustom() {
    if (!tempStart || !tempEnd) return;
    setCustomRange(tempStart, tempEnd);
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-3 bg-muted/30 border border-border rounded-md mb-4">
      {/* Chips de período */}
      <div className="flex flex-wrap items-center gap-1">
        {PERIOD_CHIPS.map(p => (
          <button
            key={p}
            onClick={() => {
              setPeriod(p);
              if (p === 'custom') setOpen(true);
            }}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              period === p
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* DateRangePicker para custom */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={() => {
              setTempStart(startDate);
              setTempEnd(endDate);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border"
          >
            <CalendarIcon className="h-3 w-3" />
            {format(parseISO(startDate), 'd MMM', { locale: es })}
            {' — '}
            {format(parseISO(endDate), 'd MMM yyyy', { locale: es })}
          </button>
        </PopoverTrigger>
        <PopoverContent className="bg-background border-border text-foreground w-72 p-3">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
              <Input
                type="date"
                value={tempStart}
                onChange={e => setTempStart(e.target.value)}
                className="bg-muted/50 border-border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
              <Input
                type="date"
                value={tempEnd}
                onChange={e => setTempEnd(e.target.value)}
                className="bg-muted/50 border-border"
              />
            </div>
            <Button onClick={applyCustom} size="sm" className="w-full">
              Aplicar rango
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1" />

      {/* Selector de moneda */}
      {availableCurrencies.length > 1 && (
        <div className="flex items-center gap-0.5 bg-muted/50 border border-border rounded p-0.5">
          {availableCurrencies.map(cur => (
            <button
              key={cur}
              onClick={() => setCurrency(cur)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                currency === cur
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {cur}
            </button>
          ))}
        </div>
      )}

      {/* Pill En vivo */}
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        connected
          ? 'bg-green-500/15 text-green-400 border border-green-500/30'
          : 'bg-muted/50 text-muted-foreground/60 border border-border'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/40'}`} />
        {connected ? 'En vivo' : '...'}
      </span>

      {lastUpdated && (
        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
          <Activity className="h-2.5 w-2.5" />
          {format(lastUpdated, 'HH:mm:ss')}
        </span>
      )}
    </div>
  );
}
