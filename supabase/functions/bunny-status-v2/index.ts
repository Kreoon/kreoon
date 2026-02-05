import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BunnyVideoStatus {
  guid: string;
  title: string;
  status: number;
  encodeProgress: number;
}

const STATUS_MAP: Record<number, string> = {
  0: "pending",
  1: "processing",
  2: "processing",
  3: "processing",
  4: "completed",
  5: "failed",
};

/**
 * Bunny Status V2 - Checks video encoding status from Bunny Stream
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

    const bunnyApiKey = Deno.env.get("BUNNY_API_KEY")!;
    const bunnyLibraryId = Deno.env.get("BUNNY_LIBRARY_ID")!;

    if (!bunnyApiKey || !bunnyLibraryId) {
      throw new Error("Missing BUNNY_API_KEY or BUNNY_LIBRARY_ID");
    }

    console.log("[bunny-status-v2] Checking status for video:", videoId);

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
      const errorText = await response.text().catch(() => "");
      throw new Error(`Bunny status error ${response.status}: ${errorText}`);
    }

    const videoData: BunnyVideoStatus = await response.json();

    const encodeProgress = (videoData as any).encodeProgress ?? (videoData as any).EncodeProgress ?? 0;
    const processingStatus = STATUS_MAP[videoData.status] || "processing";

    console.log("[bunny-status-v2] Status:", videoData.status, "mapped:", processingStatus, "progress:", encodeProgress);

    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoData.guid,
        title: videoData.title,
        status: processingStatus,
        bunnyStatus: videoData.status,
        encodeProgress,
        isReady: videoData.status === 4,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[bunny-status-v2] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
