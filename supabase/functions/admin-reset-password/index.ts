import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req)
  }

  const corsHeaders = getCorsHeaders(req)

  try {
    // ============ JWT + ADMIN VALIDATION ============
    // SECURITY: This function can reset ANY user's password
    // Requires JWT authentication + admin role verification

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Validate JWT and get caller identity
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !userData?.user) {
      console.error('JWT validation failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerEmail = userData.user.email as string
    const callerId = userData.user.id

    // Check if caller is ROOT admin (from env) or has admin role
    const ROOT_EMAILS = Deno.env.get('ROOT_ADMIN_EMAILS')?.split(',').map(e => e.trim()) || []
    const isRootUser = ROOT_EMAILS.includes(callerEmail)

    if (!isRootUser) {
      // Check admin role in user_roles table
      const { data: adminRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', callerId)
        .eq('role', 'admin')
        .maybeSingle()

      if (!adminRole) {
        console.warn(`SECURITY: Unauthorized admin-reset-password attempt by ${callerEmail} (${callerId})`)
        return new Response(
          JSON.stringify({ error: 'Forbidden: Admin role required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log(`SECURITY: admin-reset-password authorized for ${callerEmail} (root: ${isRootUser})`)
    // ============ END JWT + ADMIN VALIDATION ============

    const { user_id, password } = await req.json()

    if (!user_id || !password) {
      return new Response(
        JSON.stringify({ error: 'user_id and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent admins from changing their own password via this endpoint
    // (they should use the normal password change flow)
    if (user_id === callerId) {
      return new Response(
        JSON.stringify({ error: 'Cannot reset your own password via admin endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password }
    )

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Password updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
