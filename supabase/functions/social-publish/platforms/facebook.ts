// ============================================================================
// Facebook publish/delete. Extraido tal cual de index.ts (sin cambios).
// ============================================================================

import type { SocialAccount, ScheduledPost } from "./types.ts";
import { buildCaption, getMediaType } from "./_media.ts";

export async function publishToFacebook(
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

export async function deleteFromFacebook(
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
