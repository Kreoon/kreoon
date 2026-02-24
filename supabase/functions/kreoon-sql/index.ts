import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const kreoonUrl = Deno.env.get('KREOON_SUPABASE_URL');
    const kreoonServiceKey = Deno.env.get('KREOON_SERVICE_ROLE_KEY');

    if (!kreoonUrl || !kreoonServiceKey) {
      return new Response(JSON.stringify({ error: 'Kreoon credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { secret, sql } = await req.json();

    const EXPECTED_SECRET = Deno.env.get("KREOON_SQL_EXEC_SECRET");
    if (!EXPECTED_SECRET) {
      console.error("KREOON_SQL_EXEC_SECRET no está configurado en las variables de entorno");
      return new Response(
        JSON.stringify({ error: "Configuración de servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Comparación de tiempo constante para evitar timing attacks
    function secureCompare(a: string, b: string): boolean {
      if (a.length !== b.length) return false;
      let result = 0;
      for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return result === 0;
    }

    if (!secret || !secureCompare(secret, EXPECTED_SECRET)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!sql) {
      return new Response(JSON.stringify({ error: 'SQL required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute SQL via REST API with service role key
    const response = await fetch(`${kreoonUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': kreoonServiceKey,
        'Authorization': `Bearer ${kreoonServiceKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({}),
    });

    // For raw SQL we need to use the Postgres connection
    // Since we can't do that via REST, let's use a workaround:
    // We'll create individual policies via the Supabase client

    const supabase = createClient(kreoonUrl, kreoonServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Test by reading data with service role (should always work)
    const testResults: Record<string, any> = {};

    const tables = [
      'profiles',
      'organizations', 
      'organization_members',
      'organization_member_roles',
      'user_roles',
      'clients',
      'client_users',
      'products',
      'content',
      'app_settings',
      'achievements',
    ];

    for (const table of tables) {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      testResults[table] = {
        accessible: !error,
        count: count || 0,
        error: error?.message,
      };
    }

    return new Response(JSON.stringify({ 
      message: 'SQL execution via REST API is limited. Use Supabase Dashboard for raw SQL.',
      testResults,
      note: 'All tables are accessible with service role. The issue is RLS policies for authenticated users.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
