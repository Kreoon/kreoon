import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verificar usuario
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('[portfolio-item-delete] Auth error:', userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Sesión inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { itemId } = body;

    if (!itemId) {
      return new Response(
        JSON.stringify({ success: false, error: 'itemId requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener el item y verificar propiedad
    const { data: item, error: itemError } = await serviceClient
      .from('portfolio_items')
      .select('id, creator_id, media_type, media_url, bunny_video_id')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      console.error('[portfolio-item-delete] Item not found:', itemId);
      return new Response(
        JSON.stringify({ success: false, error: 'Item no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el usuario es dueño del creator_profile
    const { data: profile } = await serviceClient
      .from('creator_profiles')
      .select('id, user_id')
      .eq('id', item.creator_id)
      .single();

    // Verificar si es platform admin
    const { data: isAdmin } = await serviceClient.rpc('is_platform_admin_for_user', { _user_id: user.id });

    const isOwner = profile?.user_id === user.id;

    if (!isOwner && !isAdmin) {
      console.error('[portfolio-item-delete] Permission denied. User:', user.id, 'Profile owner:', profile?.user_id);
      return new Response(
        JSON.stringify({ success: false, error: 'No tienes permiso para eliminar este item' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Eliminar el item usando service_role
    const { error: deleteError } = await serviceClient
      .from('portfolio_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      console.error('[portfolio-item-delete] Delete error:', deleteError);
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[portfolio-item-delete] Deleted item ${itemId} by user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted: itemId,
        media_type: item.media_type,
        bunny_video_id: item.bunny_video_id,
        media_url: item.media_url
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[portfolio-item-delete] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
