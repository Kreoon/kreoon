// ============================================================================
// KREOON VERIFY INFLUENCER SERVICE
// Automated verification system for influencer/creator metrics
// ============================================================================
//
// Routes:
//   /verify/:profileId - POST: Verify a creator's metrics across all connected platforms
//   /status/:profileId - GET: Get verification status for a creator
//   /batch-verify      - POST: Verify multiple creators (admin only)
//   /alerts            - GET: Get creators with metric discrepancies
//
// JWT: verify_jwt = true

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Verification tolerance percentage
const VERIFICATION_TOLERANCE_PCT = 10;

// ── Types ────────────────────────────────────────────────────────────────────

type Platform = 'instagram' | 'tiktok' | 'youtube' | 'twitter';
type VerificationStatus = 'verified' | 'mismatch' | 'pending' | 'error' | 'expired';

interface PlatformVerification {
  platform: Platform;
  is_verified: boolean;
  declared_followers: number;
  actual_followers: number;
  variance_pct: number;
  status: VerificationStatus;
  last_checked_at: string;
  error?: string;
}

interface CreatorVerificationResult {
  creator_profile_id: string;
  overall_verified: boolean;
  verification_score: number; // 0-100
  platforms: PlatformVerification[];
  badges_earned: string[];
  alerts: VerificationAlert[];
  verified_at: string;
}

interface VerificationAlert {
  type: 'mismatch' | 'token_expired' | 'account_disconnected' | 'suspicious_growth';
  platform: Platform;
  message: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
}

interface CreatorDeclaredMetrics {
  instagram_followers?: number;
  tiktok_followers?: number;
  youtube_subscribers?: number;
  twitter_followers?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  console.error(`[verify-influencer] Error: ${message}`);
  return jsonResponse({ error: message }, status);
}

function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getUserFromRequest(req: Request, supabase: ReturnType<typeof getServiceClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

async function isAdmin(userId: string, supabase: ReturnType<typeof getServiceClient>): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_super_admin")
    .eq("id", userId)
    .single();

  return profile?.is_super_admin || profile?.role === 'admin';
}

// ── Verification Logic ───────────────────────────────────────────────────────

async function verifyPlatformMetrics(
  supabase: ReturnType<typeof getServiceClient>,
  connection: any,
  declaredFollowers: number
): Promise<PlatformVerification> {
  const platform = connection.platform as Platform;

  try {
    // Fetch latest metrics from the respective API
    let actualFollowers = connection.followers_count || 0;

    // Try to get fresh metrics if token is valid
    if (connection.access_token && connection.token_expires_at) {
      const tokenExpiry = new Date(connection.token_expires_at).getTime();
      const isTokenValid = tokenExpiry > Date.now();

      if (isTokenValid) {
        // Call the platform-specific metrics endpoint
        try {
          const metricsUrl = `${supabaseUrl}/functions/v1/social-${platform}/metrics/${connection.id}`;
          const metricsRes = await fetch(metricsUrl, {
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
          });

          if (metricsRes.ok) {
            const metricsData = await metricsRes.json();
            actualFollowers = metricsData.metrics?.followers_count || actualFollowers;
          }
        } catch (e) {
          console.log(`[verify-influencer] Could not fetch fresh metrics for ${platform}:`, e);
        }
      } else {
        // Token expired
        return {
          platform,
          is_verified: false,
          declared_followers: declaredFollowers,
          actual_followers: connection.followers_count || 0,
          variance_pct: 0,
          status: 'expired',
          last_checked_at: new Date().toISOString(),
          error: 'Access token expired. Please reconnect your account.',
        };
      }
    }

    // Calculate variance
    const variance = Math.abs(actualFollowers - declaredFollowers);
    const variancePct = declaredFollowers > 0
      ? (variance / declaredFollowers) * 100
      : (actualFollowers > 0 ? 100 : 0);

    const isVerified = variancePct <= VERIFICATION_TOLERANCE_PCT;
    const status: VerificationStatus = isVerified ? 'verified' : 'mismatch';

    return {
      platform,
      is_verified: isVerified,
      declared_followers: declaredFollowers,
      actual_followers: actualFollowers,
      variance_pct: Math.round(variancePct * 100) / 100,
      status,
      last_checked_at: new Date().toISOString(),
    };

  } catch (err) {
    console.error(`[verify-influencer] Error verifying ${platform}:`, err);
    return {
      platform,
      is_verified: false,
      declared_followers: declaredFollowers,
      actual_followers: connection.followers_count || 0,
      variance_pct: 0,
      status: 'error',
      last_checked_at: new Date().toISOString(),
      error: String(err),
    };
  }
}

