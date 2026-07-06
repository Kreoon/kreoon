// ============================================================================
// LinkedIn publish/delete. Extraido tal cual de index.ts (sin cambios).
// ============================================================================

import type { SocialAccount, ScheduledPost } from "./types.ts";
import { buildCaption, getMediaType } from "./_media.ts";

export async function publishToLinkedIn(
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

export async function deleteFromLinkedIn(
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
