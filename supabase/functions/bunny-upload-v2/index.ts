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
 * Bunny Upload V2 - Supports two modes:
 * 1. FormData (multipart/form-data): Receives file + metadata, uploads to Bunny server-side (proxy)
 * 2. JSON (application/json): Creates video entry and returns upload credentials (legacy)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bunnyApiKey = Deno.env.get("BUNNY_API_KEY")!;
    const bunnyLibraryId = Deno.env.get("BUNNY_LIBRARY_ID")!;
    const bunnyCdnHostname = Deno.env.get("BUNNY_CDN_HOSTNAME") || "";

    if (!bunnyApiKey || !bunnyLibraryId) {
      throw new Error("Missing BUNNY_API_KEY or BUNNY_LIBRARY_ID");
    }

    const contentType = req.headers.get("content-type") || "";

    let fileName: string;
    let folder: string;
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      // === FormData path: file included, upload server-side ===
      const formData = await req.formData();
      file = formData.get("file") as File;
      fileName = (formData.get("fileName") as string) || file?.name || "video";
      folder = (formData.get("folder") as string) || "uploads";

      if (!file) {
        return new Response(
          JSON.stringify({ success: false, error: "file is required in FormData" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[bunny-upload-v2] FormData upload: ${fileName}, size: ${file.size}, folder: ${folder}`);
    } else {
      // === JSON path: return upload credentials (existing behavior) ===
      const body = await req.json();
      fileName = body.fileName;
      folder = body.folder || "uploads";

      if (!fileName) {
        return new Response(
          JSON.stringify({ success: false, error: "fileName is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

    // Generate URLs
    const uploadUrl = `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoData.guid}`;
    const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`;
    const thumbnailUrl = bunnyCdnHostname
      ? `https://${bunnyCdnHostname}/${videoData.guid}/thumbnail.jpg`
      : `https://vz-${bunnyLibraryId}.b-cdn.net/${videoData.guid}/thumbnail.jpg`;

    // If FormData with file: upload to Bunny server-side (proxy)
    if (file) {
      console.log("[bunny-upload-v2] Uploading file to Bunny server-side...");

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "AccessKey": bunnyApiKey,
          "Content-Type": "application/octet-stream",
        },
        // @ts-ignore - Deno supports ReadableStream as body
        body: file.stream(),
        // @ts-ignore - duplex required for streaming body in Deno
        duplex: "half",
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("[bunny-upload-v2] Upload to Bunny error:", errorText);
        throw new Error(`Failed to upload to Bunny: ${errorText}`);
      }

      console.log("[bunny-upload-v2] File uploaded successfully to Bunny:", videoData.guid);

      return new Response(
        JSON.stringify({
          success: true,
          videoId: videoData.guid,
          embedUrl,
          thumbnailUrl,
          uploaded: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // JSON path: return upload credentials for client-side upload
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
