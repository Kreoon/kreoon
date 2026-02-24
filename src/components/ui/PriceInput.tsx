import { useState, useEffect, useCallback } from 'react';
import { useCurrency, CURRENCY_SYMBOLS } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { formatCurrencyAmount } from '@/modules/wallet/types/currency.types';

interface PriceInputProps {
  valueUsd: number;
  onChangeUsd: (usd: number) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function PriceInput({
  valueUsd,
  onChangeUsd,
  label,
  placeholder,
  className,
  inputClassName,
}: PriceInputProps) {
  const { displayCurrency, convertFromUsd, convertToUsd } = useCurrency();

  // Local display value in user's currency
  const [localValue, setLocalValue] = useState<string>('');

  // Sync from external USD value when it changes (e.g., on mount or parent change)
  useEffect(() => {
    if (valueUsd > 0) {
      const converted = convertFromUsd(valueUsd);
      // Use integer for COP/CLP/ARS, 2 decimals for others
      const isZeroDecimal = ['COP', 'CLP', 'ARS'].includes(displayCurrency);
      setLocalValue(isZeroDecimal ? Math.round(converted).toString() : converted.toFixed(2));
    } else {
      setLocalValue('');
    }
  }, [valueUsd, displayCurrency]); // Only re-sync when currency or external value changes

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 0) {
      const usd = convertToUsd(num);
      onChangeUsd(Math.round(usd * 100) / 100);
    } else if (raw === '') {
      onChangeUsd(0);
    }
  }, [convertToUsd, onChangeUsd]);

  const symbol = CURRENCY_SYMBOLS[displayCurrency] || '$';
  const usdHint = displayCurrency !== 'USD' && valueUsd > 0
    ? `~ USD $${valueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

  return (
    <div className={className}>
      {label && (
        <label className="text-gray-500 text-xs block mb-1">
          {label} ({displayCurrency})
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
          {symbol}
        </span>
        <input
          type="number"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            'w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500',
            inputClassName,
          )}
        />
      </div>
      {usdHint && (
        <p className="text-gray-600 text-[10px] mt-1">{usdHint}</p>
      )}
    </div>
  );
}
