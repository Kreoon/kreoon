import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Cliente con el JWT del usuario para validar identidad y rol
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let organizationId: string | null = null;
    let periodLabel: string | null = null;

    if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json();
        organizationId = body.organization_id ?? null;
        periodLabel    = body.period_label ?? null;
      } catch { /* body vacío */ }
    }

    // Verificar que el usuario es admin de la org
    if (organizationId) {
      const { data: member, error: memberError } = await userSupabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single();

      if (memberError || !member || member.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Se requiere rol de administrador' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      const { data: adminOrgs } = await userSupabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      if (!adminOrgs || adminOrgs.length === 0) {
        return new Response(JSON.stringify({ error: 'Se requiere rol de administrador' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Cliente con service role para ejecutar la función SQL (bypasa RLS)
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let result: unknown;

    if (organizationId) {
      const { data, error } = await adminSupabase.rpc('fn_monthly_talent_payroll', {
        p_organization_id: organizationId,
        p_period_label:    periodLabel,
      });
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await adminSupabase.rpc('fn_monthly_talent_payroll_all');
      if (error) throw error;
      result = data;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
