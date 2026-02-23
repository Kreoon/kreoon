// ============================================================================
// KREOON SOCIAL PUBLISH SERVICE
// Edge Function to publish content to social media platforms
// Supports: Facebook, Instagram, TikTok, YouTube, Twitter/X, LinkedIn, Pinterest
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface TargetAccount {
  account_id: string;
  platform: string;
}

interface PublishResult {
  account_id: string;
  platform: string;
  platform_post_id: string | null;
  status: "success" | "failed";
  error: string | null;
  published_at: string | null;
}

interface SocialAccount {
  id: string;
  platform: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  platform_user_id: string;
  platform_page_id: string | null;
  metadata: Record<string, unknown>;
}

interface ScheduledPost {
  id: string;
  user_id: string;
  organization_id: string | null;
  caption: string | null;
  hashtags: string[];
  post_type: string;
  visibility: string;
  first_comment: string | null;
  media_urls: string[];
  thumbnail_url: string | null;
  target_accounts: TargetAccount[];
  publish_results: PublishResult[];
  retry_count: number;
  max_retries: number;
  metadata: Record<string, unknown>;
}

// ── Utility helpers ──────────────────────────────────────────────────────────

function buildCaption(post: ScheduledPost): string {
  let text = post.caption || "";
  if (post.hashtags && post.hashtags.length > 0) {
    const tags = post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`));
    text = text ? `${text}\n\n${tags.join(" ")}` : tags.join(" ");
  }
  return text;
}

function getMediaType(
  url: string
): "image" | "video" | "unknown" {
  const lower = url.toLowerCase();

  // Bunny CDN video patterns (play_720p.mp4, embed URLs)
  if (
    /b-cdn\.net\/[a-f0-9-]+\/play_/i.test(url) ||
    /mediadelivery\.net\/embed\//i.test(url)
  ) {
    return "video";
  }

  // Bunny CDN thumbnail patterns
  if (/b-cdn\.net\/[a-f0-9-]+\/thumbnail/i.test(url)) {
    return "image";
  }

  if (
    lower.includes(".jpg") ||
    lower.includes(".jpeg") ||
    lower.includes(".png") ||
    lower.includes(".gif") ||
    lower.includes(".webp") ||
    lower.includes(".bmp")
  ) {
    return "image";
  }
  if (
    lower.includes(".mp4") ||
    lower.includes(".mov") ||
    lower.includes(".avi") ||
    lower.includes(".webm") ||
    lower.includes(".m4v") ||
    lower.includes(".mkv")
  ) {
    return "video";
  }
  return "unknown";
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Bunny CDN URL detection & download ──────────────────────────────────────

function isBunnyCdnUrl(url: string): boolean {
  return /b-cdn\.net\//i.test(url) || /iframe\.mediadelivery\.net\//i.test(url);
}

function isSupabaseStorageUrl(url: string): boolean {
  return url.includes(".supabase.co/storage/") || url.includes(".supabase.in/storage/");
}

/**
 * Extract video ID from a Bunny CDN or embed URL.
 */
function extractBunnyVideoId(url: string): string | null {
  // CDN: https://vz-xxx.b-cdn.net/{videoId}/play_720p.mp4
  const cdnMatch = url.match(/b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) return cdnMatch[1];

  // Embed: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
  const embedMatch = url.match(/mediadelivery\.net\/(?:embed|play)\/[^/]+\/([a-f0-9-]+)/i);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * Find the best available quality for a Bunny CDN video.
 * Probes from highest to lowest: original → 2160p → 1440p → 1080p → 720p → 480p.
 * Returns the URL of the best quality available.
 */
async function findBestBunnyQuality(url: string): Promise<string> {
  const videoId = extractBunnyVideoId(url);
  if (!videoId) return url;

  // Extract CDN host from URL, or use default
  const hostMatch = url.match(/(vz-[a-f0-9-]+\.b-cdn\.net)/i);
  const cdnHost =
    hostMatch?.[1] ||
    Deno.env.get("BUNNY_CDN_HOSTNAME") ||
    "vz-78fcd769-050.b-cdn.net";

  const frontendUrl =
    Deno.env.get("FRONTEND_URL") ||
    Deno.env.get("SITE_URL") ||
    "https://app.kreoon.com";

  // Probe from highest to lowest quality (transcoded MP4s only - guaranteed compatible)
  // Bunny only creates transcodes up to the source resolution, so the first hit = upload quality
  const qualities = ["play_2160p.mp4", "play_1440p.mp4", "play_1080p.mp4", "play_720p.mp4", "play_480p.mp4"];

  for (const quality of qualities) {
    const candidate = `https://${cdnHost}/${videoId}/${quality}`;
    try {
      const head = await fetch(candidate, {
        method: "HEAD",
        headers: { Referer: frontendUrl },
      });
      if (head.ok) {
        const contentLength = head.headers.get("content-length");
        const sizeKB = contentLength ? Math.round(parseInt(contentLength) / 1024) : 0;
        console.log(
          `[findBestBunnyQuality] Best quality: ${quality} (${sizeKB} KB) for video ${videoId}`
        );
        return candidate;
      }
    } catch {
      // ignore and keep trying
    }
  }

  console.warn(`[findBestBunnyQuality] No quality probes succeeded, using original URL`);
  return url;
}

/**
 * Download media with Bunny CDN hotlink protection handling.
 * Bunny CDN blocks server-side fetches (403) due to hotlink protection.
 * We add a Referer header matching the configured frontend domain.
 */
async function downloadMedia(url: string): Promise<Blob> {
  if (isBunnyCdnUrl(url)) {
    const frontendUrl =
      Deno.env.get("FRONTEND_URL") ||
      Deno.env.get("SITE_URL") ||
      "https://app.kreoon.com";
    console.log(
      `[downloadMedia] Bunny CDN URL detected, trying with Referer: ${frontendUrl}`
    );

    const res = await fetch(url, {
      headers: {
        Referer: frontendUrl,
        "User-Agent": "Mozilla/5.0 KreoonSocialPublish/1.0",
      },
    });

    if (res.ok) {
      return await res.blob();
    }

    console.warn(
      `[downloadMedia] Referer approach returned ${res.status}, trying direct fetch...`
    );

    // Fallback: try without extra headers (empty referer may pass)
    const res2 = await fetch(url);
    if (res2.ok) {
      return await res2.blob();
    }

    throw new Error(
      `Failed to download Bunny CDN media from ${url}: ${res2.status} ${res2.statusText}`
    );
  }

  // Non-Bunny URLs: fetch normally
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download media from ${url}: ${res.status} ${res.statusText}`
    );
  }
  return await res.blob();
}

// ── Media re-hosting (download from CDN → Supabase Storage) ─────────────────

const IG_TEMP_BUCKET = "social-temp";

async function ensureTempBucket(
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  // Try to create the bucket; ignore if it already exists
  const { error } = await supabase.storage.createBucket(IG_TEMP_BUCKET, {
    public: true,
    fileSizeLimit: 500 * 1024 * 1024, // 500MB max for videos
  });
  if (error && !error.message?.includes("already exists")) {
    console.warn("Bucket creation warning:", error.message);
  }
}

async function rehostMediaForIG(
  supabase: ReturnType<typeof createClient>,
  mediaUrl: string
): Promise<{ publicUrl: string; storagePath: string }> {
  console.log(`[rehost] Downloading media from: ${mediaUrl}`);
  const blob = await downloadMedia(mediaUrl);
  console.log(`[rehost] Downloaded ${blob.size} bytes, type: ${blob.type}`);

  // Extract extension from URL
  const urlPath = new URL(mediaUrl).pathname;
  const ext = urlPath.split(".").pop()?.split("?")[0] || "mp4";
  const fileName = `ig-temp/${crypto.randomUUID()}.${ext}`;

  // Determine content type
  let contentType = blob.type || "application/octet-stream";
  if (contentType === "application/octet-stream") {
    if (ext === "mp4" || ext === "m4v") contentType = "video/mp4";
    else if (ext === "mov") contentType = "video/quicktime";
    else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    else if (ext === "png") contentType = "image/png";
    else if (ext === "webp") contentType = "image/webp";
  }

  // Upload to Supabase Storage public bucket
  const { error } = await supabase.storage
    .from(IG_TEMP_BUCKET)
    .upload(fileName, blob, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Failed to upload media to temp storage: ${error.message}`
    );
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from(IG_TEMP_BUCKET)
    .getPublicUrl(fileName);

  console.log(`[IG rehost] Rehosted to: ${urlData.publicUrl}`);
  return { publicUrl: urlData.publicUrl, storagePath: fileName };
}

