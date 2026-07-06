// ============================================================================
// TikTok publish/delete. Extraido tal cual de index.ts (sin cambios).
// ============================================================================

import type { SocialAccount, ScheduledPost } from "./types.ts";
import { buildCaption, downloadMedia, sleep } from "./_media.ts";

export async function publishToTikTok(
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
  // Commercial content fields from TikTok UX settings
  const tiktokMeta = (post.metadata?.tiktok as Record<string, unknown>) || {};
  const brandContentToggle = (tiktokMeta.brandContentToggle as boolean) ?? false;
  const brandOrganic = (tiktokMeta.brandOrganic as boolean) ?? false;
  const brandedContent = (tiktokMeta.brandedContent as boolean) ?? false;

  const postInfo: Record<string, unknown> = {
    title: caption.substring(0, 2200),
    privacy_level: privacyLevel,
    disable_duet: disableDuet,
    disable_comment: disableComment,
    disable_stitch: disableStitch,
  };

  if (brandContentToggle) {
    postInfo.brand_content_toggle = true;
    if (brandOrganic) postInfo.brand_organic_toggle = true;
    if (brandedContent) postInfo.brand_content_toggle = true;
  }

  const initBody = {
    post_info: postInfo,
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

export async function deleteFromTikTok(
  account: SocialAccount,
  platformPostId: string
): Promise<void> {
  // TikTok Content Posting API does not support deletion of posts.
  throw new Error(
    "TikTok does not support programmatic post deletion via the Content Posting API. " +
      "The video must be deleted manually from TikTok."
  );
}
