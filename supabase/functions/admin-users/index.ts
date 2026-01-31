import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ROOT_EMAIL = "jacsolucionesgraficas@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use native Supabase env vars when deployed to Kreoon directly
    // Falls back to KREOON_* vars for backwards compatibility
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('KREOON_SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('KREOON_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa2JxY3J4d3NtdnR4bXFnaXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDQwNTYsImV4cCI6MjA4NTAyMDA1Nn0.BorqcEBToDVeFBDQktZoCjCndYwB0bc6jlKmSJn-Wi8';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Database credentials not configured");
      return new Response(JSON.stringify({ error: "Database credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify the caller is the root user
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

    // Create a client with the user's token to get their identity
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the user from auth
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Invalid or expired token - please log in again" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const callerEmail = userData.user.email as string;
    const callerId = userData.user.id as string;

    // Check if caller is the root user
    if (callerEmail !== ROOT_EMAIL) {
      console.warn(`Unauthorized access attempt by ${callerEmail}`);
      return new Response(JSON.stringify({ error: "Unauthorized - Root access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Admin action authorized for ${callerEmail}`);

    const body = await req.json();
    const { action, userId, email, role, clientId, contentId, conversationId, productId, notificationId, postId, referralId } = body;
    console.log(`Admin action: ${action} by ${callerEmail}`);

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

        // Check if root user is missing from auth.users but exists in profiles
        if (!authUserEmails.has(ROOT_EMAIL.toLowerCase())) {
          const rootProfile = profiles?.find(p => p.email?.toLowerCase() === ROOT_EMAIL.toLowerCase());
          if (rootProfile) {
            const rootRoles = userRoles?.filter(r => r.user_id === rootProfile.id).map(r => r.role) || [];
            users.unshift({
              id: rootProfile.id,
              email: rootProfile.email || ROOT_EMAIL,
              full_name: rootProfile.full_name || "Root Admin",
              avatar_url: rootProfile.avatar_url,
              roles: rootRoles.length > 0 ? rootRoles : ['admin'],
              created_at: rootProfile.created_at,
              last_sign_in_at: undefined,
              email_confirmed_at: rootProfile.created_at,
              banned: false
            });
            console.log(`Added root user from profiles: ${ROOT_EMAIL}`);
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

      case "delete_user": {
        if (!userId) {
          return new Response(JSON.stringify({ error: "User ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Don't allow deleting the root user
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userData?.user?.email === ROOT_EMAIL) {
          return new Response(JSON.stringify({ error: "Cannot delete root user" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw error;
        
        console.log(`User ${userId} deleted`);
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
    console.error("Admin users error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
