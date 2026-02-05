import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BunnyVideoInfo {
  guid: string;
  title: string;
  status: number;
  encodeProgress: number;
  availableResolutions: string;
}

/**
 * Bunny Download V2 - Gets video info and URLs from Bunny Stream
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
    const bunnyCdnHostname = Deno.env.get("BUNNY_CDN_HOSTNAME") || "";

    if (!bunnyApiKey || !bunnyLibraryId) {
      throw new Error("Missing BUNNY_API_KEY or BUNNY_LIBRARY_ID");
    }

    // Get video info from Bunny Stream
    const response = await fetch(
      `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoId}`,
      {
        method: "GET",
        headers: {
          "AccessKey": bunnyApiKey,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ success: false, error: "Video not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      throw new Error(`Failed to get video: ${errorText}`);
    }

    const videoInfo: BunnyVideoInfo = await response.json();

    // Build URLs
    const cdnHostname = bunnyCdnHostname || `vz-${bunnyLibraryId}.b-cdn.net`;
    const cdnBase = `https://${cdnHostname}/${videoId}`;
    const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoId}`;

    // Parse available resolutions
    const resolutions = videoInfo.availableResolutions?.split(",") || [];
    const directUrls: Record<string, string> = {};

    resolutions.forEach(res => {
      if (res) {
        directUrls[res] = `${cdnBase}/play_${res}.mp4`;
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoInfo.guid,
        title: videoInfo.title,
        status: videoInfo.status,
        encodeProgress: videoInfo.encodeProgress,
        embedUrl,
        thumbnailUrl: `${cdnBase}/thumbnail.jpg`,
        directUrls,
        isReady: videoInfo.status === 4, // Status 4 = Finished encoding
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[bunny-download-v2] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
