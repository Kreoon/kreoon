// Exchange Rate Service - Manejo de tasas de cambio
import { supabase } from '@/integrations/supabase/client';
import type {
  CurrencyCode,
  ExchangeRate,
  ExchangeRateResult,
  ConversionQuote,
  ConversionResult,
} from '../types';

// API pública gratuita para tasas de cambio
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest';

export const exchangeService = {
  /**
   * Obtener tasa de cambio actual desde la BD
   */
  async getCurrentRate(
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode
  ): Promise<ExchangeRateResult | null> {
    if (fromCurrency === toCurrency) {
      return {
        rate: 1,
        rate_with_spread: 1,
        spread: 0,
        expires_at: null,
        rate_id: null,
      };
    }

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('id, rate, is_active, created_at')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('Error fetching exchange rate:', error);
      return null;
    }

    return {
      rate: data.rate,
      rate_with_spread: data.rate,
      spread: 0,
      expires_at: null,
      rate_id: data.id,
    };
  },

  /**
   * Obtener todas las tasas actuales desde USD
   */
  async getAllRatesFromUSD(): Promise<ExchangeRate[]> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('from_currency', 'USD')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rates:', error);
      return [];
    }

    // Eliminar duplicados, quedarse con el más reciente por moneda
    const uniqueRates = (data || []).reduce((acc, rate) => {
      if (!acc[rate.to_currency]) {
        acc[rate.to_currency] = rate;
      }
      return acc;
    }, {} as Record<string, ExchangeRate>);

    return Object.values(uniqueRates);
  },

  /**
   * Obtener cotización de conversión (sin ejecutar)
   */
  async getConversionQuote(
    fromAmount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode
  ): Promise<ConversionQuote | null> {
    const rateData = await this.getCurrentRate(fromCurrency, toCurrency);

    if (!rateData) {
      return null;
    }

    const toAmountRaw = fromAmount * rateData.rate;
    const toAmount = fromAmount * rateData.rate_with_spread;
    const spreadAmount = toAmountRaw - toAmount;

    return {
      fromCurrency,
      fromAmount,
      toCurrency,
      toAmount: Math.round(toAmount * 100) / 100,
      rate: rateData.rate,
      rateWithSpread: rateData.rate_with_spread,
      spread: rateData.spread,
      spreadAmount: Math.round(spreadAmount * 100) / 100,
      expiresAt: rateData.expires_at,
      rateId: rateData.rate_id,
    };
  },

  /**
   * Ejecutar conversión y registrar en auditoría
   */
  async executeConversion(params: {
    fromAmount: number;
    fromCurrency: CurrencyCode;
    toCurrency: CurrencyCode;
    walletId?: string;
    transactionId?: string;
    withdrawalId?: string;
  }): Promise<ConversionResult | null> {
    const { fromAmount, fromCurrency, toCurrency, ...context } = params;

    // Obtener cotización
    const quote = await this.getConversionQuote(fromAmount, fromCurrency, toCurrency);

    if (!quote) {
      return null;
    }

    // Registrar conversión para auditoría
    const { data: conversion, error } = await supabase
      .from('currency_conversions')
      .insert({
        wallet_id: context.walletId || null,
        transaction_id: context.transactionId || null,
        withdrawal_id: context.withdrawalId || null,
        from_currency: fromCurrency,
        from_amount: fromAmount,
        to_currency: toCurrency,
        to_amount: quote.toAmount,
        exchange_rate: quote.rate,
        rate_id: quote.rateId,
        spread_applied: quote.spread,
        conversion_fee: quote.spreadAmount,
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording conversion:', error);
      // Aún así devolver el quote aunque falle el registro
      return {
        ...quote,
        conversionId: '',
      };
    }

    return {
      ...quote,
      conversionId: conversion.id,
    };
  },

  /**
   * Convertir monto simple (sin registro)
   */
  async convertAmount(
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    applySpread: boolean = true
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rateData = await this.getCurrentRate(fromCurrency, toCurrency);

    if (!rateData) {
      throw new Error(`No hay tasa de cambio disponible para ${fromCurrency} a ${toCurrency}`);
    }

    const rate = applySpread ? rateData.rate_with_spread : rateData.rate;
    return Math.round(amount * rate * 100) / 100;
  },

  /**
   * Fetch tasas desde API externa (para usar desde Edge Function)
   * Esta función es principalmente de referencia - el fetch real
   * debería hacerse desde una Edge Function con service_role
   */
  async fetchExternalRates(baseCurrency: CurrencyCode = 'USD'): Promise<Record<string, number> | null> {
    try {
      const response = await fetch(`${EXCHANGE_RATE_API}/${baseCurrency}`);

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      return data.rates;
    } catch (error) {
      console.error('Error fetching external rates:', error);
      return null;
    }
  },

  /**
   * Verificar si las tasas están actualizadas
   */
  async areRatesStale(): Promise<boolean> {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('created_at')
      .eq('from_currency', 'USD')
      .eq('is_active', true)
      .gt('created_at', sixHoursAgo)
      .limit(1);

    if (error || !data || data.length === 0) {
      return true;
    }

    return false;
  },
};
