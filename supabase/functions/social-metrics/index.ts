// ============================================================================
// KREOON SOCIAL METRICS SERVICE
// Fetch and store analytics from connected social media platforms
// ============================================================================
//
// Routes (parsed from URL path):
//   fetch-post-metrics   - Fetch metrics for a specific post (authenticated)
//   fetch-account-metrics - Fetch account-level metrics (authenticated)
//   sync-all             - Sync metrics for all active accounts of user (authenticated)
//   bulk-sync            - Service-role only: sync all active accounts (cron)
//
// JWT: verify_jwt = false (bulk-sync uses service_role key directly)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Types ────────────────────────────────────────────────────────────────────

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

interface MetricsResult {
  impressions?: number;
  reach?: number;
  engagement?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  video_views?: number;
  watch_time_seconds?: number;
  followers_count?: number;
  followers_gained?: number;
  profile_visits?: number;
  metadata?: Record<string, unknown>;
}

// ── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    // bulk-sync uses service_role auth (called by cron, no user token)
    if (action === "bulk-sync") {
      return await handleBulkSync(supabase, req);
    }

    // All other routes require user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("No authorization header", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return errorResponse("Invalid or expired token", 401);
    }

    const body = req.method === "POST" ? await req.json() : {};
    let result: unknown;

    switch (action) {
      case "fetch-post-metrics":
        result = await handleFetchPostMetrics(supabase, user.id, body);
        break;
      case "fetch-account-metrics":
        result = await handleFetchAccountMetrics(supabase, user.id, body);
        break;
      case "sync-all":
        result = await handleSyncAll(supabase, user.id);
        break;
      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("social-metrics error:", error);
    return errorResponse((error as Error).message, 500);
  }
});

// ── Helper: Error response ───────────────────────────────────────────────────

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Helper: Get account with token ───────────────────────────────────────────

async function getAccountToken(
  supabase: ReturnType<typeof createClient>,
  accountId: string
): Promise<SocialAccount | null> {
  const { data, error } = await supabase.rpc("get_social_account_token", {
    p_account_id: accountId,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0] as SocialAccount;
}

// ── Helper: Mark account error ───────────────────────────────────────────────

async function markAccountError(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
  errorMsg: string
) {
  await supabase
    .from("social_accounts")
    .update({ last_error: errorMsg })
    .eq("id", accountId);
}

// ── Helper: Safe platform fetch with 401 handling ────────────────────────────

async function safePlatformFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
  return response;
}

// ── Helper: Insert metrics row ───────────────────────────────────────────────

async function insertMetrics(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
  metricType: string,
  platformPostId: string | null,
  scheduledPostId: string | null,
  metrics: MetricsResult
) {
  const { error } = await supabase.from("social_metrics").insert({
    social_account_id: accountId,
    scheduled_post_id: scheduledPostId,
    platform_post_id: platformPostId,
    metric_type: metricType,
    impressions: metrics.impressions ?? 0,
    reach: metrics.reach ?? 0,
    engagement: metrics.engagement ?? 0,
    likes: metrics.likes ?? 0,
    comments: metrics.comments ?? 0,
    shares: metrics.shares ?? 0,
    saves: metrics.saves ?? 0,
    clicks: metrics.clicks ?? 0,
    video_views: metrics.video_views ?? 0,
    watch_time_seconds: metrics.watch_time_seconds ?? 0,
    followers_count: metrics.followers_count ?? 0,
    followers_gained: metrics.followers_gained ?? 0,
    profile_visits: metrics.profile_visits ?? 0,
    metadata: metrics.metadata ?? {},
    recorded_at: new Date().toISOString(),
  });

  if (error) {
    console.error(
      `Failed to insert metrics for account ${accountId}:`,
      error
    );
  }

  return !error;
}

// ── Helper: Insert post-level metrics (v2) ──────────────────────────────────

