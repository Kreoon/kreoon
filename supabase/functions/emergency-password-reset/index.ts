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
    // Legacy source database
    const sourceUrl = Deno.env.get('SUPABASE_URL');
    const sourceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Kreoon (destination)
    const kreoonUrl = Deno.env.get('KREOON_SUPABASE_URL');
    const kreoonServiceKey = Deno.env.get('KREOON_SERVICE_ROLE_KEY');

    if (!kreoonUrl || !kreoonServiceKey) {
      return new Response(JSON.stringify({ error: 'Credenciales Kreoon no configuradas' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!sourceUrl || !sourceKey) {
      return new Response(JSON.stringify({ error: 'Credenciales de origen no configuradas' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sourceClient = createClient(sourceUrl, sourceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const kreoonClient = createClient(kreoonUrl, kreoonServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, password, secret, action, newAuthId } = await req.json();

    const EXPECTED_SECRET = Deno.env.get("EMERGENCY_PASSWORD_RESET_SECRET") || 'kreoon-emergency-2026';
    if (secret !== EXPECTED_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: full_sync - Complete sync for admin user to Kreoon
    if (action === 'full_sync') {
      const oldId = Deno.env.get('LEGACY_ADMIN_USER_ID') || '06aa55b0-61ea-41f0-9708-7a3d322b6795'; // Legacy ID in source DB
      const targetAuthId = newAuthId || Deno.env.get('KREOON_ROOT_AUTH_ID') || '577c72dc-f088-4e99-a109-e88e035a0540'; // Kreoon Auth ID
      
      console.log(`[full_sync] Source: Legacy DB, Dest: Kreoon`);
      console.log(`[full_sync] Mapping ${oldId} -> ${targetAuthId}`);
      
      const results: Record<string, unknown> = {};

      // Step 1: Get admin profile from legacy source
      console.log('Step 1: Reading admin profile from legacy source');
      const { data: sourceProfile, error: profileErr } = await sourceClient
        .from('profiles')
        .select('*')
        .eq('id', oldId)
        .single();

      if (profileErr || !sourceProfile) {
        return new Response(JSON.stringify({ 
          error: 'Admin profile not found in source', 
          details: profileErr 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      results.sourceProfile = { found: true, email: sourceProfile.email };

      // Step 2: Check if profile exists in Kreoon with new ID
      console.log('Step 2: Checking Kreoon for existing profile');
      const { data: existingProfile } = await kreoonClient
        .from('profiles')
        .select('id, email')
        .eq('id', targetAuthId)
        .single();

      if (existingProfile) {
        console.log('Profile already exists, will update');
        results.existingProfile = existingProfile;
      }

      // Step 3: Upsert profile to Kreoon with new ID
      console.log('Step 3: Upserting profile to Kreoon');
      const { id: _id, created_at: _created, username: oldUsername, ...profileData } = sourceProfile;
      
      // Clear any conflicting username first
      await kreoonClient
        .from('profiles')
        .update({ username: null })
        .eq('username', oldUsername || 'alexemprendee');
      
      const { error: upsertProfileErr } = await kreoonClient
        .from('profiles')
        .upsert({
          ...profileData,
          id: targetAuthId,
          username: oldUsername || 'alexemprendee',
          active_role: 'admin',
        }, { onConflict: 'id' });

      results.profileUpsert = { error: upsertProfileErr?.message };

      // Step 4: Read and migrate user_roles
      console.log('Step 4: Migrating user_roles');
      const { data: sourceRoles } = await sourceClient
        .from('user_roles')
        .select('*')
        .eq('user_id', oldId);

      if (sourceRoles && sourceRoles.length > 0) {
        // Delete any existing roles for target ID to avoid conflicts
        await kreoonClient
          .from('user_roles')
          .delete()
          .eq('user_id', targetAuthId);

        for (const role of sourceRoles) {
          const { error: roleErr } = await kreoonClient
            .from('user_roles')
            .insert({ 
              user_id: targetAuthId, 
              role: role.role 
            });
          results[`role_${role.role}`] = { error: roleErr?.message };
        }
      } else {
        // Ensure at least admin role exists
        const { error: roleErr } = await kreoonClient
          .from('user_roles')
          .upsert({ user_id: targetAuthId, role: 'admin' }, { onConflict: 'user_id,role' });
        results.role_admin = { error: roleErr?.message };
      }

      // Step 5: Read and migrate organization_members
      console.log('Step 5: Migrating organization_members');
      const { data: sourceMembers } = await sourceClient
        .from('organization_members')
        .select('*')
        .eq('user_id', oldId);

      if (sourceMembers && sourceMembers.length > 0) {
        for (const member of sourceMembers) {
          const { id: _memberId, user_id: _userId, ...memberData } = member;
          
          // Check if entry already exists
          const { data: existingMember } = await kreoonClient
            .from('organization_members')
            .select('id')
            .eq('user_id', targetAuthId)
            .eq('organization_id', member.organization_id)
            .single();

          if (existingMember) {
            const { error: updateErr } = await kreoonClient
              .from('organization_members')
              .update({ ...memberData, user_id: targetAuthId })
              .eq('id', existingMember.id);
            results[`member_${member.organization_id}`] = { action: 'update', error: updateErr?.message };
          } else {
            const { error: insertErr } = await kreoonClient
              .from('organization_members')
              .insert({ ...memberData, user_id: targetAuthId });
            results[`member_${member.organization_id}`] = { action: 'insert', error: insertErr?.message };
          }
        }
      }

      // Step 6: Read and migrate organization_member_roles
      console.log('Step 6: Migrating organization_member_roles');
      const { data: sourceMemberRoles } = await sourceClient
        .from('organization_member_roles')
        .select('*')
        .eq('user_id', oldId);

      if (sourceMemberRoles && sourceMemberRoles.length > 0) {
        for (const memberRole of sourceMemberRoles) {
          const { id: _mrId, user_id: _mrUserId, ...memberRoleData } = memberRole;
          
          const { data: existingMemberRole } = await kreoonClient
            .from('organization_member_roles')
            .select('id')
            .eq('user_id', targetAuthId)
            .eq('organization_id', memberRole.organization_id)
            .eq('role', memberRole.role)
            .single();

          if (!existingMemberRole) {
            const { error: insertErr } = await kreoonClient
              .from('organization_member_roles')
              .insert({ ...memberRoleData, user_id: targetAuthId });
            results[`memberRole_${memberRole.organization_id}_${memberRole.role}`] = { error: insertErr?.message };
          }
        }
      }

      console.log('[full_sync] Complete');
      return new Response(JSON.stringify({ 
        success: true, 
        action: 'full_sync',
        oldId,
        newId: targetAuthId,
        results
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ACTION: sync_profile - Legacy sync within same database
    if (action === 'sync_profile') {
      if (email !== (Deno.env.get("AUTHORIZED_RESET_EMAIL") || 'jacsolucionesgraficas@gmail.com')) {
        return new Response(JSON.stringify({ error: 'Email no autorizado' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find user by email in Kreoon auth
      const { data: users, error: listErr } = await kreoonClient.auth.admin.listUsers();
      if (listErr) throw listErr;

      const targetUser = users.users.find(u => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: "Usuario no encontrado en auth" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const oldId = Deno.env.get('LEGACY_ADMIN_USER_ID') || '06aa55b0-61ea-41f0-9708-7a3d322b6795';
      const newId = targetUser.id;

      console.log(`[sync_profile] Syncing from ${oldId} to ${newId}`);

      // This action now just calls full_sync internally
      // Re-parse the request with full_sync action
      const fullSyncBody = JSON.stringify({ secret, action: 'full_sync', newAuthId: newId });
      const fullSyncReq = new Request(req.url, {
        method: 'POST',
        headers: req.headers,
        body: fullSyncBody
      });
      
      // Recursive call simulation - just do the work here
      const results: Record<string, unknown> = {};
      
      // Get profile from source
      const { data: sourceProfile } = await sourceClient
        .from('profiles')
        .select('*')
        .eq('id', oldId)
        .single();

      if (sourceProfile) {
        const { id: _id, created_at: _created, username: oldUsername, ...profileData } = sourceProfile;
        
        await kreoonClient.from('profiles').update({ username: null }).eq('username', oldUsername || 'alexemprendee');
        
        const { error: upsertErr } = await kreoonClient
          .from('profiles')
          .upsert({
            ...profileData,
            id: newId,
            username: oldUsername || 'alexemprendee',
            active_role: 'admin',
          }, { onConflict: 'id' });
        results.profileUpsert = { error: upsertErr?.message };
      }

      // Migrate roles
      const { data: sourceRoles } = await sourceClient.from('user_roles').select('*').eq('user_id', oldId);
      if (sourceRoles) {
        await kreoonClient.from('user_roles').delete().eq('user_id', newId);
        for (const role of sourceRoles) {
          await kreoonClient.from('user_roles').insert({ user_id: newId, role: role.role });
        }
      }
      await kreoonClient.from('user_roles').upsert({ user_id: newId, role: 'admin' }, { onConflict: 'user_id,role' });

      // Migrate org members
      const { data: sourceMembers } = await sourceClient.from('organization_members').select('*').eq('user_id', oldId);
      if (sourceMembers) {
        for (const member of sourceMembers) {
          const { id: _id, user_id: _uid, ...data } = member;
          await kreoonClient.from('organization_members').upsert({ 
            ...data, 
            user_id: newId 
          }, { onConflict: 'user_id,organization_id' });
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        oldId,
        newId,
        results
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ACTION: check_status - Diagnostic check
    if (action === 'check_status') {
      const targetId = newAuthId || Deno.env.get('KREOON_ROOT_AUTH_ID') || '577c72dc-f088-4e99-a109-e88e035a0540';
      
      // Check source (Legacy DB)
      const { data: sourceProfile } = await sourceClient
        .from('profiles')
        .select('id, email, active_role')
        .eq('email', Deno.env.get("AUTHORIZED_RESET_EMAIL") || 'jacsolucionesgraficas@gmail.com')
        .single();

      const { data: sourceRoles } = await sourceClient
        .from('user_roles')
        .select('role')
        .eq('user_id', Deno.env.get('LEGACY_ADMIN_USER_ID') || '06aa55b0-61ea-41f0-9708-7a3d322b6795');

      // Check destination (Kreoon)
      const { data: destProfile, error: destProfileErr } = await kreoonClient
        .from('profiles')
        .select('id, email, active_role')
        .eq('id', targetId)
        .single();

      const { data: destRoles, error: destRolesErr } = await kreoonClient
        .from('user_roles')
        .select('role')
        .eq('user_id', targetId);

      const { data: destMembers, error: destMembersErr } = await kreoonClient
        .from('organization_members')
        .select('organization_id, role, is_owner')
        .eq('user_id', targetId);

      return new Response(JSON.stringify({
        source: {
          profile: sourceProfile,
          roles: sourceRoles,
        },
        destination: {
          targetId,
          profile: destProfile,
          profileError: destProfileErr?.message,
          roles: destRoles,
          rolesError: destRolesErr?.message,
          members: destMembers,
          membersError: destMembersErr?.message,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Default: password reset
    if (email !== (Deno.env.get("AUTHORIZED_RESET_EMAIL") || 'jacsolucionesgraficas@gmail.com')) {
      return new Response(JSON.stringify({ error: 'Email no autorizado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: users, error: listErr } = await kreoonClient.auth.admin.listUsers();
    if (listErr) throw listErr;

    const targetUser = users.users.find(u => u.email === email);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado en auth" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { error: updateErr } = await kreoonClient.auth.admin.updateUserById(targetUser.id, {
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
