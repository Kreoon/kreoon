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

// ── Facebook Publish ─────────────────────────────────────────────────────────

async function publishToFacebook(
  account: SocialAccount,
  post: ScheduledPost
): Promise<{ platform_post_id: string }> {
  const pageId = account.platform_page_id || account.platform_user_id;
  const token = account.access_token;
  const caption = buildCaption(post);
  const baseUrl = "https://graph.facebook.com/v21.0";

  // No media - text post
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

  // Video
  if (mediaType === "video") {
    const res = await fetch(`${baseUrl}/${pageId}/videos`, {
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
  const igUserId = account.platform_page_id || account.platform_user_id;
  const token = account.access_token;
  const caption = buildCaption(post);
  const baseUrl = "https://graph.facebook.com/v21.0";

  if (!post.media_urls || post.media_urls.length === 0) {
    throw new Error("Instagram requires at least one media item");
  }

  const isCarousel =
    post.post_type === "carousel" || post.media_urls.length > 1;

  // ── Carousel ──
  if (isCarousel) {
    const childIds: string[] = [];

    for (const url of post.media_urls) {
      const mType = getMediaType(url);
      const childBody: Record<string, string> = {
        is_carousel_item: "true",
        access_token: token,
      };

      if (mType === "video") {
        childBody.media_type = "VIDEO";
        childBody.video_url = url;
      } else {
        childBody.media_type = "IMAGE";
        childBody.image_url = url;
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
  const mediaUrl = post.media_urls[0];
  const mType = getMediaType(mediaUrl);

  const containerBody: Record<string, string> = {
    caption: caption,
    access_token: token,
  };

  if (mType === "video") {
    // Determine if it's a Reel or regular video
    const isReel =
      post.post_type === "reel" || post.post_type === "short";
    containerBody.media_type = isReel ? "REELS" : "VIDEO";
    containerBody.video_url = mediaUrl;

    if (post.thumbnail_url) {
      containerBody.cover_url = post.thumbnail_url;
    }
  } else {
    containerBody.media_type = "IMAGE";
    containerBody.image_url = mediaUrl;
  }

  // Create media container
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

  return { platform_post_id: publishData.id };
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

  // Determine privacy level
  let privacyLevel = "PUBLIC_TO_EVERYONE";
  if (post.visibility === "private") {
    privacyLevel = "SELF_ONLY";
  } else if (post.visibility === "friends") {
    privacyLevel = "MUTUAL_FOLLOW_FRIENDS";
  } else if (post.visibility === "followers") {
    privacyLevel = "FOLLOWER_OF_CREATOR";
  }

  // Disable toggles from metadata if provided
  const disableDuet =
    (post.metadata?.disable_duet as boolean) ?? false;
  const disableComment =
    (post.metadata?.disable_comment as boolean) ?? false;
  const disableStitch =
    (post.metadata?.disable_stitch as boolean) ?? false;

  const body = {
    post_info: {
      title: caption.substring(0, 150), // TikTok title limit
      privacy_level: privacyLevel,
      disable_duet: disableDuet,
      disable_comment: disableComment,
      disable_stitch: disableStitch,
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: videoUrl,
    },
  };

  const res = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/content/init/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();

  if (data.error && data.error.code !== "ok") {
    throw new Error(
      `TikTok API error: ${data.error.message || data.error.code || JSON.stringify(data.error)}`
    );
  }

  if (data.data?.publish_id) {
    // Poll for publish status
    const publishId = data.data.publish_id;
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

  throw new Error("TikTok did not return a publish_id");
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

  const results: PublishResult[] = [];

  // Publish to each target account
  for (const target of scheduledPost.target_accounts) {
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
      const publishResult = await publishToPlatform(account, scheduledPost);
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

  let result: PublishResult;

  try {
    const publishResult = await publishToPlatform(account, scheduledPost);
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