async function insertPostMetrics(
  supabase: ReturnType<typeof createClient>,
  scheduledPostId: string,
  accountId: string,
  platformPostId: string | null,
  metrics: MetricsResult
) {
  // Upsert into post_metrics (v2 per-post per-account table)
  const { error } = await supabase.from("post_metrics").upsert(
    {
      scheduled_post_id: scheduledPostId,
      social_account_id: accountId,
      platform_post_id: platformPostId,
      impressions: metrics.impressions ?? 0,
      reach: metrics.reach ?? 0,
      likes: metrics.likes ?? 0,
      comments: metrics.comments ?? 0,
      shares: metrics.shares ?? 0,
      saves: metrics.saves ?? 0,
      clicks: metrics.clicks ?? 0,
      video_views: metrics.video_views ?? 0,
      watch_time_seconds: metrics.watch_time_seconds ?? 0,
      engagement_rate: metrics.engagement
        ? metrics.engagement / Math.max(metrics.reach ?? 1, 1)
        : 0,
      fetched_at: new Date().toISOString(),
      raw_response: metrics.metadata ?? {},
    },
    { onConflict: "scheduled_post_id,social_account_id" }
  );

  if (error) {
    console.error(
      `Failed to upsert post_metrics for post ${scheduledPostId} / account ${accountId}:`,
      error
    );
  }

  return !error;
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

// ── fetch-post-metrics ───────────────────────────────────────────────────────

async function handleFetchPostMetrics(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: { post_id: string; account_id: string; scheduled_post_id?: string }
) {
  if (!body.post_id || !body.account_id) {
    throw new Error("post_id and account_id are required");
  }

  // Verify user owns this account
  const { data: accountCheck } = await supabase
    .from("social_accounts")
    .select("id")
    .eq("id", body.account_id)
    .eq("user_id", userId)
    .single();

  if (!accountCheck) {
    throw new Error("Account not found or not authorized");
  }

  const account = await getAccountToken(supabase, body.account_id);
  if (!account) {
    throw new Error("Account not active or tokens unavailable");
  }

  const metrics = await fetchPostMetrics(account, body.post_id);

  if (!metrics) {
    throw new Error("Failed to fetch metrics from platform");
  }

  await insertMetrics(
    supabase,
    body.account_id,
    "post",
    body.post_id,
    null,
    metrics
  );

  // v2: Also write to post_metrics table if we have a scheduled_post_id
  if (body.scheduled_post_id) {
    await insertPostMetrics(
      supabase,
      body.scheduled_post_id,
      body.account_id,
      body.post_id,
      metrics
    );
  }

  // Clear any previous error on success
  await supabase
    .from("social_accounts")
    .update({ last_error: null, last_synced_at: new Date().toISOString() })
    .eq("id", body.account_id);

  return {
    success: true,
    account_id: body.account_id,
    post_id: body.post_id,
    platform: account.platform,
    metrics,
  };
}

// ── fetch-account-metrics ────────────────────────────────────────────────────

async function handleFetchAccountMetrics(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: { account_id: string }
) {
  if (!body.account_id) {
    throw new Error("account_id is required");
  }

  const { data: accountCheck } = await supabase
    .from("social_accounts")
    .select("id")
    .eq("id", body.account_id)
    .eq("user_id", userId)
    .single();

  if (!accountCheck) {
    throw new Error("Account not found or not authorized");
  }

  const account = await getAccountToken(supabase, body.account_id);
  if (!account) {
    throw new Error("Account not active or tokens unavailable");
  }

  const metrics = await fetchAccountMetrics(account);

  if (!metrics) {
    throw new Error("Failed to fetch account metrics from platform");
  }

  await insertMetrics(
    supabase,
    body.account_id,
    "account",
    null,
    null,
    metrics
  );

  await supabase
    .from("social_accounts")
    .update({ last_error: null, last_synced_at: new Date().toISOString() })
    .eq("id", body.account_id);

  return {
    success: true,
    account_id: body.account_id,
    platform: account.platform,
    metrics,
  };
}

// ── sync-all ─────────────────────────────────────────────────────────────────

async function handleSyncAll(
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  const { data: accounts, error } = await supabase
    .from("social_accounts")
    .select("id, platform")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to list accounts: ${error.message}`);
  }

  if (!accounts || accounts.length === 0) {
    return { success: true, message: "No active accounts", results: [] };
  }

  const results = await Promise.allSettled(
    accounts.map(async (acc: { id: string; platform: string }) => {
      try {
        const account = await getAccountToken(supabase, acc.id);
        if (!account) {
          return {
            account_id: acc.id,
            platform: acc.platform,
            success: false,
            error: "Token unavailable",
          };
        }

        const metrics = await fetchAccountMetrics(account);
        if (metrics) {
          await insertMetrics(supabase, acc.id, "account", null, null, metrics);
          await supabase
            .from("social_accounts")
            .update({
              last_error: null,
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", acc.id);
        }

        return {
          account_id: acc.id,
          platform: acc.platform,
          success: !!metrics,
          metrics,
        };
      } catch (err) {
        const msg = (err as Error).message;
        await markAccountError(supabase, acc.id, msg);
        return {
          account_id: acc.id,
          platform: acc.platform,
          success: false,
          error: msg,
        };
      }
    })
  );

  const mapped = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { success: false, error: (r.reason as Error).message }
  );

  return {
    success: true,
    synced: mapped.filter((r: any) => r.success).length,
    failed: mapped.filter((r: any) => !r.success).length,
    results: mapped,
  };
}

// ── bulk-sync (service_role only) ────────────────────────────────────────────

async function handleBulkSync(
  supabase: ReturnType<typeof createClient>,
  req: Request
) {
  // Verify this is called with service_role key (from cron or admin)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse("Authorization required", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  // Service role calls pass the service_role key directly
  if (token !== supabaseServiceKey) {
    // Also allow admin users
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return errorResponse("Unauthorized: service_role or admin required", 403);
    }

    // Check if user is admin in any org
    const { data: adminCheck } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (!adminCheck) {
      return errorResponse(
        "Unauthorized: service_role or admin required",
        403
      );
    }
  }

  // Fetch all active accounts
  const { data: accounts, error } = await supabase
    .from("social_accounts")
    .select("id, platform, user_id")
    .eq("is_active", true);

  if (error) {
    return errorResponse(`Failed to list accounts: ${error.message}`, 500);
  }

  if (!accounts || accounts.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        message: "No active accounts to sync",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Process in batches of 10 to avoid rate limits
  const BATCH_SIZE = 10;
  let synced = 0;
  let failed = 0;
  const errors: { account_id: string; platform: string; error: string }[] = [];

  for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
    const batch = accounts.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(
        async (acc: { id: string; platform: string; user_id: string }) => {
          try {
            const account = await getAccountToken(supabase, acc.id);
            if (!account) {
              throw new Error("Token unavailable or account inactive");
            }

            const metrics = await fetchAccountMetrics(account);
            if (metrics) {
              await insertMetrics(
                supabase,
                acc.id,
                "account",
                null,
                null,
                metrics
              );
              await supabase
                .from("social_accounts")
                .update({
                  last_error: null,
                  last_synced_at: new Date().toISOString(),
                })
                .eq("id", acc.id);
              return true;
            }
            throw new Error("No metrics returned");
          } catch (err) {
            const msg = (err as Error).message;
            await markAccountError(supabase, acc.id, msg);
            errors.push({
              account_id: acc.id,
              platform: acc.platform,
              error: msg,
            });
            return false;
          }
        }
      )
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        synced++;
      } else {
        failed++;
      }
    }

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < accounts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      total: accounts.length,
      synced,
      failed,
      errors: errors.slice(0, 20), // Cap error list
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// ============================================================================
// PLATFORM DISPATCHERS
// ============================================================================

async function fetchPostMetrics(
  account: SocialAccount,
  postId: string
): Promise<MetricsResult | null> {
  try {
    switch (account.platform) {
      case "facebook":
        return await fetchFacebookPostMetrics(account, postId);
      case "instagram":
        return await fetchInstagramPostMetrics(account, postId);
      case "tiktok":
        return await fetchTikTokVideoMetrics(account, postId);
      case "youtube":
        return await fetchYouTubeVideoMetrics(account, postId);
      case "twitter":
        return await fetchTwitterTweetMetrics(account, postId);
      case "linkedin":
        return await fetchLinkedInPostMetrics(account, postId);
      case "pinterest":
        return await fetchPinterestPinMetrics(account, postId);
      default:
        console.error(`Unsupported platform for post metrics: ${account.platform}`);
        return null;
    }
  } catch (err) {
    console.error(
      `Error fetching post metrics for ${account.platform}:`,
      err
    );
    return null;
  }
}

async function fetchAccountMetrics(
  account: SocialAccount
): Promise<MetricsResult | null> {
  try {
    switch (account.platform) {
      case "facebook":
        return await fetchFacebookPageMetrics(account);
      case "instagram":
        return await fetchInstagramAccountMetrics(account);
      case "tiktok":
        return await fetchTikTokUserMetrics(account);
      case "youtube":
        return await fetchYouTubeChannelMetrics(account);
      case "twitter":
        return await fetchTwitterUserMetrics(account);
      case "linkedin":
        return await fetchLinkedInOrgMetrics(account);
      case "pinterest":
        return await fetchPinterestUserMetrics(account);
      default:
        console.error(`Unsupported platform for account metrics: ${account.platform}`);
        return null;
    }
  } catch (err) {
    console.error(
      `Error fetching account metrics for ${account.platform}:`,
      err
    );
    return null;
  }
}

// ============================================================================
// FACEBOOK
// ============================================================================

async function fetchFacebookPostMetrics(
  account: SocialAccount,
  postId: string
): Promise<MetricsResult | null> {
  const metrics =
    "post_impressions,post_reach,post_reactions_like_total,post_comments,post_shares";
  const url = `https://graph.facebook.com/v19.0/${postId}/insights?metric=${metrics}&access_token=${account.access_token}`;

  const response = await safePlatformFetch(url);

  if (response.status === 401 || response.status === 190) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Facebook post metrics error:", errorBody);
    throw new Error(`Facebook API error: ${response.status}`);
  }

  const data = await response.json();
  const insightsMap: Record<string, number> = {};

  if (data.data) {
    for (const insight of data.data) {
      // Facebook insights return values array; take the first (lifetime for posts)
      const value = insight.values?.[0]?.value ?? 0;
      insightsMap[insight.name] = typeof value === "number" ? value : 0;
    }
  }

  const likes = insightsMap["post_reactions_like_total"] ?? 0;
  const comments = insightsMap["post_comments"] ?? 0;
  const shares = insightsMap["post_shares"] ?? 0;

  return {
    impressions: insightsMap["post_impressions"] ?? 0,
    reach: insightsMap["post_reach"] ?? 0,
    likes,
    comments,
    shares,
    engagement: likes + comments + shares,
    metadata: { raw_insights: insightsMap },
  };
}

