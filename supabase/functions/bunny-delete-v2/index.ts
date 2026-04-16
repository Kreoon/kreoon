const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

/**
 * Bunny Delete V2 - Deletes a video from Bunny Stream
 * Uses: BUNNY_API_KEY, BUNNY_LIBRARY_ID
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const videoId = body?.videoId;

    console.log("[bunny-delete-v2] Request received, videoId:", videoId);

    if (!videoId || typeof videoId !== 'string' || videoId.trim() === '') {
      console.error("[bunny-delete-v2] Invalid videoId:", videoId);
      return new Response(
        JSON.stringify({ success: false, error: "videoId es requerido y debe ser un string válido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read secrets
    const bunnyApiKey = Deno.env.get("BUNNY_API_KEY");
    const bunnyLibraryId = Deno.env.get("BUNNY_LIBRARY_ID");

    if (!bunnyApiKey || !bunnyLibraryId) {
      console.error("[bunny-delete-v2] Missing env vars");
      return new Response(
        JSON.stringify({ success: false, error: "Configuración de Bunny incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete video from Bunny Stream
    const response = await fetch(
      `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoId}`,
      {
        method: "DELETE",
        headers: {
          "AccessKey": bunnyApiKey,
        },
      }
    );

    // 404 is OK - video already deleted
    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`Failed to delete video: ${errorText}`);
    }

    console.log(`[bunny-delete-v2] Deleted video: ${videoId}`);

    return new Response(
      JSON.stringify({ success: true, deleted: videoId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[bunny-delete-v2] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
