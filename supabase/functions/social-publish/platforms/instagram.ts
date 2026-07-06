// ============================================================================
// Instagram publish/delete. Extraido tal cual de index.ts (sin cambios).
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SocialAccount, ScheduledPost } from "./types.ts";
import {
  buildCaption,
  getMediaType,
  sleep,
  isSupabaseStorageUrl,
  ensureTempBucket,
  rehostMediaForIG,
  cleanupTempMedia,
} from "./_media.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export async function pollInstagramMediaStatus(
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

export async function publishToInstagram(
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
    // Instagram Stories only allow 1 media per story, so we publish each as a separate story
    // IMPORTANT: Stories must be published one at a time with delays between them
    if (isStory) {
      const publishedIds: string[] = [];
      console.log(`[IG Story] Starting to publish ${rehostedMedia.length} stories one by one`);

      for (let i = 0; i < rehostedMedia.length; i++) {
        const publicUrl = rehostedMedia[i].publicUrl;
        const originalUrl = post.media_urls[i];
        const mType = getMediaType(originalUrl);

        console.log(`[IG Story] Processing story ${i + 1}/${rehostedMedia.length}`);
        console.log(`[IG Story] Original URL: ${originalUrl}`);
        console.log(`[IG Story] Public URL: ${publicUrl}`);
        console.log(`[IG Story] Media type: ${mType}`);

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
          console.error(`[IG Story] Container creation failed for item ${i + 1}:`, JSON.stringify(containerData.error));
          // Continue with other stories if one fails
          continue;
        }
        console.log(`[IG publish] Story container created: ${containerData.id}`);

        // Poll until processing is complete (for both images and videos)
        // Instagram needs time to process media before publishing
        try {
          console.log(`[IG Story] Polling container status for ${containerData.id}...`);
          await pollInstagramMediaStatus(containerData.id, token, 20, 3000);
          console.log(`[IG Story] Container ${containerData.id} is ready`);
        } catch (pollErr) {
          console.error(`[IG Story] Media processing failed for item ${i + 1}:`, pollErr);
          continue;
        }

        // Wait a moment before publishing to ensure processing is complete
        await sleep(2000);

        // Publish story
        console.log(`[IG Story] Publishing story ${i + 1}...`);
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
          console.error(`[IG Story] Publish failed for item ${i + 1}:`, JSON.stringify(publishData.error));
          continue;
        }

        console.log(`[IG Story] Story ${i + 1} published successfully: ${publishData.id}`);
        publishedIds.push(publishData.id);

        // Wait 45 seconds between stories to avoid rate limits
        // Instagram has strict rate limits for story publishing (up to 1 min recommended)
        if (i < rehostedMedia.length - 1) {
          console.log(`[IG Story] Waiting 45 seconds before next story (${i + 2}/${rehostedMedia.length})...`);
          await sleep(45000);
        }
      }

      if (publishedIds.length === 0) {
        throw new Error("Instagram Story publish failed: No stories could be published");
      }

      // Return the first published story ID (or all IDs joined)
      return { platform_post_id: publishedIds.join(",") };
    }

    // ── Carousel ──
    if (isCarousel) {
      const childIds: string[] = [];

      for (let i = 0; i < rehostedMedia.length; i++) {
        const publicUrl = rehostedMedia[i].publicUrl;
        const originalUrl = post.media_urls[i];
        const mType = getMediaType(originalUrl);

        console.log(`[IG Carousel] Creating item ${i + 1}/${rehostedMedia.length}, type=${mType}`);
        console.log(`[IG Carousel] Original URL: ${originalUrl}`);
        console.log(`[IG Carousel] Public URL: ${publicUrl}`);

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
          const errorDetails = {
            item: i + 1,
            total: rehostedMedia.length,
            mediaType: mType,
            publicUrl: publicUrl,
            originalUrl: originalUrl,
            error: childData.error,
          };
          console.error(`[IG Carousel] Item ${i + 1} failed:`, JSON.stringify(errorDetails));

          // Check for specific error codes
          const errorCode = childData.error.code;
          const errorSubcode = childData.error.error_subcode;

          if (errorCode === 190 || errorSubcode === 463) {
            throw new Error(
              `Instagram access token expired or invalid. Please reconnect the Instagram account.`
            );
          }

          throw new Error(
            `Instagram carousel item ${i + 1}/${rehostedMedia.length} error: ${childData.error.message || JSON.stringify(childData.error)}`
          );
        }

        console.log(`[IG Carousel] Item ${i + 1} container created: ${childData.id}`);

        // Poll all items until ready (Instagram processes both images and videos)
        try {
          console.log(`[IG Carousel] Polling item ${i + 1} status...`);
          await pollInstagramMediaStatus(childData.id, token, 20, 3000);
          console.log(`[IG Carousel] Item ${i + 1} is ready`);
        } catch (pollErr) {
          console.error(`[IG Carousel] Item ${i + 1} processing failed:`, pollErr);
          throw new Error(`Instagram carousel item ${i + 1} processing failed: ${pollErr}`);
        }

        childIds.push(childData.id);

        // Wait 5 seconds between carousel items to avoid rate limits
        if (i < rehostedMedia.length - 1) {
          console.log(`[IG Carousel] Waiting 5 seconds before next item (${i + 2}/${rehostedMedia.length})...`);
          await sleep(5000);
        }
      }

      console.log(`[IG Carousel] All ${childIds.length} items created. Creating carousel container...`);

      // Wait before creating carousel container
      await sleep(2000);

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
        console.error(`[IG Carousel] Container creation failed:`, JSON.stringify(containerData.error));
        throw new Error(
          `Instagram carousel container error: ${containerData.error.message || JSON.stringify(containerData.error)}`
        );
      }

      console.log(`[IG Carousel] Carousel container created: ${containerData.id}`);

      // Wait before publishing
      await sleep(2000);

      // Publish carousel
      console.log(`[IG Carousel] Publishing carousel...`);
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

export async function deleteFromInstagram(
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