async function fetchFacebookPageMetrics(
  account: SocialAccount
): Promise<MetricsResult | null> {
  const pageId = account.platform_page_id || account.platform_user_id;
  const metrics = "page_impressions,page_fans,page_fan_adds,page_views_total";
  const url = `https://graph.facebook.com/v19.0/${pageId}/insights?metric=${metrics}&period=day&access_token=${account.access_token}`;

  const response = await safePlatformFetch(url);

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Facebook page metrics error:", errorBody);
    throw new Error(`Facebook API error: ${response.status}`);
  }

  const data = await response.json();
  const insightsMap: Record<string, number> = {};

  if (data.data) {
    for (const insight of data.data) {
      // For daily period, take the most recent value
      const values = insight.values || [];
      const latestValue = values.length > 0 ? values[values.length - 1]?.value : 0;
      insightsMap[insight.name] =
        typeof latestValue === "number" ? latestValue : 0;
    }
  }

  return {
    impressions: insightsMap["page_impressions"] ?? 0,
    followers_count: insightsMap["page_fans"] ?? 0,
    followers_gained: insightsMap["page_fan_adds"] ?? 0,
    profile_visits: insightsMap["page_views_total"] ?? 0,
    metadata: { raw_insights: insightsMap },
  };
}

// ============================================================================
// INSTAGRAM
// ============================================================================