async function cleanupTempMedia(
  supabase: ReturnType<typeof createClient>,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return;
  try {
    const { error } = await supabase.storage
      .from(IG_TEMP_BUCKET)
      .remove(paths);
    if (error) {
      console.warn("[IG rehost] Cleanup warning:", error.message);
    } else {
      console.log(`[IG rehost] Cleaned up ${paths.length} temp files`);
    }
  } catch (err) {
    console.warn("[IG rehost] Cleanup error:", err);
  }
}

// ── Pre-resolve Bunny CDN URLs to public Supabase Storage URLs ──────────────

async function resolveMediaUrls(
  supabase: ReturnType<typeof createClient>,
  post: ScheduledPost
): Promise<{ resolvedPost: ScheduledPost; tempPaths: string[] }> {
  const tempPaths: string[] = [];
  const hasBunnyMedia = post.media_urls?.some((url) => isBunnyCdnUrl(url));
  const hasBunnyThumb =
    post.thumbnail_url != null && isBunnyCdnUrl(post.thumbnail_url);

  if (!hasBunnyMedia && !hasBunnyThumb) {
    return { resolvedPost: post, tempPaths };
  }

  console.log(
    `[resolveMediaUrls] Resolving ${post.media_urls?.length || 0} media URLs + thumbnail`
  );
  await ensureTempBucket(supabase);

  const resolvedMediaUrls: string[] = [];

  if (post.media_urls && post.media_urls.length > 0) {
    for (const url of post.media_urls) {
      if (isBunnyCdnUrl(url)) {
        // Find best available quality before downloading
        const bestUrl = await findBestBunnyQuality(url);
        const { publicUrl, storagePath } = await rehostMediaForIG(
          supabase,
          bestUrl
        );
        resolvedMediaUrls.push(publicUrl);
        tempPaths.push(storagePath);
      } else {
        resolvedMediaUrls.push(url);
      }
    }
  }

  let resolvedThumbnailUrl = post.thumbnail_url;
  if (hasBunnyThumb && post.thumbnail_url) {
    const { publicUrl, storagePath } = await rehostMediaForIG(
      supabase,
      post.thumbnail_url
    );
    resolvedThumbnailUrl = publicUrl;
    tempPaths.push(storagePath);
  }

  console.log(
    `[resolveMediaUrls] Resolved ${tempPaths.length} Bunny CDN URLs to Supabase Storage`
  );

  return {
    resolvedPost: {
      ...post,
      media_urls: resolvedMediaUrls,
      thumbnail_url: resolvedThumbnailUrl,
    },
    tempPaths,
  };
}

// ── Facebook Publish ─────────────────────────────────────────────────────────

async function publishToFacebook(
  account: SocialAccount,
  post: ScheduledPost
): Promise<{ platform_post_id: string }> {
  const pageId = account.platform_page_id || account.platform_user_id;
  const token = account.access_token;
  const caption = buildCaption(post);
  const baseUrl = "https://graph.facebook.com/v21.0";

  const isStory = post.post_type === "story";

  // No media - text post (stories require media)
  if (!post.media_urls || post.media_urls.length === 0) {
    const res = await fetch(`${baseUrl}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: caption,
        access_token: token,
      }),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(
        `Facebook API error: ${data.error.message || JSON.stringify(data.error)}`
      );
    }
    return { platform_post_id: data.id };
  }

  const firstMedia = post.media_urls[0];
  const mediaType = getMediaType(firstMedia);

  // ── Facebook Story ──
  if (isStory) {
    console.log(`[FB publish] Publishing as Story, mediaType=${mediaType}`);
    if (mediaType === "video") {
      const res = await fetch(`${baseUrl}/${pageId}/video_stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_phase: "start",
          access_token: token,
        }),
      });
      const startData = await res.json();
      if (startData.error) {
        throw new Error(`Facebook Story video start error: ${startData.error.message || JSON.stringify(startData.error)}`);
      }
      const videoId = startData.video_id;
      // Upload video
      const uploadRes = await fetch(`${baseUrl}/${videoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_phase: "transfer",
          file_url: firstMedia,
          access_token: token,
        }),
      });
      const uploadData = await uploadRes.json();
      if (uploadData.error) {
        throw new Error(`Facebook Story video upload error: ${uploadData.error.message || JSON.stringify(uploadData.error)}`);
      }
      // Finish
      const finishRes = await fetch(`${baseUrl}/${pageId}/video_stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          upload_phase: "finish",
          access_token: token,
        }),
      });
      const finishData = await finishRes.json();
      if (finishData.error) {
        throw new Error(`Facebook Story video finish error: ${finishData.error.message || JSON.stringify(finishData.error)}`);
      }
      return { platform_post_id: finishData.id || String(videoId) };
    } else {
      // Image story
      const res = await fetch(`${baseUrl}/${pageId}/photo_stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_id: firstMedia,
          url: firstMedia,
          access_token: token,
        }),
      });
      const data = await res.json();
      if (data.error) {
        // Fallback: upload photo first, then use photo_id
        console.log("[FB Story] Direct URL failed, trying with uploaded photo...");
        const photoRes = await fetch(`${baseUrl}/${pageId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: firstMedia,
            published: false,
            access_token: token,
          }),
        });
        const photoData = await photoRes.json();
        if (photoData.error) {
          throw new Error(`Facebook Story photo upload error: ${photoData.error.message || JSON.stringify(photoData.error)}`);
        }
        const storyRes = await fetch(`${baseUrl}/${pageId}/photo_stories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photo_id: photoData.id,
            access_token: token,
          }),
        });
        const storyData = await storyRes.json();
        if (storyData.error) {
          throw new Error(`Facebook Story publish error: ${storyData.error.message || JSON.stringify(storyData.error)}`);
        }
        return { platform_post_id: storyData.id || storyData.post_id };
      }
      return { platform_post_id: data.id || data.post_id };
    }
  }

  // Single image
  if (mediaType === "image" && post.media_urls.length === 1) {
    const res = await fetch(`${baseUrl}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: firstMedia,
        caption: caption,
        access_token: token,
      }),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(
        `Facebook Photos API error: ${data.error.message || JSON.stringify(data.error)}`
      );
    }
    return { platform_post_id: data.id || data.post_id };
  }

  // Multiple images - create unpublished photos, then post with attached_media
  if (mediaType === "image" && post.media_urls.length > 1) {
    const photoIds: string[] = [];

    for (const url of post.media_urls) {
      const res = await fetch(`${baseUrl}/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url,
          published: false,
          access_token: token,
        }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(
          `Facebook multi-photo upload error: ${data.error.message || JSON.stringify(data.error)}`
        );
      }
      photoIds.push(data.id);
    }

    // Create the multi-photo post
    const attachedMedia: Record<string, { media_fbid: string }> = {};
    photoIds.forEach((id, idx) => {
      attachedMedia[`attached_media[${idx}]`] = { media_fbid: id };
    });

    const params = new URLSearchParams();
    params.append("message", caption);
    params.append("access_token", token);
    photoIds.forEach((id, idx) => {
      params.append(`attached_media[${idx}]`, JSON.stringify({ media_fbid: id }));
    });

    const res = await fetch(`${baseUrl}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(
        `Facebook multi-photo post error: ${data.error.message || JSON.stringify(data.error)}`
      );
    }
    return { platform_post_id: data.id };
  }

  // Video (Reel or regular video)
  if (mediaType === "video") {
    const isReel = post.post_type === "reel" || post.post_type === "short";
    const endpoint = isReel ? `${baseUrl}/${pageId}/video_reels` : `${baseUrl}/${pageId}/videos`;

    console.log(`[FB publish] Publishing video as ${isReel ? 'Reel' : 'Video'}`);
    const videoBody: Record<string, unknown> = {
      file_url: firstMedia,
      description: caption,
      access_token: token,
    };
    if (isReel) {
      videoBody.upload_phase = "start";
    }

    if (isReel) {
      // Facebook Reels: start → transfer → finish
      const startRes = await fetch(`${baseUrl}/${pageId}/video_reels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_phase: "start", access_token: token }),
      });
      const startData = await startRes.json();
      if (startData.error) {
        // Fallback to regular video upload if Reels API fails
        console.log("[FB Reel] Reels API failed, falling back to /videos:", startData.error.message);
        const fallbackRes = await fetch(`${baseUrl}/${pageId}/videos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_url: firstMedia, description: caption, access_token: token }),
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.error) {
          throw new Error(`Facebook Video API error: ${fallbackData.error.message || JSON.stringify(fallbackData.error)}`);
        }
        return { platform_post_id: fallbackData.id };
      }
      const videoId = startData.video_id;
      // Transfer
      await fetch(`${baseUrl}/${videoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_phase: "transfer", file_url: firstMedia, access_token: token }),
      });
      // Finish
      const finishRes = await fetch(`${baseUrl}/${pageId}/video_reels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_phase: "finish", video_id: videoId, description: caption, access_token: token }),
      });
      const finishData = await finishRes.json();
      if (finishData.error) {
        throw new Error(`Facebook Reel finish error: ${finishData.error.message || JSON.stringify(finishData.error)}`);
      }
      return { platform_post_id: finishData.id || String(videoId) };
    }

    // Regular video
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: firstMedia,
        description: caption,
        access_token: token,
      }),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(
        `Facebook Video API error: ${data.error.message || JSON.stringify(data.error)}`
      );
    }
    return { platform_post_id: data.id };
  }

  // Fallback: link post with media URL
  const res = await fetch(`${baseUrl}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: caption,
      link: firstMedia,
      access_token: token,
    }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(
      `Facebook Feed API error: ${data.error.message || JSON.stringify(data.error)}`
    );
  }
  return { platform_post_id: data.id };
}

// ── Facebook Delete ──────────────────────────────────────────────────────────

async function deleteFromFacebook(
  account: SocialAccount,
  platformPostId: string
): Promise<void> {
  const token = account.access_token;
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${platformPostId}?access_token=${token}`,
    { method: "DELETE" }
  );
  const data = await res.json();
  if (data.error) {
    throw new Error(
      `Facebook delete error: ${data.error.message || JSON.stringify(data.error)}`
    );
  }
}