function generateAlerts(platformResults: PlatformVerification[]): VerificationAlert[] {
  const alerts: VerificationAlert[] = [];

  for (const result of platformResults) {
    if (result.status === 'mismatch') {
      const severity = result.variance_pct > 50 ? 'high' : result.variance_pct > 25 ? 'medium' : 'low';
      alerts.push({
        type: 'mismatch',
        platform: result.platform,
        message: `Declared ${result.declared_followers.toLocaleString()} followers but verified ${result.actual_followers.toLocaleString()} (${result.variance_pct}% variance)`,
        severity,
        created_at: new Date().toISOString(),
      });
    }

    if (result.status === 'expired') {
      alerts.push({
        type: 'token_expired',
        platform: result.platform,
        message: `${result.platform} access token has expired. Account needs to be reconnected.`,
        severity: 'medium',
        created_at: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

function calculateBadges(platformResults: PlatformVerification[]): string[] {
  const badges: string[] = [];

  const verifiedPlatforms = platformResults.filter(p => p.is_verified);
  const totalConnected = platformResults.length;

  // All platforms verified
  if (verifiedPlatforms.length === totalConnected && totalConnected > 0) {
    badges.push('fully_verified');
  }

  // At least one verified
  if (verifiedPlatforms.length > 0) {
    badges.push('verified_creator');
  }

  // Multi-platform creator (3+)
  if (totalConnected >= 3) {
    badges.push('multi_platform');
  }

  // High follower count badges
  const totalFollowers = platformResults.reduce((sum, p) => sum + p.actual_followers, 0);

  if (totalFollowers >= 1000000) {
    badges.push('mega_influencer');
  } else if (totalFollowers >= 100000) {
    badges.push('macro_influencer');
  } else if (totalFollowers >= 10000) {
    badges.push('micro_influencer');
  } else if (totalFollowers >= 1000) {
    badges.push('nano_influencer');
  }

  return badges;
}

// ── Route Handlers ───────────────────────────────────────────────────────────

async function handleVerify(
  req: Request,
  supabase: ReturnType<typeof getServiceClient>,
  profileId: string
): Promise<Response> {
  const user = await getUserFromRequest(req, supabase);
  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // Get creator profile
  const { data: profile, error: profileError } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return errorResponse("Creator profile not found", 404);
  }

  // Check ownership or admin access
  const isOwner = profile.user_id === user.id;
  const adminAccess = await isAdmin(user.id, supabase);

  if (!isOwner && !adminAccess) {
    return errorResponse("Unauthorized", 403);
  }

  // Get body for declared metrics
  let declaredMetrics: CreatorDeclaredMetrics = {};
  try {
    const body = await req.json();
    declaredMetrics = body.declared_metrics || {};
  } catch {
    // No body provided, use profile data
  }

  // Get all connected social accounts for this profile
  const { data: connections } = await supabase
    .from("creator_social_connections")
    .select("*")
    .eq("creator_profile_id", profileId);

  if (!connections || connections.length === 0) {
    return jsonResponse({
      creator_profile_id: profileId,
      overall_verified: false,
      verification_score: 0,
      platforms: [],
      badges_earned: [],
      alerts: [{
        type: 'account_disconnected',
        platform: 'instagram' as Platform,
        message: 'No social accounts connected. Connect at least one account to get verified.',
        severity: 'high',
        created_at: new Date().toISOString(),
      }],
      verified_at: new Date().toISOString(),
    });
  }

  // Verify each platform
  const platformResults: PlatformVerification[] = [];

  for (const connection of connections) {
    const platform = connection.platform as Platform;

    // Get declared followers for this platform
    const declaredKey = `${platform}_followers` as keyof CreatorDeclaredMetrics;
    const declaredFollowers = declaredMetrics[declaredKey] ||
      connection.declared_followers ||
      connection.followers_count ||
      0;

    const result = await verifyPlatformMetrics(supabase, connection, declaredFollowers);
    platformResults.push(result);

    // Update connection with verification result
    await supabase.from("creator_social_connections").update({
      is_verified: result.is_verified,
      verification_status: result.status,
      declared_followers: declaredFollowers,
      actual_followers: result.actual_followers,
      variance_pct: result.variance_pct,
      verified_at: new Date().toISOString(),
    }).eq("id", connection.id);
  }

  // Calculate overall verification score
  const verifiedCount = platformResults.filter(p => p.is_verified).length;
  const verificationScore = Math.round((verifiedCount / platformResults.length) * 100);

  // Generate alerts and badges
  const alerts = generateAlerts(platformResults);
  const badges = calculateBadges(platformResults);

  // Overall verified if at least one platform is verified with no high-severity alerts
  const hasHighSeverityAlerts = alerts.some(a => a.severity === 'high');
  const overallVerified = verifiedCount > 0 && !hasHighSeverityAlerts;

  // Update creator profile
  await supabase.from("creator_profiles").update({
    is_verified: overallVerified,
    verified_at: overallVerified ? new Date().toISOString() : null,
    verification_score: verificationScore,
    verification_badges: badges,
  }).eq("id", profileId);

  // Store verification history
  await supabase.from("creator_verification_history").insert({
    creator_profile_id: profileId,
    user_id: profile.user_id,
    overall_verified: overallVerified,
    verification_score: verificationScore,
    platforms_data: platformResults,
    badges_earned: badges,
    alerts: alerts,
    verified_by: user.id,
    verified_at: new Date().toISOString(),
  });

  const result: CreatorVerificationResult = {
    creator_profile_id: profileId,
    overall_verified: overallVerified,
    verification_score: verificationScore,
    platforms: platformResults,
    badges_earned: badges,
    alerts,
    verified_at: new Date().toISOString(),
  };

  return jsonResponse(result);
}

async function handleGetStatus(
  req: Request,
  supabase: ReturnType<typeof getServiceClient>,
  profileId: string
): Promise<Response> {
  const user = await getUserFromRequest(req, supabase);
  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // Get creator profile with verification data
  const { data: profile, error } = await supabase
    .from("creator_profiles")
    .select("id, user_id, is_verified, verified_at, verification_score, verification_badges")
    .eq("id", profileId)
    .single();

  if (error || !profile) {
    return errorResponse("Creator profile not found", 404);
  }

  // Get connected platforms
  const { data: connections } = await supabase
    .from("creator_social_connections")
    .select("platform, is_verified, verification_status, declared_followers, actual_followers, variance_pct, verified_at, last_synced_at")
    .eq("creator_profile_id", profileId);

  // Get latest verification history
  const { data: history } = await supabase
    .from("creator_verification_history")
    .select("*")
    .eq("creator_profile_id", profileId)
    .order("verified_at", { ascending: false })
    .limit(5);

  return jsonResponse({
    profile_id: profileId,
    is_verified: profile.is_verified || false,
    verified_at: profile.verified_at,
    verification_score: profile.verification_score || 0,
    badges: profile.verification_badges || [],
    platforms: connections || [],
    history: history || [],
  });
}

async function handleBatchVerify(
  req: Request,
  supabase: ReturnType<typeof getServiceClient>
): Promise<Response> {
  const user = await getUserFromRequest(req, supabase);
  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // Admin only
  if (!(await isAdmin(user.id, supabase))) {
    return errorResponse("Admin access required", 403);
  }

  const body = await req.json();
  const { profile_ids } = body;

  if (!Array.isArray(profile_ids) || profile_ids.length === 0) {
    return errorResponse("profile_ids array required");
  }

  // Limit batch size
  if (profile_ids.length > 50) {
    return errorResponse("Maximum 50 profiles per batch");
  }

  const results: CreatorVerificationResult[] = [];
  const errors: { profile_id: string; error: string }[] = [];

  for (const profileId of profile_ids) {
    try {
      // Create a mock request for internal verify call
      const mockReq = new Request(`${supabaseUrl}/functions/v1/verify-influencer/verify/${profileId}`, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify({}),
      });

      const response = await handleVerify(mockReq, supabase, profileId);
      const result = await response.json();

      if (response.status === 200) {
        results.push(result);
      } else {
        errors.push({ profile_id: profileId, error: result.error || "Unknown error" });
      }
    } catch (err) {
      errors.push({ profile_id: profileId, error: String(err) });
    }
  }

  return jsonResponse({
    processed: results.length,
    failed: errors.length,
    results,
    errors,
  });
}

async function handleGetAlerts(
  req: Request,
  supabase: ReturnType<typeof getServiceClient>
): Promise<Response> {
  const user = await getUserFromRequest(req, supabase);
  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // Admin only
  if (!(await isAdmin(user.id, supabase))) {
    return errorResponse("Admin access required", 403);
  }

  const url = new URL(req.url);
  const severity = url.searchParams.get("severity"); // low, medium, high
  const limit = parseInt(url.searchParams.get("limit") || "50");

  // Get creators with verification issues
  let query = supabase
    .from("creator_social_connections")
    .select(`
      id,
      platform,
      is_verified,
      verification_status,
      declared_followers,
      actual_followers,
      variance_pct,
      verified_at,
      creator_profile_id,
      creator_profiles!inner (
        id,
        user_id,
        display_name,
        slug,
        avatar_url
      )
    `)
    .eq("verification_status", "mismatch")
    .order("variance_pct", { ascending: false })
    .limit(limit);

  if (severity === 'high') {
    query = query.gt("variance_pct", 50);
  } else if (severity === 'medium') {
    query = query.gt("variance_pct", 25).lte("variance_pct", 50);
  } else if (severity === 'low') {
    query = query.lte("variance_pct", 25);
  }

  const { data: mismatches, error } = await query;

  if (error) {
    return errorResponse(`Database error: ${error.message}`, 500);
  }

  // Also get expired tokens
  const { data: expired } = await supabase
    .from("creator_social_connections")
    .select(`
      id,
      platform,
      token_expires_at,
      creator_profile_id,
      creator_profiles!inner (
        id,
        user_id,
        display_name,
        slug
      )
    `)
    .lt("token_expires_at", new Date().toISOString())
    .limit(limit);

  return jsonResponse({
    mismatches: mismatches || [],
    expired_tokens: expired || [],
    total_alerts: (mismatches?.length || 0) + (expired?.length || 0),
  });
}

// ── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const supabase = getServiceClient();
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // pathParts: ["verify-influencer", "action", "param"]
  const action = pathParts[1] || "";
  const param = pathParts[2] || "";

  try {
    switch (action) {
      case "verify":
        if (!param) return errorResponse("Profile ID required");
        return await handleVerify(req, supabase, param);

      case "status":
        if (!param) return errorResponse("Profile ID required");
        return await handleGetStatus(req, supabase, param);

      case "batch-verify":
        return await handleBatchVerify(req, supabase);

      case "alerts":
        return await handleGetAlerts(req, supabase);

      default:
        return errorResponse(`Unknown action: ${action}`, 404);
    }
  } catch (err) {
    console.error("[verify-influencer] Unhandled error:", err);
    return errorResponse(`Internal error: ${err}`, 500);
  }
});
