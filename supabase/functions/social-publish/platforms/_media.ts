// ============================================================================
// Helpers de media compartidos entre plataformas de social-publish.
// Extraido tal cual de index.ts (sin cambios de logica).
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { ScheduledPost } from "./types.ts";

export function buildCaption(post: ScheduledPost): string {
  let text = post.caption || "";
  if (post.hashtags && post.hashtags.length > 0) {
    const tags = post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`));
    text = text ? `${text}\n\n${tags.join(" ")}` : tags.join(" ");
  }
  return text;
}

export function getMediaType(
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

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Bunny CDN URL detection & download ──────────────────────────────────────

export function isBunnyCdnUrl(url: string): boolean {
  return (
    /b-cdn\.net\//i.test(url) ||
    /iframe\.mediadelivery\.net\//i.test(url) ||
    /cdn\.kreoon\.com\//i.test(url) // Custom Bunny CDN domain for Kreoon
  );
}

export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes(".supabase.co/storage/") || url.includes(".supabase.in/storage/");
}

/**
 * Extract video ID from a Bunny CDN or embed URL.
 */
export function extractBunnyVideoId(url: string): string | null {
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
export async function findBestBunnyQuality(url: string): Promise<string> {
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
export async function downloadMedia(url: string): Promise<Blob> {
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

export async function ensureTempBucket(
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

/**
 * Verify that a URL is publicly accessible (returns HTTP 200).
 * This is important because Instagram needs to fetch media from the URL.
 */
export async function verifyUrlAccessible(url: string, maxRetries = 3): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        console.log(`[verifyUrl] URL accessible: ${url} (status ${res.status})`);
        return true;
      }
      console.warn(`[verifyUrl] Attempt ${attempt + 1}: URL returned ${res.status}`);
    } catch (err) {
      console.warn(`[verifyUrl] Attempt ${attempt + 1}: Error checking URL:`, err);
    }
    // Wait before retry
    if (attempt < maxRetries - 1) {
      await sleep(1000);
    }
  }
  return false;
}

export async function rehostMediaForIG(
  supabase: ReturnType<typeof createClient>,
  mediaUrl: string
): Promise<{ publicUrl: string; storagePath: string }> {
  console.log(`[rehost] Downloading media from: ${mediaUrl}`);
  const blob = await downloadMedia(mediaUrl);
  console.log(`[rehost] Downloaded ${blob.size} bytes, type: ${blob.type}`);

  if (blob.size === 0) {
    throw new Error(`Downloaded media is empty (0 bytes): ${mediaUrl}`);
  }

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

  const publicUrl = urlData.publicUrl;
  console.log(`[IG rehost] Rehosted to: ${publicUrl}`);

  // Verify the URL is accessible before returning
  const isAccessible = await verifyUrlAccessible(publicUrl);
  if (!isAccessible) {
    throw new Error(`Rehosted URL is not accessible: ${publicUrl}`);
  }

  return { publicUrl, storagePath: fileName };
}

export async function cleanupTempMedia(
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

export async function resolveMediaUrls(
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
