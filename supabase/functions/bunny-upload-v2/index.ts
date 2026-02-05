import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BunnyVideoResponse {
  guid: string;
  title: string;
  status: number;
}

/**
 * Bunny Upload V2 - Creates a video in Bunny Stream and returns upload info
 * Uses: BUNNY_API_KEY, BUNNY_LIBRARY_ID
 */
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

    // Read secrets
    const bunnyApiKey = Deno.env.get("BUNNY_API_KEY")!;
    const bunnyLibraryId = Deno.env.get("BUNNY_LIBRARY_ID")!;
    const bunnyCdnHostname = Deno.env.get("BUNNY_CDN_HOSTNAME") || "";

    if (!bunnyApiKey || !bunnyLibraryId) {
      throw new Error("Missing BUNNY_API_KEY or BUNNY_LIBRARY_ID");
    }

    // Generate unique title
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().split("-")[0];
    const safeName = fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .substring(0, 30);

    const title = `${folder}/${safeName}-${timestamp}-${randomId}`;

    // Step 1: Create video entry in Bunny Stream
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`,
      {
        method: "POST",
        headers: {
          "AccessKey": bunnyApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("[bunny-upload-v2] Create video error:", errorText);
      throw new Error(`Failed to create video: ${errorText}`);
    }

    const videoData: BunnyVideoResponse = await createResponse.json();
    console.log("[bunny-upload-v2] Created video:", videoData.guid);

    // Return upload URL and video info
    const uploadUrl = `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoData.guid}`;
    const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`;
    const thumbnailUrl = bunnyCdnHostname
      ? `https://${bunnyCdnHostname}/${videoData.guid}/thumbnail.jpg`
      : `https://vz-${bunnyLibraryId}.b-cdn.net/${videoData.guid}/thumbnail.jpg`;

    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoData.guid,
        uploadUrl,
        embedUrl,
        thumbnailUrl,
        accessKey: bunnyApiKey,
        filePath: title,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[bunny-upload-v2] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
