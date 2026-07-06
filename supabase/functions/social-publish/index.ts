// ============================================================================
// KREOON SOCIAL PUBLISH SERVICE
// Edge Function to publish content to social media platforms
// Supports: Facebook, Instagram, TikTok, YouTube, Twitter/X, LinkedIn, Pinterest
//
// FASE4 B1: descompuesto por dominio. La logica de cada plataforma vive en
// ./platforms/<plataforma>.ts, los helpers de media compartidos en
// ./platforms/_media.ts, y los tipos en ./platforms/types.ts. Este archivo
// se quedo con el HTTP handler + orquestacion (publish/delete/retry/logging).
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SocialAccount, ScheduledPost, PublishResult } from "./platforms/types.ts";
import { resolveMediaUrls, cleanupTempMedia } from "./platforms/_media.ts";
import { publishToFacebook, deleteFromFacebook } from "./platforms/facebook.ts";
import { publishToInstagram, deleteFromInstagram } from "./platforms/instagram.ts";
import { publishToTikTok, deleteFromTikTok } from "./platforms/tiktok.ts";
import { publishToYouTube, deleteFromYouTube } from "./platforms/youtube.ts";
import { publishToTwitter, deleteFromTwitter } from "./platforms/twitter.ts";
import { publishToLinkedIn, deleteFromLinkedIn } from "./platforms/linkedin.ts";
import { publishToPinterest, deleteFromPinterest } from "./platforms/pinterest.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Ownership guard ──────────────────────────────────────────────────────────

// FASE 1: valida que el caller sea dueño del post (o miembro de su org)
// antes de publicar/borrar. callerUserId === null significa llamada
// interna de confianza (service_role, ej. social-scheduler).
async function assertPostOwnership(
  supabase: ReturnType<typeof createClient>,
  callerUserId: string | null,
  postUserId: string | null,
  postOrgId: string | null
): Promise<void> {
  if (callerUserId === null) return;
  if (postUserId && postUserId === callerUserId) return;
  if (postOrgId) {
    const { data } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", postOrgId)
      .eq("user_id", callerUserId)
      .maybeSingle();
    if (data) return;
  }
  throw new Error("forbidden: you do not own this post");
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
  body: { post_id: string },
  callerUserId: string | null
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

  // FASE 1: cualquier autenticado podía publicar el post de OTRA org
  // pasando su post_id, usando los tokens sociales de esa org.
  await assertPostOwnership(supabase, callerUserId, scheduledPost.user_id, scheduledPost.organization_id);

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

  // Get existing successful results to avoid re-publishing
  const existingResults: PublishResult[] = (scheduledPost.publish_results as PublishResult[]) || [];
  const alreadyPublishedAccountIds = new Set(
    existingResults
      .filter((r) => r.status === "success" && r.platform_post_id)
      .map((r) => r.account_id)
  );

  // Preserve existing successful results
  for (const existing of existingResults) {
    if (existing.status === "success" && existing.platform_post_id) {
      results.push(existing);
    }
  }

  try {
    // Publish to each target account (skip already successful ones)
    for (const target of resolvedPost.target_accounts) {
    // Skip if already published successfully
    if (alreadyPublishedAccountIds.has(target.account_id)) {
      console.log(`[social-publish] Skipping ${target.account_id} - already published successfully`);
      continue;
    }

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

  // Auto-fetch metrics for successful publishes so the UI doesn't show "sin metricas".
  // Platforms need a few seconds to process, so initial fetch might return zeros for very
  // new posts — but for most cases (stories, reels, etc.) this gets real data immediately.
  const successResults = updatedResults.filter(r => r.status === "success" && r.platform_post_id);
  for (const r of successResults) {
    try {
      const metricsUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-metrics/fetch-post-metrics`;
      await fetch(metricsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          post_id: r.platform_post_id,
          account_id: r.account_id,
          scheduled_post_id: post_id,
        }),
      });
    } catch (fetchErr) {
      console.warn(`[social-publish] Auto-fetch metrics failed for ${r.account_id}:`, fetchErr);
    }
  }

  // Clean up pre-resolved temp media files
  await cleanupTempMedia(supabase, mediaTempPaths);

  return { result };
}

// ── Route: TikTok Creator Info ────────────────────────────────────────────────

async function handleTikTokCreatorInfo(
  supabase: ReturnType<typeof createClient>,
  body: { account_id: string }
): Promise<unknown> {
  const { account_id } = body;
  if (!account_id) throw new Error("account_id is required");

  const { data: accountData, error: accountError } = await supabase.rpc(
    "get_social_account_token",
    { p_account_id: account_id }
  );

  if (accountError || !accountData || accountData.length === 0) {
    throw new Error(`TikTok account not found: ${accountError?.message || account_id}`);
  }

  const account = accountData[0] as SocialAccount;
  if (account.platform !== "tiktok") {
    throw new Error("Account is not a TikTok account");
  }

  const res = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${account.access_token}`,
      },
      body: JSON.stringify({}),
    }
  );

  const data = await res.json();
  if (data.error?.code && data.error.code !== "ok") {
    throw new Error(`TikTok API error: ${data.error.message || data.error.code}`);
  }

  return { creator_info: data.data || data };
}

// ── Route: Delete Post ───────────────────────────────────────────────────────

async function handleDeletePost(
  supabase: ReturnType<typeof createClient>,
  body: {
    post_id: string;
    account_id: string;
    platform_post_id: string;
  },
  callerUserId: string | null
): Promise<{ deleted: boolean }> {
  const { post_id, account_id, platform_post_id } = body;
  if (!post_id || !account_id || !platform_post_id) {
    throw new Error(
      "post_id, account_id, and platform_post_id are required"
    );
  }

  // FASE 1: validar dueño del post ANTES de borrar en la plataforma —
  // antes cualquiera con post_id de otra org podía borrar su post.
  const { data: ownerCheckPost, error: ownerCheckErr } = await supabase
    .from("scheduled_posts")
    .select("user_id, organization_id")
    .eq("id", post_id)
    .single();
  if (ownerCheckErr || !ownerCheckPost) {
    throw new Error(`Scheduled post not found: ${ownerCheckErr?.message || post_id}`);
  }
  await assertPostOwnership(supabase, callerUserId, ownerCheckPost.user_id, ownerCheckPost.organization_id);

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
    let callerUserId: string | null = null;

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
      callerUserId = user.id;
    }

    // Parse route
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json();

    let result: unknown;

    switch (action) {
      case "publish":
        result = await handlePublish(supabase, body, callerUserId);
        break;

      case "publish-single":
        result = await handlePublishSingle(supabase, body);
        break;

      case "delete-post":
        result = await handleDeletePost(supabase, body, callerUserId);
        break;

      case "creator-info":
        result = await handleTikTokCreatorInfo(supabase, body);
        break;

      default:
        return new Response(
          JSON.stringify({
            error: `Unknown action: ${action}`,
            available_actions: ["publish", "publish-single", "delete-post", "creator-info"],
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
