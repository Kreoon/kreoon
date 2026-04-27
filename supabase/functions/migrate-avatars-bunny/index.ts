import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_STORAGE_HOST = 'wjkbqcrxwsmvtxmqgiqc.supabase.co';

interface MigrationResult {
  userId: string;
  oldUrl: string;
  newUrl: string | null;
  success: boolean;
  error?: string;
}

/**
 * Migra avatares de Supabase Storage a Bunny CDN
 * 1. Consulta profiles y creator_profiles con avatar_url de Supabase
 * 2. Descarga cada avatar
 * 3. Lo sube a Bunny Storage
 * 4. Actualiza las URLs en la base de datos
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const storageZone = Deno.env.get('BUNNY_STORAGE_ZONE');
    const storagePassword = Deno.env.get('BUNNY_STORAGE_PASSWORD');
    const storageHostname = Deno.env.get('BUNNY_STORAGE_HOSTNAME') || 'ny.storage.bunnycdn.com';
    const cdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!storageZone || !storagePassword) {
      return new Response(
        JSON.stringify({ error: 'Missing Bunny Storage credentials (BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar perfiles con avatar_url de Supabase Storage
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .not('avatar_url', 'is', null)
      .like('avatar_url', `%${SUPABASE_STORAGE_HOST}%`);

    if (profilesError) {
      console.error('[migrate-avatars] Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: `Error fetching profiles: ${profilesError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[migrate-avatars] Found ${profiles?.length || 0} profiles with Supabase avatars`);

    const results: MigrationResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const profile of profiles || []) {
      const oldUrl = profile.avatar_url;
      if (!oldUrl) continue;

      try {
        console.log(`[migrate-avatars] Processing profile ${profile.id}: ${oldUrl}`);

        // Descargar la imagen de Supabase
        const imageResponse = await fetch(oldUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download: ${imageResponse.status}`);
        }

        const imageData = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

        // Determinar extensión
        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('gif')) ext = 'gif';

        // Generar path en Bunny Storage
        const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const storagePath = `avatars/${profile.id}/${uniqueSuffix}.${ext}`;

        const uploadUrl = `https://${storageHostname}/${storageZone}/${storagePath}`;
        const newCdnUrl = cdnHostname
          ? `https://${cdnHostname}/${storagePath}`
          : `https://${storageZone}.b-cdn.net/${storagePath}`;

        console.log(`[migrate-avatars] Uploading to Bunny: ${uploadUrl}`);

        // Subir a Bunny Storage
        const bunnyResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'AccessKey': storagePassword,
            'Content-Type': contentType,
          },
          body: imageData,
        });

        if (!bunnyResponse.ok) {
          const errorText = await bunnyResponse.text();
          throw new Error(`Bunny upload failed: ${bunnyResponse.status} - ${errorText}`);
        }

        console.log(`[migrate-avatars] Uploaded to Bunny: ${newCdnUrl}`);

        // Actualizar URL en profiles
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ avatar_url: newCdnUrl })
          .eq('id', profile.id);

        if (updateProfileError) {
          console.error(`[migrate-avatars] Error updating profile ${profile.id}:`, updateProfileError);
        }

        // También actualizar en creator_profiles si existe
        const { error: updateCreatorError } = await supabase
          .from('creator_profiles')
          .update({ avatar_url: newCdnUrl })
          .eq('user_id', profile.id);

        if (updateCreatorError && updateCreatorError.code !== 'PGRST116') {
          console.error(`[migrate-avatars] Error updating creator_profile for ${profile.id}:`, updateCreatorError);
        }

        results.push({
          userId: profile.id,
          oldUrl,
          newUrl: newCdnUrl,
          success: true,
        });
        successCount++;

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[migrate-avatars] Error migrating avatar for ${profile.id}:`, errorMsg);
        results.push({
          userId: profile.id,
          oldUrl,
          newUrl: null,
          success: false,
          error: errorMsg,
        });
        errorCount++;
      }
    }

    // También buscar creator_profiles que tengan avatar de Supabase pero no estén en profiles
    const { data: creatorProfiles, error: creatorError } = await supabase
      .from('creator_profiles')
      .select('id, user_id, avatar_url')
      .not('avatar_url', 'is', null)
      .like('avatar_url', `%${SUPABASE_STORAGE_HOST}%`);

    if (!creatorError && creatorProfiles) {
      console.log(`[migrate-avatars] Found ${creatorProfiles.length} creator_profiles with Supabase avatars`);

      for (const creator of creatorProfiles) {
        // Verificar si ya fue procesado (mismo user_id)
        if (results.some(r => r.userId === creator.user_id)) continue;

        const oldUrl = creator.avatar_url;
        if (!oldUrl) continue;

        try {
          console.log(`[migrate-avatars] Processing creator ${creator.id}: ${oldUrl}`);

          const imageResponse = await fetch(oldUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download: ${imageResponse.status}`);
          }

          const imageData = await imageResponse.arrayBuffer();
          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

          let ext = 'jpg';
          if (contentType.includes('png')) ext = 'png';
          else if (contentType.includes('webp')) ext = 'webp';
          else if (contentType.includes('gif')) ext = 'gif';

          const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const storagePath = `avatars/${creator.user_id}/${uniqueSuffix}.${ext}`;

          const uploadUrl = `https://${storageHostname}/${storageZone}/${storagePath}`;
          const newCdnUrl = cdnHostname
            ? `https://${cdnHostname}/${storagePath}`
            : `https://${storageZone}.b-cdn.net/${storagePath}`;

          const bunnyResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'AccessKey': storagePassword,
              'Content-Type': contentType,
            },
            body: imageData,
          });

          if (!bunnyResponse.ok) {
            throw new Error(`Bunny upload failed: ${bunnyResponse.status}`);
          }

          // Actualizar creator_profiles
          await supabase
            .from('creator_profiles')
            .update({ avatar_url: newCdnUrl })
            .eq('id', creator.id);

          // También actualizar profiles si existe
          if (creator.user_id) {
            await supabase
              .from('profiles')
              .update({ avatar_url: newCdnUrl })
              .eq('id', creator.user_id);
          }

          results.push({
            userId: creator.user_id || creator.id,
            oldUrl,
            newUrl: newCdnUrl,
            success: true,
          });
          successCount++;

        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error(`[migrate-avatars] Error migrating creator avatar ${creator.id}:`, errorMsg);
          results.push({
            userId: creator.user_id || creator.id,
            oldUrl,
            newUrl: null,
            success: false,
            error: errorMsg,
          });
          errorCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Avatar migration completed',
        summary: {
          total: results.length,
          success: successCount,
          errors: errorCount,
        },
        results: results.slice(0, 50), // Limitar respuesta
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[migrate-avatars] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