async function fetchInstagramPostMetrics(
  account: SocialAccount,
  mediaId: string
): Promise<MetricsResult | null> {
  const metrics = "impressions,reach,likes,comments,shares,saved,video_views";
  const url = `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=${metrics}&access_token=${account.access_token}`;

  const response = await safePlatformFetch(url);

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Instagram post metrics error:", errorBody);
    // Some metrics are not available for all media types (e.g., video_views for images)
    // Try without video_views if the full set fails
    if (response.status === 400) {
      return await fetchInstagramPostMetricsFallback(account, mediaId);
    }
    throw new Error(`Instagram API error: ${response.status}`);
  }

  const data = await response.json();
  const insightsMap: Record<string, number> = {};

  if (data.data) {
    for (const insight of data.data) {
      const value = insight.values?.[0]?.value ?? 0;
      insightsMap[insight.name] = typeof value === "number" ? value : 0;
    }
  }

  const likes = insightsMap["likes"] ?? 0;
  const comments = insightsMap["comments"] ?? 0;
  const shares = insightsMap["shares"] ?? 0;
  const saves = insightsMap["saved"] ?? 0;

  return {
    impressions: insightsMap["impressions"] ?? 0,
    reach: insightsMap["reach"] ?? 0,
    likes,
    comments,
    shares,
    saves,
    video_views: insightsMap["video_views"] ?? 0,
    engagement: likes + comments + shares + saves,
    metadata: { raw_insights: insightsMap },
  };
}

