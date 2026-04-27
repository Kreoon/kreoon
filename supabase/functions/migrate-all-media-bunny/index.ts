import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_STORAGE_HOST = 'wjkbqcrxwsmvtxmqgiqc.supabase.co';

interface MigrationResult {
  table: string;
  id: string;
  oldUrl: string;
  newUrl: string | null;
  success: boolean;
  error?: string;
}

async function migrateUrl(
  oldUrl: string,
  storagePath: string,
  storageHostname: string,
  storageZone: string,
  storagePassword: string,
  cdnHostname: string | undefined
): Promise<{ newUrl: string; success: boolean; error?: string }> {
  try {
    const imageResponse = await fetch(oldUrl);
    if (!imageResponse.ok) {
      return { newUrl: '', success: false, error: `Failed to download: ${imageResponse.status}` };
    }

    const imageData = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('gif')) ext = 'gif';

    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const fullPath = `${storagePath}/${uniqueSuffix}.${ext}`;

    const uploadUrl = `https://${storageHostname}/${storageZone}/${fullPath}`;
    const newCdnUrl = cdnHostname
      ? `https://${cdnHostname}/${fullPath}`
      : `https://${storageZone}.b-cdn.net/${fullPath}`;

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
      return { newUrl: '', success: false, error: `Bunny upload failed: ${bunnyResponse.status} - ${errorText}` };
    }

    return { newUrl: newCdnUrl, success: true };
  } catch (err) {
    return { newUrl: '', success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

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

    if (!supabaseUrl || !supabaseServiceKey || !storageZone || !storagePassword) {
      return new Response(
        JSON.stringify({ error: 'Missing credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const results: MigrationResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // 1. Migrate portfolio_items.thumbnail_url
    const { data: portfolioItems } = await supabase
      .from('portfolio_items')
      .select('id, creator_id, thumbnail_url')
      .like('thumbnail_url', `%${SUPABASE_STORAGE_HOST}%`);

    for (const item of portfolioItems || []) {
      console.log(`[migrate] portfolio_items ${item.id}: ${item.thumbnail_url}`);
      const result = await migrateUrl(
        item.thumbnail_url,
        `thumbnails/${item.creator_id}`,
        storageHostname,
        storageZone,
        storagePassword,
        cdnHostname
      );

      if (result.success) {
        await supabase
          .from('portfolio_items')
          .update({ thumbnail_url: result.newUrl })
          .eq('id', item.id);
        successCount++;
      } else {
        errorCount++;
      }

      results.push({
        table: 'portfolio_items',
        id: item.id,
        oldUrl: item.thumbnail_url,
        newUrl: result.newUrl || null,
        success: result.success,
        error: result.error,
      });
    }

    // 2. Migrate profiles.avatar_url
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .like('avatar_url', `%${SUPABASE_STORAGE_HOST}%`);

    for (const profile of profiles || []) {
      console.log(`[migrate] profiles ${profile.id}: ${profile.avatar_url}`);
      const result = await migrateUrl(
        profile.avatar_url,
        `avatars/${profile.id}`,
        storageHostname,
        storageZone,
        storagePassword,
        cdnHostname
      );

      if (result.success) {
        await supabase
          .from('profiles')
          .update({ avatar_url: result.newUrl })
          .eq('id', profile.id);

        // Also update creator_profiles if exists
        await supabase
          .from('creator_profiles')
          .update({ avatar_url: result.newUrl })
          .eq('user_id', profile.id);

        successCount++;
      } else {
        errorCount++;
      }

      results.push({
        table: 'profiles',
        id: profile.id,
        oldUrl: profile.avatar_url,
        newUrl: result.newUrl || null,
        success: result.success,
        error: result.error,
      });
    }

    // 3. Migrate organizations.logo_url
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, logo_url')
      .like('logo_url', `%${SUPABASE_STORAGE_HOST}%`);

    for (const org of orgs || []) {
      console.log(`[migrate] organizations ${org.id}: ${org.logo_url}`);
      const result = await migrateUrl(
        org.logo_url,
        `organizations/${org.id}`,
        storageHostname,
        storageZone,
        storagePassword,
        cdnHostname
      );

      if (result.success) {
        await supabase
          .from('organizations')
          .update({ logo_url: result.newUrl })
          .eq('id', org.id);
        successCount++;
      } else {
        errorCount++;
      }

      results.push({
        table: 'organizations',
        id: org.id,
        oldUrl: org.logo_url,
        newUrl: result.newUrl || null,
        success: result.success,
        error: result.error,
      });
    }

    return new Response(
      JSON.stringify({
        message: 'Migration completed',
        summary: { total: results.length, success: successCount, errors: errorCount },
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[migrate-all-media] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
