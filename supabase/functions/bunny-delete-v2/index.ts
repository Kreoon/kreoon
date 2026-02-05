import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

/**
 * Bunny Delete V2 - Deletes a video from Bunny Stream
 * Uses: BUNNY_API_KEY, BUNNY_LIBRARY_ID
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return new Response(
        JSON.stringify({ success: false, error: "videoId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read secrets
    const bunnyApiKey = Deno.env.get("BUNNY_API_KEY")!;
    const bunnyLibraryId = Deno.env.get("BUNNY_LIBRARY_ID")!;

    if (!bunnyApiKey || !bunnyLibraryId) {
      throw new Error("Missing BUNNY_API_KEY or BUNNY_LIBRARY_ID");
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
