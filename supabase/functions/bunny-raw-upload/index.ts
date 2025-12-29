import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Get Bunny credentials
    const storageZone = Deno.env.get('BUNNY_STORAGE_ZONE');
    const storagePassword = Deno.env.get('BUNNY_STORAGE_PASSWORD');
    const storageHostname = Deno.env.get('BUNNY_STORAGE_HOSTNAME') || 'storage.bunnycdn.com';
    const cdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME');

    if (!storageZone || !storagePassword) {
      console.error('Missing Bunny Storage credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuración de storage incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { filename, storagePath, contentType, fileSize, fileData } = await req.json();

    if (!filename || !storagePath || !fileData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Datos incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Uploading file: ${filename} to ${storagePath}`);

    // Decode base64 file data
    const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

    // Upload to Bunny Storage
    const uploadUrl = `https://${storageHostname}/${storageZone}/${storagePath}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': storagePassword,
        'Content-Type': contentType || 'application/octet-stream',
      },
      body: binaryData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Bunny upload failed:', uploadResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error de Bunny Storage: ${uploadResponse.status}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct CDN URL
    const cdnUrl = cdnHostname 
      ? `https://${cdnHostname}/${storagePath}`
      : `https://${storageZone}.b-cdn.net/${storagePath}`;

    console.log(`Upload successful. CDN URL: ${cdnUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: cdnUrl,
        storagePath,
        fileSize
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Upload error:', error);
    const errMsg = error instanceof Error ? error.message : 'Error interno';
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
