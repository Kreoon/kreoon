import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// Platform root emails that have full admin access
const ROOT_EMAILS = (Deno.env.get("ROOT_ADMIN_EMAILS") || "jacsolucionesgraficas@gmail.com,kairosgp.sas@gmail.com").split(",").map(e => e.trim());

// Actions that require ROOT access (destructive operations)
const ROOT_ONLY_ACTIONS = [
  "delete_user",
  "delete_client",
  "delete_content",
  "delete_conversation",
  "delete_product",
  "delete_notification",
  "delete_portfolio_post",
  "delete_referral"
];

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const corsHeaders = getCorsHeaders(req);

  try {
    // Use native Supabase env vars when deployed to Kreoon directly
    // Falls back to KREOON_* vars for backwards compatibility
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('KREOON_SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('KREOON_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Database credentials not configured");
      return new Response(JSON.stringify({ error: "Database credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify the caller has authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Extract JWT token and verify using admin client (more reliable than anonKey)
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Invalid or expired token - please log in again" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const callerEmail = userData.user.email as string;
    const callerId = userData.user.id as string;

    // Check if caller is a root user
    const isRootUser = ROOT_EMAILS.includes(callerEmail);

    // Check if caller has admin role in user_roles table
    let isPlatformAdmin = isRootUser;
    if (!isRootUser) {
      const { data: adminRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("role", "admin")
        .maybeSingle();

      isPlatformAdmin = !!adminRole;
    }

    // Parse body to get action
    const body = await req.json();
    const { action, userId, email, role, clientId, contentId, conversationId, productId, notificationId, postId, referralId } = body;

    console.log(`[admin-users] Action: ${action}, Caller: ${callerEmail}, isRoot: ${isRootUser}, Target userId: ${userId || 'N/A'}`);


    // Check authorization based on action type
    if (ROOT_ONLY_ACTIONS.includes(action)) {
      // Destructive actions require ROOT access
      if (!isRootUser) {
        console.warn(`Unauthorized ROOT action attempt by ${callerEmail}: ${action}`);
        return new Response(JSON.stringify({ error: "Unauthorized - Root access required for this action" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } else {
      // Non-destructive actions require platform admin OR root
      if (!isPlatformAdmin) {
        console.warn(`Unauthorized admin access attempt by ${callerEmail}: ${action}`);
        return new Response(JSON.stringify({ error: "Unauthorized - Platform admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    console.log(`Admin action authorized for ${callerEmail} (root: ${isRootUser}, admin: ${isPlatformAdmin}): ${action}`);

    switch (action) {
      case "list_users": {
        // Get all users from auth
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error("Error listing users:", listError);
          throw listError;
        }

        // Get profiles and roles
        const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
        const { data: userRoles } = await supabaseAdmin.from("user_roles").select("*");

        // Build list of auth user emails to check for missing root
        const authUserEmails = new Set(authUsers.users.map(u => u.email?.toLowerCase()));

        const users = authUsers.users.map(u => {
          const profile = profiles?.find(p => p.id === u.id);
          const roles = userRoles?.filter(r => r.user_id === u.id).map(r => r.role) || [];
          const userAny = u as any;
          return {
            id: u.id,
            email: u.email,
            full_name: profile?.full_name || u.user_metadata?.full_name || "Sin nombre",
            avatar_url: profile?.avatar_url,
            roles,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            email_confirmed_at: u.email_confirmed_at,
            banned: userAny.banned_until ? new Date(userAny.banned_until) > new Date() : false
          };
        });

        // Check if any root users are missing from auth.users but exist in profiles
        for (const rootEmail of ROOT_EMAILS) {
          if (!authUserEmails.has(rootEmail.toLowerCase())) {
            const rootProfile = profiles?.find(p => p.email?.toLowerCase() === rootEmail.toLowerCase());
            if (rootProfile) {
              const rootRoles = userRoles?.filter(r => r.user_id === rootProfile.id).map(r => r.role) || [];
              users.unshift({
                id: rootProfile.id,
                email: rootProfile.email || rootEmail,
                full_name: rootProfile.full_name || "Root Admin",
                avatar_url: rootProfile.avatar_url,
                roles: rootRoles.length > 0 ? rootRoles : ['admin'],
                created_at: rootProfile.created_at,
                last_sign_in_at: undefined,
                email_confirmed_at: rootProfile.created_at,
                banned: false
              });
              console.log(`Added root user from profiles: ${rootEmail}`);
            }
          }
        }

        return new Response(JSON.stringify({ users }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "send_password_reset": {
        if (!email) {
          return new Response(JSON.stringify({ error: "Email required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Always redirect password recovery to the primary domain.
        const redirectTo = 'https://kreoon.com/reset-password';

        // Generate link; if user does not exist in auth yet, create it and retry.
        let resetError: any = null;
        {
          const res = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: { redirectTo },
          });
          resetError = res.error;
        }

        if (resetError) {
          const msg = String(resetError.message || resetError);
          const isNotFound = /user\s*not\s*found|not\s*found|no\s*user/i.test(msg);
          if (isNotFound) {
            const tempPassword = crypto.randomUUID();
            const { error: createError } = await supabaseAdmin.auth.admin.createUser({
              email,
              password: tempPassword,
              email_confirm: true,
            });
            if (createError) throw createError;

            const { error: retryError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email,
              options: { redirectTo },
            });
            if (retryError) throw retryError;
          } else {
            console.error('Error sending reset:', resetError);
            throw resetError;
          }
        }

        console.log(`Password reset sent to ${email}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "set_password": {
        // Directly set a password for a user (bypasses email rate limits)
        const { password: newPassword } = body;
        if (!email || !newPassword) {
          return new Response(JSON.stringify({ error: "Email and password required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Find user by email
        const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (listErr) throw listErr;

        const targetUser = users.users.find(u => u.email === email);
        if (!targetUser) {
          return new Response(JSON.stringify({ error: "User not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
          password: newPassword,
        });
        if (updateErr) throw updateErr;

        console.log(`Password set for ${email}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "toggle_ban": {
        if (!userId) {
          return new Response(JSON.stringify({ error: "User ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Get current user status
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        const userAny = userData?.user as any;
        const isBanned = userAny?.banned_until && new Date(userAny.banned_until) > new Date();

        if (isBanned) {
          // Unban
          const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: "none"
          });
          if (error) throw error;
          console.log(`User ${userId} unbanned`);
        } else {
          // Ban for 100 years (effectively permanent)
          const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: "876000h" // ~100 years
          });
          if (error) throw error;
          console.log(`User ${userId} banned`);
        }

        return new Response(JSON.stringify({ success: true, banned: !isBanned }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "update_role": {
        if (!userId || !role) {
          return new Response(JSON.stringify({ error: "User ID and role required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Check if role already exists
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("*")
          .eq("user_id", userId)
          .eq("role", role)
          .single();

        if (existingRole) {
          // Remove role
          const { error } = await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .eq("role", role);
          
          if (error) throw error;
          console.log(`Role ${role} removed from user ${userId}`);
          return new Response(JSON.stringify({ success: true, added: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } else {
          // Add role
          const { error } = await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: userId, role });
          
          if (error) throw error;
          console.log(`Role ${role} added to user ${userId}`);
          return new Response(JSON.stringify({ success: true, added: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      case "set_active_role": {
        // Set active_role on profile + organization_members + organization_member_roles
        // activeRole can be null to clear the role
        const { activeRole } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: "User ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 1. Update profiles.active_role (null clears it)
        const { error: roleUpdateError } = await supabaseAdmin
          .from("profiles")
          .update({ active_role: activeRole || null })
          .eq("id", userId);
        if (roleUpdateError) throw roleUpdateError;

        // 2. Get org memberships
        const { data: memberships } = await supabaseAdmin
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", userId);

        if (activeRole) {
          // Setting a role: update org_members + upsert org_member_roles
          const { error: omError } = await supabaseAdmin
            .from("organization_members")
            .update({ role: activeRole })
            .eq("user_id", userId);
          if (omError) console.error("Error updating organization_members:", omError);

          if (memberships && memberships.length > 0) {
            for (const m of memberships) {
              await supabaseAdmin
                .from("organization_member_roles")
                .delete()
                .eq("user_id", userId)
                .eq("organization_id", m.organization_id);

              await supabaseAdmin
                .from("organization_member_roles")
                .insert({
                  user_id: userId,
                  organization_id: m.organization_id,
                  role: activeRole,
                });
            }
          }
        } else {
          // Clearing role: remove from org_member_roles, reset org_members.role to default
          // org_members.role is NOT NULL DEFAULT 'creator' so we keep default
          if (memberships && memberships.length > 0) {
            for (const m of memberships) {
              await supabaseAdmin
                .from("organization_member_roles")
                .delete()
                .eq("user_id", userId)
                .eq("organization_id", m.organization_id);
            }
          }
        }

        console.log(`Active role ${activeRole ? `set to ${activeRole}` : 'cleared'} for user ${userId}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "delete_user": {
        if (!userId) {
          return new Response(JSON.stringify({ error: "User ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        console.log(`[delete_user] Starting deletion of user ${userId}`);

        // Don't allow deleting any root user
        const { data: targetUserData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (getUserError) {
          console.error(`[delete_user] Error getting user: ${getUserError.message}`);
          // Continue anyway - user might not exist in auth but exists in profiles
        }

        if (targetUserData?.user?.email && ROOT_EMAILS.includes(targetUserData.user.email)) {
          return new Response(JSON.stringify({ error: "Cannot delete root user" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Clean up all related data before deleting auth user
        // Using a helper to log errors but continue
        const cleanupTable = async (table: string, column: string, value: string, operation: 'delete' | 'nullify' = 'delete') => {
          try {
            if (operation === 'delete') {
              const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
              if (error) console.warn(`[delete_user] Cleanup ${table}.${column}: ${error.message}`);
            } else {
              const { error } = await supabaseAdmin.from(table).update({ [column]: null }).eq(column, value);
              if (error) console.warn(`[delete_user] Nullify ${table}.${column}: ${error.message}`);
            }
          } catch (e) {
            console.warn(`[delete_user] Failed cleanup ${table}.${column}: ${e}`);
          }
        };

        console.log(`[delete_user] Cleaning up related data for user ${userId}`);

        // ─── Partner communities ───
        await cleanupTable("partner_community_memberships", "user_id", userId);

        // ─── Organization tables ───
        await cleanupTable("organization_member_badges", "user_id", userId);
        await cleanupTable("organization_member_roles", "user_id", userId);
        await cleanupTable("organization_members", "user_id", userId);
        await cleanupTable("user_roles", "user_id", userId);

        // ─── Client tables ───
        await cleanupTable("client_users", "user_id", userId);

        // ─── Notifications ───
        await cleanupTable("notifications", "user_id", userId);

        // ─── Chat ───
        await cleanupTable("chat_participants", "user_id", userId);
        await cleanupTable("chat_messages", "sender_id", userId);

        // ─── Content (nullify, don't delete) ───
        await cleanupTable("content", "creator_id", userId, 'nullify');
        await cleanupTable("content", "editor_id", userId, 'nullify');
        await cleanupTable("content", "script_approved_by", userId, 'nullify');
        await cleanupTable("content", "approved_by", userId, 'nullify');
        await cleanupTable("content_comments", "user_id", userId);
        await cleanupTable("content_history", "user_id", userId);
        await cleanupTable("content_likes", "user_id", userId);
        await cleanupTable("content_collaborators", "user_id", userId);

        // ─── Portfolio ───
        await cleanupTable("portfolio_posts", "user_id", userId);
        await cleanupTable("portfolio_items", "user_id", userId);

        // ─── Creator/Marketplace ───
        await cleanupTable("creator_services", "user_id", userId);
        await cleanupTable("creator_profiles", "user_id", userId);
        await cleanupTable("saved_creators", "user_id", userId);
        await cleanupTable("campaign_applications", "creator_id", userId);
        await cleanupTable("marketplace_projects", "creator_id", userId, 'nullify');
        await cleanupTable("marketplace_projects", "editor_id", userId, 'nullify');
        await cleanupTable("project_deliveries", "creator_id", userId, 'nullify');
        await cleanupTable("creator_reviews", "reviewer_id", userId, 'nullify');

        // ─── Referrals ───
        await cleanupTable("referrals", "referrer_id", userId);
        await cleanupTable("referrals", "referred_user_id", userId, 'nullify');
        await cleanupTable("referral_commissions", "referrer_id", userId);

        // ─── Unified Finance ───
        await cleanupTable("unified_wallets", "user_id", userId);
        await cleanupTable("unified_transactions", "user_id", userId);
        await cleanupTable("ai_token_balances", "user_id", userId);
        await cleanupTable("withdrawal_requests", "user_id", userId);
        await cleanupTable("referral_relationships", "referrer_id", userId);
        await cleanupTable("referral_relationships", "referred_id", userId);
        await cleanupTable("referral_codes", "user_id", userId);
        await cleanupTable("referral_earnings", "referrer_id", userId);

        // ─── Reputation ───
        await cleanupTable("reputation_events", "user_id", userId);
        await cleanupTable("user_reputation_totals", "user_id", userId);
        await cleanupTable("marketplace_reputation", "user_id", userId);

        // ─── CRM ───
        await cleanupTable("platform_crm_leads", "converted_user_id", userId, 'nullify');
        await cleanupTable("platform_crm_leads", "assigned_to", userId, 'nullify');
        await cleanupTable("platform_crm_activities", "performed_by", userId, 'nullify');
        await cleanupTable("platform_user_health", "user_id", userId);

        // ─── Followers ───
        await cleanupTable("user_followers", "follower_id", userId);
        await cleanupTable("user_followers", "followed_id", userId);

        // ─── Brands ───
        await cleanupTable("brand_members", "user_id", userId);
        await cleanupTable("brands", "owner_id", userId, 'nullify');

        // ─── Finally delete profile ───
        await cleanupTable("profiles", "id", userId);

        console.log(`[delete_user] Using SQL cascade function to delete user and all related data`);

        // Use the robust SQL function that handles all FK constraints
        const { data: deleteResult, error: rpcError } = await supabaseAdmin.rpc('admin_delete_user_cascade', {
          target_user_id: userId
        });

        if (rpcError) {
          console.error(`[delete_user] RPC error: ${rpcError.message}`);
          throw new Error(`Failed to delete user: ${rpcError.message}`);
        }

        if (deleteResult && !deleteResult.success) {
          console.error(`[delete_user] Cascade delete failed: ${deleteResult.error}`);
          throw new Error(`Failed to delete user: ${deleteResult.error}`);
        }

        console.log(`[delete_user] User ${userId} deleted successfully. Tables cleaned: ${deleteResult?.deleted_from?.join(', ')}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "create_profile": {
        // Create profile for a user who doesn't have one (trigger failed)
        const { fullName, organizationId: profileOrgId } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: "User ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Get user info from auth
        const { data: authUserData, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authUserErr) {
          console.error("Error getting auth user for create_profile:", authUserErr);
          throw authUserErr;
        }

        const userEmail = authUserData.user.email || email || '';
        const userName = fullName
          || authUserData.user.user_metadata?.full_name
          || authUserData.user.user_metadata?.name
          || userEmail.split('@')[0]
          || 'Usuario';

        // Use UPSERT - creates if not exists, updates if exists
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: userId,
            email: userEmail,
            full_name: userName,
            is_active: true,
            current_organization_id: profileOrgId || null,
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (profileError) {
          console.error("Error upserting profile:", profileError);
          throw profileError;
        }

        console.log(`Profile created/updated for user ${userId} (${userEmail})`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "assign_to_org": {
        // Assign a user to an organization with a specific role
        const { organizationId, assignRole, makeOwner: assignOwner } = body;
        console.log("assign_to_org params:", { userId, organizationId, assignRole });

        if (!userId || !organizationId) {
          console.error("Missing params:", { userId: !!userId, organizationId: !!organizationId });
          return new Response(JSON.stringify({
            error: `Missing required params: ${!userId ? 'userId ' : ''}${!organizationId ? 'organizationId' : ''}`.trim()
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Get user info from auth
        const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authUserError) {
          console.error("Error getting auth user:", authUserError);
          throw authUserError;
        }

        const userEmail = authUser.user.email || '';
        const fullName = authUser.user.user_metadata?.full_name
          || authUser.user.user_metadata?.name
          || userEmail.split('@')[0]
          || 'Usuario';
        // GUARD: Never assign 'ambassador' as active_role - it's a badge, not a functional role
        const functionalRoles = ['admin', 'team_leader', 'strategist', 'trafficker', 'creator', 'editor', 'client'];
        const roleToAssign = (assignRole && functionalRoles.includes(assignRole)) ? assignRole : 'creator';

        console.log(`Assigning user ${userId} (${userEmail}) to org ${organizationId} with role ${roleToAssign || '(owner only)'}`);

        // Use UPSERT for profile - creates if not exists, updates if exists
        const profileData: Record<string, unknown> = {
          id: userId,
          email: userEmail,
          full_name: fullName,
          current_organization_id: organizationId,
          is_active: true,
        };
        if (roleToAssign) {
          profileData.active_role = roleToAssign;
        }

        const { error: upsertError } = await supabaseAdmin
          .from("profiles")
          .upsert(profileData, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error("Error upserting profile:", JSON.stringify(upsertError));
          throw new Error(`Failed to upsert profile: ${upsertError.message}`);
        }

        // Remove from all previous organizations
        await supabaseAdmin
          .from("organization_members")
          .delete()
          .eq("user_id", userId);

        await supabaseAdmin
          .from("organization_member_roles")
          .delete()
          .eq("user_id", userId);

        // Insert new membership
        // organization_members.role is NOT NULL DEFAULT 'creator',
        // so we only include role if one was explicitly chosen
        const memberData: Record<string, unknown> = {
          organization_id: organizationId,
          user_id: userId,
          is_owner: !!assignOwner,
        };
        if (roleToAssign) {
          memberData.role = roleToAssign;
        }

        const { error: memberError } = await supabaseAdmin
          .from("organization_members")
          .insert(memberData);

        if (memberError) {
          console.error("Error inserting organization member:", memberError);
          throw memberError;
        }

        // Insert role mapping only if a role was specified
        if (roleToAssign) {
          const { error: roleError } = await supabaseAdmin
            .from("organization_member_roles")
            .insert({
              organization_id: organizationId,
              user_id: userId,
              role: roleToAssign,
            });

          if (roleError) {
            console.error("Error inserting organization member role:", roleError);
            // Don't throw - membership was created
          }
        }

        console.log(`User ${userId} assigned to org ${organizationId}${roleToAssign ? ` with role ${roleToAssign}` : ' as owner (no role)'}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "set_owner": {
        // Toggle is_owner on organization_members for a user
        const { organizationId: ownerOrgId, makeOwner } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: "User ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Find the user's org membership (use provided orgId or look it up)
        let targetOrgId = ownerOrgId;
        if (!targetOrgId) {
          const { data: membership } = await supabaseAdmin
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();

          if (!membership) {
            return new Response(JSON.stringify({ error: "User is not a member of any organization" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          targetOrgId = membership.organization_id;
        }

        const setOwner = makeOwner !== false; // default to true

        // If making owner, optionally remove is_owner from all other members in that org
        // (allow multiple owners - the UI toggle is per-user)

        const { error: ownerError } = await supabaseAdmin
          .from("organization_members")
          .update({ is_owner: setOwner })
          .eq("user_id", userId)
          .eq("organization_id", targetOrgId);

        if (ownerError) {
          console.error("Error setting owner:", ownerError);
          throw ownerError;
        }

        console.log(`User ${userId} is_owner set to ${setOwner} in org ${targetOrgId}`);
        return new Response(JSON.stringify({ success: true, is_owner: setOwner }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "remove_from_org": {
        // Remove a user from their current organization
        if (!userId) {
          return new Response(JSON.stringify({ error: "User ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Remove from organization_members
        await supabaseAdmin
          .from("organization_members")
          .delete()
          .eq("user_id", userId);

        // Remove from organization_member_roles
        await supabaseAdmin
          .from("organization_member_roles")
          .delete()
          .eq("user_id", userId);

        // Clear current org in profile
        await supabaseAdmin
          .from("profiles")
          .update({ current_organization_id: null })
          .eq("id", userId);

        console.log(`User ${userId} removed from all organizations`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // ============ ROOT DELETE ANY ENTITY ============
      
      case "delete_client": {
        if (!clientId) {
          return new Response(JSON.stringify({ error: "Client ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Delete related data first
        await supabaseAdmin.from("products").delete().eq("client_id", clientId);
        await supabaseAdmin.from("client_packages").delete().eq("client_id", clientId);
        await supabaseAdmin.from("content").update({ client_id: null }).eq("client_id", clientId);
        
        const { error } = await supabaseAdmin.from("clients").delete().eq("id", clientId);
        if (error) throw error;
        
        console.log(`Client ${clientId} deleted by root`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "delete_content": {
        if (!contentId) {
          return new Response(JSON.stringify({ error: "Content ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Delete related data
        await supabaseAdmin.from("content_comments").delete().eq("content_id", contentId);
        await supabaseAdmin.from("content_history").delete().eq("content_id", contentId);
        await supabaseAdmin.from("content_likes").delete().eq("content_id", contentId);
        await supabaseAdmin.from("content_collaborators").delete().eq("content_id", contentId);
        await supabaseAdmin.from("chat_conversations").update({ content_id: null }).eq("content_id", contentId);
        
        const { error } = await supabaseAdmin.from("content").delete().eq("id", contentId);
        if (error) throw error;
        
        console.log(`Content ${contentId} deleted by root`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "delete_conversation": {
        if (!conversationId) {
          return new Response(JSON.stringify({ error: "Conversation ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Delete messages and participants first
        await supabaseAdmin.from("chat_messages").delete().eq("conversation_id", conversationId);
        await supabaseAdmin.from("chat_participants").delete().eq("conversation_id", conversationId);
        
        const { error } = await supabaseAdmin.from("chat_conversations").delete().eq("id", conversationId);
        if (error) throw error;
        
        console.log(`Conversation ${conversationId} deleted by root`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "delete_product": {
        if (!productId) {
          return new Response(JSON.stringify({ error: "Product ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        await supabaseAdmin.from("content").update({ product_id: null }).eq("product_id", productId);
        
        const { error } = await supabaseAdmin.from("products").delete().eq("id", productId);
        if (error) throw error;
        
        console.log(`Product ${productId} deleted by root`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "delete_notification": {
        if (!notificationId) {
          return new Response(JSON.stringify({ error: "Notification ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const { error } = await supabaseAdmin.from("notifications").delete().eq("id", notificationId);
        if (error) throw error;
        
        console.log(`Notification ${notificationId} deleted by root`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "delete_portfolio_post": {
        if (!postId) {
          return new Response(JSON.stringify({ error: "Post ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const { error } = await supabaseAdmin.from("portfolio_posts").delete().eq("id", postId);
        if (error) throw error;
        
        console.log(`Portfolio post ${postId} deleted by root`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "delete_referral": {
        if (!referralId) {
          return new Response(JSON.stringify({ error: "Referral ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        await supabaseAdmin.from("referral_commissions").delete().eq("referral_id", referralId);
        
        const { error } = await supabaseAdmin.from("referrals").delete().eq("id", referralId);
        if (error) throw error;
        
        console.log(`Referral ${referralId} deleted by root`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "link_to_company": {
        // Link a user to a company via client_users
        if (!userId || !clientId) {
          return new Response(JSON.stringify({ error: "User ID and Client ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Check if already linked
        const { data: existingLink } = await supabaseAdmin
          .from("client_users")
          .select("id")
          .eq("user_id", userId)
          .eq("client_id", clientId)
          .maybeSingle();

        if (existingLink) {
          return new Response(JSON.stringify({ error: "User is already linked to this company" }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const { error: linkError } = await supabaseAdmin
          .from("client_users")
          .insert({ user_id: userId, client_id: clientId, role: "viewer" });

        if (linkError) {
          console.error("Error linking user to company:", linkError);
          throw linkError;
        }

        console.log(`User ${userId} linked to company ${clientId}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "unlink_from_company": {
        // Remove a user from a company via client_users
        if (!userId || !clientId) {
          return new Response(JSON.stringify({ error: "User ID and Client ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const { error: unlinkError } = await supabaseAdmin
          .from("client_users")
          .delete()
          .eq("user_id", userId)
          .eq("client_id", clientId);

        if (unlinkError) {
          console.error("Error unlinking user from company:", unlinkError);
          throw unlinkError;
        }

        console.log(`User ${userId} unlinked from company ${clientId}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "list_all_entities": {
        // Get counts of all entities for the admin dashboard
        const [clients, content, conversations, products, notifications, portfolioPosts, referrals] = await Promise.all([
          supabaseAdmin.from("clients").select("id, name, user_id, created_at").order("created_at", { ascending: false }),
          supabaseAdmin.from("content").select("id, title, client_id, creator_id, status, created_at").order("created_at", { ascending: false }),
          supabaseAdmin.from("chat_conversations").select("id, name, is_group, created_at, created_by").order("created_at", { ascending: false }),
          supabaseAdmin.from("products").select("id, name, client_id, created_at").order("created_at", { ascending: false }),
          supabaseAdmin.from("notifications").select("id, title, user_id, type, created_at").order("created_at", { ascending: false }).limit(100),
          supabaseAdmin.from("portfolio_posts").select("id, user_id, media_type, created_at").order("created_at", { ascending: false }),
          supabaseAdmin.from("referrals").select("id, referrer_id, referred_email, status, created_at").order("created_at", { ascending: false }),
        ]);

        return new Response(JSON.stringify({
          clients: clients.data || [],
          content: content.data || [],
          conversations: conversations.data || [],
          products: products.data || [],
          notifications: notifications.data || [],
          portfolioPosts: portfolioPosts.data || [],
          referrals: referrals.data || [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Admin users error:", errorMessage);
    if (errorStack) console.error("Stack:", errorStack);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
