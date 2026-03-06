import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obtener todos los perfiles activos
    const { data: profiles, error: fetchError } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('is_active', true);

    if (fetchError) {
      throw fetchError;
    }

    let updated = 0;
    let errors = 0;

    // Recalcular score de cada perfil
    for (const p of profiles ?? []) {
      try {
        const { error: rpcError } = await supabase.rpc('compute_creator_search_score', {
          p_creator_id: p.id
        });

        if (rpcError) {
          console.error(`Error updating score for ${p.id}:`, rpcError.message);
          errors++;
        } else {
          updated++;
        }
      } catch (e) {
        console.error(`Exception updating score for ${p.id}:`, e);
        errors++;
      }
    }

    // También actualizar portfolio_count de cada perfil
    const { error: countError } = await supabase.rpc('update_all_portfolio_counts');
    if (countError) {
      console.warn('Could not update portfolio counts:', countError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        errors,
        total: profiles?.length ?? 0,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Score updater error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