// ── Instagram Publish ────────────────────────────────────────────────────────

async function pollInstagramMediaStatus(
  containerId: string,
  token: string,
  maxAttempts = 30,
  intervalMs = 5000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${containerId}?fields=status_code,status&access_token=${token}`
    );
    const data = await res.json();

    if (data.error) {
      throw new Error(
        `Instagram status poll error: ${data.error.message || JSON.stringify(data.error)}`
      );
    }

    if (data.status_code === "FINISHED") {
      return;
    }

    if (data.status_code === "ERROR") {
      throw new Error(
        `Instagram media processing failed: ${data.status || "Unknown error"}`
      );
    }

    // IN_PROGRESS - wait and retry
    await sleep(intervalMs);
  }

  throw new Error(
    "Instagram media processing timed out after " +
      maxAttempts * intervalMs / 1000 +
      " seconds"
  );
}

async function publishToInstagram(
  account: SocialAccount,
  post: ScheduledPost
): Promise<{ platform_post_id: string }> {
  // platform_user_id holds the IG Business Account ID (17841xxx)
  // platform_page_id holds the Facebook Page ID — wrong for IG API calls
  const igUserId = account.platform_user_id || account.platform_page_id;
  const token = account.access_token;
  const caption = buildCaption(post);
  const baseUrl = "https://graph.facebook.com/v21.0";

  if (!post.media_urls || post.media_urls.length === 0) {
    throw new Error("Instagram requires at least one media item");
  }

  // ── Re-host all media to publicly accessible Supabase Storage URLs ──
  // Instagram's servers need to fetch media from the URL, but CDN URLs
  // (e.g. Bunny CDN) may not be accessible from Meta's servers.
  // If URLs are already Supabase Storage URLs (pre-resolved), skip re-hosting.
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  await ensureTempBucket(supabase);

  const rehostedMedia: { publicUrl: string; storagePath: string }[] = [];
  const tempPaths: string[] = [];

  try {
    for (const url of post.media_urls) {
      if (isSupabaseStorageUrl(url)) {
        // Already a public Supabase Storage URL (pre-resolved by resolveMediaUrls)
        rehostedMedia.push({ publicUrl: url, storagePath: "" });
      } else {
        const rehosted = await rehostMediaForIG(supabase, url);
        rehostedMedia.push(rehosted);
        tempPaths.push(rehosted.storagePath);
      }
    }

    // Also rehost thumbnail if present
    let rehostedThumbnailUrl: string | null = null;
    if (post.thumbnail_url) {
      if (isSupabaseStorageUrl(post.thumbnail_url)) {
        rehostedThumbnailUrl = post.thumbnail_url;
      } else {
        const thumbRehosted = await rehostMediaForIG(supabase, post.thumbnail_url);
        rehostedThumbnailUrl = thumbRehosted.publicUrl;
        tempPaths.push(thumbRehosted.storagePath);
      }
    }

    const isStory = post.post_type === "story";
    const isCarousel =
      post.post_type === "carousel" || (!isStory && post.media_urls.length > 1);

    // ── Instagram Story ──
    if (isStory) {
      const publicUrl = rehostedMedia[0].publicUrl;
      const mType = getMediaType(post.media_urls[0]);
      console.log(`[IG publish] Publishing as Story, mediaType=${mType}`);

      const storyBody: Record<string, string> = {
        media_type: "STORIES",
        access_token: token,
      };

      if (mType === "video") {
        storyBody.video_url = publicUrl;
      } else {
        storyBody.image_url = publicUrl;
      }

      // Create story container
      const containerRes = await fetch(`${baseUrl}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storyBody),
      });
      const containerData = await containerRes.json();
      if (containerData.error) {
        throw new Error(
          `Instagram Story container error: ${containerData.error.message || JSON.stringify(containerData.error)}`
        );
      }
      console.log(`[IG publish] Story container created: ${containerData.id}`);

      // For video stories, poll until processing is complete
      if (mType === "video") {
        await pollInstagramMediaStatus(containerData.id, token);
      }

      // Publish story
      const publishRes = await fetch(`${baseUrl}/${igUserId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: token,
        }),
      });
      const publishData = await publishRes.json();
      if (publishData.error) {
        throw new Error(
          `Instagram Story publish error: ${publishData.error.message || JSON.stringify(publishData.error)}`
        );
      }
      console.log(`[IG publish] Story published successfully: ${publishData.id}`);
      return { platform_post_id: publishData.id };
    }

    // ── Carousel ──
    if (isCarousel) {
      const childIds: string[] = [];

      for (let i = 0; i < rehostedMedia.length; i++) {
        const publicUrl = rehostedMedia[i].publicUrl;
        const mType = getMediaType(post.media_urls[i]);
        const childBody: Record<string, string> = {
          is_carousel_item: "true",
          access_token: token,
        };

        if (mType === "video") {
          childBody.media_type = "VIDEO";
          childBody.video_url = publicUrl;
        } else {
          childBody.media_type = "IMAGE";
          childBody.image_url = publicUrl;
        }

        const childRes = await fetch(`${baseUrl}/${igUserId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(childBody),
        });
        const childData = await childRes.json();
        if (childData.error) {
          throw new Error(
            `Instagram carousel item error: ${childData.error.message || JSON.stringify(childData.error)}`
          );
        }

        // Poll video items until ready
        if (mType === "video") {
          await pollInstagramMediaStatus(childData.id, token);
        }

        childIds.push(childData.id);
      }

      // Create carousel container
      const containerRes = await fetch(`${baseUrl}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "CAROUSEL",
          caption: caption,
          children: childIds.join(","),
          access_token: token,
        }),
      });
      const containerData = await containerRes.json();
      if (containerData.error) {
        throw new Error(
          `Instagram carousel container error: ${containerData.error.message || JSON.stringify(containerData.error)}`
        );
      }

      // Publish carousel
      const publishRes = await fetch(
        `${baseUrl}/${igUserId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerData.id,
            access_token: token,
          }),
        }
      );
      const publishData = await publishRes.json();
      if (publishData.error) {
        throw new Error(
          `Instagram carousel publish error: ${publishData.error.message || JSON.stringify(publishData.error)}`
        );
      }
      return { platform_post_id: publishData.id };
    }

    // ── Single image or video ──
    const publicUrl = rehostedMedia[0].publicUrl;
    const mType = getMediaType(post.media_urls[0]);

    const containerBody: Record<string, string> = {
      caption: caption,
      access_token: token,
    };

    if (mType === "video") {
      // Determine if it's a Reel or regular video
      const isReel =
        post.post_type === "reel" || post.post_type === "short";
      containerBody.media_type = isReel ? "REELS" : "VIDEO";
      containerBody.video_url = publicUrl;

      if (rehostedThumbnailUrl) {
        containerBody.cover_url = rehostedThumbnailUrl;
      }
    } else {
      containerBody.media_type = "IMAGE";
      containerBody.image_url = publicUrl;
    }

    // Create media container
    console.log(`[IG publish] Creating container for ${igUserId}, media_type=${containerBody.media_type}`);
    const containerRes = await fetch(`${baseUrl}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    });
    const containerData = await containerRes.json();
    if (containerData.error) {
      throw new Error(
        `Instagram container error: ${containerData.error.message || JSON.stringify(containerData.error)}`
      );
    }
    console.log(`[IG publish] Container created: ${containerData.id}`);

    // For video, poll until processing is complete
    if (mType === "video") {
      await pollInstagramMediaStatus(containerData.id, token);
    }

    // Publish
    const publishRes = await fetch(
      `${baseUrl}/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: token,
        }),
      }
    );
    const publishData = await publishRes.json();
    if (publishData.error) {
      throw new Error(
        `Instagram publish error: ${publishData.error.message || JSON.stringify(publishData.error)}`
      );
    }

    console.log(`[IG publish] Published successfully: ${publishData.id}`);
    return { platform_post_id: publishData.id };
  } finally {
    // Always clean up temp files, even on error
    await cleanupTempMedia(supabase, tempPaths);
  }
}

