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
      return new Response(JSON.stringify({ error: 'Credenciales no configuradas' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(kreoonUrl, kreoonServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, password, secret } = await req.json();

    if (secret !== 'kreoon-emergency-2026') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (email !== 'jacsolucionesgraficas@gmail.com') {
      return new Response(JSON.stringify({ error: 'Email no autorizado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find user by email
    const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;

    const targetUser = users.users.find(u => u.email === email);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado", users: users.users.length }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      password: password,
    });
    
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message, code: updateErr.code }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Emergency password reset for ${email} - user id: ${targetUser.id}`);
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Contraseña actualizada",
      userId: targetUser.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Emergency reset error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
