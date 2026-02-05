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
    const { fileName, folder = "uploads" } = await req.json();

    if (!fileName) {
      return new Response(
        JSON.stringify({ success: false, error: "fileName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Leer secrets
    const storageZone = Deno.env.get("BUNNY_STORAGE_ZONE")!;
    const storageHostname = Deno.env.get("BUNNY_STORAGE_HOSTNAME")!;
    const storagePassword = Deno.env.get("BUNNY_STORAGE_PASSWORD")!;
    const cdnHostname = Deno.env.get("BUNNY_CDN_HOSTNAME")!;

    // Generar nombre único
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().split("-")[0];
    const extension = fileName.split(".").pop();
    const safeName = fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .substring(0, 30);

    const uniqueFileName = `${safeName}-${timestamp}-${randomId}.${extension}`;
    const filePath = `${folder}/${uniqueFileName}`;

    // URLs
    const uploadUrl = `https://${storageHostname}/${storageZone}/${filePath}`;
    const cdnUrl = `https://${cdnHostname}/${filePath}`;

    return new Response(
      JSON.stringify({
        success: true,
        uploadUrl,
        cdnUrl,
        filePath,
        accessKey: storagePassword,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
