import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * This edge function handles user signup for organization registration.
 * It creates the user with email_confirm: true so users can sign in immediately.
 * This is specifically for the /auth/org/:slug registration flow.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use Kreoon as the primary database
    const kreoonUrl = Deno.env.get('KREOON_SUPABASE_URL');
    const kreoonServiceKey = Deno.env.get('KREOON_SERVICE_ROLE_KEY');
    
    if (!kreoonUrl || !kreoonServiceKey) {
      console.error("Kreoon credentials not configured");
      return new Response(JSON.stringify({ error: "Database credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(kreoonUrl, kreoonServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { email, password, fullName, organizationId, role, inviteCode, companyName } = body;

    if (!email || !password || !fullName || !organizationId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify organization exists and is open for registration
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, is_registration_open, registration_require_invite, default_role')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      console.error("Organization not found:", orgError);
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!org.is_registration_open) {
      return new Response(JSON.stringify({ error: "Registration is closed for this organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify invite code if required
    if (org.registration_require_invite) {
      if (!inviteCode) {
        return new Response(JSON.stringify({ error: "Invite code required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: invite, error: inviteError } = await supabaseAdmin
        .from('organization_invites')
        .select('id, used_at, expires_at, max_uses, use_count')
        .eq('organization_id', organizationId)
        .eq('code', inviteCode)
        .single();

      if (inviteError || !invite) {
        return new Response(JSON.stringify({ error: "Invalid invite code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Check if expired
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Invite code has expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Check if max uses reached
      if (invite.max_uses && invite.use_count >= invite.max_uses) {
        return new Response(JSON.stringify({ error: "Invite code has reached maximum uses" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Create user with email_confirm: true (auto-verified)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // This is the key - auto confirm email
      user_metadata: { full_name: fullName }
    });

    if (authError) {
      console.error("Error creating user:", authError);
      
      // Check if user already exists
      if (authError.message?.includes('already') || authError.message?.includes('exists')) {
        return new Response(JSON.stringify({ error: "already_exists", message: "Este correo ya está registrado. Intenta iniciar sesión." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userId = authData.user.id;

    // Create or update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        current_organization_id: organizationId,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error("Error creating profile:", profileError);
    }

    // Add user to organization
    const userRole = role || org.default_role || 'client';
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role: userRole,
      });

    if (memberError) {
      console.error("Error adding to organization:", memberError);
    }

    // Add role to organization_member_roles
    const { error: roleError } = await supabaseAdmin
      .from('organization_member_roles')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role: userRole,
      });

    if (roleError) {
      console.error("Error adding role:", roleError);
    }

    // If client role and company name provided, create client record
    if (userRole === 'client' && companyName) {
      const { data: clientData, error: clientError } = await supabaseAdmin
        .from('clients')
        .insert({
          name: companyName,
          user_id: userId,
          contact_email: email,
          created_by: userId,
          organization_id: organizationId,
        })
        .select('id')
        .single();

      if (clientError) {
        console.error("Error creating client:", clientError);
      } else if (clientData) {
        // Add to client_users
        await supabaseAdmin
          .from('client_users')
          .insert({
            client_id: clientData.id,
            user_id: userId,
            role: 'owner',
            created_by: userId,
          });
      }
    }

    // Update invite usage if applicable
    if (org.registration_require_invite && inviteCode) {
      await supabaseAdmin
        .from('organization_invites')
        .update({ use_count: supabaseAdmin.rpc('increment_use_count') })
        .eq('organization_id', organizationId)
        .eq('code', inviteCode);
    }

    console.log(`User ${email} created and added to organization ${org.name}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      userId,
      message: "Cuenta creada exitosamente. Ya puedes iniciar sesión."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Error in org-confirm-signup:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
