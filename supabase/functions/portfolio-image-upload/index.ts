import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * portfolio-image-upload Edge Function
 *
 * Handles portfolio image uploads:
 * 1. Receives image as base64 and uploads to Bunny Storage (server-side, avoids CORS)
 * 2. Creates portfolio_items record using service_role (bypasses RLS)
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[portfolio-image-upload] No authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado - falta header de autorización' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract user from JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('[portfolio-image-upload] Missing Supabase env vars');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuración de Supabase incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('[portfolio-image-upload] User auth error:', userError?.message || 'No user');
      return new Response(
        JSON.stringify({ success: false, error: `Usuario no válido: ${userError?.message || 'sesión expirada'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[portfolio-image-upload] Authenticated user: ${user.id}`);

    // Parse request body
    const body = await req.json();
    const { creatorProfileId, title, category, fileName, fileExt, imageBase64, contentType: fileContentType } = body;

    if (!creatorProfileId) {
      return new Response(
        JSON.stringify({ success: false, error: 'creatorProfileId requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'imageBase64 requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for DB operations (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the creator profile belongs to this user
    const { data: profile, error: profileError } = await serviceClient
      .from('creator_profiles')
      .select('id, user_id')
      .eq('id', creatorProfileId)
      .single();

    if (profileError || !profile) {
      console.error('[portfolio-image-upload] Profile not found:', creatorProfileId, profileError?.message);
      return new Response(
        JSON.stringify({ success: false, error: `Perfil de creador no encontrado (ID: ${creatorProfileId})` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[portfolio-image-upload] Found profile for user: ${profile.user_id}`);

    if (profile.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'No tienes permiso para este perfil' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Bunny credentials
    const storageZone = Deno.env.get('BUNNY_STORAGE_ZONE');
    const storagePassword = Deno.env.get('BUNNY_STORAGE_PASSWORD');
    const storageHostname = Deno.env.get('BUNNY_STORAGE_HOSTNAME') || 'ny.storage.bunnycdn.com';
    const cdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME');

    if (!storageZone || !storagePassword) {
      const missing = [];
      if (!storageZone) missing.push('BUNNY_STORAGE_ZONE');
      if (!storagePassword) missing.push('BUNNY_STORAGE_PASSWORD');
      console.error('[portfolio-image-upload] Missing Bunny env vars:', missing.join(', '));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Configuración de Bunny Storage incompleta. Faltan: ${missing.join(', ')}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[portfolio-image-upload] Using storage zone: ${storageZone}, hostname: ${storageHostname}`);

    // Generate storage path
    const ext = fileExt || 'jpg';
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = `marketplace/portfolio/${creatorProfileId}/${uniqueSuffix}.${ext}`;

    const uploadUrl = `https://${storageHostname}/${storageZone}/${storagePath}`;
    const cdnUrl = cdnHostname
      ? `https://${cdnHostname}/${storagePath}`
      : `https://${storageZone}.b-cdn.net/${storagePath}`;

    // Decode base64 and upload to Bunny Storage (server-side)
    const binaryData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    console.log(`[portfolio-image-upload] Uploading ${binaryData.length} bytes to Bunny Storage`);

    const bunnyResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': storagePassword,
        'Content-Type': fileContentType || 'image/jpeg',
      },
      body: binaryData,
    });

    if (!bunnyResponse.ok) {
      const errorText = await bunnyResponse.text();
      console.error('[portfolio-image-upload] Bunny upload failed:', bunnyResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Error subiendo a CDN: ${bunnyResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[portfolio-image-upload] Image uploaded to Bunny: ${cdnUrl}`);

    // Get current max display_order
    const { data: existingItems } = await serviceClient
      .from('portfolio_items')
      .select('display_order')
      .eq('creator_id', creatorProfileId)
      .order('display_order', { ascending: false })
      .limit(1);

    const maxOrder = existingItems?.[0]?.display_order ?? -1;

    // Create portfolio item record using service role (bypasses RLS)
    const { data: portfolioItem, error: insertError } = await serviceClient
      .from('portfolio_items')
      .insert({
        creator_id: creatorProfileId,
        title: title || fileName?.replace(/\.[^.]+$/, '') || null,
        description: null,
        media_type: 'image',
        media_url: cdnUrl,
        thumbnail_url: cdnUrl,
        bunny_video_id: null,
        duration_seconds: null,
        aspect_ratio: '9:16',
        category: category || null,
        tags: [],
        brand_name: null,
        is_featured: false,
        is_public: true,
        display_order: maxOrder + 1,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('[portfolio-image-upload] Insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: `Error creando registro en DB: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[portfolio-image-upload] Created portfolio item ${portfolioItem.id} for creator ${creatorProfileId}, CDN URL: ${cdnUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        cdnUrl,
        storagePath,
        portfolioItem,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[portfolio-image-upload] Unhandled error:', error);
    const errMsg = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
