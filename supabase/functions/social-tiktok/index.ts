// ============================================================================
// KREOON SOCIAL TIKTOK API
// TikTok API integration for creator verification and metrics
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

// TikTok API credentials
const TIKTOK_CLIENT_KEY = Deno.env.get("SOCIAL_TIKTOK_CLIENT_ID");
const TIKTOK_CLIENT_SECRET = Deno.env.get("SOCIAL_TIKTOK_CLIENT_SECRET");
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://app.kreoon.com";

// ── Types ────────────────────────────────────────────────────────────────────

interface TikTokMetrics {
  followers_count: number;
  following_count: number;
  video_count: number;
  likes_count: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio_description?: string;
  // Calculated
  engagement_rate?: number;
  avg_views_per_video?: number;
  avg_likes_per_video?: number;
}

interface TikTokVideo {
  id: string;
  title?: string;
  cover_image_url?: string;
  embed_link?: string;
  create_time: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  duration: number;
}

interface VerificationResult {
  is_verified: boolean;
  declared_followers: number;
  actual_followers: number;
  variance_pct: number;
  verification_status: 'verified' | 'mismatch' | 'pending' | 'error';
  verified_at: string;
  platform: 'tiktok';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  console.error(`[social-tiktok] Error: ${message}`);
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

// Generate PKCE challenge
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = crypto.randomUUID() + crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return { verifier, challenge };
}

// ── TikTok API Functions ─────────────────────────────────────────────────────

async function exchangeCodeForToken(code: string, redirectUri: string, codeVerifier: string): Promise<{
  access_token: string;
  refresh_token: string;
  open_id: string;
  expires_in: number;
  refresh_expires_in: number;
}> {
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY!,
      client_secret: TIKTOK_CLIENT_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TikTok token exchange failed: ${error}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`TikTok API error: ${data.error.message || data.error}`);
  }

  return data;
}

async function refreshTikTokToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY!,
      client_secret: TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh TikTok token");
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`TikTok refresh error: ${data.error.message}`);
  }

  return data;
}

