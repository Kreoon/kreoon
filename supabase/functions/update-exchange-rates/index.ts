// Edge Function: Update Exchange Rates
// Actualiza las tasas de cambio desde API externa
// Configurar como cron job: cada hora

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API gratuita de tasas de cambio
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

// Monedas que nos interesan
const TARGET_CURRENCIES = ['COP', 'MXN', 'PEN', 'CLP', 'ARS', 'BRL', 'EUR'];

// Spread por defecto (2%)
const DEFAULT_SPREAD = 0.02;

// Tiempo de expiración (2 horas)
const EXPIRATION_HOURS = 2;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Crear cliente Supabase con service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch tasas desde API externa
    console.log('Fetching exchange rates from API...');
    const response = await fetch(EXCHANGE_RATE_API);

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log('Received rates for:', Object.keys(data.rates).length, 'currencies');

    // Preparar tasas para insertar
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRATION_HOURS * 60 * 60 * 1000);

    const rates: Array<{
      from_currency: string;
      to_currency: string;
      rate: number;
      spread: number;
      source: string;
      expires_at: string;
    }> = [];

    for (const currency of TARGET_CURRENCIES) {
      const rate = data.rates[currency];

      if (!rate) {
        console.warn(`No rate found for ${currency}`);
        continue;
      }

      // USD -> Moneda local
      rates.push({
        from_currency: 'USD',
        to_currency: currency,
        rate: rate,
        spread: DEFAULT_SPREAD,
        source: 'exchangerate-api',
        expires_at: expiresAt.toISOString(),
      });

      // Moneda local -> USD (inverso)
      rates.push({
        from_currency: currency,
        to_currency: 'USD',
        rate: 1 / rate,
        spread: DEFAULT_SPREAD,
        source: 'exchangerate-api',
        expires_at: expiresAt.toISOString(),
      });
    }

    // También agregar EUR <-> otras monedas importantes
    const eurRate = data.rates['EUR'];
    if (eurRate) {
      for (const currency of ['COP', 'MXN']) {
        const localRate = data.rates[currency];
        if (localRate) {
          // EUR -> Local (a través de USD)
          rates.push({
            from_currency: 'EUR',
            to_currency: currency,
            rate: localRate / eurRate,
            spread: DEFAULT_SPREAD,
            source: 'exchangerate-api',
            expires_at: expiresAt.toISOString(),
          });

          // Local -> EUR
          rates.push({
            from_currency: currency,
            to_currency: 'EUR',
            rate: eurRate / localRate,
            spread: DEFAULT_SPREAD,
            source: 'exchangerate-api',
            expires_at: expiresAt.toISOString(),
          });
        }
      }
    }

    console.log('Inserting', rates.length, 'exchange rates...');

    // Insertar tasas en la base de datos
    const { error } = await supabase
      .from('exchange_rates')
      .insert(rates);

    if (error) {
      throw error;
    }

    // Limpiar tasas antiguas (más de 24 horas)
    const cleanupDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { error: cleanupError } = await supabase
      .from('exchange_rates')
      .delete()
      .lt('expires_at', cleanupDate.toISOString());

    if (cleanupError) {
      console.warn('Error cleaning up old rates:', cleanupError.message);
    }

    // Log de tasas principales
    const mainRates = rates
      .filter(r => r.from_currency === 'USD')
      .map(r => `${r.to_currency}: ${r.rate.toFixed(2)}`);

    console.log('Updated rates:', mainRates.join(', '));

    return new Response(
      JSON.stringify({
        success: true,
        rates_updated: rates.length,
        expires_at: expiresAt.toISOString(),
        rates: rates
          .filter(r => r.from_currency === 'USD')
          .reduce((acc, r) => {
            acc[r.to_currency] = r.rate;
            return acc;
          }, {} as Record<string, number>),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error updating exchange rates:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