async function fetchInstagramPostMetricsFallback(
  account: SocialAccount,
  mediaId: string
): Promise<MetricsResult | null> {
  // Fallback without video_views for image posts
  const metrics = "impressions,reach,likes,comments,shares,saved";
  const url = `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=${metrics}&access_token=${account.access_token}`;

  const response = await safePlatformFetch(url);

  if (!response.ok) {
    throw new Error(`Instagram API fallback error: ${response.status}`);
  }

  const data = await response.json();
  const insightsMap: Record<string, number> = {};

  if (data.data) {
    for (const insight of data.data) {
      const value = insight.values?.[0]?.value ?? 0;
      insightsMap[insight.name] = typeof value === "number" ? value : 0;
    }
  }

  const likes = insightsMap["likes"] ?? 0;
  const comments = insightsMap["comments"] ?? 0;
  const shares = insightsMap["shares"] ?? 0;
  const saves = insightsMap["saved"] ?? 0;

  return {
    impressions: insightsMap["impressions"] ?? 0,
    reach: insightsMap["reach"] ?? 0,
    likes,
    comments,
    shares,
    saves,
    engagement: likes + comments + shares + saves,
    metadata: { raw_insights: insightsMap },
  };
}

async function fetchInstagramAccountMetrics(
  account: SocialAccount
): Promise<MetricsResult | null> {
  const igUserId = account.platform_user_id;
  const metrics = "impressions,reach,follower_count,profile_views";
  const url = `https://graph.facebook.com/v19.0/${igUserId}/insights?metric=${metrics}&period=day&access_token=${account.access_token}`;

  const response = await safePlatformFetch(url);

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Instagram account metrics error:", errorBody);
    throw new Error(`Instagram API error: ${response.status}`);
  }

  const data = await response.json();
  const insightsMap: Record<string, number> = {};

  if (data.data) {
    for (const insight of data.data) {
      const values = insight.values || [];
      const latestValue =
        values.length > 0 ? values[values.length - 1]?.value : 0;
      insightsMap[insight.name] =
        typeof latestValue === "number" ? latestValue : 0;
    }
  }

  return {
    impressions: insightsMap["impressions"] ?? 0,
    reach: insightsMap["reach"] ?? 0,
    followers_count: insightsMap["follower_count"] ?? 0,
    profile_visits: insightsMap["profile_views"] ?? 0,
    metadata: { raw_insights: insightsMap },
  };
}

// ============================================================================
// TIKTOK
// ============================================================================

async function fetchTikTokVideoMetrics(
  account: SocialAccount,
  videoId: string
): Promise<MetricsResult | null> {
  const url =
    "https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count";

  const response = await safePlatformFetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filters: {
        video_ids: [videoId],
      },
    }),
  });

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("TikTok video metrics error:", errorBody);
    throw new Error(`TikTok API error: ${response.status}`);
  }

  const data = await response.json();
  const videos = data.data?.videos;

  if (!videos || videos.length === 0) {
    return null;
  }

  const video = videos[0];
  const likes = video.like_count ?? 0;
  const comments = video.comment_count ?? 0;
  const shares = video.share_count ?? 0;

  return {
    video_views: video.view_count ?? 0,
    likes,
    comments,
    shares,
    engagement: likes + comments + shares,
    metadata: { raw: video },
  };
}

