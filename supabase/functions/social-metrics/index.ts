// ============================================================================
// KREOON SOCIAL METRICS SERVICE v2
// Fetch REAL metrics from all connected social accounts (not just Kreoon posts)
// ============================================================================
//
// Routes:
//   account/:id        - GET full metrics for one account (account info + insights + recent media)
//   sync               - POST sync selected accounts (body: { accountIds: string[] })
//   sync-all           - POST sync all user accounts
//   bulk-sync          - POST service-role only: sync ALL active accounts (cron)
//   fetch-post-metrics - POST fetch metrics for a specific platform post (legacy)
//
// JWT: verify_jwt = false (auth handled manually)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

interface AccountMetricsResult {
  // Account info
  followers_count: number;
  following_count: number;
  posts_count: number;
  profile_picture_url?: string;
  username?: string;
  biography?: string;

  // Period insights (last day/period)
  impressions: number;
  reach: number;
  profile_views: number;
  accounts_engaged: number;

  // Engagement totals
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_saves: number;
  video_views: number;

  // Growth
  followers_gained: number;
  followers_lost: number;

  // Audience demographics
  audience_demographics: Record<string, unknown>;

  // Recent media with metrics
  recent_media: RecentMediaItem[];

  // Raw data for debugging
  raw_data: Record<string, unknown>;
}

interface RecentMediaItem {
  id: string;
  caption: string | null;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  timestamp: string;
  likes: number;
  comments: number;
  impressions: number;
  reach: number;
  shares: number;
  saves: number;
  video_views: number;
  engagement: number;
}

interface PostMetricsResult {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  video_views: number;
  watch_time_seconds: number;
  engagement: number;
  metadata: Record<string, unknown>;
}

// ── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // pathParts: ["social-metrics", "action", ...rest]
    const action = pathParts.length > 1 ? pathParts[pathParts.length - 1] : pathParts[0];
    // For account/:id route
    const parentAction = pathParts.length > 2 ? pathParts[pathParts.length - 2] : null;

    // bulk-sync: service_role only
    if (action === "bulk-sync") {
      return await handleBulkSync(supabase, req);
    }

    // All other routes require user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("No authorization header", 401);
    }

    const token = authHeader.replace("Bearer ", "");

    // Allow service_role key for internal calls
    let userId: string | null = null;
    const isServiceRole = token === supabaseServiceKey;

    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return errorResponse("Invalid or expired token", 401);
      }
      userId = user.id;
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    let result: unknown;

    // Route: account/:id (GET account metrics)
    if (parentAction === "account" || (action !== "sync" && action !== "sync-all" && action !== "fetch-post-metrics" && action !== "fetch-account-metrics" && action !== "social-metrics")) {
      if (parentAction === "account") {
        result = await handleAccountMetrics(supabase, userId, action);
      } else {
        return errorResponse(`Unknown action: ${action}`, 400);
      }
    } else {
      switch (action) {
        case "sync":
          result = await handleSync(supabase, userId, body);
          break;
        case "sync-all":
          result = await handleSyncAll(supabase, userId);
          break;
        case "fetch-post-metrics":
          result = await handleFetchPostMetrics(supabase, userId!, body);
          break;
        case "fetch-account-metrics":
          result = await handleFetchAccountMetrics(supabase, userId!, body);
          break;
        default:
          return errorResponse(`Unknown action: ${action}`, 400);
      }
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAccountToken(
  supabase: ReturnType<typeof createClient>,
  accountId: string
): Promise<SocialAccount | null> {
  const { data, error } = await supabase.rpc("get_social_account_token", {
    p_account_id: accountId,
  });
  if (error || !data || data.length === 0) return null;
  return data[0] as SocialAccount;
}

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

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Save snapshot ────────────────────────────────────────────────────────────

async function saveSnapshot(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
  metrics: AccountMetricsResult
) {
  const snapshotDate = today();

  // Get yesterday's snapshot to compute growth
  const { data: prevSnapshot } = await supabase
    .from("social_account_snapshots")
    .select("followers_count")
    .eq("account_id", accountId)
    .lt("snapshot_date", snapshotDate)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevFollowers = prevSnapshot?.followers_count ?? metrics.followers_count;
  const gained = Math.max(0, metrics.followers_count - prevFollowers);
  const lost = Math.max(0, prevFollowers - metrics.followers_count);

  const { error } = await supabase.from("social_account_snapshots").upsert(
    {
      account_id: accountId,
      snapshot_date: snapshotDate,
      followers_count: metrics.followers_count,
      following_count: metrics.following_count,
      posts_count: metrics.posts_count,
      impressions: metrics.impressions,
      reach: metrics.reach,
      profile_views: metrics.profile_views,
      accounts_engaged: metrics.accounts_engaged,
      total_likes: metrics.total_likes,
      total_comments: metrics.total_comments,
      total_shares: metrics.total_shares,
      total_saves: metrics.total_saves,
      video_views: metrics.video_views,
      followers_gained: gained,
      followers_lost: lost,
      audience_demographics: metrics.audience_demographics,
      raw_data: metrics.raw_data,
    },
    { onConflict: "account_id,snapshot_date" }
  );

  if (error) {
    console.error(`Failed to save snapshot for ${accountId}:`, error.message);
  }
}

// Also save to legacy social_metrics table for backward compat
async function saveLegacyMetrics(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
  metrics: AccountMetricsResult
) {
  await supabase.from("social_metrics").insert({
    social_account_id: accountId,
    metric_type: "account",
    impressions: metrics.impressions,
    reach: metrics.reach,
    likes: metrics.total_likes,
    comments: metrics.total_comments,
    shares: metrics.total_shares,
    saves: metrics.total_saves,
    video_views: metrics.video_views,
    followers_count: metrics.followers_count,
    followers_gained: metrics.followers_gained,
    profile_visits: metrics.profile_views,
    metadata: metrics.raw_data,
    recorded_at: new Date().toISOString(),
  });
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

// ── GET account/:id — Full metrics for one account ──────────────────────────

async function handleAccountMetrics(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  accountId: string
) {
  const account = await getAccountToken(supabase, accountId);
  if (!account) {
    throw new Error("Account not active or tokens unavailable");
  }

  const metrics = await fetchFullAccountMetrics(account);
  if (!metrics) {
    throw new Error("Failed to fetch metrics from platform");
  }

  // Save snapshot + legacy metrics
  await saveSnapshot(supabase, accountId, metrics);
  await saveLegacyMetrics(supabase, accountId, metrics);

  // Update account sync timestamp
  await supabase
    .from("social_accounts")
    .update({ last_error: null, last_synced_at: new Date().toISOString() })
    .eq("id", accountId);

  return {
    success: true,
    account_id: accountId,
    platform: account.platform,
    metrics,
  };
}

// ── POST sync — Sync selected accounts ──────────────────────────────────────

async function handleSync(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  body: { accountIds?: string[] }
) {
  if (!body.accountIds || body.accountIds.length === 0) {
    throw new Error("accountIds array is required");
  }

  const results = await Promise.allSettled(
    body.accountIds.map(async (accId) => {
      try {
        const account = await getAccountToken(supabase, accId);
        if (!account) {
          return { account_id: accId, success: false, error: "Token unavailable" };
        }

        const metrics = await fetchFullAccountMetrics(account);
        if (metrics) {
          await saveSnapshot(supabase, accId, metrics);
          await saveLegacyMetrics(supabase, accId, metrics);
          await supabase
            .from("social_accounts")
            .update({ last_error: null, last_synced_at: new Date().toISOString() })
            .eq("id", accId);
        }

        return { account_id: accId, platform: account.platform, success: !!metrics, metrics };
      } catch (err) {
        const msg = (err as Error).message;
        await markAccountError(supabase, accId, msg);
        return { account_id: accId, success: false, error: msg };
      }
    })
  );

  const mapped = results.map((r) =>
    r.status === "fulfilled" ? r.value : { success: false, error: (r.reason as Error).message }
  );

  return {
    success: true,
    synced: mapped.filter((r: any) => r.success).length,
    failed: mapped.filter((r: any) => !r.success).length,
    results: mapped,
  };
}

// ── POST sync-all — Sync all user accounts ──────────────────────────────────

async function handleSyncAll(
  supabase: ReturnType<typeof createClient>,
  userId: string | null
) {
  // Get all active accounts for the user or all if service_role
  let query = supabase
    .from("social_accounts")
    .select("id, platform")
    .eq("is_active", true);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: accounts, error } = await query;
  if (error) throw new Error(`Failed to list accounts: ${error.message}`);
  if (!accounts || accounts.length === 0) {
    return { success: true, message: "No active accounts", results: [] };
  }

  const results = await Promise.allSettled(
    accounts.map(async (acc: { id: string; platform: string }) => {
      try {
        const account = await getAccountToken(supabase, acc.id);
        if (!account) {
          return { account_id: acc.id, platform: acc.platform, success: false, error: "Token unavailable" };
        }

        const metrics = await fetchFullAccountMetrics(account);
        if (metrics) {
          await saveSnapshot(supabase, acc.id, metrics);
          await saveLegacyMetrics(supabase, acc.id, metrics);
          await supabase
            .from("social_accounts")
            .update({ last_error: null, last_synced_at: new Date().toISOString() })
            .eq("id", acc.id);
        }

        return { account_id: acc.id, platform: acc.platform, success: !!metrics };
      } catch (err) {
        const msg = (err as Error).message;
        await markAccountError(supabase, acc.id, msg);
        return { account_id: acc.id, platform: acc.platform, success: false, error: msg };
      }
    })
  );

  const mapped = results.map((r) =>
    r.status === "fulfilled" ? r.value : { success: false, error: (r.reason as Error).message }
  );

  return {
    success: true,
    synced: mapped.filter((r: any) => r.success).length,
    failed: mapped.filter((r: any) => !r.success).length,
    results: mapped,
  };
}

// ── POST bulk-sync — Service-role cron ──────────────────────────────────────

async function handleBulkSync(
  supabase: ReturnType<typeof createClient>,
  req: Request
) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return errorResponse("Authorization required", 401);

  const token = authHeader.replace("Bearer ", "");
  if (token !== supabaseServiceKey) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return errorResponse("Unauthorized", 403);

    const { data: adminCheck } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (!adminCheck) return errorResponse("Unauthorized: service_role or admin required", 403);
  }

  const { data: accounts, error } = await supabase
    .from("social_accounts")
    .select("id, platform, user_id")
    .eq("is_active", true);

  if (error) return errorResponse(`Failed to list accounts: ${error.message}`, 500);
  if (!accounts || accounts.length === 0) {
    return new Response(JSON.stringify({ success: true, message: "No active accounts" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const BATCH_SIZE = 5;
  let synced = 0;
  let failed = 0;
  const errors: { account_id: string; platform: string; error: string }[] = [];

  for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
    const batch = accounts.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (acc: { id: string; platform: string }) => {
        try {
          const account = await getAccountToken(supabase, acc.id);
          if (!account) throw new Error("Token unavailable");

          const metrics = await fetchFullAccountMetrics(account);
          if (metrics) {
            await saveSnapshot(supabase, acc.id, metrics);
            await saveLegacyMetrics(supabase, acc.id, metrics);
            await supabase
              .from("social_accounts")
              .update({ last_error: null, last_synced_at: new Date().toISOString() })
              .eq("id", acc.id);
            return true;
          }
          throw new Error("No metrics returned");
        } catch (err) {
          const msg = (err as Error).message;
          await markAccountError(supabase, acc.id, msg);
          errors.push({ account_id: acc.id, platform: acc.platform, error: msg });
          return false;
        }
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) synced++;
      else failed++;
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < accounts.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return new Response(
    JSON.stringify({ success: true, total: accounts.length, synced, failed, errors: errors.slice(0, 20) }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ── Legacy: fetch-post-metrics ──────────────────────────────────────────────

async function handleFetchPostMetrics(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: { post_id: string; account_id: string; scheduled_post_id?: string }
) {
  if (!body.post_id || !body.account_id) throw new Error("post_id and account_id are required");

  const account = await getAccountToken(supabase, body.account_id);
  if (!account) throw new Error("Account not active or tokens unavailable");

  const metrics = await fetchPostMetrics(account, body.post_id);
  if (!metrics) throw new Error("Failed to fetch metrics from platform");

  // Insert into social_metrics
  await supabase.from("social_metrics").insert({
    social_account_id: body.account_id,
    scheduled_post_id: body.scheduled_post_id || null,
    platform_post_id: body.post_id,
    metric_type: "post",
    impressions: metrics.impressions,
    reach: metrics.reach,
    engagement: metrics.engagement,
    likes: metrics.likes,
    comments: metrics.comments,
    shares: metrics.shares,
    saves: metrics.saves,
    clicks: metrics.clicks,
    video_views: metrics.video_views,
    metadata: metrics.metadata,
    recorded_at: new Date().toISOString(),
  });

  // Also write to post_metrics (v2) if scheduled_post_id provided
  if (body.scheduled_post_id) {
    await supabase.from("post_metrics").upsert(
      {
        scheduled_post_id: body.scheduled_post_id,
        social_account_id: body.account_id,
        platform_post_id: body.post_id,
        impressions: metrics.impressions,
        reach: metrics.reach,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves,
        clicks: metrics.clicks,
        video_views: metrics.video_views,
        engagement_rate: metrics.reach > 0 ? metrics.engagement / metrics.reach : 0,
        platform_data: metrics.metadata,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "scheduled_post_id,social_account_id" }
    );
  }

  await supabase
    .from("social_accounts")
    .update({ last_error: null, last_synced_at: new Date().toISOString() })
    .eq("id", body.account_id);

  return { success: true, account_id: body.account_id, post_id: body.post_id, platform: account.platform, metrics };
}

// ── Legacy: fetch-account-metrics ───────────────────────────────────────────

async function handleFetchAccountMetrics(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: { account_id: string }
) {
  if (!body.account_id) throw new Error("account_id is required");

  const account = await getAccountToken(supabase, body.account_id);
  if (!account) throw new Error("Account not active or tokens unavailable");

  const metrics = await fetchFullAccountMetrics(account);
  if (!metrics) throw new Error("Failed to fetch account metrics");

  await saveSnapshot(supabase, body.account_id, metrics);
  await saveLegacyMetrics(supabase, body.account_id, metrics);

  await supabase
    .from("social_accounts")
    .update({ last_error: null, last_synced_at: new Date().toISOString() })
    .eq("id", body.account_id);

  return { success: true, account_id: body.account_id, platform: account.platform, metrics };
}

// ============================================================================
// PLATFORM DISPATCHERS
// ============================================================================

async function fetchFullAccountMetrics(
  account: SocialAccount
): Promise<AccountMetricsResult | null> {
  try {
    switch (account.platform) {
      case "facebook":
        return await fetchFacebookFullMetrics(account);
      case "instagram":
        return await fetchInstagramFullMetrics(account);
      case "tiktok":
        return await fetchTikTokFullMetrics(account);
      case "youtube":
        return await fetchYouTubeFullMetrics(account);
      case "twitter":
        return await fetchTwitterFullMetrics(account);
      case "linkedin":
        return await fetchLinkedInFullMetrics(account);
      case "pinterest":
        return await fetchPinterestFullMetrics(account);
      default:
        console.error(`Unsupported platform: ${account.platform}`);
        return null;
    }
  } catch (err) {
    console.error(`Error fetching full metrics for ${account.platform}:`, err);
    throw err; // Re-throw to let caller handle
  }
}

async function fetchPostMetrics(
  account: SocialAccount,
  postId: string
): Promise<PostMetricsResult | null> {
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
        return null;
    }
  } catch (err) {
    console.error(`Error fetching post metrics for ${account.platform}:`, err);
    return null;
  }
}

// ============================================================================
// INSTAGRAM — Full Account Metrics
// ============================================================================

async function fetchInstagramFullMetrics(
  account: SocialAccount
): Promise<AccountMetricsResult> {
  const igUserId = account.platform_user_id;
  const token = account.access_token;
  const baseUrl = "https://graph.facebook.com/v19.0";

  // 1. Account info
  const accountInfoRes = await fetch(
    `${baseUrl}/${igUserId}?fields=followers_count,follows_count,media_count,profile_picture_url,username,biography&access_token=${token}`
  );
  if (!accountInfoRes.ok) {
    const errBody = await accountInfoRes.text();
    throw new Error(`Instagram account info error (${accountInfoRes.status}): ${errBody}`);
  }
  const accountInfo = await accountInfoRes.json();

  // 2. Account insights — v19+ valid metrics:
  //    reach, follower_count, website_clicks, profile_views, online_followers,
  //    accounts_engaged, total_interactions, likes, comments
  //    NOTE: "impressions" was REMOVED in v19+; use "reach" and "total_interactions" instead
  let insights: Record<string, number> = {};
  let insightsError: string | null = null;
  try {
    const nowTs = Math.floor(Date.now() / 1000);
    const sinceTs = nowTs - 28 * 86400;

    // metric_type=total_value with since/until (v19+ valid metrics only)
    const validMetrics = "reach,profile_views,accounts_engaged,total_interactions,likes,comments,follower_count";
    const insightsUrl = `${baseUrl}/${igUserId}/insights?metric=${validMetrics}&metric_type=total_value&since=${sinceTs}&until=${nowTs}&access_token=${token}`;
    const insightsRes = await fetch(insightsUrl);

    if (insightsRes.ok) {
      const insightsData = await insightsRes.json();
      if (insightsData.data) {
        for (const item of insightsData.data) {
          const val = item.total_value?.value ?? item.values?.[0]?.value ?? 0;
          insights[item.name] = typeof val === "number" ? val : 0;
        }
      }
    } else {
      const errText = await insightsRes.text();
      insightsError = `total_value(${insightsRes.status}): ${errText.substring(0, 300)}`;

      // Fallback: period=day with fewer metrics
      const fallbackUrl = `${baseUrl}/${igUserId}/insights?metric=reach,profile_views&period=day&since=${sinceTs}&until=${nowTs}&access_token=${token}`;
      const fbRes = await fetch(fallbackUrl);
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        insightsError = null;
        if (fbData.data) {
          for (const item of fbData.data) {
            const total = (item.values || []).reduce(
              (s: number, v: any) => s + (typeof v.value === "number" ? v.value : 0), 0
            );
            insights[item.name] = total;
          }
        }
      } else {
        const fbErr = await fbRes.text();
        insightsError += ` | day(${fbRes.status}): ${fbErr.substring(0, 200)}`;
      }
    }
  } catch (e) {
    insightsError = `exception: ${(e as Error).message}`;
  }

  // 3. Recent media with metrics (last 25 posts)
  const recentMedia: RecentMediaItem[] = [];
  let totalLikes = 0, totalComments = 0, totalShares = 0, totalSaves = 0, totalVideoViews = 0;

  try {
    const mediaRes = await fetch(
      `${baseUrl}/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=25&access_token=${token}`
    );

    if (mediaRes.ok) {
      const mediaData = await mediaRes.json();
      const mediaItems = mediaData.data || [];

      for (const item of mediaItems) {
        const likes = item.like_count ?? 0;
        const comments = item.comments_count ?? 0;

        // Try to get detailed insights per media
        let mediaInsights = { impressions: 0, reach: 0, shares: 0, saves: 0, video_views: 0 };
        try {
          const isVideo = item.media_type === "VIDEO" || item.media_type === "REEL";
          // For Reels: use plays instead of video_views (v19+ deprecates video_views for reels)
          const isReel = item.media_type === "REEL";
          let metricsStr: string;
          if (isReel) {
            metricsStr = "impressions,reach,shares,saved,plays";
          } else if (isVideo) {
            metricsStr = "impressions,reach,shares,saved,video_views";
          } else {
            metricsStr = "impressions,reach,shares,saved";
          }

          const miRes = await fetch(
            `${baseUrl}/${item.id}/insights?metric=${metricsStr}&access_token=${token}`
          );
          if (miRes.ok) {
            const miData = await miRes.json();
            for (const mi of miData.data || []) {
              const v = mi.values?.[0]?.value ?? 0;
              if (mi.name === "impressions") mediaInsights.impressions = v;
              if (mi.name === "reach") mediaInsights.reach = v;
              if (mi.name === "shares") mediaInsights.shares = v;
              if (mi.name === "saved") mediaInsights.saves = v;
              if (mi.name === "video_views" || mi.name === "plays") mediaInsights.video_views = v;
            }
          } else {
            // If specific metrics fail, try minimal set
            const minRes = await fetch(
              `${baseUrl}/${item.id}/insights?metric=impressions,reach&access_token=${token}`
            );
            if (minRes.ok) {
              const minData = await minRes.json();
              for (const mi of minData.data || []) {
                const v = mi.values?.[0]?.value ?? 0;
                if (mi.name === "impressions") mediaInsights.impressions = v;
                if (mi.name === "reach") mediaInsights.reach = v;
              }
            }
          }
        } catch {
          // Non-critical — use basic counts
        }

        totalLikes += likes;
        totalComments += comments;
        totalShares += mediaInsights.shares;
        totalSaves += mediaInsights.saves;
        totalVideoViews += mediaInsights.video_views;

        recentMedia.push({
          id: item.id,
          caption: item.caption || null,
          media_type: item.media_type || "IMAGE",
          media_url: item.media_url || null,
          thumbnail_url: item.thumbnail_url || null,
          permalink: item.permalink || null,
          timestamp: item.timestamp || new Date().toISOString(),
          likes,
          comments,
          impressions: mediaInsights.impressions,
          reach: mediaInsights.reach,
          shares: mediaInsights.shares,
          saves: mediaInsights.saves,
          video_views: mediaInsights.video_views,
          engagement: likes + comments + mediaInsights.shares + mediaInsights.saves,
        });
      }
    }
  } catch (e) {
    console.warn("Instagram recent media fetch failed:", e);
  }

  // 4. Audience demographics (requires instagram_manage_insights + >= 100 followers)
  let demographics: Record<string, unknown> = {};
  let demographicsError: string | null = null;
  try {
    const demoRes = await fetch(
      `${baseUrl}/${igUserId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=city,country,age,gender&access_token=${token}`
    );
    if (demoRes.ok) {
      const demoData = await demoRes.json();
      if (demoData.data) {
        for (const item of demoData.data) {
          if (item.total_value?.breakdowns) {
            demographics = item.total_value.breakdowns.reduce(
              (acc: Record<string, unknown>, b: any) => {
                acc[b.dimension_keys?.[0] || "unknown"] = b.results || [];
                return acc;
              },
              {}
            );
          }
        }
      }
    } else {
      const errText = await demoRes.text();
      demographicsError = `${demoRes.status}: ${errText.substring(0, 200)}`;
    }
  } catch (e) {
    demographicsError = `exception: ${(e as Error).message}`;
  }

  // If account-level insights failed, sum from per-media insights as fallback
  const totalMediaImpressions = recentMedia.reduce((s, m) => s + m.impressions, 0);
  const totalMediaReach = recentMedia.reduce((s, m) => s + m.reach, 0);

  return {
    followers_count: accountInfo.followers_count ?? 0,
    following_count: accountInfo.follows_count ?? 0,
    posts_count: accountInfo.media_count ?? 0,
    profile_picture_url: accountInfo.profile_picture_url,
    username: accountInfo.username,
    biography: accountInfo.biography,
    // "impressions" was removed in v19+ — use media-level sum as primary source
    impressions: totalMediaImpressions || insights["total_interactions"] || 0,
    reach: insights["reach"] || totalMediaReach,
    profile_views: insights["profile_views"] ?? 0,
    accounts_engaged: insights["accounts_engaged"] ?? 0,
    // Use account-level likes/comments from insights if media-level totals are 0
    total_likes: totalLikes || insights["likes"] || 0,
    total_comments: totalComments || insights["comments"] || 0,
    total_shares: totalShares,
    total_saves: totalSaves,
    video_views: totalVideoViews,
    followers_gained: 0,
    followers_lost: 0,
    audience_demographics: demographics,
    recent_media: recentMedia,
    raw_data: {
      accountInfo,
      insights,
      demographics,
      ...(insightsError ? { insightsError } : {}),
      ...(demographicsError ? { demographicsError } : {}),
      mediaImpressionsFallback: insightsError ? totalMediaImpressions : undefined,
    },
  };
}

// ============================================================================
// FACEBOOK PAGE — Full Metrics
// ============================================================================

async function fetchFacebookFullMetrics(
  account: SocialAccount
): Promise<AccountMetricsResult> {
  const pageId = account.platform_page_id || account.platform_user_id;
  const token = account.access_token;
  const baseUrl = "https://graph.facebook.com/v19.0";

  // 1. Page info
  const pageInfoRes = await fetch(
    `${baseUrl}/${pageId}?fields=followers_count,fan_count,talking_about_count,new_like_count,picture,name&access_token=${token}`
  );
  if (!pageInfoRes.ok) {
    const errBody = await pageInfoRes.text();
    throw new Error(`Facebook page info error (${pageInfoRes.status}): ${errBody}`);
  }
  const pageInfo = await pageInfoRes.json();

  // 2. Page insights — try metric groups individually for resilience
  let insights: Record<string, number> = {};
  let fbInsightsError: string | null = null;
  const nowTs = Math.floor(Date.now() / 1000);
  const sinceTs = nowTs - 28 * 86400;

  // Try metric groups separately so one failing group doesn't kill all insights
  const metricGroups = [
    ["page_impressions", "page_impressions_unique"],
    ["page_engaged_users", "page_post_engagements"],
    ["page_views_total"],
    ["page_fan_adds", "page_fan_removes"],
    ["page_video_views"],
  ];

  for (const group of metricGroups) {
    try {
      const url = `${baseUrl}/${pageId}/insights?metric=${group.join(",")}&period=day&since=${sinceTs}&until=${nowTs}&access_token=${token}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        for (const item of data.data || []) {
          const values = item.values || [];
          const total = values.reduce((s: number, v: any) => s + (typeof v.value === "number" ? v.value : 0), 0);
          insights[item.name] = total;
        }
      } else {
        const errText = await res.text();
        const errMsg = `${group.join(",")}(${res.status}): ${errText.substring(0, 150)}`;
        fbInsightsError = fbInsightsError ? `${fbInsightsError} | ${errMsg}` : errMsg;
      }
    } catch (e) {
      const errMsg = `${group.join(",")}: ${(e as Error).message}`;
      fbInsightsError = fbInsightsError ? `${fbInsightsError} | ${errMsg}` : errMsg;
    }
  }

  // 3. Recent posts with metrics (last 25)
  const recentMedia: RecentMediaItem[] = [];
  let totalLikes = 0, totalComments = 0, totalShares = 0;

  try {
    const postsRes = await fetch(
      `${baseUrl}/${pageId}/posts?fields=id,message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true),shares&limit=25&access_token=${token}`
    );
    if (postsRes.ok) {
      const postsData = await postsRes.json();
      for (const post of postsData.data || []) {
        const likes = post.likes?.summary?.total_count ?? 0;
        const comments = post.comments?.summary?.total_count ?? 0;
        const shares = post.shares?.count ?? 0;

        totalLikes += likes;
        totalComments += comments;
        totalShares += shares;

        // Try post insights
        let postImpressions = 0, postReach = 0;
        try {
          const piRes = await fetch(
            `${baseUrl}/${post.id}/insights?metric=post_impressions,post_reach&access_token=${token}`
          );
          if (piRes.ok) {
            const piData = await piRes.json();
            for (const pi of piData.data || []) {
              const v = pi.values?.[0]?.value ?? 0;
              if (pi.name === "post_impressions") postImpressions = v;
              if (pi.name === "post_reach") postReach = v;
            }
          }
        } catch { /* non-critical */ }

        recentMedia.push({
          id: post.id,
          caption: post.message || null,
          media_type: "POST",
          media_url: post.full_picture || null,
          thumbnail_url: post.full_picture || null,
          permalink: post.permalink_url || null,
          timestamp: post.created_time || new Date().toISOString(),
          likes,
          comments,
          impressions: postImpressions,
          reach: postReach,
          shares,
          saves: 0,
          video_views: 0,
          engagement: likes + comments + shares,
        });
      }
    }
  } catch (e) {
    console.warn("Facebook posts fetch failed:", e);
  }

  const followersCount = pageInfo.followers_count ?? pageInfo.fan_count ?? 0;

  // Fallback: sum from per-post insights if page-level insights failed
  const postImprTotal = recentMedia.reduce((s, m) => s + m.impressions, 0);
  const postReachTotal = recentMedia.reduce((s, m) => s + m.reach, 0);

  return {
    followers_count: followersCount,
    following_count: 0,
    posts_count: recentMedia.length,
    profile_picture_url: pageInfo.picture?.data?.url,
    username: pageInfo.name,
    biography: undefined,
    impressions: insights["page_impressions"] || postImprTotal,
    reach: insights["page_impressions_unique"] || postReachTotal,
    profile_views: insights["page_views_total"] ?? 0,
    accounts_engaged: insights["page_engaged_users"] ?? 0,
    total_likes: totalLikes,
    total_comments: totalComments,
    total_shares: totalShares,
    total_saves: 0,
    video_views: insights["page_video_views"] ?? 0,
    followers_gained: insights["page_fan_adds"] ?? 0,
    followers_lost: insights["page_fan_removes"] ?? 0,
    audience_demographics: {},
    recent_media: recentMedia,
    raw_data: {
      pageInfo,
      insights,
      ...(fbInsightsError ? { fbInsightsError } : {}),
    },
  };
}

// ============================================================================
// TIKTOK — Full Metrics
// ============================================================================

async function fetchTikTokFullMetrics(
  account: SocialAccount
): Promise<AccountMetricsResult> {
  const token = account.access_token;

  const res = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count",
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error(`TikTok API error: ${res.status}`);
  const data = await res.json();
  const user = data.data?.user;
  if (!user) throw new Error("TikTok user info not available");

  return {
    followers_count: user.follower_count ?? 0,
    following_count: user.following_count ?? 0,
    posts_count: user.video_count ?? 0,
    impressions: 0,
    reach: 0,
    profile_views: 0,
    accounts_engaged: 0,
    total_likes: user.likes_count ?? 0,
    total_comments: 0,
    total_shares: 0,
    total_saves: 0,
    video_views: 0,
    followers_gained: 0,
    followers_lost: 0,
    audience_demographics: {},
    recent_media: [],
    raw_data: { user },
  };
}

// ============================================================================
// YOUTUBE — Full Metrics
// ============================================================================

async function fetchYouTubeFullMetrics(
  account: SocialAccount
): Promise<AccountMetricsResult> {
  const token = account.access_token;

  // Channel stats
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!channelRes.ok) throw new Error(`YouTube API error: ${channelRes.status}`);
  const channelData = await channelRes.json();
  const channel = channelData.items?.[0];
  if (!channel) throw new Error("YouTube channel not found");

  const stats = channel.statistics;

  // Recent videos
  const recentMedia: RecentMediaItem[] = [];
  let totalLikes = 0, totalComments = 0, totalViews = 0;

  try {
    // Search for recent uploads
    const searchRes = await fetch(
      "https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=25&order=date",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const videoIds = (searchData.items || []).map((v: any) => v.id?.videoId).filter(Boolean);

      if (videoIds.length > 0) {
        const videosRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds.join(",")}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (videosRes.ok) {
          const videosData = await videosRes.json();
          for (const video of videosData.items || []) {
            const vs = video.statistics;
            const likes = parseInt(vs.likeCount ?? "0", 10);
            const comments = parseInt(vs.commentCount ?? "0", 10);
            const views = parseInt(vs.viewCount ?? "0", 10);

            totalLikes += likes;
            totalComments += comments;
            totalViews += views;

            recentMedia.push({
              id: video.id,
              caption: video.snippet?.title || null,
              media_type: "VIDEO",
              media_url: null,
              thumbnail_url: video.snippet?.thumbnails?.medium?.url || null,
              permalink: `https://youtube.com/watch?v=${video.id}`,
              timestamp: video.snippet?.publishedAt || new Date().toISOString(),
              likes,
              comments,
              impressions: views,
              reach: views,
              shares: 0,
              saves: parseInt(vs.favoriteCount ?? "0", 10),
              video_views: views,
              engagement: likes + comments,
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn("YouTube recent videos fetch failed:", e);
  }

  return {
    followers_count: parseInt(stats.subscriberCount ?? "0", 10),
    following_count: 0,
    posts_count: parseInt(stats.videoCount ?? "0", 10),
    profile_picture_url: channel.snippet?.thumbnails?.default?.url,
    username: channel.snippet?.title,
    biography: channel.snippet?.description,
    impressions: parseInt(stats.viewCount ?? "0", 10),
    reach: parseInt(stats.viewCount ?? "0", 10),
    profile_views: 0,
    accounts_engaged: 0,
    total_likes: totalLikes,
    total_comments: totalComments,
    total_shares: 0,
    total_saves: 0,
    video_views: totalViews,
    followers_gained: 0,
    followers_lost: 0,
    audience_demographics: {},
    recent_media: recentMedia,
    raw_data: { channel: stats },
  };
}

// ============================================================================
// TWITTER/X — Full Metrics
// ============================================================================

async function fetchTwitterFullMetrics(
  account: SocialAccount
): Promise<AccountMetricsResult> {
  const token = account.access_token;

  const res = await fetch(
    "https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url,description",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Twitter API error: ${res.status}`);
  const data = await res.json();
  const pm = data.data?.public_metrics;
  if (!pm) throw new Error("Twitter user metrics not available");

  return {
    followers_count: pm.followers_count ?? 0,
    following_count: pm.following_count ?? 0,
    posts_count: pm.tweet_count ?? 0,
    profile_picture_url: data.data?.profile_image_url,
    username: data.data?.username,
    biography: data.data?.description,
    impressions: 0,
    reach: 0,
    profile_views: 0,
    accounts_engaged: 0,
    total_likes: pm.like_count ?? 0,
    total_comments: 0,
    total_shares: 0,
    total_saves: 0,
    video_views: 0,
    followers_gained: 0,
    followers_lost: 0,
    audience_demographics: {},
    recent_media: [],
    raw_data: { user: data.data },
  };
}

// ============================================================================
// LINKEDIN — Full Metrics
// ============================================================================

async function fetchLinkedInFullMetrics(
  account: SocialAccount
): Promise<AccountMetricsResult> {
  const token = account.access_token;
  const orgUrn = account.platform_page_id || `urn:li:organization:${account.platform_user_id}`;
  const encodedOrg = encodeURIComponent(orgUrn);

  let followersCount = 0;
  let followersGained = 0;

  try {
    const res = await fetch(
      `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodedOrg}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": "202401",
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      const el = data.elements?.[0];
      if (el) {
        const fc = el.followerCounts || {};
        followersCount = (fc.organicFollowerCount ?? 0) + (fc.paidFollowerCount ?? 0);
        followersGained = el.followerGains?.organicFollowerGain ?? 0;
      }
    }
  } catch (e) {
    console.warn("LinkedIn follower stats failed:", e);
  }

  return {
    followers_count: followersCount,
    following_count: 0,
    posts_count: 0,
    impressions: 0,
    reach: 0,
    profile_views: 0,
    accounts_engaged: 0,
    total_likes: 0,
    total_comments: 0,
    total_shares: 0,
    total_saves: 0,
    video_views: 0,
    followers_gained: followersGained,
    followers_lost: 0,
    audience_demographics: {},
    recent_media: [],
    raw_data: { followersCount, followersGained },
  };
}

// ============================================================================
// PINTEREST — Full Metrics
// ============================================================================

async function fetchPinterestFullMetrics(
  account: SocialAccount
): Promise<AccountMetricsResult> {
  const token = account.access_token;

  const res = await fetch("https://api.pinterest.com/v5/user_account", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Pinterest API error: ${res.status}`);
  const data = await res.json();

  return {
    followers_count: data.follower_count ?? 0,
    following_count: data.following_count ?? 0,
    posts_count: data.pin_count ?? 0,
    profile_picture_url: data.profile_image,
    username: data.username,
    biography: data.about,
    impressions: data.monthly_views ?? 0,
    reach: data.monthly_views ?? 0,
    profile_views: 0,
    accounts_engaged: 0,
    total_likes: 0,
    total_comments: 0,
    total_shares: 0,
    total_saves: 0,
    video_views: 0,
    followers_gained: 0,
    followers_lost: 0,
    audience_demographics: {},
    recent_media: [],
    raw_data: { user: data },
  };
}

// ============================================================================
// POST-LEVEL METRICS (individual posts — legacy, used by fetch-post-metrics)
// ============================================================================

async function fetchFacebookPostMetrics(
  account: SocialAccount,
  postId: string
): Promise<PostMetricsResult | null> {
  const url = `https://graph.facebook.com/v19.0/${postId}/insights?metric=post_impressions,post_reach,post_reactions_like_total,post_comments,post_shares&access_token=${account.access_token}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Facebook post metrics error: ${res.status}`);

  const data = await res.json();
  const m: Record<string, number> = {};
  for (const i of data.data || []) {
    m[i.name] = i.values?.[0]?.value ?? 0;
  }

  const likes = m["post_reactions_like_total"] ?? 0;
  const comments = m["post_comments"] ?? 0;
  const shares = m["post_shares"] ?? 0;

  return {
    impressions: m["post_impressions"] ?? 0,
    reach: m["post_reach"] ?? 0,
    likes, comments, shares,
    saves: 0, clicks: 0, video_views: 0, watch_time_seconds: 0,
    engagement: likes + comments + shares,
    metadata: { raw_insights: m },
  };
}

async function fetchInstagramPostMetrics(
  account: SocialAccount,
  mediaId: string
): Promise<PostMetricsResult | null> {
  // Try with video_views first, fallback without
  let metricsStr = "impressions,reach,likes,comments,shares,saved,video_views";
  let res = await fetch(
    `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=${metricsStr}&access_token=${account.access_token}`
  );

  if (!res.ok && res.status === 400) {
    metricsStr = "impressions,reach,likes,comments,shares,saved";
    res = await fetch(
      `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=${metricsStr}&access_token=${account.access_token}`
    );
  }

  if (!res.ok) throw new Error(`Instagram post metrics error: ${res.status}`);

  const data = await res.json();
  const m: Record<string, number> = {};
  for (const i of data.data || []) {
    m[i.name] = i.values?.[0]?.value ?? 0;
  }

  const likes = m["likes"] ?? 0;
  const comments = m["comments"] ?? 0;
  const shares = m["shares"] ?? 0;
  const saves = m["saved"] ?? 0;

  return {
    impressions: m["impressions"] ?? 0,
    reach: m["reach"] ?? 0,
    likes, comments, shares, saves,
    clicks: 0, video_views: m["video_views"] ?? 0, watch_time_seconds: 0,
    engagement: likes + comments + shares + saves,
    metadata: { raw_insights: m },
  };
}

async function fetchTikTokVideoMetrics(
  account: SocialAccount,
  videoId: string
): Promise<PostMetricsResult | null> {
  const res = await fetch(
    "https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${account.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ filters: { video_ids: [videoId] } }),
    }
  );
  if (!res.ok) throw new Error(`TikTok video metrics error: ${res.status}`);
  const data = await res.json();
  const v = data.data?.videos?.[0];
  if (!v) return null;

  return {
    impressions: v.view_count ?? 0,
    reach: v.view_count ?? 0,
    likes: v.like_count ?? 0,
    comments: v.comment_count ?? 0,
    shares: v.share_count ?? 0,
    saves: 0, clicks: 0, video_views: v.view_count ?? 0, watch_time_seconds: 0,
    engagement: (v.like_count ?? 0) + (v.comment_count ?? 0) + (v.share_count ?? 0),
    metadata: { raw: v },
  };
}

async function fetchYouTubeVideoMetrics(
  account: SocialAccount,
  videoId: string
): Promise<PostMetricsResult | null> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(videoId)}`,
    { headers: { Authorization: `Bearer ${account.access_token}` } }
  );
  if (!res.ok) throw new Error(`YouTube video metrics error: ${res.status}`);
  const data = await res.json();
  const s = data.items?.[0]?.statistics;
  if (!s) return null;

  const likes = parseInt(s.likeCount ?? "0", 10);
  const comments = parseInt(s.commentCount ?? "0", 10);
  const views = parseInt(s.viewCount ?? "0", 10);

  return {
    impressions: views, reach: views,
    likes, comments, shares: 0, saves: parseInt(s.favoriteCount ?? "0", 10),
    clicks: 0, video_views: views, watch_time_seconds: 0,
    engagement: likes + comments,
    metadata: { raw_statistics: s },
  };
}

async function fetchTwitterTweetMetrics(
  account: SocialAccount,
  tweetId: string
): Promise<PostMetricsResult | null> {
  const res = await fetch(
    `https://api.twitter.com/2/tweets/${encodeURIComponent(tweetId)}?tweet.fields=public_metrics`,
    { headers: { Authorization: `Bearer ${account.access_token}` } }
  );
  if (!res.ok) throw new Error(`Twitter tweet metrics error: ${res.status}`);
  const data = await res.json();
  const pm = data.data?.public_metrics;
  if (!pm) return null;

  return {
    impressions: pm.impression_count ?? 0, reach: pm.impression_count ?? 0,
    likes: pm.like_count ?? 0, comments: pm.reply_count ?? 0,
    shares: pm.retweet_count ?? 0, saves: pm.bookmark_count ?? 0,
    clicks: 0, video_views: 0, watch_time_seconds: 0,
    engagement: (pm.like_count ?? 0) + (pm.reply_count ?? 0) + (pm.retweet_count ?? 0),
    metadata: { raw_public_metrics: pm },
  };
}