// ── Instagram Delete ─────────────────────────────────────────────────────────

async function deleteFromInstagram(
  account: SocialAccount,
  platformPostId: string
): Promise<void> {
  // Instagram does not support deletion via the Content Publishing API.
  // Only comments can be deleted. Posts must be deleted manually.
  throw new Error(
    "Instagram does not support programmatic post deletion via the API. " +
      "The post must be deleted manually from the Instagram app."
  );
}

// ── TikTok Publish ───────────────────────────────────────────────────────────

async function publishToTikTok(
  account: SocialAccount,
  post: ScheduledPost
): Promise<{ platform_post_id: string }> {
  const token = account.access_token;
  const caption = buildCaption(post);

  if (!post.media_urls || post.media_urls.length === 0) {
    throw new Error("TikTok requires a video to publish");
  }

  const videoUrl = post.media_urls[0];

  // ── Step 0: Query creator info for allowed privacy levels ──
  console.log(`[publishToTikTok] Querying creator info...`);
  const creatorInfoRes = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    }
  );
  const creatorInfo = await creatorInfoRes.json();
  console.log(`[publishToTikTok] Creator info: ${JSON.stringify(creatorInfo)}`);

  const allowedPrivacyLevels: string[] =
    creatorInfo.data?.privacy_level_options || ["SELF_ONLY"];

  // Determine privacy level based on user preference + allowed levels
  let desiredLevel = "PUBLIC_TO_EVERYONE";
  if (post.visibility === "private") {
    desiredLevel = "SELF_ONLY";
  } else if (post.visibility === "friends") {
    desiredLevel = "MUTUAL_FOLLOW_FRIENDS";
  } else if (post.visibility === "followers") {
    desiredLevel = "FOLLOWER_OF_CREATOR";
  }

  // Use desired level if allowed, otherwise fall back to best available
  const privacyLevel = allowedPrivacyLevels.includes(desiredLevel)
    ? desiredLevel
    : allowedPrivacyLevels[0] || "SELF_ONLY";

  if (privacyLevel !== desiredLevel) {
    console.log(
      `[publishToTikTok] Desired privacy '${desiredLevel}' not allowed. Using '${privacyLevel}'. Allowed: ${allowedPrivacyLevels.join(", ")}`
    );
  }

  // Disable toggles from metadata if provided
  const disableDuet =
    (post.metadata?.disable_duet as boolean) ??
    (creatorInfo.data?.duet_disabled === true);
  const disableComment =
    (post.metadata?.disable_comment as boolean) ??
    (creatorInfo.data?.comment_disabled === true);
  const disableStitch =
    (post.metadata?.disable_stitch as boolean) ??
    (creatorInfo.data?.stitch_disabled === true);

  // ── Step 1: Download video binary ──
  console.log(`[publishToTikTok] Downloading video from ${videoUrl}`);
  const videoBlob = await downloadMedia(videoUrl);
  const videoSize = videoBlob.size;
  console.log(`[publishToTikTok] Downloaded ${videoSize} bytes`);

  if (videoSize === 0) {
    throw new Error("Downloaded video is empty (0 bytes)");
  }

  // Use a single chunk for files under 64MB, otherwise chunk
  const MAX_CHUNK = 64 * 1024 * 1024; // 64MB
  const chunkSize = Math.min(videoSize, MAX_CHUNK);
  const totalChunkCount = Math.ceil(videoSize / chunkSize);

  // ── Step 2: Initialize upload via FILE_UPLOAD ──
  const initBody = {
    post_info: {
      title: caption.substring(0, 2200),
      privacy_level: privacyLevel,
      disable_duet: disableDuet,
      disable_comment: disableComment,
      disable_stitch: disableStitch,
    },
    source_info: {
      source: "FILE_UPLOAD",
      video_size: videoSize,
      chunk_size: chunkSize,
      total_chunk_count: totalChunkCount,
    },
  };

  console.log(`[publishToTikTok] Init FILE_UPLOAD: size=${videoSize}, chunks=${totalChunkCount}`);

  const initRes = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(initBody),
    }
  );

  const initData = await initRes.json();
  console.log(`[publishToTikTok] Init response: ${JSON.stringify(initData)}`);

  if (initData.error && initData.error.code !== "ok") {
    throw new Error(
      `TikTok API error: ${initData.error.message || initData.error.code || JSON.stringify(initData.error)}`
    );
  }

  const uploadUrl = initData.data?.upload_url;
  const publishId = initData.data?.publish_id;

  if (!uploadUrl || !publishId) {
    throw new Error(`TikTok init did not return upload_url or publish_id: ${JSON.stringify(initData)}`);
  }

  // ── Step 3: Upload video in chunks via PUT ──
  const videoBuffer = await videoBlob.arrayBuffer();

  for (let i = 0; i < totalChunkCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, videoSize);
    const chunk = videoBuffer.slice(start, end);

    console.log(`[publishToTikTok] Uploading chunk ${i + 1}/${totalChunkCount}: bytes ${start}-${end - 1}/${videoSize}`);

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": `${end - start}`,
        "Content-Range": `bytes ${start}-${end - 1}/${videoSize}`,
      },
      body: chunk,
    });

    // 201 = complete, 206 = partial (more chunks needed)
    if (uploadRes.status !== 201 && uploadRes.status !== 206) {
      const errText = await uploadRes.text();
      throw new Error(`TikTok upload chunk ${i + 1} failed (${uploadRes.status}): ${errText}`);
    }

    console.log(`[publishToTikTok] Chunk ${i + 1} uploaded: status=${uploadRes.status}`);
  }

  // ── Step 4: Poll for publish status ──
  console.log(`[publishToTikTok] Upload complete, polling publish_id=${publishId}`);
  let finalPostId: string | null = null;

  for (let i = 0; i < 30; i++) {
    await sleep(5000);
    const statusRes = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ publish_id: publishId }),
      }
    );
    const statusData = await statusRes.json();
    console.log(`[publishToTikTok] Status poll ${i + 1}: ${JSON.stringify(statusData)}`);

    if (
      statusData.data?.status === "PUBLISH_COMPLETE" ||
      statusData.data?.status === "SEND_TO_USER_INBOX"
    ) {
      finalPostId = statusData.data?.publicaly_available_post_id?.[0] || publishId;
      break;
    }

    if (statusData.data?.status === "FAILED") {
      throw new Error(
        `TikTok publish failed: ${statusData.data?.fail_reason || "Unknown reason"}`
      );
    }
  }

  return { platform_post_id: finalPostId || publishId };
}

// ── TikTok Delete ────────────────────────────────────────────────────────────

async function deleteFromTikTok(
  account: SocialAccount,
  platformPostId: string
): Promise<void> {
  // TikTok Content Posting API does not support deletion of posts.
  throw new Error(
    "TikTok does not support programmatic post deletion via the Content Posting API. " +
      "The video must be deleted manually from TikTok."
  );
}