async function fetchTikTokUserMetrics(
  account: SocialAccount
): Promise<MetricsResult | null> {
  const url =
    "https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count";

  const response = await safePlatformFetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${account.access_token}`,
    },
  });

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("TikTok user metrics error:", errorBody);
    throw new Error(`TikTok API error: ${response.status}`);
  }

  const data = await response.json();
  const userInfo = data.data?.user;

  if (!userInfo) {
    return null;
  }

  return {
    followers_count: userInfo.follower_count ?? 0,
    likes: userInfo.likes_count ?? 0,
    metadata: {
      following_count: userInfo.following_count ?? 0,
      video_count: userInfo.video_count ?? 0,
    },
  };
}

// ============================================================================
// YOUTUBE
// ============================================================================

async function fetchYouTubeVideoMetrics(
  account: SocialAccount,
  videoId: string
): Promise<MetricsResult | null> {
  // YouTube Data API: use OAuth token via Authorization header
  const response = await safePlatformFetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(videoId)}`,
    {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
      },
    }
  );

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("YouTube video metrics error:", errorBody);
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();
  const items = data.items;

  if (!items || items.length === 0) {
    return null;
  }

  const stats = items[0].statistics;
  const likes = parseInt(stats.likeCount ?? "0", 10);
  const comments = parseInt(stats.commentCount ?? "0", 10);
  const views = parseInt(stats.viewCount ?? "0", 10);

  return {
    video_views: views,
    likes,
    comments,
    engagement: likes + comments,
    metadata: {
      favorite_count: parseInt(stats.favoriteCount ?? "0", 10),
      raw_statistics: stats,
    },
  };
}

async function fetchYouTubeChannelMetrics(
  account: SocialAccount
): Promise<MetricsResult | null> {
  const response = await safePlatformFetch(
    "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",
    {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
      },
    }
  );

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("YouTube channel metrics error:", errorBody);
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();
  const items = data.items;

  if (!items || items.length === 0) {
    return null;
  }

  const stats = items[0].statistics;

  return {
    followers_count: parseInt(stats.subscriberCount ?? "0", 10),
    video_views: parseInt(stats.viewCount ?? "0", 10),
    metadata: {
      video_count: parseInt(stats.videoCount ?? "0", 10),
      hidden_subscriber_count: stats.hiddenSubscriberCount ?? false,
      raw_statistics: stats,
    },
  };
}

// ============================================================================
// TWITTER / X
// ============================================================================

async function fetchTwitterTweetMetrics(
  account: SocialAccount,
  tweetId: string
): Promise<MetricsResult | null> {
  const url = `https://api.twitter.com/2/tweets/${encodeURIComponent(tweetId)}?tweet.fields=public_metrics`;

  const response = await safePlatformFetch(url, {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
    },
  });

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Twitter tweet metrics error:", errorBody);
    throw new Error(`Twitter API error: ${response.status}`);
  }

  const data = await response.json();
  const pm = data.data?.public_metrics;

  if (!pm) {
    return null;
  }

  const likes = pm.like_count ?? 0;
  const shares = pm.retweet_count ?? 0;
  const comments = pm.reply_count ?? 0;

  return {
    impressions: pm.impression_count ?? 0,
    likes,
    shares,
    comments,
    saves: pm.bookmark_count ?? 0,
    engagement: likes + shares + comments,
    metadata: {
      quote_count: pm.quote_count ?? 0,
      raw_public_metrics: pm,
    },
  };
}

async function fetchTwitterUserMetrics(
  account: SocialAccount
): Promise<MetricsResult | null> {
  const url =
    "https://api.twitter.com/2/users/me?user.fields=public_metrics";

  const response = await safePlatformFetch(url, {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
    },
  });

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Twitter user metrics error:", errorBody);
    throw new Error(`Twitter API error: ${response.status}`);
  }

  const data = await response.json();
  const pm = data.data?.public_metrics;

  if (!pm) {
    return null;
  }

  return {
    followers_count: pm.followers_count ?? 0,
    likes: pm.like_count ?? 0,
    metadata: {
      following_count: pm.following_count ?? 0,
      tweet_count: pm.tweet_count ?? 0,
      listed_count: pm.listed_count ?? 0,
      raw_public_metrics: pm,
    },
  };
}

// ============================================================================
// LINKEDIN
// ============================================================================

async function fetchLinkedInPostMetrics(
  account: SocialAccount,
  ugcPostUrn: string
): Promise<MetricsResult | null> {
  // LinkedIn URN should be in format urn:li:share:12345 or urn:li:ugcPost:12345
  const encodedUrn = encodeURIComponent(ugcPostUrn);

  // Fetch social actions (likes, comments, shares)
  const actionsUrl = `https://api.linkedin.com/v2/socialActions/${encodedUrn}`;

  const response = await safePlatformFetch(actionsUrl, {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202401",
    },
  });

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("LinkedIn post metrics error:", errorBody);
    throw new Error(`LinkedIn API error: ${response.status}`);
  }

  const data = await response.json();

  const likes =
    data.likesSummary?.totalLikes ?? data.likesCount ?? 0;
  const comments =
    data.commentsSummary?.totalFirstLevelComments ??
    data.commentsCount ??
    0;
  const shares = data.shareCount ?? 0;

  return {
    likes,
    comments,
    shares,
    engagement: likes + comments + shares,
    metadata: {
      raw_social_actions: data,
    },
  };
}

