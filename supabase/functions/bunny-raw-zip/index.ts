import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { BlobWriter, ZipWriter, Uint8ArrayReader } from "https://deno.land/x/zipjs@v2.7.32/index.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const storageZone = Deno.env.get('BUNNY_STORAGE_ZONE');
    const storagePassword = Deno.env.get('BUNNY_STORAGE_PASSWORD');
    const storageHostname = Deno.env.get('BUNNY_STORAGE_HOSTNAME') || 'storage.bunnycdn.com';
    const cdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME');

    console.log('Bunny config:', { 
      storageZone: storageZone ? 'SET' : 'NOT SET', 
      storagePassword: storagePassword ? 'SET (length: ' + storagePassword.length + ')' : 'NOT SET',
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
        
        let downloadUrl = asset.url;
        let downloadHeaders: Record<string, string> = {};

        // Extract the path from the URL to construct proper URLs
        // URLs can be:
        // 1. Storage URL: https://ny.storage.bunnycdn.com/raw-assets/org_.../raw/file.mp4
        // 2. CDN URL: https://hostname.b-cdn.net/org_.../raw/file.mp4
        // 3. Path only: raw-assets/org_.../raw/file.mp4
        
        // Extract the path portion after the storage zone or from the URL
        let assetPath = '';
        
        if (asset.url.includes('storage.bunnycdn.com')) {
          // Extract path after storage zone name
          // URL format: https://ny.storage.bunnycdn.com/raw-assets/org_.../file.mp4
          // We need: org_.../file.mp4 (path after 'raw-assets/')
          const match = asset.url.match(/storage\.bunnycdn\.com\/[^/]+\/(.+)$/);
          if (match) {
            assetPath = match[1];
          }
        } else if (asset.url.includes('.b-cdn.net')) {
          // CDN URL - extract path after domain
          const match = asset.url.match(/\.b-cdn\.net\/(.+)$/);
          if (match) {
            assetPath = match[1];
          }
        } else if (asset.url.startsWith('raw-assets/')) {
          assetPath = asset.url;
        } else if (cdnHostname && asset.url.includes(cdnHostname)) {
          const match = asset.url.match(new RegExp(cdnHostname.replace('.', '\\.') + '/(.+)$'));
          if (match) {
            assetPath = match[1];
          }
        }

        console.log(`Extracted asset path: ${assetPath}`);

        // First try CDN URL (public, no auth needed)
        if (cdnHostname && assetPath) {
          downloadUrl = `https://${cdnHostname}/${assetPath}`;
          downloadHeaders = {}; // CDN doesn't need auth
          console.log(`Trying CDN URL: ${downloadUrl}`);
        } else if (assetPath) {
          // Fallback to default CDN pattern
          downloadUrl = `https://${storageZone}.b-cdn.net/${assetPath}`;
          downloadHeaders = {};
          console.log(`Trying default CDN URL: ${downloadUrl}`);
        }
        
        let response = await fetch(downloadUrl, { headers: downloadHeaders });
        
        // If CDN fails, try storage URL with authentication
        if (!response.ok && storageZone && storagePassword && assetPath) {
          console.log(`CDN failed (${response.status}), trying storage with auth...`);
          downloadUrl = `https://${storageHostname}/${storageZone}/${assetPath}`;
          downloadHeaders = { 'AccessKey': storagePassword };
          console.log(`Trying storage URL: ${downloadUrl}`);
          response = await fetch(downloadUrl, { headers: downloadHeaders });
        }

        // If still failing, try the original URL with auth (in case it's a storage URL)
        if (!response.ok && storagePassword) {
          console.log(`Storage with path failed (${response.status}), trying original URL with auth...`);
          downloadUrl = asset.url;
          downloadHeaders = { 'AccessKey': storagePassword };
          response = await fetch(downloadUrl, { headers: downloadHeaders });
        }
        
        if (!response.ok) {
          console.error(`Failed to download ${asset.filename}: ${response.status} from ${downloadUrl}`);
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
