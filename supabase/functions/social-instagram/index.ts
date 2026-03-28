// ============================================================================
// KREOON SOCIAL INSTAGRAM API
// Instagram Basic Display API + Graph API integration for creator verification
// ============================================================================
//
// Routes:
//   /connect       - GET: Initiate OAuth flow
//   /callback      - GET: Handle OAuth callback
//   /metrics/:id   - GET: Fetch real metrics for verification
//   /verify        - POST: Verify follower count against declared
//
// JWT: verify_jwt = false (auth handled manually for OAuth)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Instagram API credentials
const IG_CLIENT_ID = Deno.env.get("SOCIAL_META_IG_CLIENT_ID") || Deno.env.get("SOCIAL_META_FB_CLIENT_ID");
const IG_CLIENT_SECRET = Deno.env.get("SOCIAL_META_IG_CLIENT_SECRET") || Deno.env.get("SOCIAL_META_FB_CLIENT_SECRET");
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://app.kreoon.com";

// ── Types ────────────────────────────────────────────────────────────────────

interface InstagramMetrics {
  followers_count: number;
  following_count: number;
  media_count: number;
  username: string;
  profile_picture_url?: string;
  biography?: string;
  website?: string;
  // Engagement metrics (requires business account)
  impressions?: number;
  reach?: number;
  profile_views?: number;
  // Calculated
  engagement_rate?: number;
  avg_likes_per_post?: number;
  avg_comments_per_post?: number;
}

interface RecentMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

interface VerificationResult {
  is_verified: boolean;
  declared_followers: number;
  actual_followers: number;
  variance_pct: number;
  verification_status: 'verified' | 'mismatch' | 'pending' | 'error';
  verified_at: string;
  platform: 'instagram';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  console.error(`[social-instagram] Error: ${message}`);
  return jsonResponse({ error: message }, status);
}

function redirectResponse(url: string) {
  return new Response(null, {
    status: 302,
    headers: { ...CORS_HEADERS, Location: url },
  });
}

function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const supabase = getServiceClient();
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// ── Instagram API Functions ──────────────────────────────────────────────────

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{
  access_token: string;
  user_id: string;
}> {
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: IG_CLIENT_ID!,
      client_secret: IG_CLIENT_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

async function exchangeForLongLivedToken(shortToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const url = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_CLIENT_SECRET}&access_token=${shortToken}`;

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Long-lived token exchange failed: ${error}`);
  }

  return response.json();
}

