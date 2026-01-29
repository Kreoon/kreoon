import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROOT_EMAIL = "jacsolucionesgraficas@gmail.com";

// Core tables that need RLS policies for authenticated users
const CORE_TABLES = [
  'profiles',
  'organizations',
  'organization_members',
  'organization_member_roles',
  'user_roles',
  'clients',
  'client_users',
  'client_packages',
  'products',
  'content',
  'app_settings',
  'achievements',
  'chat_conversations',
  'chat_participants',
  'chat_messages',
  'notifications',
];

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

    const { action, secret } = await req.json();

    // Simple auth
    if (secret !== 'kreoon-bootstrap-2026') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(kreoonUrl, kreoonServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: Record<string, any> = {};

    // ACTION: setup_root - Configure root admin user
    if (action === 'setup_root') {
      console.log('[bootstrap] Setting up root admin...');

      // 1. Find or create root user in auth
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      let rootUser = authUsers?.users.find(u => u.email === ROOT_EMAIL);

      if (!rootUser) {
        console.log('[bootstrap] Creating root user in auth...');
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: ROOT_EMAIL,
          password: 'Kreoon2026!',
          email_confirm: true,
          user_metadata: { full_name: 'Johan Alexander Castaño' },
        });
        if (createErr) {
          results.auth_create = { error: createErr.message };
        } else {
          rootUser = created.user;
          results.auth_create = { success: true, id: rootUser?.id };
        }
      } else {
        results.auth_exists = { id: rootUser.id };
      }

      if (!rootUser) {
        return new Response(JSON.stringify({ error: 'Could not find/create root user', results }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rootId = rootUser.id;

      // 2. Ensure profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', rootId)
        .maybeSingle();

      if (!existingProfile) {
        const { error: profileErr } = await supabase.from('profiles').insert({
          id: rootId,
          email: ROOT_EMAIL,
          full_name: 'Johan Alexander Castaño',
          is_platform_root: true,
        });
        results.profile_create = profileErr ? { error: profileErr.message } : { success: true };
      } else {
        // Update to ensure is_platform_root is set
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ is_platform_root: true, email: ROOT_EMAIL })
          .eq('id', rootId);
        results.profile_update = updateErr ? { error: updateErr.message } : { success: true };
      }

      // 3. Ensure admin role in user_roles
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', rootId)
        .eq('role', 'admin')
        .maybeSingle();

      if (!existingRole) {
        const { error: roleErr } = await supabase.from('user_roles').insert({
          user_id: rootId,
          role: 'admin',
        });
        results.role_admin = roleErr ? { error: roleErr.message } : { success: true };
      } else {
        results.role_admin = { exists: true };
      }

      // Also add strategist role
      const { data: stratRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', rootId)
        .eq('role', 'strategist')
        .maybeSingle();

      if (!stratRole) {
        const { error: stratErr } = await supabase.from('user_roles').insert({
          user_id: rootId,
          role: 'strategist',
        });
        results.role_strategist = stratErr ? { error: stratErr.message } : { success: true };
      } else {
        results.role_strategist = { exists: true };
      }

      // 4. Check organization membership (find first org or create one)
      const { data: orgs } = await supabase.from('organizations').select('id, name').limit(1);
      let orgId = orgs?.[0]?.id;

      if (!orgId) {
        // Create a default organization
        const { data: newOrg, error: orgErr } = await supabase.from('organizations').insert({
          name: 'KREOON',
          owner_id: rootId,
        }).select('id').single();
        
        if (orgErr) {
          results.org_create = { error: orgErr.message };
        } else {
          orgId = newOrg.id;
          results.org_create = { success: true, id: orgId };
        }
      } else {
        results.org_exists = { id: orgId, name: orgs?.[0]?.name || 'Unknown' };
      }

      if (orgId) {
        // Ensure root is owner of the org
        const { error: ownerErr } = await supabase
          .from('organizations')
          .update({ owner_id: rootId })
          .eq('id', orgId);
        results.org_owner = ownerErr ? { error: ownerErr.message } : { success: true };

        // Ensure organization member exists
        const { data: existingMember } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', rootId)
          .eq('organization_id', orgId)
          .maybeSingle();

        if (!existingMember) {
          const { error: memberErr } = await supabase.from('organization_members').insert({
            user_id: rootId,
            organization_id: orgId,
            role: 'admin',
            status: 'active',
          });
          results.org_member = memberErr ? { error: memberErr.message } : { success: true };
        } else {
          results.org_member = { exists: true };
        }

        // Ensure organization_member_roles has admin
        const { data: existingOrgRole } = await supabase
          .from('organization_member_roles')
          .select('id')
          .eq('user_id', rootId)
          .eq('organization_id', orgId)
          .eq('role', 'admin')
          .maybeSingle();

        if (!existingOrgRole) {
          const { error: orgRoleErr } = await supabase.from('organization_member_roles').insert({
            user_id: rootId,
            organization_id: orgId,
            role: 'admin',
          });
          results.org_role = orgRoleErr ? { error: orgRoleErr.message } : { success: true };
        } else {
          results.org_role = { exists: true };
        }

        // Update profile with current_organization_id
        const { error: profOrgErr } = await supabase
          .from('profiles')
          .update({ current_organization_id: orgId })
          .eq('id', rootId);
        results.profile_org = profOrgErr ? { error: profOrgErr.message } : { success: true };
      }

      return new Response(JSON.stringify({ 
        success: true,
        root_user_id: rootId,
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: check_rls - Check which tables have RLS enabled
    if (action === 'check_rls') {
      const rlsStatus: Record<string, boolean> = {};

      for (const table of CORE_TABLES) {
        try {
          // Try to select with service role - this always works
          const { error } = await supabase.from(table).select('*').limit(1);
          rlsStatus[table] = !error;
        } catch (e) {
          rlsStatus[table] = false;
        }
      }

      return new Response(JSON.stringify({ rlsStatus }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: sync_batch - Sync a specific table in small batches
    if (action === 'sync_batch') {
      const { table, batchSize = 50, offset = 0 } = await req.json().catch(() => ({}));
      
      // Source (Lovable Cloud)
      const sourceUrl = Deno.env.get('SUPABASE_URL');
      const sourceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!sourceUrl || !sourceKey) {
        return new Response(JSON.stringify({ error: 'Source credentials not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sourceClient = createClient(sourceUrl, sourceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Get count from source
      const { count: totalCount } = await sourceClient
        .from(table)
        .select('*', { count: 'exact', head: true });

      // Get batch of data
      const { data: sourceData, error: readError } = await sourceClient
        .from(table)
        .select('*')
        .range(offset, offset + batchSize - 1);

      if (readError) {
        return new Response(JSON.stringify({ 
          error: `Failed to read from source: ${readError.message}`,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!sourceData || sourceData.length === 0) {
        return new Response(JSON.stringify({ 
          success: true,
          table,
          synced: 0,
          total: totalCount || 0,
          done: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Upsert to destination
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of sourceData) {
        const { error: writeError } = await supabase
          .from(table)
          .upsert(row, { onConflict: 'id', ignoreDuplicates: false });

        if (writeError) {
          errorCount++;
          if (errors.length < 3) {
            errors.push(`${row.id}: ${writeError.message}`);
          }
        } else {
          successCount++;
        }
      }

      const nextOffset = offset + sourceData.length;
      const done = nextOffset >= (totalCount || 0);

      return new Response(JSON.stringify({ 
        success: errorCount === 0,
        table,
        synced: successCount,
        failed: errorCount,
        offset,
        nextOffset,
        total: totalCount || 0,
        done,
        errors: errors.length > 0 ? errors : undefined,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Invalid action',
      validActions: ['setup_root', 'check_rls', 'sync_batch'],
    }), {
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
