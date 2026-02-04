import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useSupportedCurrencies, useExchangeRates } from '../../hooks/useCurrency';
import type { CurrencyCode } from '../../types';
import { CURRENCY_FLAGS, formatExchangeRate } from '../../types';

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  showRate?: boolean;
  baseCurrency?: CurrencyCode;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function CurrencySelector({
  value,
  onChange,
  showRate = true,
  baseCurrency = 'USD',
  disabled = false,
  className,
  placeholder = 'Seleccionar moneda',
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: currencies = [], isLoading: loadingCurrencies } = useSupportedCurrencies();
  const { data: rates = [] } = useExchangeRates();

  const selectedCurrency = currencies.find(c => c.code === value);
  const selectedRate = rates.find(r => r.to_currency === value);

  return (
    <div className={cn('space-y-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loadingCurrencies}
            className="w-full justify-between bg-[hsl(270,40%,8%)] border-[hsl(270,30%,20%)] hover:bg-[hsl(270,30%,12%)] hover:border-[hsl(270,50%,40%)]"
          >
            {selectedCurrency ? (
              <span className="flex items-center gap-2">
                <span className="text-lg">{CURRENCY_FLAGS[value] || '💱'}</span>
                <span className="font-medium">{selectedCurrency.code}</span>
                <span className="text-[hsl(270,30%,60%)]">- {selectedCurrency.name}</span>
              </span>
            ) : (
              <span className="text-[hsl(270,30%,50%)]">{placeholder}</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 bg-[hsl(270,40%,6%)] border-[hsl(270,30%,20%)]">
          <Command className="bg-transparent">
            <CommandInput
              placeholder="Buscar moneda..."
              className="border-b border-[hsl(270,30%,15%)]"
            />
            <CommandList>
              <CommandEmpty>No se encontraron monedas.</CommandEmpty>
              <CommandGroup>
                {currencies.map((currency) => {
                  const rate = rates.find(r => r.to_currency === currency.code);
                  return (
                    <CommandItem
                      key={currency.code}
                      value={`${currency.code} ${currency.name} ${currency.country}`}
                      onSelect={() => {
                        onChange(currency.code as CurrencyCode);
                        setOpen(false);
                      }}
                      className="cursor-pointer hover:bg-[hsl(270,30%,15%)]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{currency.flag_emoji}</span>
                          <div>
                            <span className="font-medium">{currency.code}</span>
                            <span className="text-xs text-[hsl(270,30%,60%)] ml-2">
                              {currency.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {rate && baseCurrency === 'USD' && currency.code !== 'USD' && (
                            <span className="text-xs text-[hsl(270,30%,50%)]">
                              {currency.symbol}{Math.round(rate.rate).toLocaleString('es-CO')}
                            </span>
                          )}
                          <Check
                            className={cn(
                              'h-4 w-4',
                              value === currency.code ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showRate && selectedRate && value !== baseCurrency && (
        <p className="text-xs text-[hsl(270,30%,50%)] pl-1">
          Tasa: {formatExchangeRate(selectedRate.rate, baseCurrency, value)}
        </p>
      )}
    </div>
  );
}