// ── YouTube Publish ──────────────────────────────────────────────────────────

async function publishToYouTube(
  account: SocialAccount,
  post: ScheduledPost
): Promise<{ platform_post_id: string }> {
  const token = account.access_token;
  const caption = buildCaption(post);

  if (!post.media_urls || post.media_urls.length === 0) {
    throw new Error("YouTube requires a video to publish");
  }

  const videoUrl = post.media_urls[0];

  // Extract metadata
  const title =
    (post.metadata?.title as string) ||
    (post.caption || "").substring(0, 100) ||
    "Untitled";
  const tags = (post.metadata?.tags as string[]) || post.hashtags || [];

  // Determine privacy
  let privacyStatus = "public";
  if (post.visibility === "private") {
    privacyStatus = "private";
  } else if (post.visibility === "unlisted") {
    privacyStatus = "unlisted";
  }

  const isShort = post.post_type === "short";

  // Determine the snippet title - for Shorts, append #Shorts if not present
  let snippetTitle = title;
  if (isShort && !snippetTitle.includes("#Shorts")) {
    snippetTitle = `${snippetTitle} #Shorts`;
  }

  // Build the video resource
  const videoResource = {
    snippet: {
      title: snippetTitle.substring(0, 100),
      description: caption,
      tags: tags,
      categoryId: (post.metadata?.category_id as string) || "22", // 22 = People & Blogs
    },
    status: {
      privacyStatus: privacyStatus,
      selfDeclaredMadeForKids: false,
      ...(post.metadata?.publish_at
        ? { publishAt: post.metadata.publish_at as string }
        : {}),
    },
  };

  // Step 1: Initiate resumable upload
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "application/octet-stream",
      },
      body: JSON.stringify(videoResource),
    }
  );

  if (!initRes.ok) {
    const errData = await initRes.json().catch(() => ({}));
    throw new Error(
      `YouTube upload init error (${initRes.status}): ${JSON.stringify(errData)}`
    );
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("YouTube did not return a resumable upload URL");
  }

  // Step 2: Download the video from our CDN
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) {
    throw new Error(
      `Failed to download video from ${videoUrl}: ${videoRes.status}`
    );
  }
  const videoBlob = await videoRes.blob();

  // Step 3: Upload the video binary to the resumable URL
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(videoBlob.size),
    },
    body: videoBlob,
  });

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}));
    throw new Error(
      `YouTube upload error (${uploadRes.status}): ${JSON.stringify(errData)}`
    );
  }

  const uploadData = await uploadRes.json();

  if (!uploadData.id) {
    throw new Error(
      `YouTube upload did not return video ID: ${JSON.stringify(uploadData)}`
    );
  }

  // Set thumbnail if provided
  if (post.thumbnail_url) {
    try {
      const thumbRes = await fetch(post.thumbnail_url);
      if (thumbRes.ok) {
        const thumbBlob = await thumbRes.blob();
        await fetch(
          `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${uploadData.id}&uploadType=media`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": thumbBlob.type || "image/jpeg",
            },
            body: thumbBlob,
          }
        );
      }
    } catch {
      // Thumbnail upload is best-effort, don't fail the publish
      console.warn("YouTube thumbnail upload failed, continuing");
    }
  }

  return { platform_post_id: uploadData.id };
}

// ── YouTube Delete ───────────────────────────────────────────────────────────

async function deleteFromYouTube(
  account: SocialAccount,
  platformPostId: string
): Promise<void> {
  const token = account.access_token;
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${platformPostId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok && res.status !== 204) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      `YouTube delete error (${res.status}): ${JSON.stringify(errData)}`
    );
  }
}

// ── Twitter/X Publish ────────────────────────────────────────────────────────

/**
 * Twitter OAuth 1.0a HMAC-SHA1 signature generation.
 * Used for media upload v1.1 endpoint.
 */
async function generateTwitterOAuthHeader(
  method: string,
  url: string,
  params: Record<string, string>,
  account: SocialAccount
): Promise<string> {
  const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY") || "";
  const consumerSecret = Deno.env.get("TWITTER_CONSUMER_SECRET") || "";
  const oauthToken = account.access_token;
  const oauthTokenSecret =
    (account.metadata?.oauth_token_secret as string) ||
    account.refresh_token ||
    "";

  const oauthNonce = crypto.randomUUID().replace(/-/g, "");
  const oauthTimestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: oauthNonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: oauthTimestamp,
    oauth_token: oauthToken,
    oauth_version: "1.0",
  };

  // Combine all params for signature base
  const allParams = { ...oauthParams, ...params };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map(
      (k) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`
    )
    .join("&");

  const signatureBase = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(oauthTokenSecret)}`;

  // HMAC-SHA1
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signatureBase)
  );

  // Base64 encode
  const signatureArray = new Uint8Array(signatureBytes);
  let binary = "";
  for (const byte of signatureArray) {
    binary += String.fromCharCode(byte);
  }
  const oauthSignature = btoa(binary);

  oauthParams.oauth_signature = oauthSignature;

  const authHeader =
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map(
        (k) =>
          `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`
      )
      .join(", ");

  return authHeader;
}

/**
 * Upload media to Twitter using chunked upload (v1.1).
 * Returns the media_id_string.
 */
