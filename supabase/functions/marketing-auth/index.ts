// ============================================================================
// KREOON MARKETING AUTH
// Edge Function para conectar cuentas publicitarias (Meta, TikTok, Google Ads)
// OAuth flow: connect → callback → token storage
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://app.kreoon.com";

// Meta / Facebook
const META_APP_ID = Deno.env.get("META_APP_ID") || "";
const META_APP_SECRET = Deno.env.get("META_APP_SECRET") || "";

// TikTok Ads
const TIKTOK_ADS_APP_ID = Deno.env.get("TIKTOK_ADS_APP_ID") || "";
const TIKTOK_ADS_APP_SECRET = Deno.env.get("TIKTOK_ADS_APP_SECRET") || "";

// Google Ads
const GOOGLE_ADS_CLIENT_ID = Deno.env.get("GOOGLE_ADS_CLIENT_ID") || "";
const GOOGLE_ADS_CLIENT_SECRET = Deno.env.get("GOOGLE_ADS_CLIENT_SECRET") || "";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ============================================================================
// Types
// ============================================================================

type AdPlatform = "meta" | "tiktok" | "google";

interface ConnectRequest {
  platform: AdPlatform;
  organization_id: string;
  redirect_uri?: string;
}

interface CallbackRequest {
  platform: AdPlatform;
  code: string;
  state: string; // JSON-encoded { user_id, organization_id }
  redirect_uri?: string;
}

interface DisconnectRequest {
  account_id: string; // marketing_ad_accounts.id
}

interface RefreshRequest {
  account_id: string;
}

