import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FALLBACK_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
  <rect width="720" height="1280" fill="#000000"/>
  <circle cx="360" cy="640" r="60" fill="#ffffff" opacity="0.15"/>
  <path d="M340 605 L400 640 L340 675 Z" fill="#ffffff" opacity="0.5"/>
</svg>`;

/**
 * Bunny Thumbnail V2 - Gets video thumbnail from Bunny Stream
 * Uses: BUNNY_API_KEY, BUNNY_LIBRARY_ID, BUNNY_CDN_HOSTNAME
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

    const bunnyLibraryId = Deno.env.get("BUNNY_LIBRARY_ID")!;
    const bunnyCdnHostname = Deno.env.get("BUNNY_CDN_HOSTNAME") || "";

    if (!bunnyLibraryId) {
      throw new Error("Missing BUNNY_LIBRARY_ID");
    }

    const cdnHostname = bunnyCdnHostname || `vz-${bunnyLibraryId}.b-cdn.net`;

    // Build candidate thumbnail URLs
    const candidateUrls = [
      `https://${cdnHostname}/${videoId}/thumbnail.jpg`,
      `https://${cdnHostname}/${videoId}/thumbnail_1.jpg`,
      `https://${cdnHostname}/${videoId}/thumbnail_2.jpg`,
      `https://${cdnHostname}/${videoId}/preview.jpg`,
      `https://${cdnHostname}/${videoId}/preview.webp`,
    ];

    console.log(`[bunny-thumbnail-v2] Trying ${candidateUrls.length} candidate URLs for video: ${videoId}`);

    // Try each URL until one works
    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, { redirect: "follow" });
        if (res.ok) {
          console.log(`[bunny-thumbnail-v2] Found thumbnail: ${url}`);

          const contentType = res.headers.get("content-type") || "image/jpeg";
          const cacheControl = res.headers.get("cache-control") || "public, max-age=86400, stale-while-revalidate=604800";

          return new Response(res.body, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": contentType,
              "Cache-Control": cacheControl,
            },
          });
        }
      } catch (err) {
        console.log(`[bunny-thumbnail-v2] Failed: ${url}`);
      }
    }

    // No thumbnail found - return fallback SVG
    console.log("[bunny-thumbnail-v2] No thumbnail found, returning fallback SVG");
    return new Response(FALLBACK_SVG, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=10, stale-while-revalidate=60",
      },
    });

  } catch (error) {
    console.error("[bunny-thumbnail-v2] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
