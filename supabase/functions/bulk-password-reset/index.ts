import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

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

    // ============ JWT + ROOT VALIDATION ============
    // This function is extremely dangerous (can reset passwords for all users)
    // so we require JWT authentication + ROOT admin verification

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "No authorization header - JWT required" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate JWT using Kreoon admin client
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await kreoonClient.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error("JWT validation failed:", userError);
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerEmail = userData.user.email as string;
    const callerId = userData.user.id as string;

    // Check if caller is ROOT user (only ROOT can use this dangerous function)
    const ROOT_EMAILS = (Deno.env.get("ROOT_ADMIN_EMAILS") ||
      "jacsolucionesgraficas@gmail.com,kairosgp.sas@gmail.com")
      .split(",").map(e => e.trim());

    const isRootUser = ROOT_EMAILS.includes(callerEmail);

    if (!isRootUser) {
      // Double check in user_roles table
      const { data: adminRole } = await kreoonClient
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminRole) {
        console.warn(`SECURITY: Unauthorized bulk-password-reset attempt by ${callerEmail}`);
        return new Response(JSON.stringify({
          error: "Unauthorized - Root admin access required for bulk operations"
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`SECURITY: bulk-password-reset authorized for ROOT user ${callerEmail}`);

    // ============ END JWT VALIDATION ============

    const { secret, action, password } = await req.json();

    // SECURITY: Require secret from environment variable (no hardcoded fallback)
    const EXPECTED_SECRET = Deno.env.get("EMERGENCY_PASSWORD_RESET_SECRET");
    if (!EXPECTED_SECRET) {
      console.error('EMERGENCY_PASSWORD_RESET_SECRET not configured in environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error: Emergency secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!secret || secret !== EXPECTED_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: list_users - List all users in both systems
    if (action === 'list_users') {
      const { data: sourceUsers, error: sourceErr } = await sourceClient.auth.admin.listUsers();
      const { data: kreoonUsers, error: kreoonErr } = await kreoonClient.auth.admin.listUsers();
      
      if (sourceErr) throw sourceErr;
      if (kreoonErr) throw kreoonErr;

      const kreoonEmails = new Set(kreoonUsers.users.map(u => u.email?.toLowerCase()));
      
      const sourceList = sourceUsers.users.map(u => ({
        id: u.id,
        email: u.email,
        exists_in_kreoon: kreoonEmails.has(u.email?.toLowerCase()),
      }));

      return new Response(JSON.stringify({ 
        source_total: sourceList.length,
        kreoon_total: kreoonUsers.users.length,
        to_migrate: sourceList.filter(u => !u.exists_in_kreoon).length,
        users: sourceList 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: migrate_all_users - Create all users from source in Kreoon with temp password
    // Also creates users from profiles that exist in Kreoon DB but not in Auth
    if (action === 'migrate_all_users') {
      const tempPassword = password || 'Kreoon2026!';
      
      // Get all users from source
      const { data: sourceUsers, error: sourceErr } = await sourceClient.auth.admin.listUsers();
      if (sourceErr) throw sourceErr;

      // Get existing users in Kreoon
      const { data: kreoonUsers, error: kreoonErr } = await kreoonClient.auth.admin.listUsers();
      if (kreoonErr) throw kreoonErr;

      const kreoonEmails = new Set(kreoonUsers.users.map(u => u.email?.toLowerCase()));
      
      const results: { email: string; action: string; success: boolean; newId?: string; error?: string }[] = [];
      
      for (const user of sourceUsers.users) {
        const email = user.email?.toLowerCase();
        if (!email) continue;

        try {
          if (kreoonEmails.has(email)) {
            // User exists, just update password
            const existingUser = kreoonUsers.users.find(u => u.email?.toLowerCase() === email);
            if (existingUser) {
              const { error: updateErr } = await kreoonClient.auth.admin.updateUserById(existingUser.id, {
                password: tempPassword,
              });
              
              results.push({
                email,
                action: 'password_updated',
                success: !updateErr,
                error: updateErr?.message,
              });
            }
          } else {
            // Create new user in Kreoon
            const { data: newUser, error: createErr } = await kreoonClient.auth.admin.createUser({
              email,
              password: tempPassword,
              email_confirm: true, // Auto-confirm email
              user_metadata: user.user_metadata,
            });
            
            results.push({
              email,
              action: 'created',
              success: !createErr,
              newId: newUser?.user?.id,
              error: createErr?.message,
            });
            
            console.log(`User ${email}: ${createErr ? 'FAILED' : 'CREATED'}`);
          }
        } catch (err) {
          results.push({
            email,
            action: 'error',
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Also check for profiles in Kreoon DB that don't have auth accounts
      const { data: kreoonProfiles } = await kreoonClient.from('profiles').select('id, email, full_name');
      if (kreoonProfiles) {
        for (const profile of kreoonProfiles) {
          const email = profile.email?.toLowerCase();
          if (!email) continue;
          
          // Check if user already exists in Kreoon auth
          const existingKreoon = kreoonUsers.users.find(u => u.email?.toLowerCase() === email);
          if (!existingKreoon) {
            try {
              const { data: newUser, error: createErr } = await kreoonClient.auth.admin.createUser({
                email,
                password: tempPassword,
                email_confirm: true,
              });
              
              results.push({
                email,
                action: 'created_from_profile',
                success: !createErr,
                newId: newUser?.user?.id,
                error: createErr?.message,
              });
              
              console.log(`User ${email} created from profile: ${createErr ? 'FAILED' : 'SUCCESS'}`);
            } catch (err) {
              results.push({
                email,
                action: 'error',
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error',
              });
            }
          }
        }
      }

      const created = results.filter(r => r.action === 'created' && r.success).length;
      const createdFromProfile = results.filter(r => r.action === 'created_from_profile' && r.success).length;
      const updated = results.filter(r => r.action === 'password_updated' && r.success).length;
      const failed = results.filter(r => !r.success).length;

      return new Response(JSON.stringify({ 
        action: 'migrate_all_users',
        total_source: sourceUsers.users.length,
        created,
        created_from_profiles: createdFromProfile,
        updated,
        failed,
        temp_password: tempPassword,
        results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: set_all_passwords - Set same password for all existing Kreoon users
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

    return new Response(JSON.stringify({ error: 'Invalid action. Use: list_users, migrate_all_users, set_all_passwords' }), {
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
