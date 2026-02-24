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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch rates from external API
    console.log('Fetching exchange rates from API...');
    const response = await fetch(EXCHANGE_RATE_API);

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log('Received rates for:', Object.keys(data.rates).length, 'currencies');

    // Update rates using UPSERT (matches actual table schema: from_currency, to_currency, rate, is_active)
    let updatedCount = 0;

    for (const currency of TARGET_CURRENCIES) {
      const rate = data.rates[currency];
      if (!rate) {
        console.warn(`No rate found for ${currency}`);
        continue;
      }

      // USD → Local currency
      const { error: e1 } = await supabase
        .from('exchange_rates')
        .update({ rate, created_at: new Date().toISOString() })
        .eq('from_currency', 'USD')
        .eq('to_currency', currency)
        .eq('is_active', true);

      if (e1) {
        // Row doesn't exist yet, insert it
        await supabase.from('exchange_rates').insert({
          from_currency: 'USD',
          to_currency: currency,
          rate,
          is_active: true,
        });
      }

      // Local currency → USD (inverse)
      const inverseRate = 1 / rate;
      const { error: e2 } = await supabase
        .from('exchange_rates')
        .update({ rate: inverseRate, created_at: new Date().toISOString() })
        .eq('from_currency', currency)
        .eq('to_currency', 'USD')
        .eq('is_active', true);

      if (e2) {
        await supabase.from('exchange_rates').insert({
          from_currency: currency,
          to_currency: 'USD',
          rate: inverseRate,
          is_active: true,
        });
      }

      updatedCount += 2;
    }

    // Log main rates
    const mainRates = TARGET_CURRENCIES
      .map(c => `${c}: ${data.rates[c]?.toFixed(2) || 'N/A'}`)
      .join(', ');

    console.log(`Updated ${updatedCount} rates: ${mainRates}`);

    return new Response(
      JSON.stringify({
        success: true,
        rates_updated: updatedCount,
        rates: TARGET_CURRENCIES.reduce((acc, c) => {
          if (data.rates[c]) acc[c] = data.rates[c];
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
