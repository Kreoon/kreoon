// ============================================================================
// Twitter/X publish/delete. Extraido tal cual de index.ts (sin cambios).
// ============================================================================

import type { SocialAccount, ScheduledPost } from "./types.ts";
import { buildCaption, getMediaType, sleep } from "./_media.ts";

/**
 * Twitter OAuth 1.0a HMAC-SHA1 signature generation.
 * Used for media upload v1.1 endpoint.
 */
export async function generateTwitterOAuthHeader(
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
export async function twitterUploadMedia(
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

export async function publishToTwitter(
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

export async function deleteFromTwitter(
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