async function twitterUploadMedia(
  account: SocialAccount,
  mediaUrl: string,
  mediaType: "image" | "video"
): Promise<string> {
  const uploadEndpoint = "https://upload.twitter.com/1.1/media/upload.json";

  // Download the media
  const mediaRes = await fetch(mediaUrl);
  if (!mediaRes.ok) {
    throw new Error(`Failed to download media for Twitter: ${mediaRes.status}`);
  }
  const mediaBlob = await mediaRes.blob();
  const mediaBytes = new Uint8Array(await mediaBlob.arrayBuffer());
  const totalBytes = mediaBytes.length;
  const mimeType =
    mediaType === "video" ? "video/mp4" : mediaBlob.type || "image/jpeg";

  const mediaCategory =
    mediaType === "video" ? "tweet_video" : "tweet_image";

  // ── INIT ──
  const initParams: Record<string, string> = {
    command: "INIT",
    total_bytes: String(totalBytes),
    media_type: mimeType,
    media_category: mediaCategory,
  };
  const initAuth = await generateTwitterOAuthHeader(
    "POST",
    uploadEndpoint,
    initParams,
    account
  );

  const initForm = new URLSearchParams();
  for (const [k, v] of Object.entries(initParams)) {
    initForm.append(k, v);
  }

  const initRes = await fetch(uploadEndpoint, {
    method: "POST",
    headers: {
      Authorization: initAuth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: initForm.toString(),
  });
  const initData = await initRes.json();
  if (!initData.media_id_string) {
    throw new Error(
      `Twitter INIT failed: ${JSON.stringify(initData)}`
    );
  }
  const mediaIdString = initData.media_id_string;

  // ── APPEND (chunked) ──
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  let segmentIndex = 0;
  let offset = 0;

  while (offset < totalBytes) {
    const end = Math.min(offset + chunkSize, totalBytes);
    const chunk = mediaBytes.slice(offset, end);

    // For APPEND, we use multipart/form-data
    const formData = new FormData();
    formData.append("command", "APPEND");
    formData.append("media_id", mediaIdString);
    formData.append("segment_index", String(segmentIndex));
    formData.append(
      "media_data",
      btoa(
        Array.from(chunk)
          .map((b) => String.fromCharCode(b))
          .join("")
      )
    );

    // OAuth for APPEND - only include non-file params
    const appendOauthParams: Record<string, string> = {
      command: "APPEND",
      media_id: mediaIdString,
      segment_index: String(segmentIndex),
    };
    const appendAuth = await generateTwitterOAuthHeader(
      "POST",
      uploadEndpoint,
      appendOauthParams,
      account
    );

    const appendRes = await fetch(uploadEndpoint, {
      method: "POST",
      headers: {
        Authorization: appendAuth,
      },
      body: formData,
    });

    if (!appendRes.ok && appendRes.status !== 204 && appendRes.status !== 202) {
      const errText = await appendRes.text().catch(() => "");
      throw new Error(
        `Twitter APPEND segment ${segmentIndex} failed (${appendRes.status}): ${errText}`
      );
    }

    segmentIndex++;
    offset = end;
  }

  // ── FINALIZE ──
  const finalizeParams: Record<string, string> = {
    command: "FINALIZE",
    media_id: mediaIdString,
  };
  const finalizeAuth = await generateTwitterOAuthHeader(
    "POST",
    uploadEndpoint,
    finalizeParams,
    account
  );
  const finalizeForm = new URLSearchParams();
  for (const [k, v] of Object.entries(finalizeParams)) {
    finalizeForm.append(k, v);
  }

  const finalizeRes = await fetch(uploadEndpoint, {
    method: "POST",
    headers: {
      Authorization: finalizeAuth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: finalizeForm.toString(),
  });
  const finalizeData = await finalizeRes.json();

  if (finalizeData.error) {
    throw new Error(
      `Twitter FINALIZE failed: ${JSON.stringify(finalizeData)}`
    );
  }

  // ── Poll STATUS for async processing (video) ──
  if (
    finalizeData.processing_info &&
    finalizeData.processing_info.state !== "succeeded"
  ) {
    let checkAfterSecs =
      finalizeData.processing_info.check_after_secs || 5;

    for (let i = 0; i < 60; i++) {
      await sleep(checkAfterSecs * 1000);

      const statusParams: Record<string, string> = {
        command: "STATUS",
        media_id: mediaIdString,
      };
      const statusAuth = await generateTwitterOAuthHeader(
        "GET",
        uploadEndpoint,
        statusParams,
        account
      );

      const statusRes = await fetch(
        `${uploadEndpoint}?command=STATUS&media_id=${mediaIdString}`,
        {
          method: "GET",
          headers: {
            Authorization: statusAuth,
          },
        }
      );
      const statusData = await statusRes.json();

      if (!statusData.processing_info) {
        break; // Processing done
      }

      if (statusData.processing_info.state === "succeeded") {
        break;
      }

      if (statusData.processing_info.state === "failed") {
        throw new Error(
          `Twitter media processing failed: ${JSON.stringify(statusData.processing_info.error)}`
        );
      }

      checkAfterSecs =
        statusData.processing_info.check_after_secs || 5;
    }
  }

  return mediaIdString;
}

async function publishToTwitter(
  account: SocialAccount,
  post: ScheduledPost
): Promise<{ platform_post_id: string }> {
  const caption = buildCaption(post);

  // Upload media if present
  const mediaIds: string[] = [];
  if (post.media_urls && post.media_urls.length > 0) {
    // Twitter v2 supports up to 4 images or 1 video
    for (const url of post.media_urls.slice(0, 4)) {
      const mType = getMediaType(url);
      const mediaId = await twitterUploadMedia(
        account,
        url,
        mType === "video" ? "video" : "image"
      );
      mediaIds.push(mediaId);

      // Only 1 video allowed
      if (mType === "video") break;
    }
  }

  // Create tweet using v2 API (Bearer token / OAuth 2.0)
  const tweetBody: Record<string, unknown> = {
    text: caption,
  };

  if (mediaIds.length > 0) {
    tweetBody.media = {
      media_ids: mediaIds,
    };
  }

  // Reply to thread if metadata indicates
  if (post.metadata?.reply_to_tweet_id) {
    tweetBody.reply = {
      in_reply_to_tweet_id: post.metadata.reply_to_tweet_id as string,
    };
  }

  const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tweetBody),
  });

  const tweetData = await tweetRes.json();

  if (tweetData.errors) {
    throw new Error(
      `Twitter tweet error: ${JSON.stringify(tweetData.errors)}`
    );
  }

  if (!tweetData.data?.id) {
    throw new Error(
      `Twitter did not return tweet ID: ${JSON.stringify(tweetData)}`
    );
  }

  return { platform_post_id: tweetData.data.id };
}

// ── Twitter Delete ───────────────────────────────────────────────────────────

async function deleteFromTwitter(
  account: SocialAccount,
  platformPostId: string
): Promise<void> {
  const res = await fetch(
    `https://api.twitter.com/2/tweets/${platformPostId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
      },
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      `Twitter delete error (${res.status}): ${JSON.stringify(errData)}`
    );
  }
}

// ── LinkedIn Publish ─────────────────────────────────────────────────────────

async function publishToLinkedIn(
  account: SocialAccount,
  post: ScheduledPost
): Promise<{ platform_post_id: string }> {
  const token = account.access_token;
  const caption = buildCaption(post);
  const authorUrn = `urn:li:person:${account.platform_user_id}`;

  // If it's a company page
  const isOrg = !!(account.platform_page_id && account.metadata?.is_organization);
  const author = isOrg
    ? `urn:li:organization:${account.platform_page_id}`
    : authorUrn;

  // No media - text post
  if (!post.media_urls || post.media_urls.length === 0) {
    const postBody = {
      author: author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: caption,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        `LinkedIn post error (${res.status}): ${JSON.stringify(errData)}`
      );
    }

    const postId = res.headers.get("x-restli-id") || res.headers.get("X-RestLi-Id");
    if (!postId) {
      const data = await res.json().catch(() => ({}));
      return {
        platform_post_id: (data as Record<string, string>).id || "unknown",
      };
    }
    return { platform_post_id: postId };
  }

  // ── With media ──
  const mediaAssets: string[] = [];

  for (const mediaUrl of post.media_urls) {
    const mType = getMediaType(mediaUrl);

    // Step 1: Register upload
    const registerBody = {
      registerUploadRequest: {
        recipes: [
          mType === "video"
            ? "urn:li:digitalmediaRecipe:feedshare-video"
            : "urn:li:digitalmediaRecipe:feedshare-image",
        ],
        owner: author,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    };

    const registerRes = await fetch(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerBody),
      }
    );

    if (!registerRes.ok) {
      const errData = await registerRes.json().catch(() => ({}));
      throw new Error(
        `LinkedIn register upload error (${registerRes.status}): ${JSON.stringify(errData)}`
      );
    }

    const registerData = await registerRes.json();
    const uploadUrl =
      registerData.value?.uploadMechanism?.[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ]?.uploadUrl;
    const asset = registerData.value?.asset;

    if (!uploadUrl || !asset) {
      throw new Error(
        `LinkedIn register did not return upload URL: ${JSON.stringify(registerData)}`
      );
    }

    // Step 2: Download media from our CDN
    const dlRes = await fetch(mediaUrl);
    if (!dlRes.ok) {
      throw new Error(
        `Failed to download media for LinkedIn: ${dlRes.status}`
      );
    }
    const mediaBlob = await dlRes.blob();

    // Step 3: Upload binary to LinkedIn
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": mediaBlob.type || "application/octet-stream",
      },
      body: mediaBlob,
    });

    if (!uploadRes.ok && uploadRes.status !== 201) {
      throw new Error(
        `LinkedIn media upload failed (${uploadRes.status})`
      );
    }

    mediaAssets.push(asset);
  }

  // Step 4: Create the UGC post with media
  const mediaElements = mediaAssets.map((asset, idx) => {
    const mType = getMediaType(post.media_urls[idx]);
    return {
      status: "READY",
      description: {
        text: caption.substring(0, 200),
      },
      media: asset,
      title: {
        text: (post.metadata?.title as string) || "Shared media",
      },
      ...(mType === "video"
        ? {}
        : post.thumbnail_url
          ? {
              thumbnails: [
                {
                  url: post.thumbnail_url,
                },
              ],
            }
          : {}),
    };
  });

  const firstMediaType = getMediaType(post.media_urls[0]);
  const shareMediaCategory =
    firstMediaType === "video" ? "VIDEO" : "IMAGE";

  const postBody = {
    author: author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: caption,
        },
        shareMediaCategory: shareMediaCategory,
        media: mediaElements,
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(postBody),
  });

  if (!postRes.ok) {
    const errData = await postRes.json().catch(() => ({}));
    throw new Error(
      `LinkedIn UGC post error (${postRes.status}): ${JSON.stringify(errData)}`
    );
  }

  const postId =
    postRes.headers.get("x-restli-id") ||
    postRes.headers.get("X-RestLi-Id");
  if (!postId) {
    const data = await postRes.json().catch(() => ({}));
    return {
      platform_post_id: (data as Record<string, string>).id || "unknown",
    };
  }
  return { platform_post_id: postId };
}

// ── LinkedIn Delete ──────────────────────────────────────────────────────────

async function deleteFromLinkedIn(
  account: SocialAccount,
  platformPostId: string
): Promise<void> {
  const token = account.access_token;

  const res = await fetch(
    `https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(platformPostId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  if (!res.ok && res.status !== 204) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      `LinkedIn delete error (${res.status}): ${JSON.stringify(errData)}`
    );
  }
}

