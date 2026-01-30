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
    // Lovable Cloud (source - has original data with old IDs)
    const sourceUrl = Deno.env.get('SUPABASE_URL');
    const sourceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Kreoon (destination - has new Auth IDs)
    const kreoonUrl = Deno.env.get('KREOON_SUPABASE_URL');
    const kreoonServiceKey = Deno.env.get('KREOON_SERVICE_ROLE_KEY');

    if (!kreoonUrl || !kreoonServiceKey || !sourceUrl || !sourceKey) {
      return new Response(JSON.stringify({ error: 'Credentials not configured' }), {
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

    const { secret, action } = await req.json();

    if (secret !== 'kreoon-emergency-2026') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: sync_all_permissions - Map old IDs to new Auth IDs and sync everything
    if (action === 'sync_all_permissions') {
      const results: Record<string, unknown> = {};
      
      // Step 1: Get all Kreoon auth users to build email->newId mapping
      console.log('Step 1: Building email->authId mapping from Kreoon');
      const { data: kreoonAuthUsers, error: authErr } = await kreoonClient.auth.admin.listUsers();
      if (authErr) throw authErr;

      const emailToNewId: Record<string, string> = {};
      for (const user of kreoonAuthUsers.users) {
        if (user.email) {
          emailToNewId[user.email.toLowerCase()] = user.id;
        }
      }
      results.authUsersCount = kreoonAuthUsers.users.length;

      // Step 2: Get source data in parallel
      console.log('Step 2: Getting source data');
      const [profilesRes, rolesRes, membersRes, memberRolesRes] = await Promise.all([
        sourceClient.from('profiles').select('id, email'),
        sourceClient.from('user_roles').select('*'),
        sourceClient.from('organization_members').select('*'),
        sourceClient.from('organization_member_roles').select('*'),
      ]);

      const sourceProfiles = profilesRes.data || [];
      const sourceUserRoles = rolesRes.data || [];
      const sourceOrgMembers = membersRes.data || [];
      const sourceOrgMemberRoles = memberRolesRes.data || [];

      // Build mappings
      const oldIdToEmail: Record<string, string> = {};
      for (const profile of sourceProfiles) {
        if (profile.email) {
          oldIdToEmail[profile.id] = profile.email.toLowerCase();
        }
      }

      // Step 3: Batch sync user_roles
      console.log('Step 3: Syncing user_roles');
      const rolesToInsert: { user_id: string; role: string }[] = [];
      for (const role of sourceUserRoles) {
        const email = oldIdToEmail[role.user_id];
        if (!email) continue;
        const newUserId = emailToNewId[email];
        if (!newUserId) continue;
        rolesToInsert.push({ user_id: newUserId, role: role.role });
      }
      
      // Use upsert to avoid duplicates
      if (rolesToInsert.length > 0) {
        const { error: rolesErr } = await kreoonClient
          .from('user_roles')
          .upsert(rolesToInsert, { onConflict: 'user_id,role', ignoreDuplicates: true });
        results.rolesUpserted = rolesToInsert.length;
        results.rolesError = rolesErr?.message;
      }

      // Step 4: Batch sync organization_members
      console.log('Step 4: Syncing organization_members');
      const membersToInsert: any[] = [];
      for (const member of sourceOrgMembers) {
        const email = oldIdToEmail[member.user_id];
        if (!email) continue;
        const newUserId = emailToNewId[email];
        if (!newUserId) continue;
        const { id: _id, user_id: _uid, ...memberData } = member;
        membersToInsert.push({ ...memberData, user_id: newUserId });
      }
      
      if (membersToInsert.length > 0) {
        const { error: membersErr } = await kreoonClient
          .from('organization_members')
          .upsert(membersToInsert, { onConflict: 'user_id,organization_id', ignoreDuplicates: true });
        results.membersUpserted = membersToInsert.length;
        results.membersError = membersErr?.message;
      }

      // Step 5: Batch sync organization_member_roles
      console.log('Step 5: Syncing organization_member_roles');
      const memberRolesToInsert: any[] = [];
      for (const memberRole of sourceOrgMemberRoles) {
        const email = oldIdToEmail[memberRole.user_id];
        if (!email) continue;
        const newUserId = emailToNewId[email];
        if (!newUserId) continue;
        const { id: _id, user_id: _uid, ...memberRoleData } = memberRole;
        memberRolesToInsert.push({ ...memberRoleData, user_id: newUserId });
      }
      
      if (memberRolesToInsert.length > 0) {
        const { error: memberRolesErr } = await kreoonClient
          .from('organization_member_roles')
          .upsert(memberRolesToInsert, { onConflict: 'user_id,organization_id,role', ignoreDuplicates: true });
        results.memberRolesUpserted = memberRolesToInsert.length;
        results.memberRolesError = memberRolesErr?.message;
      }

      console.log('[sync_all_permissions] Complete');
      return new Response(JSON.stringify({ 
        success: true, 
        action: 'sync_all_permissions',
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: check_status - Show current state
    if (action === 'check_status') {
      const { data: kreoonAuthUsers } = await kreoonClient.auth.admin.listUsers();
      const { data: kreoonProfiles } = await kreoonClient.from('profiles').select('id, email');
      const { data: kreoonUserRoles } = await kreoonClient.from('user_roles').select('*');
      const { data: kreoonOrgMembers } = await kreoonClient.from('organization_members').select('*');
      const { data: kreoonOrgMemberRoles } = await kreoonClient.from('organization_member_roles').select('*');

      // Find profiles that don't match auth IDs
      const authIds = new Set(kreoonAuthUsers?.users.map(u => u.id) || []);
      const profileIds = new Set(kreoonProfiles?.map(p => p.id) || []);
      
      const profilesWithoutAuth = kreoonProfiles?.filter(p => !authIds.has(p.id)) || [];
      const authWithoutProfile = kreoonAuthUsers?.users.filter(u => !profileIds.has(u.id)) || [];

      return new Response(JSON.stringify({
        kreoon: {
          authUsers: kreoonAuthUsers?.users.length || 0,
          profiles: kreoonProfiles?.length || 0,
          userRoles: kreoonUserRoles?.length || 0,
          orgMembers: kreoonOrgMembers?.length || 0,
          orgMemberRoles: kreoonOrgMemberRoles?.length || 0,
        },
        mismatches: {
          profilesWithoutAuth: profilesWithoutAuth.map(p => ({ id: p.id, email: p.email })),
          authWithoutProfile: authWithoutProfile.map(u => ({ id: u.id, email: u.email })),
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: cleanup_to_single_org_and_role - Ensure each user has only 1 org and 1 role
    if (action === 'cleanup_to_single_org_and_role') {
      const results: Record<string, unknown> = {};
      const ROOT_ADMIN_EMAIL = 'jacsolucionesgraficas@gmail.com';
      const ROOT_ADMIN_ID = '577c72dc-f088-4e99-a109-e88e035a0540'; // Known Kreoon ID for root admin
      const DEFAULT_ORG_ID = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'; // UGC Colombia
      
      const rootAdminId = ROOT_ADMIN_ID;
      results.rootAdminId = rootAdminId;
      results.rootAdminEmail = ROOT_ADMIN_EMAIL;

      // Step 1: Ensure root admin has admin role
      if (rootAdminId) {
        // Delete all existing roles for root admin
        await kreoonClient.from('user_roles').delete().eq('user_id', rootAdminId);
        // Insert admin role
        const { error: adminRoleErr } = await kreoonClient.from('user_roles').insert({
          user_id: rootAdminId,
          role: 'admin'
        });
        results.rootAdminRoleSet = !adminRoleErr;
        if (adminRoleErr) results.rootAdminRoleError = adminRoleErr.message;

        // Update profile active_role
        await kreoonClient.from('profiles').update({ 
          active_role: 'admin',
          current_organization_id: DEFAULT_ORG_ID
        }).eq('id', rootAdminId);
      }

      // Step 2: Get source data to determine primary role for each user
      const [sourceUserRoles, sourceOrgMembers] = await Promise.all([
        sourceClient.from('user_roles').select('*'),
        sourceClient.from('organization_members').select('*'),
      ]);

      // Build map of user's primary role (first one found)
      const userPrimaryRole: Record<string, string> = {};
      for (const role of sourceUserRoles.data || []) {
        if (!userPrimaryRole[role.user_id]) {
          userPrimaryRole[role.user_id] = role.role;
        }
      }

      // Step 3: For each Kreoon user (except root admin), keep only one role
      const { data: currentUserRoles } = await kreoonClient.from('user_roles').select('*');
      const userRolesMap: Record<string, any[]> = {};
      for (const role of currentUserRoles || []) {
        if (!userRolesMap[role.user_id]) userRolesMap[role.user_id] = [];
        userRolesMap[role.user_id].push(role);
      }

      let rolesDeleted = 0;
      for (const userId in userRolesMap) {
        if (userId === rootAdminId) continue; // Skip root admin
        const roles = userRolesMap[userId];
        if (roles.length > 1) {
          // Keep only the first role, delete the rest
          const [keepRole, ...deleteRoles] = roles;
          for (const roleToDelete of deleteRoles) {
            const { error } = await kreoonClient.from('user_roles').delete().eq('id', roleToDelete.id);
            if (!error) rolesDeleted++;
          }
        }
      }
      results.duplicateRolesDeleted = rolesDeleted;

      // Step 4: Delete ALL organization_member_roles first
      const { error: deleteAllMemberRoles } = await kreoonClient
        .from('organization_member_roles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      results.allMemberRolesDeleted = !deleteAllMemberRoles;

      // Step 5: Delete ALL organization_members 
      const { error: deleteAllMembers } = await kreoonClient
        .from('organization_members')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      results.allMembersDeleted = !deleteAllMembers;

      // Step 6: Create fresh membership for each profile in UGC Colombia
      const { data: kreoonProfiles } = await kreoonClient.from('profiles').select('id');
      let orgMembersCreated = 0;
      let memberRolesCreated = 0;
      
      for (const profile of kreoonProfiles || []) {
        const userId = profile.id;
        
        // Get user's role
        const { data: userRole } = await kreoonClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .limit(1)
          .single();
        const role = userRole?.role || 'creator';
        
        // Create organization_member
        const { error: memberErr } = await kreoonClient.from('organization_members').insert({
          user_id: userId,
          organization_id: DEFAULT_ORG_ID,
          role: role
        });
        if (!memberErr) {
          orgMembersCreated++;
        } else {
          if (!results.memberErrors) results.memberErrors = [];
          (results.memberErrors as string[]).push(`${userId}: ${memberErr.message}`);
        }
        
        // Create organization_member_role
        const { error: roleErr } = await kreoonClient.from('organization_member_roles').insert({
          user_id: userId,
          organization_id: DEFAULT_ORG_ID,
          role: role
        });
        if (!roleErr) memberRolesCreated++;
        
        // Update profile's current_organization_id
        await kreoonClient.from('profiles').update({
          current_organization_id: DEFAULT_ORG_ID
        }).eq('id', userId);
      }
      results.orgMembersCreated = orgMembersCreated;
      results.memberRolesCreated = memberRolesCreated;
      results.profilesProcessed = kreoonProfiles?.length || 0;

      return new Response(JSON.stringify({
        success: true,
        action: 'cleanup_to_single_org_and_role',
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: cleanup_duplicate_profiles - Remove profiles with old IDs that have duplicates with new auth IDs
    if (action === 'cleanup_duplicate_profiles') {
      const { data: kreoonAuthUsers } = await kreoonClient.auth.admin.listUsers();
      const { data: kreoonProfiles } = await kreoonClient.from('profiles').select('id, email');
      
      const authIds = new Set(kreoonAuthUsers?.users.map(u => u.id) || []);
      const authEmailToId: Record<string, string> = {};
      for (const user of kreoonAuthUsers?.users || []) {
        if (user.email) {
          authEmailToId[user.email.toLowerCase()] = user.id;
        }
      }
      
      // Find ALL profiles that don't match any auth ID
      const profilesToDelete: string[] = [];
      const profilesByEmail: Record<string, any[]> = {};
      
      for (const profile of kreoonProfiles || []) {
        const email = profile.email?.toLowerCase();
        if (!email) continue;
        if (!profilesByEmail[email]) profilesByEmail[email] = [];
        profilesByEmail[email].push(profile);
      }
      
      // For each email, delete profiles that don't match the auth ID
      for (const email in profilesByEmail) {
        const profiles = profilesByEmail[email];
        const correctAuthId = authEmailToId[email];
        
        for (const profile of profiles) {
          // Delete if profile ID doesn't match auth ID
          if (correctAuthId && profile.id !== correctAuthId) {
            profilesToDelete.push(profile.id);
          }
          // Also delete if no auth user exists for this email
          if (!correctAuthId && !authIds.has(profile.id)) {
            profilesToDelete.push(profile.id);
          }
        }
      }

      // Delete orphan profiles
      let deleted = 0;
      const deleteErrors: string[] = [];
      for (const profileId of profilesToDelete) {
        const { error } = await kreoonClient.from('profiles').delete().eq('id', profileId);
        if (!error) {
          deleted++;
        } else {
          deleteErrors.push(`${profileId}: ${error.message}`);
        }
      }

      return new Response(JSON.stringify({
        action: 'cleanup_duplicate_profiles',
        duplicatesFound: profilesToDelete.length,
        deleted,
        errors: deleteErrors.length > 0 ? deleteErrors : undefined,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: create_missing_profiles - Create profiles for auth users that don't have one
    if (action === 'create_missing_profiles') {
      const { data: kreoonAuthUsers } = await kreoonClient.auth.admin.listUsers();
      const { data: kreoonProfiles } = await kreoonClient.from('profiles').select('id, email');
      
      const existingProfileIds = new Set(kreoonProfiles?.map(p => p.id) || []);
      const existingProfileEmails = new Set(kreoonProfiles?.map(p => p.email?.toLowerCase()) || []);
      
      // Get source profiles to copy data from
      const { data: sourceProfiles } = await sourceClient.from('profiles').select('*');
      const sourceProfileByEmail: Record<string, any> = {};
      for (const profile of sourceProfiles || []) {
        if (profile.email) {
          sourceProfileByEmail[profile.email.toLowerCase()] = profile;
        }
      }

      let created = 0;
      for (const authUser of kreoonAuthUsers?.users || []) {
        if (existingProfileIds.has(authUser.id)) continue;
        
        const email = authUser.email?.toLowerCase();
        if (!email) continue;
        
        // Get data from source profile
        const sourceProfile = sourceProfileByEmail[email];
        
        if (sourceProfile) {
          const { id: _id, created_at: _created, ...profileData } = sourceProfile;
          const { error } = await kreoonClient.from('profiles').insert({
            ...profileData,
            id: authUser.id,
          });
          if (!error) created++;
        } else {
          // Create minimal profile
          const { error } = await kreoonClient.from('profiles').insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || 'Sin nombre',
          });
          if (!error) created++;
        }
      }

      return new Response(JSON.stringify({
        action: 'create_missing_profiles',
        created,
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
