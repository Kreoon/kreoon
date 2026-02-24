import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface PriceProps {
  amount: number;        // Always in USD (stored value)
  className?: string;
  showOriginal?: boolean; // Show "~ USD $X.XX" below
  compact?: boolean;      // No decimals for currencies like COP
}

export function Price({ amount, className, showOriginal = false, compact = false }: PriceProps) {
  const { formatPrice, displayCurrency, convertFromUsd } = useCurrency();

  if (amount == null || isNaN(amount)) return null;

  const formatted = formatPrice(amount);

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span>{formatted}</span>
      {showOriginal && displayCurrency !== 'USD' && (
        <span className="text-[10px] text-gray-500">
          ~ USD ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )}
    </span>
  );
}

/** Inline price display — single line, no wrapping */
export function InlinePrice({ amount, className }: { amount: number; className?: string }) {
  const { formatPrice } = useCurrency();
  if (amount == null || isNaN(amount)) return null;
  return <span className={className}>{formatPrice(amount)}</span>;
}
