// ============================================================================
// Pinterest publish/delete. Extraido tal cual de index.ts (sin cambios).
// ============================================================================

import type { SocialAccount, ScheduledPost } from "./types.ts";
import { buildCaption, getMediaType, sleep } from "./_media.ts";

export async function publishToPinterest(
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

export async function deleteFromPinterest(
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
