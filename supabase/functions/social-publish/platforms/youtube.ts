// ============================================================================
// YouTube publish/delete. Extraido tal cual de index.ts (sin cambios).
// ============================================================================

import type { SocialAccount, ScheduledPost } from "./types.ts";
import { buildCaption } from "./_media.ts";

export async function publishToYouTube(
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

export async function deleteFromYouTube(
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
