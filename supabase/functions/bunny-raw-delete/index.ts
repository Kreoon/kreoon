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

    if (!storageZone || !storagePassword) {
      console.error('Missing Bunny Storage credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuración de storage incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { storagePath } = await req.json();

    if (!storagePath) {
      return new Response(
        JSON.stringify({ success: false, error: 'storagePath requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract path from CDN URL if needed
    let pathToDelete = storagePath;
    if (storagePath.includes('.b-cdn.net/') || storagePath.includes('cdn.')) {
      const urlParts: string[] = storagePath.split('/');
      const startIndex = urlParts.findIndex((part: string) => part === 'raw-assets');
      if (startIndex !== -1) {
        pathToDelete = urlParts.slice(startIndex).join('/');
      }
    }

    console.log(`Deleting file: ${pathToDelete}`);

    // Delete from Bunny Storage
    const deleteUrl = `https://${storageHostname}/${storageZone}/${pathToDelete}`;
    
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'AccessKey': storagePassword,
      },
    });

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      const errorText = await deleteResponse.text();
      console.error('Bunny delete failed:', deleteResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error de Bunny Storage: ${deleteResponse.status}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Delete successful');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Delete error:', error);
    const errMsg = error instanceof Error ? error.message : 'Error interno';
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
