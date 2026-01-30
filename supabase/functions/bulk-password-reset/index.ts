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
    // Kreoon credentials
    const kreoonUrl = Deno.env.get('KREOON_SUPABASE_URL');
    const kreoonServiceKey = Deno.env.get('KREOON_SERVICE_ROLE_KEY');

    if (!kreoonUrl || !kreoonServiceKey) {
      return new Response(JSON.stringify({ error: 'Credenciales Kreoon no configuradas' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const kreoonClient = createClient(kreoonUrl, kreoonServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { secret, action, password } = await req.json();

    if (secret !== 'kreoon-emergency-2026') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: list_users - List all users in Kreoon
    if (action === 'list_users') {
      const { data: users, error } = await kreoonClient.auth.admin.listUsers();
      
      if (error) throw error;

      const userList = users.users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));

      return new Response(JSON.stringify({ 
        total: userList.length,
        users: userList 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: set_all_passwords - Set same password for all users
    if (action === 'set_all_passwords') {
      if (!password) {
        return new Response(JSON.stringify({ error: 'Password is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: users, error: listErr } = await kreoonClient.auth.admin.listUsers();
      if (listErr) throw listErr;

      const results: { email: string; success: boolean; error?: string }[] = [];
      
      for (const user of users.users) {
        try {
          const { error: updateErr } = await kreoonClient.auth.admin.updateUserById(user.id, {
            password: password,
          });
          
          results.push({
            email: user.email || 'unknown',
            success: !updateErr,
            error: updateErr?.message,
          });
          
          console.log(`Password updated for ${user.email}: ${updateErr ? 'FAILED' : 'SUCCESS'}`);
        } catch (err) {
          results.push({
            email: user.email || 'unknown',
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return new Response(JSON.stringify({ 
        action: 'set_all_passwords',
        total: users.users.length,
        successful,
        failed,
        results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