async function fetchLinkedInPostMetrics(
  account: SocialAccount,
  ugcPostUrn: string
): Promise<PostMetricsResult | null> {
  const res = await fetch(
    `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(ugcPostUrn)}`,
    {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202401",
      },
    }
  );
  if (!res.ok) throw new Error(`LinkedIn post metrics error: ${res.status}`);
  const data = await res.json();

  const likes = data.likesSummary?.totalLikes ?? 0;
  const comments = data.commentsSummary?.totalFirstLevelComments ?? 0;
  const shares = data.shareCount ?? 0;

  return {
    impressions: 0, reach: 0,
    likes, comments, shares, saves: 0, clicks: 0,
    video_views: 0, watch_time_seconds: 0,
    engagement: likes + comments + shares,
    metadata: { raw: data },
  };
}

async function fetchPinterestPinMetrics(
  account: SocialAccount,
  pinId: string
): Promise<PostMetricsResult | null> {
  const res = await fetch(
    `https://api.pinterest.com/v5/pins/${encodeURIComponent(pinId)}?pin_metrics=true`,
    { headers: { Authorization: `Bearer ${account.access_token}` } }
  );
  if (!res.ok) throw new Error(`Pinterest pin metrics error: ${res.status}`);
  const data = await res.json();
  const at = data.pin_metrics?.all_time || {};

  return {
    impressions: at.impression ?? 0, reach: at.impression ?? 0,
    likes: 0, comments: 0, shares: 0,
    saves: at.save ?? 0, clicks: at.outbound_click ?? at.pin_click ?? 0,
    video_views: at.video_start ?? 0, watch_time_seconds: 0,
    engagement: (at.save ?? 0) + (at.outbound_click ?? 0),
    metadata: { raw_pin_metrics: data.pin_metrics },
  };
}