// ── Pinterest Publish ────────────────────────────────────────────────────────

async function publishToPinterest(
  account: SocialAccount,
  post: ScheduledPost
): Promise<{ platform_post_id: string }> {
  const token = account.access_token;
  const caption = buildCaption(post);

  const boardId =
    (post.metadata?.board_id as string) ||
    (account.metadata?.default_board_id as string);

  if (!boardId) {
    throw new Error(
      "Pinterest requires a board_id in post metadata or a default_board_id in account metadata"
    );
  }

  const title =
    (post.metadata?.title as string) ||
    (post.caption || "").substring(0, 100) ||
    "Pin";

  const pinBody: Record<string, unknown> = {
    board_id: boardId,
    title: title.substring(0, 100),
    description: caption.substring(0, 500),
  };

  if (post.media_urls && post.media_urls.length > 0) {
    const mediaUrl = post.media_urls[0];
    const mType = getMediaType(mediaUrl);

    if (mType === "video") {
      // Pinterest video pin - need to register and upload
      // Step 1: Register media upload
      const registerRes = await fetch(
        "https://api.pinterest.com/v5/media",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            media_type: "video",
          }),
        }
      );

      if (!registerRes.ok) {
        const errData = await registerRes.json().catch(() => ({}));
        throw new Error(
          `Pinterest media register error (${registerRes.status}): ${JSON.stringify(errData)}`
        );
      }

      const registerData = await registerRes.json();
      const uploadUrl = registerData.upload_url;
      const mediaId = registerData.media_id;

      if (!uploadUrl || !mediaId) {
        throw new Error(
          `Pinterest did not return upload info: ${JSON.stringify(registerData)}`
        );
      }

      // Step 2: Download video
      const videoRes = await fetch(mediaUrl);
      if (!videoRes.ok) {
        throw new Error(
          `Failed to download video for Pinterest: ${videoRes.status}`
        );
      }
      const videoBlob = await videoRes.blob();

      // Step 3: Upload to Pinterest
      const uploadFormData = new FormData();
      uploadFormData.append("file", videoBlob, "video.mp4");

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        throw new Error(
          `Pinterest video upload failed (${uploadRes.status})`
        );
      }

      // Step 4: Poll media status
      for (let i = 0; i < 60; i++) {
        await sleep(5000);
        const statusRes = await fetch(
          `https://api.pinterest.com/v5/media/${mediaId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const statusData = await statusRes.json();

        if (statusData.status === "succeeded") {
          break;
        }
        if (statusData.status === "failed") {
          throw new Error(
            `Pinterest media processing failed: ${JSON.stringify(statusData)}`
          );
        }
      }

      pinBody.media_source = {
        source_type: "video_id",
        media_id: mediaId,
      };
    } else {
      // Image pin
      pinBody.media_source = {
        source_type: "image_url",
        url: mediaUrl,
      };
    }
  } else {
    throw new Error("Pinterest requires at least one media item (image or video)");
  }

  // Add link if provided
  if (post.metadata?.link) {
    pinBody.link = post.metadata.link as string;
  }

  // Add alt text if provided
  if (post.metadata?.alt_text) {
    pinBody.alt_text = post.metadata.alt_text as string;
  }

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pinBody),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      `Pinterest pin create error (${res.status}): ${JSON.stringify(errData)}`
    );
  }

  const pinData = await res.json();

  if (!pinData.id) {
    throw new Error(
      `Pinterest did not return pin ID: ${JSON.stringify(pinData)}`
    );
  }

  return { platform_post_id: pinData.id };
}

// ── Pinterest Delete ─────────────────────────────────────────────────────────

async function deleteFromPinterest(
  account: SocialAccount,
  platformPostId: string
): Promise<void> {
  const token = account.access_token;
  const res = await fetch(
    `https://api.pinterest.com/v5/pins/${platformPostId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok && res.status !== 204) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      `Pinterest delete error (${res.status}): ${JSON.stringify(errData)}`
    );
  }
}

// ── Platform Dispatcher ──────────────────────────────────────────────────────

async function publishToPlatform(
  account: SocialAccount,
  post: ScheduledPost
): Promise<{ platform_post_id: string }> {
  switch (account.platform) {
    case "facebook":
      return publishToFacebook(account, post);
    case "instagram":
      return publishToInstagram(account, post);
    case "tiktok":
      return publishToTikTok(account, post);
    case "youtube":
      return publishToYouTube(account, post);
    case "twitter":
      return publishToTwitter(account, post);
    case "linkedin":
      return publishToLinkedIn(account, post);
    case "pinterest":
      return publishToPinterest(account, post);
    default:
      throw new Error(`Unsupported platform: ${account.platform}`);
  }
}

async function deleteFromPlatform(
  account: SocialAccount,
  platformPostId: string
): Promise<void> {
  switch (account.platform) {
    case "facebook":
      return deleteFromFacebook(account, platformPostId);
    case "instagram":
      return deleteFromInstagram(account, platformPostId);
    case "tiktok":
      return deleteFromTikTok(account, platformPostId);
    case "youtube":
      return deleteFromYouTube(account, platformPostId);
    case "twitter":
      return deleteFromTwitter(account, platformPostId);
    case "linkedin":
      return deleteFromLinkedIn(account, platformPostId);
    case "pinterest":
      return deleteFromPinterest(account, platformPostId);
    default:
      throw new Error(`Unsupported platform for deletion: ${account.platform}`);
  }
}

// ── Logging helper ───────────────────────────────────────────────────────────

async function logPublishAttempt(
  supabase: ReturnType<typeof createClient>,
  params: {
    scheduled_post_id: string;
    social_account_id: string;
    platform: string;
    action: string;
    status: string;
    platform_post_id?: string | null;
    platform_response?: unknown;
    error_message?: string | null;
    duration_ms?: number;
  }
): Promise<void> {
  try {
    await supabase.from("social_publish_logs").insert({
      scheduled_post_id: params.scheduled_post_id,
      social_account_id: params.social_account_id,
      platform: params.platform,
      action: params.action,
      status: params.status,
      platform_post_id: params.platform_post_id || null,
      platform_response: params.platform_response || null,
      error_message: params.error_message || null,
      duration_ms: params.duration_ms || null,
    });
  } catch (err) {
    console.error("Failed to insert publish log:", err);
  }
}

// ── Route: Publish (all target accounts) ─────────────────────────────────────

