// Currency Types - Sistema multi-moneda de Kreoon

export type CurrencyCode = 'USD' | 'COP' | 'MXN' | 'PEN' | 'CLP' | 'ARS' | 'BRL' | 'EUR';

export interface SupportedCurrency {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimal_places: number;
  country: string;
  flag_emoji: string;
  is_active: boolean;
  min_withdrawal: number;
}

export interface ExchangeRate {
  id: string;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
  spread: number;
  source: string;
  fetched_at: string;
  expires_at: string | null;
}

export interface ExchangeRateResult {
  rate: number;
  rate_with_spread: number;
  spread: number;
  expires_at: string | null;
  rate_id: string | null;
}

export interface CurrencyConversion {
  id: string;
  wallet_id: string | null;
  transaction_id: string | null;
  withdrawal_id: string | null;
  from_currency: CurrencyCode;
  from_amount: number;
  to_currency: CurrencyCode;
  to_amount: number;
  exchange_rate: number;
  rate_id: string | null;
  spread_applied: number | null;
  conversion_fee: number;
  created_at: string;
}

export type PaymentProviderType = 'deposit' | 'withdrawal' | 'both';

export interface PaymentProvider {
  id: string;
  name: string;
  type: PaymentProviderType;
  supported_currencies: CurrencyCode[];
  supported_countries: string[];
  fixed_fee: number;
  percentage_fee: number;
  min_amount: number | null;
  max_amount: number | null;
  is_active: boolean;
  priority: number;
  logo_url: string | null;
  description: string | null;
  processing_time: string | null;
}

// Para mostrar en UI
export interface PaymentProviderDisplay extends PaymentProvider {
  formattedFee: string;
  totalFee: (amount: number) => number;
  formattedTotalFee: (amount: number) => string;
}

export interface ConversionQuote {
  fromCurrency: CurrencyCode;
  fromAmount: number;
  toCurrency: CurrencyCode;
  toAmount: number;
  rate: number;
  rateWithSpread: number;
  spread: number;
  spreadAmount: number;
  expiresAt: string | null;
  rateId: string | null;
}

export interface ConversionResult extends ConversionQuote {
  conversionId: string;
}

// Labels y helpers
export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: 'Dólar Estadounidense',
  COP: 'Peso Colombiano',
  MXN: 'Peso Mexicano',
  PEN: 'Sol Peruano',
  CLP: 'Peso Chileno',
  ARS: 'Peso Argentino',
  BRL: 'Real Brasileño',
  EUR: 'Euro',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  COP: '$',
  MXN: '$',
  PEN: 'S/',
  CLP: '$',
  ARS: '$',
  BRL: 'R$',
  EUR: '€',
};

export const CURRENCY_FLAGS: Record<CurrencyCode, string> = {
  USD: '🇺🇸',
  COP: '🇨🇴',
  MXN: '🇲🇽',
  PEN: '🇵🇪',
  CLP: '🇨🇱',
  ARS: '🇦🇷',
  BRL: '🇧🇷',
  EUR: '🇪🇺',
};

export const COUNTRY_CURRENCIES: Record<string, CurrencyCode> = {
  US: 'USD',
  CO: 'COP',
  MX: 'MXN',
  PE: 'PEN',
  CL: 'CLP',
  AR: 'ARS',
  BR: 'BRL',
  ES: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
};

// Formatear moneda según código
export function formatCurrencyAmount(amount: number, currency: CurrencyCode): string {
  const formatters: Record<CurrencyCode, Intl.NumberFormat> = {
    USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    COP: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }),
    MXN: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }),
    PEN: new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }),
    CLP: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }),
    ARS: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
    BRL: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    EUR: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }),
  };
  return formatters[currency].format(amount);
}

// Formatear tasa de cambio
export function formatExchangeRate(
  rate: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): string {
  const toSymbol = CURRENCY_SYMBOLS[toCurrency];
  const formattedRate = toCurrency === 'COP' || toCurrency === 'CLP' || toCurrency === 'ARS'
    ? Math.round(rate).toLocaleString('es-CO')
    : rate.toFixed(4);
  return `1 ${fromCurrency} = ${toSymbol}${formattedRate} ${toCurrency}`;
}

// Calcular fee de proveedor
export function calculateProviderFee(
  amount: number,
  provider: PaymentProvider
): number {
  return provider.fixed_fee + (amount * provider.percentage_fee);
}

// Formatear fee de proveedor para mostrar
export function formatProviderFee(provider: PaymentProvider): string {
  const parts: string[] = [];

  if (provider.fixed_fee > 0) {
    parts.push(`$${provider.fixed_fee}`);
  }

  if (provider.percentage_fee > 0) {
    parts.push(`${(provider.percentage_fee * 100).toFixed(1)}%`);
  }

  if (parts.length === 0) {
    return 'Gratis';
  }

  return parts.join(' + ');
}

// Convertir PaymentProvider a PaymentProviderDisplay
export function toPaymentProviderDisplay(provider: PaymentProvider): PaymentProviderDisplay {
  return {
    ...provider,
    formattedFee: formatProviderFee(provider),
    totalFee: (amount: number) => calculateProviderFee(amount, provider),
    formattedTotalFee: (amount: number) => {
      const fee = calculateProviderFee(amount, provider);
      return fee > 0 ? formatCurrencyAmount(fee, provider.supported_currencies[0] || 'USD') : 'Gratis';
    },
  };
}