interface AdAccountRecord {
  id?: string;
  organization_id: string;
  user_id: string;
  platform: AdPlatform;
  platform_account_id: string;
  account_name: string;
  access_token: string;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  account_metadata?: Record<string, unknown>;
  status: "active" | "disconnected" | "expired";
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Main handler
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // All routes except /callback require auth
    if (action !== "callback") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("No authorization header");
      }
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);
      if (authError || !user) {
        throw new Error("Invalid or expired token");
      }

      switch (action) {
        case "connect":
          return await handleConnect(req, user.id);
        case "disconnect":
          return await handleDisconnect(supabase, req, user.id);
        case "refresh":
          return await handleRefresh(supabase, req, user.id);
        case "accounts":
          return await handleListAccounts(supabase, req, user.id);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }

    // /callback does NOT require auth (browser redirect from OAuth provider)
    return await handleCallback(supabase, req);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("marketing-auth error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// CONNECT - Generate OAuth URL for a platform
// ============================================================================

async function handleConnect(
  req: Request,
  userId: string
): Promise<Response> {
  const body: ConnectRequest = await req.json();
  const { platform, organization_id, redirect_uri } = body;

  if (!platform || !organization_id) {
    throw new Error("platform and organization_id are required");
  }

  // State param encodes user + org so we can link back after callback
  const state = btoa(
    JSON.stringify({ user_id: userId, organization_id })
  );

  const callbackUrl =
    redirect_uri ||
    `${supabaseUrl}/functions/v1/marketing-auth/callback`;

  let authUrl: string;

  switch (platform) {
    case "meta": {
      if (!META_APP_ID) throw new Error("META_APP_ID not configured");
      const params = new URLSearchParams({
        client_id: META_APP_ID,
        redirect_uri: callbackUrl,
        state,
        scope: "ads_management,ads_read,business_management",
        response_type: "code",
      });
      authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
      break;
    }

    case "tiktok": {
      if (!TIKTOK_ADS_APP_ID)
        throw new Error("TIKTOK_ADS_APP_ID not configured");
      const params = new URLSearchParams({
        app_id: TIKTOK_ADS_APP_ID,
        redirect_uri: callbackUrl,
        state,
        scope: "advertiser_management,campaign_management",
        response_type: "code",
      });
      authUrl = `https://business-api.tiktok.com/open_api/v1.3/oauth2/authorize/?${params.toString()}`;
      break;
    }

    case "google": {
      if (!GOOGLE_ADS_CLIENT_ID)
        throw new Error("GOOGLE_ADS_CLIENT_ID not configured");
      const params = new URLSearchParams({
        client_id: GOOGLE_ADS_CLIENT_ID,
        redirect_uri: callbackUrl,
        state,
        scope: "https://www.googleapis.com/auth/adwords",
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
      });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      break;
    }

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  return new Response(JSON.stringify({ auth_url: authUrl, state }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================================================
// CALLBACK - Handle OAuth callback, exchange code for tokens, store account
// ============================================================================

async function handleCallback(
  supabase: ReturnType<typeof createClient>,
  req: Request
): Promise<Response> {
  // Callback can arrive as GET (browser redirect) or POST (frontend relay)
  let code: string;
  let state: string;
  let platform: AdPlatform | undefined;
  let redirectUri: string;

  if (req.method === "GET") {
    const url = new URL(req.url);
    code = url.searchParams.get("code") || "";
    state = url.searchParams.get("state") || "";
    redirectUri =
      `${supabaseUrl}/functions/v1/marketing-auth/callback`;
  } else {
    const body: CallbackRequest = await req.json();
    code = body.code;
    state = body.state;
    platform = body.platform;
    redirectUri =
      body.redirect_uri ||
      `${supabaseUrl}/functions/v1/marketing-auth/callback`;
  }

  if (!code || !state) {
    throw new Error("Missing code or state parameter");
  }

  // Decode state
  let stateData: { user_id: string; organization_id: string };
  try {
    stateData = JSON.parse(atob(state));
  } catch {
    throw new Error("Invalid state parameter");
  }

  const { user_id, organization_id } = stateData;

  // If platform not in body, try to detect from auth_code or we need it from state
  // For GET callbacks we detect platform from the code format or require the caller to add it to state
  if (!platform) {
    // Try to extract platform from extended state
    try {
      const extState = JSON.parse(atob(state));
      platform = extState.platform;
    } catch {
      // fallback
    }
  }

  if (!platform) {
    throw new Error(
      "Could not determine platform. Include platform in the state or POST body."
    );
  }

  // Exchange code for tokens based on platform
  let tokenData: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  let accounts: { id: string; name: string; metadata?: Record<string, unknown> }[] = [];

  switch (platform) {
    case "meta":
      tokenData = await exchangeMetaToken(code, redirectUri);
      accounts = await fetchMetaAdAccounts(tokenData.access_token);
      break;
    case "tiktok":
      tokenData = await exchangeTikTokToken(code);
      accounts = await fetchTikTokAdvertisers(tokenData.access_token);
      break;
    case "google":
      tokenData = await exchangeGoogleToken(code, redirectUri);
      accounts = await fetchGoogleCustomerAccounts(tokenData.access_token);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  // Calculate token expiration
  const tokenExpiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  // Store each ad account
  const savedAccounts: AdAccountRecord[] = [];

  for (const account of accounts) {
    const record: AdAccountRecord = {
      organization_id,
      user_id,
      platform,
      platform_account_id: account.id,
      account_name: account.name,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: tokenExpiresAt,
      account_metadata: account.metadata || {},
      status: "active",
    };

    // Upsert (if same org+platform+account already exists, update tokens)
    const { data, error } = await supabase
      .from("marketing_ad_accounts")
      .upsert(record, {
        onConflict: "organization_id,platform,platform_account_id",
      })
      .select()
      .single();

    if (error) {
      console.error(
        `Error saving account ${account.id}:`,
        error.message
      );
      continue;
    }

    savedAccounts.push(data);
  }

  // If GET request (browser redirect), redirect to frontend
  if (req.method === "GET") {
    const redirectTo = `${FRONTEND_URL}/settings/marketing?connected=${platform}&accounts=${savedAccounts.length}`;
    return new Response(null, {
      status: 302,
      headers: { Location: redirectTo },
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      platform,
      accounts_connected: savedAccounts.length,
      accounts: savedAccounts,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// ============================================================================
// DISCONNECT - Remove an ad account connection
// ============================================================================

async function handleDisconnect(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  userId: string
): Promise<Response> {
  const body: DisconnectRequest = await req.json();
  const { account_id } = body;

  if (!account_id) {
    throw new Error("account_id is required");
  }

  // Verify ownership
  const { data: account, error: fetchErr } = await supabase
    .from("marketing_ad_accounts")
    .select("id, user_id, platform")
    .eq("id", account_id)
    .single();

  if (fetchErr || !account) {
    throw new Error("Ad account not found");
  }

  if (account.user_id !== userId) {
    // Check if user is admin of the organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!membership || membership.role !== "admin") {
      throw new Error("Not authorized to disconnect this account");
    }
  }

  // Soft disconnect: mark as disconnected, clear tokens
  const { error: updateErr } = await supabase
    .from("marketing_ad_accounts")
    .update({
      status: "disconnected",
      access_token: "",
      refresh_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account_id);

  if (updateErr) {
    throw new Error(`Failed to disconnect: ${updateErr.message}`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: `${account.platform} account disconnected`,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// ============================================================================
// REFRESH - Refresh an expired access token
// ============================================================================

async function handleRefresh(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  userId: string
): Promise<Response> {
  const body: RefreshRequest = await req.json();
  const { account_id } = body;

  if (!account_id) {
    throw new Error("account_id is required");
  }

  const { data: account, error: fetchErr } = await supabase
    .from("marketing_ad_accounts")
    .select("*")
    .eq("id", account_id)
    .single();

  if (fetchErr || !account) {
    throw new Error("Ad account not found");
  }

  let newTokenData: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  switch (account.platform as AdPlatform) {
    case "meta": {
      // Meta long-lived tokens don't use refresh_token — exchange current token
      newTokenData = await refreshMetaToken(account.access_token);
      break;
    }
    case "tiktok": {
      if (!account.refresh_token) {
        throw new Error("No refresh token available for TikTok account");
      }
      newTokenData = await refreshTikTokToken(account.refresh_token);
      break;
    }
    case "google": {
      if (!account.refresh_token) {
        throw new Error("No refresh token available for Google account");
      }
      newTokenData = await refreshGoogleToken(account.refresh_token);
      break;
    }
    default:
      throw new Error(`Unsupported platform: ${account.platform}`);
  }

  const tokenExpiresAt = newTokenData.expires_in
    ? new Date(Date.now() + newTokenData.expires_in * 1000).toISOString()
    : null;

  const { error: updateErr } = await supabase
    .from("marketing_ad_accounts")
    .update({
      access_token: newTokenData.access_token,
      refresh_token: newTokenData.refresh_token || account.refresh_token,
      token_expires_at: tokenExpiresAt,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", account_id);

  if (updateErr) {
    throw new Error(`Failed to update tokens: ${updateErr.message}`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      expires_at: tokenExpiresAt,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// ============================================================================
// LIST ACCOUNTS - Get connected ad accounts for user/org
// ============================================================================

async function handleListAccounts(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  userId: string
): Promise<Response> {
  const url = new URL(req.url);
  const organizationId = url.searchParams.get("organization_id");
  const platform = url.searchParams.get("platform") as AdPlatform | null;

  let query = supabase
    .from("marketing_ad_accounts")
    .select(
      "id, organization_id, platform, platform_account_id, account_name, status, token_expires_at, account_metadata, created_at, updated_at"
    )
    .neq("status", "disconnected")
    .order("created_at", { ascending: false });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  } else {
    query = query.eq("user_id", userId);
  }

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch accounts: ${error.message}`);
  }

  // Check which accounts have expired tokens
  const now = new Date();
  const accounts = (data || []).map((acc: Record<string, unknown>) => ({
    ...acc,
    token_expired: acc.token_expires_at
      ? new Date(acc.token_expires_at as string) < now
      : false,
  }));

  return new Response(JSON.stringify({ accounts }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================================================
// META / FACEBOOK - Token Exchange & Account Fetching
// ============================================================================

async function exchangeMetaToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; expires_in?: number }> {
  // Exchange short-lived code for a short-lived access token
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  });

  const resp = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`
  );
  const data = await resp.json();

  if (data.error) {
    throw new Error(
      `Meta token exchange failed: ${data.error.message || JSON.stringify(data.error)}`
    );
  }

  // Exchange for long-lived token (60-day validity)
  const longLivedParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: data.access_token,
  });

  const longResp = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${longLivedParams.toString()}`
  );
  const longData = await longResp.json();

  if (longData.error) {
    // Fallback to short-lived token
    console.warn(
      "Could not get long-lived Meta token, using short-lived:",
      longData.error
    );
    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
    };
  }

  return {
    access_token: longData.access_token,
    expires_in: longData.expires_in || 5184000, // ~60 days
  };
}

async function refreshMetaToken(
  currentToken: string
): Promise<{ access_token: string; expires_in?: number }> {
  // For Meta, long-lived tokens are refreshed by exchanging them again
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: currentToken,
  });

  const resp = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`
  );
  const data = await resp.json();

  if (data.error) {
    throw new Error(
      `Meta token refresh failed: ${data.error.message || JSON.stringify(data.error)}`
    );
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in || 5184000,
  };
}

async function fetchMetaAdAccounts(
  accessToken: string
): Promise<{ id: string; name: string; metadata?: Record<string, unknown> }[]> {
  const resp = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name,business_name&access_token=${accessToken}`
  );
  const data = await resp.json();

  if (data.error) {
    throw new Error(
      `Failed to fetch Meta ad accounts: ${data.error.message}`
    );
  }

  return (data.data || []).map(
    (acc: Record<string, unknown>) => ({
      id: (acc.id as string).replace("act_", ""),
      name:
        (acc.name as string) ||
        (acc.business_name as string) ||
        `Account ${acc.id}`,
      metadata: {
        account_status: acc.account_status,
        currency: acc.currency,
        timezone: acc.timezone_name,
        business_name: acc.business_name,
        full_id: acc.id, // act_XXXXX
      },
    })
  );
}

// ============================================================================
// TIKTOK ADS - Token Exchange & Account Fetching
// ============================================================================

async function exchangeTikTokToken(
  code: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const resp = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: TIKTOK_ADS_APP_ID,
        secret: TIKTOK_ADS_APP_SECRET,
        auth_code: code,
        grant_type: "authorization_code",
      }),
    }
  );
  const data = await resp.json();

  if (data.code !== 0) {
    throw new Error(
      `TikTok token exchange failed: ${data.message || JSON.stringify(data)}`
    );
  }

  return {
    access_token: data.data.access_token,
    refresh_token: data.data.refresh_token,
    expires_in: data.data.expires_in || 86400,
  };
}

async function refreshTikTokToken(
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const resp = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: TIKTOK_ADS_APP_ID,
        secret: TIKTOK_ADS_APP_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    }
  );
  const data = await resp.json();

  if (data.code !== 0) {
    throw new Error(
      `TikTok token refresh failed: ${data.message || JSON.stringify(data)}`
    );
  }

  return {
    access_token: data.data.access_token,
    refresh_token: data.data.refresh_token,
    expires_in: data.data.expires_in || 86400,
  };
}

async function fetchTikTokAdvertisers(
  accessToken: string
): Promise<{ id: string; name: string; metadata?: Record<string, unknown> }[]> {
  const resp = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/",
    {
      method: "GET",
      headers: {
        "Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );
  const data = await resp.json();

  if (data.code !== 0) {
    throw new Error(
      `Failed to fetch TikTok advertisers: ${data.message}`
    );
  }

  const advertiserIds: string[] = (data.data?.list || []).map(
    (a: Record<string, unknown>) => a.advertiser_id as string
  );

  if (advertiserIds.length === 0) {
    return [];
  }

  // Fetch advertiser details
  const infoResp = await fetch(
    `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=${JSON.stringify(advertiserIds)}`,
    {
      headers: {
        "Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );
  const infoData = await infoResp.json();

  if (infoData.code !== 0) {
    // Fallback: return IDs without names
    return advertiserIds.map((id) => ({
      id,
      name: `TikTok Advertiser ${id}`,
    }));
  }

  return (infoData.data?.list || []).map(
    (adv: Record<string, unknown>) => ({
      id: String(adv.advertiser_id),
      name: (adv.advertiser_name as string) || `Advertiser ${adv.advertiser_id}`,
      metadata: {
        status: adv.status,
        currency: adv.currency,
        timezone: adv.timezone,
        industry: adv.industry,
      },
    })
  );
}

// ============================================================================
// GOOGLE ADS - Token Exchange & Account Fetching
// ============================================================================

async function exchangeGoogleToken(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_ADS_CLIENT_ID,
      client_secret: GOOGLE_ADS_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  const data = await resp.json();

  if (data.error) {
    throw new Error(
      `Google token exchange failed: ${data.error_description || data.error}`
    );
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in || 3600,
  };
}

async function refreshGoogleToken(
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_ADS_CLIENT_ID,
      client_secret: GOOGLE_ADS_CLIENT_SECRET,
      grant_type: "refresh_token",
    }).toString(),
  });

  const data = await resp.json();

  if (data.error) {
    throw new Error(
      `Google token refresh failed: ${data.error_description || data.error}`
    );
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in || 3600,
  };
}

async function fetchGoogleCustomerAccounts(
  accessToken: string
): Promise<{ id: string; name: string; metadata?: Record<string, unknown> }[]> {
  // Use Google Ads API REST to list accessible customer accounts
  const resp = await fetch(
    "https://googleads.googleapis.com/v18/customers:listAccessibleCustomers",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await resp.json();

  if (data.error) {
    throw new Error(
      `Failed to fetch Google customer accounts: ${data.error.message || JSON.stringify(data.error)}`
    );
  }

  const resourceNames: string[] = data.resourceNames || [];

  // Fetch details for each customer
  const accounts: { id: string; name: string; metadata?: Record<string, unknown> }[] = [];

  for (const resourceName of resourceNames) {
    const customerId = resourceName.replace("customers/", "");
    try {
      const detailResp = await fetch(
        `https://googleads.googleapis.com/v18/${resourceName}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
            "login-customer-id": customerId,
            "Content-Type": "application/json",
          },
        }
      );

      const detail = await detailResp.json();

      accounts.push({
        id: customerId,
        name:
          detail.descriptiveName ||
          `Google Ads ${customerId}`,
        metadata: {
          currency_code: detail.currencyCode,
          time_zone: detail.timeZone,
          manager: detail.manager,
          test_account: detail.testAccount,
        },
      });
    } catch (err) {
      // If individual account fetch fails, still include with basic info
      console.warn(
        `Could not fetch details for Google customer ${customerId}:`,
        err
      );
      accounts.push({
        id: customerId,
        name: `Google Ads ${customerId}`,
      });
    }
  }

  return accounts;
}