async function handlePublish(
  supabase: ReturnType<typeof createClient>,
  body: { post_id: string }
): Promise<{ post: unknown; results: PublishResult[] }> {
  const { post_id } = body;
  if (!post_id) {
    throw new Error("post_id is required");
  }

  // Fetch the scheduled post
  const { data: post, error: postError } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("id", post_id)
    .single();

  if (postError || !post) {
    throw new Error(
      `Scheduled post not found: ${postError?.message || "No data"}`
    );
  }

  const scheduledPost = post as ScheduledPost;

  if (
    !scheduledPost.target_accounts ||
    scheduledPost.target_accounts.length === 0
  ) {
    throw new Error("No target accounts configured for this post");
  }

  // Update status to publishing
  await supabase
    .from("scheduled_posts")
    .update({ status: "publishing" })
    .eq("id", post_id);

  // Pre-resolve Bunny CDN URLs to publicly accessible Supabase Storage URLs
  // This must happen before platform dispatch so all handlers get working URLs
  const { resolvedPost, tempPaths: mediaTempPaths } = await resolveMediaUrls(
    supabase,
    scheduledPost
  );

  const results: PublishResult[] = [];

  try {
    // Publish to each target account
    for (const target of resolvedPost.target_accounts) {
    const startTime = Date.now();
    let result: PublishResult;

    try {
      // Fetch the social account with token
      const { data: accountData, error: accountError } = await supabase
        .rpc("get_social_account_token", {
          p_account_id: target.account_id,
        });

      if (accountError || !accountData || accountData.length === 0) {
        throw new Error(
          `Social account not found or inactive: ${accountError?.message || target.account_id}`
        );
      }

      const account = accountData[0] as SocialAccount;

      // Publish
      const publishResult = await publishToPlatform(account, resolvedPost);
      const durationMs = Date.now() - startTime;

      result = {
        account_id: target.account_id,
        platform: account.platform,
        platform_post_id: publishResult.platform_post_id,
        status: "success",
        error: null,
        published_at: new Date().toISOString(),
      };

      // Log success
      await logPublishAttempt(supabase, {
        scheduled_post_id: post_id,
        social_account_id: target.account_id,
        platform: account.platform,
        action: "publish",
        status: "success",
        platform_post_id: publishResult.platform_post_id,
        platform_response: publishResult,
        duration_ms: durationMs,
      });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      result = {
        account_id: target.account_id,
        platform: target.platform,
        platform_post_id: null,
        status: "failed",
        error: errorMessage,
        published_at: null,
      };

      // Log failure
      await logPublishAttempt(supabase, {
        scheduled_post_id: post_id,
        social_account_id: target.account_id,
        platform: target.platform,
        action: "publish",
        status: "failed",
        error_message: errorMessage,
        duration_ms: durationMs,
      });

      console.error(
        `Publish to ${target.platform} (${target.account_id}) failed:`,
        errorMessage
      );
    }

    results.push(result);
  }

  // Determine overall post status
  const successCount = results.filter((r) => r.status === "success").length;
  const totalCount = results.length;

  let postStatus: string;
  if (successCount === totalCount) {
    postStatus = "published";
  } else if (successCount > 0) {
    postStatus = "partially_published";
  } else {
    postStatus = "failed";
  }

  // Update the post with results
  const updatePayload: Record<string, unknown> = {
    status: postStatus,
    publish_results: results,
    updated_at: new Date().toISOString(),
  };

  if (successCount > 0) {
    updatePayload.published_at = new Date().toISOString();
  }

  if (postStatus === "failed") {
    updatePayload.retry_count = (scheduledPost.retry_count || 0) + 1;
    updatePayload.error_message = results
      .filter((r) => r.error)
      .map((r) => `${r.platform}: ${r.error}`)
      .join("; ");
  }

  await supabase
    .from("scheduled_posts")
    .update(updatePayload)
    .eq("id", post_id);

  return { post: { ...scheduledPost, ...updatePayload }, results };
  } finally {
    // Always clean up pre-resolved temp media files
    await cleanupTempMedia(supabase, mediaTempPaths);
  }
}

// ── Route: Publish Single (retry one account) ────────────────────────────────

async function handlePublishSingle(
  supabase: ReturnType<typeof createClient>,
  body: { post_id: string; account_id: string }
): Promise<{ result: PublishResult }> {
  const { post_id, account_id } = body;
  if (!post_id || !account_id) {
    throw new Error("post_id and account_id are required");
  }

  // Fetch the scheduled post
  const { data: post, error: postError } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("id", post_id)
    .single();

  if (postError || !post) {
    throw new Error(
      `Scheduled post not found: ${postError?.message || "No data"}`
    );
  }

  const scheduledPost = post as ScheduledPost;
  const startTime = Date.now();

  // Pre-resolve Bunny CDN URLs
  const { resolvedPost, tempPaths: mediaTempPaths } = await resolveMediaUrls(
    supabase,
    scheduledPost
  );

  // Fetch the social account
  const { data: accountData, error: accountError } = await supabase
    .rpc("get_social_account_token", {
      p_account_id: account_id,
    });

  if (accountError || !accountData || accountData.length === 0) {
    // Clean up temp files before throwing
    await cleanupTempMedia(supabase, mediaTempPaths);
    throw new Error(
      `Social account not found or inactive: ${accountError?.message || account_id}`
    );
  }

  const account = accountData[0] as SocialAccount;

  let result: PublishResult;

  try {
    const publishResult = await publishToPlatform(account, resolvedPost);
    const durationMs = Date.now() - startTime;

    result = {
      account_id: account_id,
      platform: account.platform,
      platform_post_id: publishResult.platform_post_id,
      status: "success",
      error: null,
      published_at: new Date().toISOString(),
    };

    await logPublishAttempt(supabase, {
      scheduled_post_id: post_id,
      social_account_id: account_id,
      platform: account.platform,
      action: "retry",
      status: "success",
      platform_post_id: publishResult.platform_post_id,
      platform_response: publishResult,
      duration_ms: durationMs,
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    result = {
      account_id: account_id,
      platform: account.platform,
      platform_post_id: null,
      status: "failed",
      error: errorMessage,
      published_at: null,
    };

    await logPublishAttempt(supabase, {
      scheduled_post_id: post_id,
      social_account_id: account_id,
      platform: account.platform,
      action: "retry",
      status: "failed",
      error_message: errorMessage,
      duration_ms: durationMs,
    });
  }

  // Update publish_results array: replace existing result for this account or append
  const existingResults: PublishResult[] =
    (scheduledPost.publish_results as PublishResult[]) || [];
  const updatedResults = existingResults.filter(
    (r) => r.account_id !== account_id
  );
  updatedResults.push(result);

  // Recalculate overall status
  const successCount = updatedResults.filter(
    (r) => r.status === "success"
  ).length;
  const totalTargets = scheduledPost.target_accounts?.length || 1;

  let postStatus: string;
  if (successCount === totalTargets) {
    postStatus = "published";
  } else if (successCount > 0) {
    postStatus = "partially_published";
  } else {
    postStatus = "failed";
  }

  const updatePayload: Record<string, unknown> = {
    status: postStatus,
    publish_results: updatedResults,
    updated_at: new Date().toISOString(),
  };

  if (successCount > 0 && !scheduledPost.published_at) {
    updatePayload.published_at = new Date().toISOString();
  }

  await supabase
    .from("scheduled_posts")
    .update(updatePayload)
    .eq("id", post_id);

  // Clean up pre-resolved temp media files
  await cleanupTempMedia(supabase, mediaTempPaths);

  return { result };
}

// ── Route: Delete Post ───────────────────────────────────────────────────────

async function handleDeletePost(
  supabase: ReturnType<typeof createClient>,
  body: {
    post_id: string;
    account_id: string;
    platform_post_id: string;
  }
): Promise<{ deleted: boolean }> {
  const { post_id, account_id, platform_post_id } = body;
  if (!post_id || !account_id || !platform_post_id) {
    throw new Error(
      "post_id, account_id, and platform_post_id are required"
    );
  }

  const startTime = Date.now();

  // Fetch the social account
  const { data: accountData, error: accountError } = await supabase
    .rpc("get_social_account_token", {
      p_account_id: account_id,
    });

  if (accountError || !accountData || accountData.length === 0) {
    throw new Error(
      `Social account not found or inactive: ${accountError?.message || account_id}`
    );
  }

  const account = accountData[0] as SocialAccount;

  try {
    await deleteFromPlatform(account, platform_post_id);
    const durationMs = Date.now() - startTime;

    await logPublishAttempt(supabase, {
      scheduled_post_id: post_id,
      social_account_id: account_id,
      platform: account.platform,
      action: "delete",
      status: "success",
      platform_post_id: platform_post_id,
      duration_ms: durationMs,
    });

    // Update publish_results: remove or mark as deleted
    const { data: post } = await supabase
      .from("scheduled_posts")
      .select("publish_results")
      .eq("id", post_id)
      .single();

    if (post && post.publish_results) {
      const updatedResults = (
        post.publish_results as PublishResult[]
      ).map((r) => {
        if (r.account_id === account_id) {
          return {
            ...r,
            status: "deleted" as const,
            platform_post_id: null,
          };
        }
        return r;
      });

      await supabase
        .from("scheduled_posts")
        .update({
          publish_results: updatedResults,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post_id);
    }

    return { deleted: true };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    await logPublishAttempt(supabase, {
      scheduled_post_id: post_id,
      social_account_id: account_id,
      platform: account.platform,
      action: "delete",
      status: "failed",
      platform_post_id: platform_post_id,
      error_message: errorMessage,
      duration_ms: durationMs,
    });

    throw new Error(`Failed to delete post: ${errorMessage}`);
  }
}

// ── Main server ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create service_role client for reading tokens and updating posts
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller: allow service_role key (internal calls from social-scheduler)
    // or validate as user JWT
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;

    if (!isServiceRole) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Parse route
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json();

    let result: unknown;

    switch (action) {
      case "publish":
        result = await handlePublish(supabase, body);
        break;

      case "publish-single":
        result = await handlePublishSingle(supabase, body);
        break;

      case "delete-post":
        result = await handleDeletePost(supabase, body);
        break;

      default:
        return new Response(
          JSON.stringify({
            error: `Unknown action: ${action}`,
            available_actions: ["publish", "publish-single", "delete-post"],
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("social-publish error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
