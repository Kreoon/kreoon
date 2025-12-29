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
        console.log(`Downloading: ${asset.filename}`);
        
        const response = await fetch(asset.url);
        if (!response.ok) {
          console.error(`Failed to download ${asset.filename}: ${response.status}`);
          errorCount++;
          continue;
        }

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
    
    console.log(`ZIP created: ${successCount} files, ${errorCount} errors`);

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
