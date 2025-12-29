import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { BlobWriter, ZipWriter, Uint8ArrayReader } from "https://deno.land/x/zipjs@v2.7.32/index.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function safeCdnHostname(raw: string | undefined) {
  if (!raw) return undefined;
  // Misconfig guard: sometimes people set the storage hostname as CDN hostname.
  if (raw.includes('storage.bunnycdn.com')) return undefined;
  return raw;
}

function extractStorageZoneFromStorageUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('storage.bunnycdn.com')) return undefined;
    const [first] = u.pathname.replace(/^\//, '').split('/');
    return first || undefined;
  } catch {
    return undefined;
  }
}

function extractPathAfterFirstSegment(url: string): string | undefined {
  // For storage URLs, pathname is /<zone>/<path...>. We want <path...>
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/^\//, '').split('/');
    if (parts.length < 2) return undefined;
    return parts.slice(1).join('/');
  } catch {
    return undefined;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Bunny credentials for authenticated downloads
    const envStorageZone = Deno.env.get('BUNNY_STORAGE_ZONE');
    const storagePassword = Deno.env.get('BUNNY_STORAGE_PASSWORD');
    const storageHostname = Deno.env.get('BUNNY_STORAGE_HOSTNAME') || 'storage.bunnycdn.com';
    const cdnHostname = safeCdnHostname(Deno.env.get('BUNNY_CDN_HOSTNAME'));

    console.log('Bunny config:', {
      envStorageZone: envStorageZone ? 'SET' : 'NOT SET',
      storagePassword: storagePassword ? `SET (length: ${storagePassword.length})` : 'NOT SET',
      storageHostname,
      cdnHostname: cdnHostname || 'NOT SET'
    });

    const { projectId, assets } = await req.json();

    if (!projectId || !assets || !Array.isArray(assets) || assets.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Datos incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating ZIP for project ${projectId} with ${assets.length} files`);

    // Create ZIP in memory
    const blobWriter = new BlobWriter("application/zip");
    const zipWriter = new ZipWriter(blobWriter);

    let successCount = 0;
    let errorCount = 0;

    // Download each file and add to ZIP
    for (const asset of assets) {
      try {
        console.log(`Downloading: ${asset.filename} from ${asset.url}`);

        // Extract a usable asset path
        // storage URL: https://<region>.storage.bunnycdn.com/<zone>/<path...>
        // cdn URL: https://<cdnHost>/<path...>
        // path only: raw-assets/... (legacy)

        let assetPath = '';
        const urlStr: string = asset.url;

        if (urlStr.startsWith('raw-assets/')) {
          // If caller gives us a path including zone, keep as-is.
          assetPath = urlStr;
        } else if (urlStr.includes('storage.bunnycdn.com')) {
          const afterZone = extractPathAfterFirstSegment(urlStr);
          if (afterZone) assetPath = afterZone;
        } else {
          // generic: take everything after host
          try {
            const u = new URL(urlStr);
            assetPath = u.pathname.replace(/^\//, '');
          } catch {
            assetPath = '';
          }
        }

        // If assetPath still contains zone prefix (raw-assets/...), normalize to remove it
        if (assetPath.startsWith('raw-assets/')) {
          assetPath = assetPath.replace(/^raw-assets\//, '');
        }

        console.log(`Extracted asset path: ${assetPath}`);

        // 1) Try CDN (public)
        let response: Response | null = null;
        let lastTriedUrl = '';

        if (assetPath) {
          const defaultCdnHost = envStorageZone ? `${envStorageZone}.b-cdn.net` : undefined;
          const cdnHostToUse = cdnHostname || defaultCdnHost;

          if (cdnHostToUse) {
            const cdnUrl = `https://${cdnHostToUse}/${assetPath}`;
            lastTriedUrl = cdnUrl;
            console.log(`Trying CDN URL: ${cdnUrl}`);
            response = await fetch(cdnUrl);
          }
        }

        // 2) If CDN failed, try storage with auth
        if ((!response || !response.ok) && storagePassword && assetPath) {
          const zoneFromUrl = extractStorageZoneFromStorageUrl(urlStr);
          const zoneForStorage = zoneFromUrl || envStorageZone || 'raw-assets';

          const storageUrl = `https://${storageHostname}/${zoneForStorage}/${assetPath}`;
          lastTriedUrl = storageUrl;
          console.log(`Trying storage URL with auth: ${storageUrl}`);
          response = await fetch(storageUrl, { headers: { 'AccessKey': storagePassword } });
        }

        // 3) Last resort: original URL with auth (if it's a storage URL)
        if ((!response || !response.ok) && storagePassword) {
          lastTriedUrl = urlStr;
          console.log(`Trying original URL with auth: ${urlStr}`);
          response = await fetch(urlStr, { headers: { 'AccessKey': storagePassword } });
        }

        if (!response || !response.ok) {
          console.error(`Failed to download ${asset.filename}: ${response?.status ?? 'NO_RESPONSE'} from ${lastTriedUrl}`);
          errorCount++;
          continue;
        }

        console.log(`Successfully downloaded ${asset.filename}`);
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        await zipWriter.add(asset.filename, new Uint8ArrayReader(uint8Array));
        successCount++;

      } catch (fileError) {
        console.error(`Error processing ${asset.filename}:`, fileError);
        errorCount++;
      }
    }

    await zipWriter.close();
    const zipBlob = await blobWriter.getData();

    console.log(`ZIP created: ${successCount} files, ${errorCount} errors, size: ${zipBlob.size} bytes`);

    if (successCount === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se pudo descargar ningún archivo para el ZIP'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert blob to base64 for transfer
    const arrayBuffer = await zipBlob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Create a data URL that can be downloaded directly
    const dataUrl = `data:application/zip;base64,${base64}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: dataUrl,
        filename: `material_crudo_${projectId.slice(0, 8)}.zip`,
        fileCount: successCount,
        errors: errorCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('ZIP generation error:', error);
    const errMsg = error instanceof Error ? error.message : 'Error generando ZIP';
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
