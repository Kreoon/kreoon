import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DollarSign } from "lucide-react";

export type CurrencyType = 'COP' | 'USD';

interface CurrencyInputProps {
  value: number;
  currency: CurrencyType;
  onValueChange: (value: number) => void;
  onCurrencyChange: (currency: CurrencyType) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showCurrencySymbol?: boolean;
  id?: string;
}

const currencyConfig: Record<CurrencyType, { symbol: string; locale: string; name: string }> = {
  COP: { symbol: '$', locale: 'es-CO', name: 'Pesos Colombianos' },
  USD: { symbol: 'US$', locale: 'en-US', name: 'Dólares' }
};

export function formatCurrency(value: number, currency: CurrencyType): string {
  const config = currencyConfig[currency];
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'COP' ? 0 : 2,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(value);
}

export function CurrencyInput({
  value,
  currency,
  onValueChange,
  onCurrencyChange,
  placeholder = "0",
  disabled = false,
  className,
  showCurrencySymbol = true,
  id
}: CurrencyInputProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        {showCurrencySymbol && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {currencyConfig[currency].symbol}
          </span>
        )}
        <Input
          id={id}
          type="number"
          value={value || ''}
          onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(showCurrencySymbol && "pl-10")}
          min={0}
          step={currency === 'COP' ? 1000 : 0.01}
        />
      </div>
      <Select
        value={currency}
        onValueChange={(val) => onCurrencyChange(val as CurrencyType)}
        disabled={disabled}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="COP">
            <div className="flex items-center gap-1">
              <span className="text-xs">🇨🇴</span>
              <span>COP</span>
            </div>
          </SelectItem>
          <SelectItem value="USD">
            <div className="flex items-center gap-1">
              <span className="text-xs">🇺🇸</span>
              <span>USD</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// Display component for showing formatted currency values
interface CurrencyDisplayProps {
  value: number;
  currency: CurrencyType;
  className?: string;
  showFlag?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CurrencyDisplay({ 
  value, 
  currency, 
  className,
  showFlag = false,
  size = 'md'
}: CurrencyDisplayProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base font-semibold'
  };

  return (
    <span className={cn("inline-flex items-center gap-1", sizeClasses[size], className)}>
      {showFlag && (
        <span className="text-xs">{currency === 'COP' ? '🇨🇴' : '🇺🇸'}</span>
      )}
      <span>{formatCurrency(value, currency)}</span>
    </span>
  );
}

// Badge component for currency type
interface CurrencyBadgeProps {
  currency: CurrencyType;
  className?: string;
}

export function CurrencyBadge({ currency, className }: CurrencyBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      currency === 'COP' 
        ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20" 
        : "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
      className
    )}>
      <span>{currency === 'COP' ? '🇨🇴' : '🇺🇸'}</span>
      <span>{currency}</span>
    </span>
  );
}
