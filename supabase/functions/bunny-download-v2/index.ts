import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath } = await req.json();

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: "filePath is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Leer secrets
    const storageZone = Deno.env.get("BUNNY_STORAGE_ZONE")!;
    const storageHostname = Deno.env.get("BUNNY_STORAGE_HOSTNAME")!;
    const storagePassword = Deno.env.get("BUNNY_STORAGE_PASSWORD")!;
    const cdnHostname = Deno.env.get("BUNNY_CDN_HOSTNAME")!;

    // Descargar archivo de Bunny
    const downloadUrl = `https://${storageHostname}/${storageZone}/${filePath}`;

    const response = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        "AccessKey": storagePassword,
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `File not found: ${response.status}`
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retornar el archivo con headers correctos
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const fileData = await response.arrayBuffer();

    return new Response(fileData, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filePath.split('/').pop()}"`,
      },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
