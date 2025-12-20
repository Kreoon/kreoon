import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROOT_EMAIL = "jacsolucionesgraficas@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the caller is the root user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if caller is the root user
    if (caller.email !== ROOT_EMAIL) {
      console.warn(`Unauthorized access attempt by ${caller.email}`);
      return new Response(JSON.stringify({ error: "Unauthorized - Root access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { action, userId, email, role } = await req.json();
    console.log(`Admin action: ${action} by ${caller.email}`);

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

        const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: `${req.headers.get("origin") || "https://app.ugccolombia.co"}/auth`
          }
        });

        if (resetError) {
          console.error("Error sending reset:", resetError);
          throw resetError;
        }

        console.log(`Password reset sent to ${email}`);
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
