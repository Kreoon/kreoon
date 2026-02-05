import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
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

    // Eliminar archivo de Bunny
    const deleteUrl = `https://${storageHostname}/${storageZone}/${filePath}`;

    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "AccessKey": storagePassword,
      },
    });

    if (!response.ok && response.status !== 404) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Delete failed: ${response.status}`
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, deleted: filePath }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