async function getInstagramProfile(accessToken: string): Promise<InstagramMetrics> {
  // Get basic profile info
  const profileUrl = `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`;
  const profileRes = await fetch(profileUrl);

  if (!profileRes.ok) {
    throw new Error("Failed to fetch Instagram profile");
  }

  const profile = await profileRes.json();

  // Try to get business account insights (may fail for personal accounts)
  let businessInsights: any = {};
  try {
    // For Instagram Business/Creator accounts connected via Facebook
    const insightsUrl = `https://graph.instagram.com/${profile.id}/insights?metric=follower_count,impressions,reach,profile_views&period=day&access_token=${accessToken}`;
    const insightsRes = await fetch(insightsUrl);
    if (insightsRes.ok) {
      const insights = await insightsRes.json();
      businessInsights = insights.data?.reduce((acc: any, metric: any) => {
        acc[metric.name] = metric.values?.[0]?.value || 0;
        return acc;
      }, {}) || {};
    }
  } catch (e) {
    console.log("[social-instagram] Business insights not available (personal account)");
  }

  // Get recent media for engagement calculation
  let recentMedia: RecentMedia[] = [];
  let avgLikes = 0;
  let avgComments = 0;

  try {
    const mediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=25&access_token=${accessToken}`;
    const mediaRes = await fetch(mediaUrl);
    if (mediaRes.ok) {
      const mediaData = await mediaRes.json();
      recentMedia = mediaData.data || [];

      if (recentMedia.length > 0) {
        const totalLikes = recentMedia.reduce((sum, m) => sum + (m.like_count || 0), 0);
        const totalComments = recentMedia.reduce((sum, m) => sum + (m.comments_count || 0), 0);
        avgLikes = Math.round(totalLikes / recentMedia.length);
        avgComments = Math.round(totalComments / recentMedia.length);
      }
    }
  } catch (e) {
    console.log("[social-instagram] Could not fetch media");
  }

  // Calculate engagement rate if we have followers
  const followersCount = businessInsights.follower_count || 0;
  let engagementRate = 0;
  if (followersCount > 0 && (avgLikes > 0 || avgComments > 0)) {
    engagementRate = ((avgLikes + avgComments) / followersCount) * 100;
  }

  return {
    followers_count: followersCount,
    following_count: 0, // Not available via Basic Display API
    media_count: profile.media_count || 0,
    username: profile.username,
    impressions: businessInsights.impressions,
    reach: businessInsights.reach,
    profile_views: businessInsights.profile_views,
    engagement_rate: Math.round(engagementRate * 100) / 100,
    avg_likes_per_post: avgLikes,
    avg_comments_per_post: avgComments,
  };
}

// ── Route Handlers ───────────────────────────────────────────────────────────

async function handleConnect(req: Request, supabase: ReturnType<typeof createClient>): Promise<Response> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  const url = new URL(req.url);
  const creatorProfileId = url.searchParams.get("profile_id");
  const returnUrl = url.searchParams.get("return_url") || `${FRONTEND_URL}/marketplace/profile`;

  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Store state in DB for callback verification
  await supabase.from("oauth_states").insert({
    state,
    user_id: user.id,
    platform: "instagram",
    creator_profile_id: creatorProfileId,
    return_url: returnUrl,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
  });

  const redirectUri = `${supabaseUrl}/functions/v1/social-instagram/callback`;
  const scopes = "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments";

  const authUrl = new URL("https://api.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", IG_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  return jsonResponse({ url: authUrl.toString() });
}

async function handleCallback(req: Request, supabase: ReturnType<typeof createClient>): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return redirectResponse(`${FRONTEND_URL}/marketplace/profile?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return redirectResponse(`${FRONTEND_URL}/marketplace/profile?error=missing_params`);
  }

  // Verify state
  const { data: stateData } = await supabase
    .from("oauth_states")
    .select("*")
    .eq("state", state)
    .eq("platform", "instagram")
    .single();

  if (!stateData) {
    return redirectResponse(`${FRONTEND_URL}/marketplace/profile?error=invalid_state`);
  }

  // Delete used state
  await supabase.from("oauth_states").delete().eq("state", state);

  try {
    const redirectUri = `${supabaseUrl}/functions/v1/social-instagram/callback`;

    // Exchange code for short-lived token
    const tokenData = await exchangeCodeForToken(code, redirectUri);

    // Exchange for long-lived token
    const longLivedToken = await exchangeForLongLivedToken(tokenData.access_token);

    // Get profile metrics
    const metrics = await getInstagramProfile(longLivedToken.access_token);

    // Store or update social connection
    const expiresAt = new Date(Date.now() + longLivedToken.expires_in * 1000).toISOString();

    await supabase.from("creator_social_connections").upsert({
      user_id: stateData.user_id,
      creator_profile_id: stateData.creator_profile_id,
      platform: "instagram",
      platform_user_id: tokenData.user_id,
      platform_username: metrics.username,
      access_token: longLivedToken.access_token,
      token_expires_at: expiresAt,
      followers_count: metrics.followers_count,
      following_count: metrics.following_count,
      posts_count: metrics.media_count,
      engagement_rate: metrics.engagement_rate,
      last_synced_at: new Date().toISOString(),
      is_verified: false, // Will be verified separately
      metadata: {
        account_type: "instagram",
        avg_likes: metrics.avg_likes_per_post,
        avg_comments: metrics.avg_comments_per_post,
      },
    }, {
      onConflict: "user_id,platform",
    });

    // Store verified metrics snapshot
    await supabase.from("creator_verified_metrics").insert({
      user_id: stateData.user_id,
      creator_profile_id: stateData.creator_profile_id,
      platform: "instagram",
      followers_count: metrics.followers_count,
      following_count: metrics.following_count,
      posts_count: metrics.media_count,
      engagement_rate: metrics.engagement_rate,
      avg_likes: metrics.avg_likes_per_post,
      avg_comments: metrics.avg_comments_per_post,
      verified_at: new Date().toISOString(),
      verification_source: "api",
    });

    const returnUrl = stateData.return_url || `${FRONTEND_URL}/marketplace/profile`;
    return redirectResponse(`${returnUrl}?instagram_connected=true`);

  } catch (err) {
    console.error("[social-instagram] Callback error:", err);
    const returnUrl = stateData.return_url || `${FRONTEND_URL}/marketplace/profile`;
    return redirectResponse(`${returnUrl}?error=${encodeURIComponent(String(err))}`);
  }
}

