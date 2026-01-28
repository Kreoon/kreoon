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

    const { email, password, secret, action } = await req.json();

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

    // Find user by email in auth
    const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;

    const targetUser = users.users.find(u => u.email === email);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado en auth" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === 'sync_profile') {
      const oldId = '06aa55b0-61ea-41f0-9708-7a3d322b6795';
      const newId = targetUser.id;

      console.log(`[v2] Syncing from ${oldId} to ${newId}`);

      // Step 1: Clear username from OLD profile to release constraint
      console.log('Step 1: Clear old profile username');
      await supabaseAdmin
        .from('profiles')
        .update({ username: null })
        .eq('id', oldId);

      // Step 2: Get old profile data
      console.log('Step 2: Get old profile');
      const { data: oldProfile, error: oldErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', oldId)
        .single();

      if (oldErr || !oldProfile) {
        return new Response(JSON.stringify({ error: "Old profile not found", details: oldErr }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Step 3: Delete old profile  
      console.log('Step 3: Delete old profile');
      await supabaseAdmin.from('profiles').delete().eq('id', oldId);

      // Step 4: Update or insert new profile
      console.log('Step 4: Upsert new profile');
      const { id: _id, created_at: _created, ...profileData } = oldProfile;
      
      const { error: upsertErr } = await supabaseAdmin
        .from('profiles')
        .upsert({
          ...profileData,
          id: newId,
          username: 'alexemprendee', // restore username
        });

      if (upsertErr) throw upsertErr;

      // Step 5: Update references - use admin RPC to bypass triggers
      console.log('Step 5: Update references');
      
      // Direct SQL for user_roles (bypasses RLS)
      const { error: sqlErr } = await supabaseAdmin.rpc('update_user_id_references', {
        old_user_id: oldId,
        new_user_id: newId
      });
      
      if (sqlErr) {
        console.log('RPC not available, trying direct updates');
      }
      
      // Also try direct updates
      const tables = [
        { t: 'organization_members', c: 'user_id' },
        { t: 'organization_member_roles', c: 'user_id' },
      ];

      const results = [];
      for (const item of tables) {
        const { error } = await supabaseAdmin
          .from(item.t)
          .update({ [item.c]: newId })
          .eq(item.c, oldId);
        results.push({ table: item.t, col: item.c, error: error?.message });
      }
      
      // Insert into user_roles directly since old one might be blocked by RLS
      const { error: roleErr } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: newId, role: 'admin' }, { onConflict: 'user_id,role' });
      results.push({ table: 'user_roles', action: 'upsert admin', error: roleErr?.message });

      console.log('Sync complete');
      return new Response(JSON.stringify({ 
        success: true, 
        oldId,
        newId,
        results
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Default: set password
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      password: password,
    });
    
    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ 
      success: true, 
      userId: targetUser.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      details: error 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