async function getTikTokUserInfo(accessToken: string): Promise<TikTokMetrics> {
  // Get user info
  const userInfoUrl = "https://open.tiktokapis.com/v2/user/info/";
  const fields = "open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count";

  const userRes = await fetch(`${userInfoUrl}?fields=${fields}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userRes.ok) {
    const error = await userRes.text();
    throw new Error(`Failed to fetch TikTok user info: ${error}`);
  }

  const userData = await userRes.json();

  if (userData.error?.code) {
    throw new Error(`TikTok API error: ${userData.error.message}`);
  }

  const user = userData.data?.user || {};

  // Get recent videos for engagement calculation
  let avgViews = 0;
  let avgLikes = 0;
  let engagementRate = 0;

  try {
    const videosUrl = "https://open.tiktokapis.com/v2/video/list/";
    const videoFields = "id,title,cover_image_url,create_time,view_count,like_count,comment_count,share_count,duration";

    const videosRes = await fetch(`${videosUrl}?fields=${videoFields}&max_count=20`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (videosRes.ok) {
      const videosData = await videosRes.json();
      const videos = videosData.data?.videos || [];

      if (videos.length > 0) {
        const totalViews = videos.reduce((sum: number, v: TikTokVideo) => sum + (v.view_count || 0), 0);
        const totalLikes = videos.reduce((sum: number, v: TikTokVideo) => sum + (v.like_count || 0), 0);
        avgViews = Math.round(totalViews / videos.length);
        avgLikes = Math.round(totalLikes / videos.length);

        // Engagement rate = (avg interactions / followers) * 100
        const followersCount = user.follower_count || 0;
        if (followersCount > 0) {
          const avgInteractions = videos.reduce((sum: number, v: TikTokVideo) =>
            sum + (v.like_count || 0) + (v.comment_count || 0) + (v.share_count || 0), 0) / videos.length;
          engagementRate = (avgInteractions / followersCount) * 100;
        }
      }
    }
  } catch (e) {
    console.log("[social-tiktok] Could not fetch videos for engagement:", e);
  }

  return {
    followers_count: user.follower_count || 0,
    following_count: user.following_count || 0,
    video_count: user.video_count || 0,
    likes_count: user.likes_count || 0,
    username: user.display_name || user.open_id,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    bio_description: user.bio_description,
    engagement_rate: Math.round(engagementRate * 100) / 100,
    avg_views_per_video: avgViews,
    avg_likes_per_video: avgLikes,
  };
}

// ── Route Handlers ───────────────────────────────────────────────────────────

async function handleConnect(req: Request, supabase: ReturnType<typeof getServiceClient>): Promise<Response> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  const url = new URL(req.url);
  const creatorProfileId = url.searchParams.get("profile_id");
  const returnUrl = url.searchParams.get("return_url") || `${FRONTEND_URL}/marketplace/profile`;

  // Generate PKCE
  const { verifier, challenge } = await generatePKCE();

  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Store state and PKCE verifier in DB
  await supabase.from("oauth_states").insert({
    state,
    user_id: user.id,
    platform: "tiktok",
    creator_profile_id: creatorProfileId,
    return_url: returnUrl,
    code_verifier: verifier,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  const redirectUri = `${supabaseUrl}/functions/v1/social-tiktok/callback`;
  const scopes = "user.info.basic,user.info.profile,user.info.stats,video.list";

  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", TIKTOK_CLIENT_KEY!);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return jsonResponse({ url: authUrl.toString() });
}

async function handleCallback(req: Request, supabase: ReturnType<typeof getServiceClient>): Promise<Response> {
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

  // Verify state and get PKCE verifier
  const { data: stateData } = await supabase
    .from("oauth_states")
    .select("*")
    .eq("state", state)
    .eq("platform", "tiktok")
    .single();

  if (!stateData) {
    return redirectResponse(`${FRONTEND_URL}/marketplace/profile?error=invalid_state`);
  }

  // Delete used state
  await supabase.from("oauth_states").delete().eq("state", state);

  try {
    const redirectUri = `${supabaseUrl}/functions/v1/social-tiktok/callback`;

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code, redirectUri, stateData.code_verifier);

    // Get user metrics
    const metrics = await getTikTokUserInfo(tokenData.access_token);

    // Store or update social connection
    const accessExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + tokenData.refresh_expires_in * 1000).toISOString();

    await supabase.from("creator_social_connections").upsert({
      user_id: stateData.user_id,
      creator_profile_id: stateData.creator_profile_id,
      platform: "tiktok",
      platform_user_id: tokenData.open_id,
      platform_username: metrics.username,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: accessExpiresAt,
      refresh_token_expires_at: refreshExpiresAt,
      followers_count: metrics.followers_count,
      following_count: metrics.following_count,
      posts_count: metrics.video_count,
      likes_count: metrics.likes_count,
      engagement_rate: metrics.engagement_rate,
      last_synced_at: new Date().toISOString(),
      is_verified: false,
      metadata: {
        account_type: "tiktok",
        display_name: metrics.display_name,
        avatar_url: metrics.avatar_url,
        bio: metrics.bio_description,
        avg_views: metrics.avg_views_per_video,
        avg_likes: metrics.avg_likes_per_video,
      },
    }, {
      onConflict: "user_id,platform",
    });

    // Store verified metrics snapshot
    await supabase.from("creator_verified_metrics").insert({
      user_id: stateData.user_id,
      creator_profile_id: stateData.creator_profile_id,
      platform: "tiktok",
      followers_count: metrics.followers_count,
      following_count: metrics.following_count,
      posts_count: metrics.video_count,
      likes_count: metrics.likes_count,
      engagement_rate: metrics.engagement_rate,
      avg_views: metrics.avg_views_per_video,
      avg_likes: metrics.avg_likes_per_video,
      verified_at: new Date().toISOString(),
      verification_source: "api",
    });

    const returnUrl = stateData.return_url || `${FRONTEND_URL}/marketplace/profile`;
    return redirectResponse(`${returnUrl}?tiktok_connected=true`);

  } catch (err) {
    console.error("[social-tiktok] Callback error:", err);
    const returnUrl = stateData.return_url || `${FRONTEND_URL}/marketplace/profile`;
    return redirectResponse(`${returnUrl}?error=${encodeURIComponent(String(err))}`);
  }
}

async function handleGetMetrics(req: Request, supabase: ReturnType<typeof getServiceClient>, connectionId: string): Promise<Response> {
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
    // Check if token needs refresh
    let accessToken = connection.access_token;
    const tokenExpiry = new Date(connection.token_expires_at).getTime();
    const now = Date.now();

    if (tokenExpiry < now + 60000 && connection.refresh_token) { // Refresh if expires in < 1 min
      console.log("[social-tiktok] Refreshing expired token");
      const newTokens = await refreshTikTokToken(connection.refresh_token);
      accessToken = newTokens.access_token;

      await supabase.from("creator_social_connections").update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      }).eq("id", connectionId);
    }

    const metrics = await getTikTokUserInfo(accessToken);

    // Update stored metrics
    await supabase.from("creator_social_connections").update({
      followers_count: metrics.followers_count,
      following_count: metrics.following_count,
      posts_count: metrics.video_count,
      likes_count: metrics.likes_count,
      engagement_rate: metrics.engagement_rate,
      last_synced_at: new Date().toISOString(),
      metadata: {
        ...connection.metadata,
        display_name: metrics.display_name,
        avatar_url: metrics.avatar_url,
        avg_views: metrics.avg_views_per_video,
        avg_likes: metrics.avg_likes_per_video,
      },
    }).eq("id", connectionId);

    return jsonResponse({
      success: true,
      metrics,
      synced_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[social-tiktok] Metrics fetch error:", err);
    return errorResponse(`Failed to fetch metrics: ${err}`, 500);
  }
}

async function handleVerify(req: Request, supabase: ReturnType<typeof getServiceClient>): Promise<Response> {
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
    .eq("platform", "tiktok")
    .single();

  if (!connection) {
    return jsonResponse({
      is_verified: false,
      verification_status: "pending",
      message: "TikTok account not connected",
    });
  }

  try {
    // Check token validity and refresh if needed
    let accessToken = connection.access_token;
    const tokenExpiry = new Date(connection.token_expires_at).getTime();

    if (tokenExpiry < Date.now() + 60000 && connection.refresh_token) {
      const newTokens = await refreshTikTokToken(connection.refresh_token);
      accessToken = newTokens.access_token;

      await supabase.from("creator_social_connections").update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      }).eq("id", connection.id);
    }

    // Fetch fresh metrics
    const metrics = await getTikTokUserInfo(accessToken);
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
      platform: "tiktok",
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
      platform: "tiktok",
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
    console.error("[social-tiktok] Verification error:", err);
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
    console.error("[social-tiktok] Unhandled error:", err);
    return errorResponse(`Internal error: ${err}`, 500);
  }
});