async function handleGetMetrics(req: Request, supabase: ReturnType<typeof createClient>, connectionId: string): Promise<Response> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // Get the connection
  const { data: connection, error } = await supabase
    .from("creator_social_connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (error || !connection) {
    return errorResponse("Connection not found", 404);
  }

  // Verify ownership
  if (connection.user_id !== user.id) {
    return errorResponse("Unauthorized", 403);
  }

  try {
    const metrics = await getInstagramProfile(connection.access_token);

    // Update stored metrics
    await supabase.from("creator_social_connections").update({
      followers_count: metrics.followers_count,
      following_count: metrics.following_count,
      posts_count: metrics.media_count,
      engagement_rate: metrics.engagement_rate,
      last_synced_at: new Date().toISOString(),
      metadata: {
        ...connection.metadata,
        avg_likes: metrics.avg_likes_per_post,
        avg_comments: metrics.avg_comments_per_post,
        impressions: metrics.impressions,
        reach: metrics.reach,
        profile_views: metrics.profile_views,
      },
    }).eq("id", connectionId);

    return jsonResponse({
      success: true,
      metrics,
      synced_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[social-instagram] Metrics fetch error:", err);
    return errorResponse(`Failed to fetch metrics: ${err}`, 500);
  }
}

async function handleVerify(req: Request, supabase: ReturnType<typeof createClient>): Promise<Response> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  const body = await req.json();
  const { creator_profile_id, declared_followers } = body;

  if (!creator_profile_id || declared_followers === undefined) {
    return errorResponse("Missing required fields: creator_profile_id, declared_followers");
  }

  // Get the connection for this profile
  const { data: connection } = await supabase
    .from("creator_social_connections")
    .select("*")
    .eq("creator_profile_id", creator_profile_id)
    .eq("platform", "instagram")
    .single();

  if (!connection) {
    return jsonResponse({
      is_verified: false,
      verification_status: "pending",
      message: "Instagram account not connected",
    });
  }

  try {
    // Fetch fresh metrics
    const metrics = await getInstagramProfile(connection.access_token);
    const actualFollowers = metrics.followers_count;

    // Calculate variance
    const variance = Math.abs(actualFollowers - declared_followers);
    const variancePct = declared_followers > 0
      ? (variance / declared_followers) * 100
      : 100;

    // Verified if within 10% tolerance
    const isVerified = variancePct <= 10;
    const status: VerificationResult["verification_status"] = isVerified ? "verified" : "mismatch";

    const result: VerificationResult = {
      is_verified: isVerified,
      declared_followers,
      actual_followers: actualFollowers,
      variance_pct: Math.round(variancePct * 100) / 100,
      verification_status: status,
      verified_at: new Date().toISOString(),
      platform: "instagram",
    };

    // Update connection verification status
    await supabase.from("creator_social_connections").update({
      is_verified: isVerified,
      verification_status: status,
      verified_at: new Date().toISOString(),
      declared_followers,
      actual_followers: actualFollowers,
      variance_pct: result.variance_pct,
    }).eq("id", connection.id);

    // Update creator profile is_verified badge if verified
    if (isVerified) {
      await supabase.from("creator_profiles").update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      }).eq("id", creator_profile_id);
    }

    // Store verification record
    await supabase.from("creator_verified_metrics").insert({
      user_id: connection.user_id,
      creator_profile_id,
      platform: "instagram",
      followers_count: actualFollowers,
      declared_followers,
      variance_pct: result.variance_pct,
      is_verified: isVerified,
      verification_status: status,
      verified_at: new Date().toISOString(),
      verification_source: "api",
    });

    return jsonResponse(result);

  } catch (err) {
    console.error("[social-instagram] Verification error:", err);
    return jsonResponse({
      is_verified: false,
      verification_status: "error",
      error: String(err),
    });
  }
}

// ── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const supabase = getServiceClient();
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // pathParts: ["social-instagram", "action", ...params]
  const action = pathParts[1] || "";
  const param = pathParts[2] || "";

  try {
    switch (action) {
      case "connect":
        return await handleConnect(req, supabase);

      case "callback":
        return await handleCallback(req, supabase);

      case "metrics":
        if (!param) return errorResponse("Connection ID required");
        return await handleGetMetrics(req, supabase, param);

      case "verify":
        return await handleVerify(req, supabase);

      default:
        return errorResponse(`Unknown action: ${action}`, 404);
    }
  } catch (err) {
    console.error("[social-instagram] Unhandled error:", err);
    return errorResponse(`Internal error: ${err}`, 500);
  }
});
