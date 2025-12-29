import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Check request type: GET for signed URL, PUT for streaming upload
    if (req.method === 'GET') {
      // Return signed upload config for direct browser upload
      const url = new URL(req.url);
      const storagePath = url.searchParams.get('storagePath');
      
      if (!storagePath) {
        return new Response(
          JSON.stringify({ success: false, error: 'storagePath requerido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const uploadUrl = `https://${storageHostname}/${storageZone}/${storagePath}`;
      const cdnUrl = cdnHostname 
        ? `https://${cdnHostname}/${storagePath}`
        : `https://${storageZone}.b-cdn.net/${storagePath}`;

      return new Response(
        JSON.stringify({ 
          success: true, 
          uploadUrl,
          cdnUrl,
          accessKey: storagePassword,
          storageZone
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Stream the file directly to Bunny (for browsers that can't do direct PUT)
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      
      // If it's multipart form data, handle streaming upload
      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const storagePath = formData.get('storagePath') as string;
        const fileContentType = formData.get('contentType') as string;

        if (!file || !storagePath) {
          return new Response(
            JSON.stringify({ success: false, error: 'Archivo y storagePath requeridos' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Streaming upload: ${file.name} (${file.size} bytes) to ${storagePath}`);

        const uploadUrl = `https://${storageHostname}/${storageZone}/${storagePath}`;
        
        // Stream the file directly to Bunny
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'AccessKey': storagePassword,
            'Content-Type': fileContentType || file.type || 'application/octet-stream',
          },
          body: file.stream(),
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

        // Always return public CDN URL (not storage URL)
        const cdnUrl = cdnHostname 
          ? `https://${cdnHostname}/${storagePath}`
          : `https://${storageZone}.b-cdn.net/${storagePath}`;

        console.log(`Stream upload successful. CDN URL: ${cdnUrl}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            url: cdnUrl,
            storagePath,
            fileSize: file.size
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // JSON body (legacy support for small files)
      const body = await req.json();
      const { filename, storagePath, contentType: fileContentType, fileSize, fileData } = body;

      if (!filename || !storagePath) {
        return new Response(
          JSON.stringify({ success: false, error: 'Datos incompletos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If fileData is provided (base64), use legacy method for small files
      if (fileData) {
        // Reject large base64 uploads to prevent memory issues
        if (fileData.length > 5 * 1024 * 1024) { // ~3.75MB actual file
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Archivo muy grande para subida base64. Usa el método FormData.',
              useFormData: true
            }),
            { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Legacy upload: ${filename} to ${storagePath}`);

        const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
        const uploadUrl = `https://${storageHostname}/${storageZone}/${storagePath}`;
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'AccessKey': storagePassword,
            'Content-Type': fileContentType || 'application/octet-stream',
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
      }

      // No fileData - return error
      return new Response(
        JSON.stringify({ success: false, error: 'fileData o archivo FormData requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Método no soportado' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
