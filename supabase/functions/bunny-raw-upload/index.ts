import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/**
 * bunny-raw-upload Edge Function
 * 
 * This function ONLY returns upload credentials for direct browser-to-Bunny uploads.
 * It does NOT handle file uploads itself to avoid memory limits.
 * 
 * Usage:
 * 1. Client calls GET with ?storagePath=... to get upload credentials
 * 2. Client uploads directly to Bunny Storage using the returned uploadUrl and accessKey
 */
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

    // Get Bunny credentials from environment
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

    // Extract storagePath from query params (GET) or body (POST with JSON)
    let storagePath: string | null = null;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      storagePath = url.searchParams.get('storagePath');
    } else if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      
      // IMPORTANT: Reject FormData uploads to prevent memory issues
      // Mobile browsers sometimes send FormData even when not intended
      if (contentType.includes('multipart/form-data')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Subida directa no soportada. Usa GET para obtener credenciales.',
            code: 'USE_DIRECT_UPLOAD'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Parse JSON body for storagePath
      try {
        const body = await req.json();
        storagePath = body.storagePath;
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: 'Body JSON inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!storagePath) {
      return new Response(
        JSON.stringify({ success: false, error: 'storagePath requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build upload URL and CDN URL
    const uploadUrl = `https://${storageHostname}/${storageZone}/${storagePath}`;
    const cdnUrl = cdnHostname 
      ? `https://${cdnHostname}/${storagePath}`
      : `https://${storageZone}.b-cdn.net/${storagePath}`;

    console.log(`Returning upload credentials for: ${storagePath}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        uploadUrl,
        cdnUrl,
        accessKey: storagePassword,
        storageZone,
        storagePath
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errMsg = error instanceof Error ? error.message : 'Error interno';
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
