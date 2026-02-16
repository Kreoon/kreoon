import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Campaign Media Upload — Credential Issuer Pattern
//
// Follows the project's existing Bunny upload pattern:
//   POST  → validate + return upload credentials (client uploads directly to Bunny)
//   PUT   → confirm upload complete, create campaign_media DB record
//
// Images → Bunny Storage (direct PUT by client)
// Videos → Bunny Stream  (create slot, client uploads to slot URL)
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Bunny Storage (images/files)
const BUNNY_STORAGE_ZONE =
  Deno.env.get("BUNNY_STORAGE_ZONE") || "ugc-colombia";
const BUNNY_STORAGE_PASSWORD = Deno.env.get("BUNNY_STORAGE_PASSWORD") || "";
const BUNNY_STORAGE_HOSTNAME =
  Deno.env.get("BUNNY_STORAGE_HOSTNAME") || "storage.bunnycdn.com";

// Bunny Stream (videos)
const BUNNY_API_KEY = Deno.env.get("BUNNY_API_KEY") || "";
const BUNNY_LIBRARY_ID = Deno.env.get("BUNNY_LIBRARY_ID") || "";

// CDN hostname (shared)
const BUNNY_CDN_HOSTNAME =
  Deno.env.get("BUNNY_CDN_HOSTNAME") || "ugc-colombia.b-cdn.net";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
];

/** Maps campaign_media_type enum to whether it's a video or image */
const MEDIA_TYPE_IS_VIDEO: Record<string, boolean> = {
  cover_image: false,
  gallery_image: false,
  product_image: false,
  video_brief: true,
  reference_video: true,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreatePayload {
  campaign_id: string;
  media_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

interface ConfirmPayload {
  campaign_id: string;
  media_id?: string;
  media_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_url: string;
  thumbnail_url?: string;
  bunny_video_id?: string;
  duration_seconds?: number;
  width?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, error: message }, status);
}

async function authenticateUser(
  req: Request,
  supabaseUrl: string,
  anonKey: string
): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}

async function verifyCampaignManager(
  supabase: ReturnType<typeof createClient>,
  campaignId: string,
  userId: string
): Promise<{ allowed: boolean; campaign: Record<string, unknown> | null }> {
  const { data: campaign, error } = await supabase
    .from("marketplace_campaigns")
    .select("id, created_by, brand_id, organization_id, status")
    .eq("id", campaignId)
    .single();

  if (error || !campaign) return { allowed: false, campaign: null };

  // Owner check
  if (campaign.created_by === userId) return { allowed: true, campaign };

  // Brand admin check
  if (campaign.brand_id) {
    const { data: bm } = await supabase
      .from("brand_members")
      .select("role")
      .eq("brand_id", campaign.brand_id)
      .eq("user_id", userId)
      .in("role", ["owner", "admin"])
      .limit(1)
      .maybeSingle();
    if (bm) return { allowed: true, campaign };
  }

  // Org admin check
  if (campaign.organization_id) {
    const { data: om } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", campaign.organization_id)
      .eq("user_id", userId)
      .in("role", ["admin", "team_leader"])
      .limit(1)
      .maybeSingle();
    if (om) return { allowed: true, campaign };
  }

  return { allowed: false, campaign };
}

// ---------------------------------------------------------------------------
// POST handler: Issue upload credentials
// ---------------------------------------------------------------------------