async function fetchLinkedInOrgMetrics(
  account: SocialAccount
): Promise<MetricsResult | null> {
  // LinkedIn organization follower statistics
  // Requires platform_page_id to be the organization URN (urn:li:organization:12345)
  const orgUrn =
    account.platform_page_id ||
    `urn:li:organization:${account.platform_user_id}`;
  const encodedOrg = encodeURIComponent(orgUrn);

  const url = `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodedOrg}`;

  const response = await safePlatformFetch(url, {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202401",
    },
  });

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("LinkedIn org metrics error:", errorBody);
    throw new Error(`LinkedIn API error: ${response.status}`);
  }

  const data = await response.json();
  const elements = data.elements;

  if (!elements || elements.length === 0) {
    // Try to get basic follower count from organization endpoint
    return await fetchLinkedInOrgFollowersFallback(account, orgUrn);
  }

  const stats = elements[0];
  const followerCounts = stats.followerCounts || {};
  const organicCount = followerCounts.organicFollowerCount ?? 0;
  const paidCount = followerCounts.paidFollowerCount ?? 0;
  const totalFollowers = organicCount + paidCount;

  return {
    followers_count: totalFollowers,
    followers_gained: stats.followerGains?.organicFollowerGain ?? 0,
    metadata: {
      organic_followers: organicCount,
      paid_followers: paidCount,
      raw_stats: stats,
    },
  };
}

async function fetchLinkedInOrgFollowersFallback(
  account: SocialAccount,
  orgUrn: string
): Promise<MetricsResult | null> {
  // Fallback: get follower count from organization endpoint
  const encodedOrg = encodeURIComponent(orgUrn);
  const url = `https://api.linkedin.com/v2/organizationFollowerCount?organizationalEntity=${encodedOrg}`;

  const response = await safePlatformFetch(url, {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!response.ok) {
    console.error("LinkedIn org followers fallback error:", response.status);
    return null;
  }

  const data = await response.json();

  return {
    followers_count: data.firstDegreeSize ?? 0,
    metadata: { raw: data },
  };
}

// ============================================================================
// PINTEREST
// ============================================================================

async function fetchPinterestPinMetrics(
  account: SocialAccount,
  pinId: string
): Promise<MetricsResult | null> {
  const url = `https://api.pinterest.com/v5/pins/${encodeURIComponent(pinId)}?pin_metrics=true`;

  const response = await safePlatformFetch(url, {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
    },
  });

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Pinterest pin metrics error:", errorBody);
    throw new Error(`Pinterest API error: ${response.status}`);
  }

  const data = await response.json();

  // Pin metrics are nested under pin_metrics.all_time or pin_metrics.daily
  const allTime = data.pin_metrics?.all_time || {};
  const impressions = allTime.impression ?? 0;
  const saves = allTime.save ?? 0;
  const clicks = allTime.outbound_click ?? allTime.pin_click ?? 0;

  return {
    impressions,
    saves,
    clicks,
    engagement: saves + clicks,
    metadata: {
      pin_click: allTime.pin_click ?? 0,
      outbound_click: allTime.outbound_click ?? 0,
      video_start: allTime.video_start ?? 0,
      video_avg_watch_time: allTime.video_avg_watch_time ?? 0,
      raw_pin_metrics: data.pin_metrics,
    },
  };
}

async function fetchPinterestUserMetrics(
  account: SocialAccount
): Promise<MetricsResult | null> {
  const url = "https://api.pinterest.com/v5/user_account";

  const response = await safePlatformFetch(url, {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
    },
  });

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Pinterest user metrics error:", errorBody);
    throw new Error(`Pinterest API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    followers_count: data.follower_count ?? 0,
    metadata: {
      pin_count: data.pin_count ?? 0,
      following_count: data.following_count ?? 0,
      monthly_views: data.monthly_views ?? 0,
      board_count: data.board_count ?? 0,
      username: data.username,
    },
  };
}
