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

    // ============ JWT + ADMIN VALIDATION ============
    // This function provides database diagnostics and should require admin access

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "No authorization header - JWT required" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client
    const supabaseAdmin = createClient(kreoonUrl, kreoonServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validate JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error("JWT validation failed:", userError);
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerEmail = userData.user.email as string;
    const callerId = userData.user.id as string;

    // Check if caller is admin (ROOT or platform admin)
    const ROOT_EMAILS = (Deno.env.get("ROOT_ADMIN_EMAILS") ||
      "jacsolucionesgraficas@gmail.com,kairosgp.sas@gmail.com")
      .split(",").map(e => e.trim());

    const isRootUser = ROOT_EMAILS.includes(callerEmail);

    if (!isRootUser) {
      const { data: adminRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminRole) {
        console.warn(`SECURITY: Unauthorized kreoon-sql attempt by ${callerEmail}`);
        return new Response(JSON.stringify({
          error: "Unauthorized - Admin access required"
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`SECURITY: kreoon-sql authorized for ${callerEmail} (root: ${isRootUser})`);

    // ============ END JWT VALIDATION ============

    const { secret, sql } = await req.json();

    const EXPECTED_SECRET = Deno.env.get("KREOON_SQL_EXEC_SECRET") || 'kreoon-sql-exec-2026';
    if (secret !== EXPECTED_SECRET) {
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

    // Use the supabaseAdmin client already created above for JWT validation

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
      const { data, error, count } = await supabaseAdmin
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