async function handleCreate(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: CreatePayload
): Promise<Response> {
  const { campaign_id, media_type, file_name, file_size, mime_type } = body;

  // Validate media_type against enum
  if (!(media_type in MEDIA_TYPE_IS_VIDEO)) {
    return errorResponse(
      `Invalid media_type. Allowed: ${Object.keys(MEDIA_TYPE_IS_VIDEO).join(", ")}`
    );
  }

  const isVideo = MEDIA_TYPE_IS_VIDEO[media_type];

  // Validate MIME type
  const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
  if (!allowedTypes.includes(mime_type)) {
    return errorResponse(
      `Invalid mime_type '${mime_type}' for ${media_type}. Allowed: ${allowedTypes.join(", ")}`
    );
  }

  // Validate file size
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file_size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return errorResponse(`File too large. Max ${maxMB}MB for ${isVideo ? "videos" : "images"}`);
  }

  // Authorization
  const { allowed, campaign } = await verifyCampaignManager(
    supabase,
    campaign_id,
    userId
  );
  if (!allowed || !campaign) {
    return errorResponse("Not authorized to upload media to this campaign", 403);
  }

  // ---- VIDEO: Create Bunny Stream slot ----
  if (isVideo) {
    const title = `campaign_${campaign_id}_${media_type}_${Date.now()}`;

    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Bunny Stream create error:", errText);
      return errorResponse("Failed to create video slot", 502);
    }

    const videoData = await createRes.json();
    const videoGuid = videoData.guid;

    const uploadUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoGuid}`;
    const thumbnailUrl = BUNNY_CDN_HOSTNAME
      ? `https://${BUNNY_CDN_HOSTNAME}/${videoGuid}/thumbnail.jpg`
      : null;
    const mp4Url = BUNNY_CDN_HOSTNAME
      ? `https://${BUNNY_CDN_HOSTNAME}/${videoGuid}/play_720p.mp4`
      : null;

    return jsonResponse({
      success: true,
      upload_type: "bunny_stream",
      upload_url: uploadUrl,
      access_key: BUNNY_API_KEY,
      video_id: videoGuid,
      cdn_url: mp4Url,
      thumbnail_url: thumbnailUrl,
      // Client should call PUT after upload completes
    });
  }

  // ---- IMAGE: Return Bunny Storage credentials ----
  const ext = file_name.split(".").pop() || "jpg";
  const storagePath = `campaigns/${campaign_id}/${media_type}_${Date.now()}.${ext}`;
  const uploadUrl = `https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${storagePath}`;
  const cdnUrl = `https://${BUNNY_CDN_HOSTNAME}/${storagePath}`;

  return jsonResponse({
    success: true,
    upload_type: "bunny_storage",
    upload_url: uploadUrl,
    access_key: BUNNY_STORAGE_PASSWORD,
    cdn_url: cdnUrl,
    storage_path: storagePath,
    // Client should call PUT after upload completes
  });
}

// ---------------------------------------------------------------------------
// PUT handler: Confirm upload, create campaign_media record
// ---------------------------------------------------------------------------

async function handleConfirm(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: ConfirmPayload
): Promise<Response> {
  const { campaign_id, media_type, file_name, file_size, mime_type, file_url } =
    body;

  if (!file_url) {
    return errorResponse("file_url is required for confirmation");
  }

  // Authorization
  const { allowed } = await verifyCampaignManager(
    supabase,
    campaign_id,
    userId
  );
  if (!allowed) {
    return errorResponse("Not authorized", 403);
  }

  const isPrimary = media_type === "cover_image";

  // If uploading a new cover image, unset the old one first
  // (avoids unique constraint violation on idx_campaign_media_single_primary)
  if (isPrimary) {
    await supabase
      .from("campaign_media")
      .update({ is_primary: false })
      .eq("campaign_id", campaign_id)
      .eq("media_type", "cover_image")
      .eq("is_primary", true);
  }

  // Create campaign_media record
  const { data: media, error: mediaError } = await supabase
    .from("campaign_media")
    .insert({
      campaign_id,
      media_type,
      file_url,
      thumbnail_url: body.thumbnail_url || null,
      file_name,
      file_size_bytes: file_size || null,
      mime_type: mime_type || null,
      duration_seconds: body.duration_seconds || null,
      width: body.width || null,
      height: body.height || null,
      is_primary: isPrimary,
      bunny_video_id: body.bunny_video_id || null,
      processing_status: MEDIA_TYPE_IS_VIDEO[media_type]
        ? "processing"
        : "completed",
      uploaded_by: userId,
    })
    .select("id, file_url, thumbnail_url, media_type, is_primary")
    .single();

  if (mediaError) {
    console.error("Error creating campaign_media:", mediaError);
    return errorResponse(`Failed to save media record: ${mediaError.message}`, 500);
  }

  // Update cover_image_url on the campaign (denormalized for quick access)
  // No cover_media_id/video_brief_id — those FK columns were removed
  if (media_type === "cover_image") {
    await supabase
      .from("marketplace_campaigns")
      .update({ cover_image_url: file_url })
      .eq("id", campaign_id);
  }

  return jsonResponse({
    success: true,
    media: {
      id: media.id,
      file_url: media.file_url,
      thumbnail_url: media.thumbnail_url,
      media_type: media.media_type,
      is_primary: media.is_primary,
    },
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate from JWT (never trust user_id from request body)
    const user = await authenticateUser(req, supabaseUrl, supabaseAnonKey);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    if (req.method === "POST") {
      return await handleCreate(supabase, user.id, body as CreatePayload);
    }

    if (req.method === "PUT") {
      return await handleConfirm(supabase, user.id, body as ConfirmPayload);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    console.error("Error in upload-campaign-media:", error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
});
