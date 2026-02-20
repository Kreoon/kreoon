import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  console.error(`[social-auth] Error: ${message}`);
  return jsonResponse({ error: message }, status);
}

function redirectResponse(url: string) {
  return new Response(null, {
    status: 302,
    headers: { ...CORS_HEADERS, Location: url },
  });
}

function oauthResultPage(frontendUrl: string, success: boolean, platform: string, errorMsg?: string) {
  const payload = JSON.stringify({ type: "social-auth-result", success, platform, error: errorMsg || null });
  const fallbackUrl = success
    ? `${frontendUrl}/social-hub?success=true&platform=${platform}`
    : `${frontendUrl}/social-hub?error=${encodeURIComponent(errorMsg || "Unknown error")}&platform=${platform}`;
  const displayMsg = success ? "Cuenta conectada. Esta ventana se cerrara..." : `Error: ${errorMsg || "Unknown"}`;
  const successIcon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  const errorIcon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kreoon - ${success ? "Conectado" : "Error"}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e5e5e5;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#171717;border:1px solid #262626;border-radius:16px;padding:40px 32px;max-width:400px;width:90%;text-align:center}
.logo{font-size:24px;font-weight:700;color:#6ee7b7;margin-bottom:24px;letter-spacing:-0.5px}
.icon{margin-bottom:16px}
h2{font-size:18px;font-weight:600;margin-bottom:8px;color:${success ? "#e5e5e5" : "#f87171"}}
.subtitle{font-size:14px;color:#a3a3a3;margin-bottom:20px;line-height:1.5}
.countdown{font-size:13px;color:#737373;margin-bottom:16px}
.countdown span{color:#6ee7b7;font-weight:600}
.btn{display:inline-block;padding:10px 24px;background:${success ? "#6ee7b7" : "#404040"};color:#0a0a0a;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:opacity .2s}
.btn:hover{opacity:.85}
.link{display:block;margin-top:12px;font-size:13px;color:#6ee7b7;text-decoration:none}
.link:hover{text-decoration:underline}
</style></head><body>
<div class="card">
<div class="logo">KREOON</div>
<div class="icon">${success ? successIcon : errorIcon}</div>
<h2>${success ? "Cuenta conectada exitosamente" : "Error al conectar"}</h2>
<p class="subtitle">${success ? `Tu cuenta de <strong>${platform}</strong> ha sido vinculada correctamente.` : `${errorMsg || "Ocurrio un error desconocido."}`}</p>
<p class="countdown" id="countdown">Cerrando en <span id="timer">5</span> segundos...</p>
<button class="btn" onclick="window.close()">Cerrar ventana</button>
<a class="link" href="${fallbackUrl}">Ir al Social Hub</a>
</div>
<script>
try { if (window.opener) window.opener.postMessage(${payload}, "${frontendUrl}"); } catch(e) {}
var t = 5;
var interval = setInterval(function() {
  t--;
  var el = document.getElementById("timer");
  if (el) el.textContent = t;
  if (t <= 0) {
    clearInterval(interval);
    try { window.close(); } catch(e) {}
    setTimeout(function() {
      var cd = document.getElementById("countdown");
      if (cd) cd.textContent = "No se pudo cerrar automaticamente.";
      window.location.href = "${fallbackUrl}";
    }, 500);
  }
}, 1000);
</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
    },
  });
}

// ─── Supabase Client ─────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function getAnonClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const client = getAnonClient();
  const {
    data: { user },
  } = await client.auth.getUser(authHeader.replace("Bearer ", ""));
  return user;
}

// ─── Platform OAuth Configs ──────────────────────────────────────────────────

type PlatformKey =
  | "meta"
  | "instagram_direct"
  | "tiktok"
  | "youtube"
  | "twitter"
  | "linkedin"
  | "pinterest";

interface PlatformOAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string;
  scopeSeparator: string;
  clientIdEnvKey: string;
  clientSecretEnvKey: string;
  clientIdParamName: string;
  usesPKCE: boolean;
  responseType: string;
  extraAuthParams?: Record<string, string>;
  extraTokenParams?: Record<string, string>;
  tokenAuthMethod: "body" | "basic";
}

const PLATFORM_CONFIGS: Record<PlatformKey, PlatformOAuthConfig> = {
  meta: {
    authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: [
      // Pages
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "pages_manage_metadata",
      "pages_manage_ads",
      // Insights
      "read_insights",
      // Instagram
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_comments",
      "instagram_manage_insights",
      // Business & Ads
      "business_management",
      "ads_management",
      "ads_read",
      // Catalogs & Leads
      "catalog_management",
      "leads_retrieval",
      // Live streaming
      "publish_video",
    ].join(","),
    scopeSeparator: ",",
    clientIdEnvKey: "SOCIAL_META_FB_CLIENT_ID",
    clientSecretEnvKey: "SOCIAL_META_FB_CLIENT_SECRET",
    clientIdParamName: "client_id",
    usesPKCE: false,
    responseType: "code",
    extraAuthParams: { auth_type: "rerequest" },
    tokenAuthMethod: "body",
  },
  instagram_direct: {
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scopes:
      "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments",
    scopeSeparator: ",",
    clientIdEnvKey: "SOCIAL_META_IG_CLIENT_ID",
    clientSecretEnvKey: "SOCIAL_META_IG_CLIENT_SECRET",
    clientIdParamName: "client_id",
    usesPKCE: false,
    responseType: "code",
    tokenAuthMethod: "body",
  },
  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: "user.info.basic,user.info.profile,user.info.stats,video.publish,video.upload,video.list",
    scopeSeparator: ",",
    clientIdEnvKey: "SOCIAL_TIKTOK_CLIENT_ID",
    clientSecretEnvKey: "SOCIAL_TIKTOK_CLIENT_SECRET",
    clientIdParamName: "client_key",
    usesPKCE: false,
    responseType: "code",
    tokenAuthMethod: "body",
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes:
      "https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.force-ssl",
    scopeSeparator: " ",
    clientIdEnvKey: "SOCIAL_YOUTUBE_CLIENT_ID",
    clientSecretEnvKey: "SOCIAL_YOUTUBE_CLIENT_SECRET",
    clientIdParamName: "client_id",
    usesPKCE: false,
    responseType: "code",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
    tokenAuthMethod: "body",
  },
  twitter: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: "tweet.read tweet.write users.read offline.access",
    scopeSeparator: " ",
    clientIdEnvKey: "SOCIAL_TWITTER_CLIENT_ID",
    clientSecretEnvKey: "SOCIAL_TWITTER_CLIENT_SECRET",
    clientIdParamName: "client_id",
    usesPKCE: true,
    responseType: "code",
    extraAuthParams: { code_challenge_method: "S256" },
    tokenAuthMethod: "basic",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: "openid profile w_member_social r_basicprofile",
    scopeSeparator: " ",
    clientIdEnvKey: "SOCIAL_LINKEDIN_CLIENT_ID",
    clientSecretEnvKey: "SOCIAL_LINKEDIN_CLIENT_SECRET",
    clientIdParamName: "client_id",
    usesPKCE: false,
    responseType: "code",
    tokenAuthMethod: "body",
  },
  pinterest: {
    authUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    scopes: "boards:read,pins:read,pins:write,user_accounts:read",
    scopeSeparator: ",",
    clientIdEnvKey: "SOCIAL_PINTEREST_CLIENT_ID",
    clientSecretEnvKey: "SOCIAL_PINTEREST_CLIENT_SECRET",
    clientIdParamName: "client_id",
    usesPKCE: false,
    responseType: "code",
    tokenAuthMethod: "basic",
  },
};

// ─── PKCE Utilities ──────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(buffer: Uint8Array): string {
  let str = "";
  for (const byte of buffer) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ─── Helper: Get Redirect URI ────────────────────────────────────────────────

function getRedirectUri(): string {
  const base =
    Deno.env.get("SOCIAL_REDIRECT_BASE_URL") ||
    Deno.env.get("FRONTEND_URL") ||
    Deno.env.get("SUPABASE_URL")!;
  // If we use the frontend URL, the callback is handled by the edge function
  // so we point to the edge function URL
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  return `${supabaseUrl}/functions/v1/social-auth/callback`;
}

// ─── Helpers: platform DB name mapping ──────────────────────────────────────

function platformToDbEnum(
  platform: PlatformKey,
  subType?: "facebook" | "instagram",
): string {
  if (platform === "meta") {
    return subType === "instagram" ? "instagram" : "facebook";
  }
  if (platform === "instagram_direct") return "instagram";
  if (platform === "youtube") return "youtube";
  if (platform === "twitter") return "twitter";
  return platform;
}

// ─── Route: CONNECT ──────────────────────────────────────────────────────────

async function handleConnect(req: Request): Promise<Response> {
  const user = await getUserFromRequest(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  let platform = url.searchParams.get("platform") as PlatformKey | null;
  let orgId = url.searchParams.get("org_id");
  let ownerType = url.searchParams.get("owner_type") || "user";
  let brandId = url.searchParams.get("brand_id");
  let stateClientId = url.searchParams.get("client_id");
  let method = url.searchParams.get("method"); // 'facebook' or 'direct' for Instagram

  // Also support JSON body (from supabase.functions.invoke)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body.platform) platform = body.platform;
      if (body.organization_id) orgId = body.organization_id;
      if (body.owner_type) ownerType = body.owner_type;
      if (body.brand_id) brandId = body.brand_id;
      if (body.client_id) stateClientId = body.client_id;
      if (body.method) method = body.method;
    } catch {
      // not JSON body, use URL params
    }
  }

  // Map instagram/facebook to the correct platform config
  if (platform === "instagram" as unknown || platform === "facebook" as unknown) {
    if (platform === "instagram" as unknown && method === "direct") {
      platform = "instagram_direct" as PlatformKey;
    } else {
      platform = "meta" as PlatformKey;
    }
  }

  if (!platform || !PLATFORM_CONFIGS[platform]) {
    return errorResponse(
      `Invalid platform. Supported: ${Object.keys(PLATFORM_CONFIGS).join(", ")}, instagram, facebook`,
    );
  }

  const config = PLATFORM_CONFIGS[platform];
  const clientId = Deno.env.get(config.clientIdEnvKey);
  if (!clientId) {
    return errorResponse(
      `Platform ${platform} is not configured (missing ${config.clientIdEnvKey})`,
      500,
    );
  }

  const redirectUri = getRedirectUri();

  // Build state payload (v2: include owner_type and brand_id)
  const statePayload: Record<string, string> = {
    user_id: user.id,
    platform,
  };
  if (orgId) statePayload.org_id = orgId;
  if (ownerType && ownerType !== "user") statePayload.owner_type = ownerType;
  if (brandId) statePayload.brand_id = brandId;
  if (stateClientId) statePayload.client_id = stateClientId;

  // For PKCE, include code_verifier in state so callback can use it
  let codeVerifier: string | undefined;
  if (config.usesPKCE) {
    codeVerifier = generateCodeVerifier();
    statePayload.code_verifier = codeVerifier;
  }

  const stateStr = btoa(JSON.stringify(statePayload));

  // Build auth URL
  const authParams = new URLSearchParams();
  authParams.set(config.clientIdParamName, clientId);
  authParams.set("redirect_uri", redirectUri);
  authParams.set("response_type", config.responseType);
  authParams.set("scope", config.scopes);
  authParams.set("state", stateStr);

  // PKCE code_challenge
  if (config.usesPKCE && codeVerifier) {
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    authParams.set("code_challenge", codeChallenge);
    if (config.extraAuthParams?.code_challenge_method) {
      authParams.set(
        "code_challenge_method",
        config.extraAuthParams.code_challenge_method,
      );
    }
  }

  // Extra auth params (except code_challenge_method which we handled above)
  if (config.extraAuthParams) {
    for (const [key, value] of Object.entries(config.extraAuthParams)) {
      if (key !== "code_challenge_method" || !config.usesPKCE) {
        authParams.set(key, value);
      }
    }
  }

  const authorizationUrl = `${config.authUrl}?${authParams.toString()}`;

  return jsonResponse({ url: authorizationUrl });
}

// ─── Route: CALLBACK ─────────────────────────────────────────────────────────

async function handleCallback(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateStr = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const frontendUrl =
    Deno.env.get("SOCIAL_REDIRECT_BASE_URL") ||
    Deno.env.get("FRONTEND_URL") ||
    "";

  if (errorParam) {
    console.error(
      `[social-auth] OAuth error: ${errorParam} - ${errorDescription}`,
    );
    return redirectResponse(
      `${frontendUrl}/social-hub?error=${encodeURIComponent(errorDescription || errorParam)}`,
    );
  }

  if (!code || !stateStr) {
    return redirectResponse(
      `${frontendUrl}/social-hub?error=${encodeURIComponent("Missing code or state parameter")}`,
    );
  }

  let state: {
    user_id: string;
    platform: PlatformKey;
    org_id?: string;
    code_verifier?: string;
    owner_type?: string;
    brand_id?: string;
    client_id?: string;
  };
  try {
    state = JSON.parse(atob(stateStr));
  } catch {
    return redirectResponse(
      `${frontendUrl}/social-hub?error=${encodeURIComponent("Invalid state parameter")}`,
    );
  }

  const { user_id, platform, org_id, code_verifier, owner_type, brand_id, client_id } = state;

  if (!user_id || !platform || !PLATFORM_CONFIGS[platform]) {
    return redirectResponse(
      `${frontendUrl}/social-hub?error=${encodeURIComponent("Invalid state data")}`,
    );
  }

  const config = PLATFORM_CONFIGS[platform];
  const clientId = Deno.env.get(config.clientIdEnvKey);
  const clientSecret = Deno.env.get(config.clientSecretEnvKey);

  if (!clientId || !clientSecret) {
    return redirectResponse(
      `${frontendUrl}/social-hub?error=${encodeURIComponent(`Platform ${platform} not configured`)}`,
    );
  }

  const redirectUri = getRedirectUri();

  try {
    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(
      platform,
      config,
      code,
      redirectUri,
      clientId,
      clientSecret,
      code_verifier,
    );

    // Platform-specific: fetch user info and save accounts
    const supabase = getServiceClient();

    switch (platform) {
      case "meta":
        await handleMetaCallback(
          supabase,
          tokenData,
          user_id,
          org_id,
          clientId,
          clientSecret,
          owner_type,
          brand_id,
          client_id,
        );
        break;
      case "instagram_direct":
        await handleInstagramDirectCallback(
          supabase,
          tokenData,
          user_id,
          org_id,
          clientId,
          clientSecret,
          owner_type,
          brand_id,
          client_id,
        );
        break;
      case "tiktok":
        await handleTikTokCallback(supabase, tokenData, user_id, org_id, owner_type, brand_id, client_id);
        break;
      case "youtube":
        await handleYouTubeCallback(supabase, tokenData, user_id, org_id, owner_type, brand_id, client_id);
        break;
      case "twitter":
        await handleTwitterCallback(supabase, tokenData, user_id, org_id, owner_type, brand_id, client_id);
        break;
      case "linkedin":
        await handleLinkedInCallback(supabase, tokenData, user_id, org_id, owner_type, brand_id, client_id);
        break;
      case "pinterest":
        await handlePinterestCallback(supabase, tokenData, user_id, org_id, owner_type, brand_id, client_id);
        break;
    }

    // Return HTML page that notifies parent window and closes popup
    const dbPlatform = platformToDbEnum(platform);
    return oauthResultPage(frontendUrl, true, dbPlatform);
  } catch (err) {
    console.error(`[social-auth] Callback error for ${platform}:`, err);
    const message =
      err instanceof Error ? err.message : "Unknown error during OAuth";
    const dbPlatform = platformToDbEnum(platform);
    return oauthResultPage(frontendUrl, false, dbPlatform, message);
  }
}

// ─── Token Exchange ──────────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  open_id?: string; // TikTok
  [key: string]: unknown;
}

async function exchangeCodeForTokens(
  platform: PlatformKey,
  config: PlatformOAuthConfig,
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
  codeVerifier?: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", redirectUri);

  if (config.tokenAuthMethod === "body") {
    if (platform === "tiktok") {
      body.set("client_key", clientId);
    } else {
      body.set("client_id", clientId);
    }
    body.set("client_secret", clientSecret);
  }

  if (config.usesPKCE && codeVerifier) {
    body.set("code_verifier", codeVerifier);
    // Twitter requires client_id in body even with basic auth
    if (platform === "twitter") {
      body.set("client_id", clientId);
    }
  }

  if (config.extraTokenParams) {
    for (const [key, value] of Object.entries(config.extraTokenParams)) {
      body.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (config.tokenAuthMethod === "basic") {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    headers["Authorization"] = `Basic ${credentials}`;
  }

  console.log(
    `[social-auth] Exchanging code for ${platform} at ${config.tokenUrl}`,
  );

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(
      `[social-auth] Token exchange failed for ${platform}: ${response.status} ${responseText}`,
    );
    throw new Error(
      `Token exchange failed: ${response.status} - ${responseText}`,
    );
  }

  // Some APIs return URL-encoded responses (old Facebook behavior)
  let tokenData: TokenResponse;
  try {
    tokenData = JSON.parse(responseText);
  } catch {
    // Parse as URL-encoded
    const params = new URLSearchParams(responseText);
    tokenData = {
      access_token: params.get("access_token") || "",
      token_type: params.get("token_type") || "bearer",
    };
    const expiresIn = params.get("expires_in");
    if (expiresIn) tokenData.expires_in = parseInt(expiresIn, 10);
  }

  // TikTok nests data
  if (platform === "tiktok" && (tokenData as Record<string, unknown>).data) {
    const nested = (tokenData as Record<string, unknown>).data as TokenResponse;
    tokenData = { ...tokenData, ...nested };
  }

  if (!tokenData.access_token) {
    throw new Error(
      `No access_token in response from ${platform}: ${responseText}`,
    );
  }

  return tokenData;
}

// ─── Meta (Facebook + Instagram) Callback ────────────────────────────────────

async function handleMetaCallback(
  supabase: ReturnType<typeof createClient>,
  tokenData: TokenResponse,
  userId: string,
  orgId?: string,
  oauthClientId?: string,
  oauthClientSecret?: string,
  ownerType?: string,
  brandId?: string,
  clientId?: string,
): Promise<void> {
  let accessToken = tokenData.access_token;
  let tokenExpiresAt: string | null = null;

  // Exchange for long-lived token
  if (oauthClientId && oauthClientSecret) {
    try {
      const llResponse = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?` +
          `grant_type=fb_exchange_token&client_id=${oauthClientId}&client_secret=${oauthClientSecret}&fb_exchange_token=${accessToken}`,
      );
      if (llResponse.ok) {
        const llData = await llResponse.json();
        if (llData.access_token) {
          accessToken = llData.access_token;
          if (llData.expires_in) {
            tokenExpiresAt = new Date(
              Date.now() + llData.expires_in * 1000,
            ).toISOString();
          }
        }
      }
    } catch (err) {
      console.warn("[social-auth] Failed to get long-lived Meta token:", err);
      // Continue with short-lived token
      if (tokenData.expires_in) {
        tokenExpiresAt = new Date(
          Date.now() + tokenData.expires_in * 1000,
        ).toISOString();
      }
    }
  } else if (tokenData.expires_in) {
    tokenExpiresAt = new Date(
      Date.now() + tokenData.expires_in * 1000,
    ).toISOString();
  }

  console.log("=== META CALLBACK DEBUG START ===");
  console.log(`[social-auth] User access token (first 20 chars): ${accessToken?.substring(0, 20)}...`);
  console.log(`[social-auth] Token length: ${accessToken?.length || 0}`);
  console.log(`[social-auth] Token expires at: ${tokenExpiresAt || "never (long-lived page token)"}`);

  // Fetch user info (only to get fb_user_id, NOT saved as account)
  const meResponse = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${accessToken}`,
  );
  if (!meResponse.ok) {
    const meErrText = await meResponse.text();
    console.error(`[social-auth] /me failed: ${meResponse.status} ${meErrText}`);
    throw new Error(
      `Failed to fetch Meta user info: ${meResponse.status} ${meErrText}`,
    );
  }
  const meData = await meResponse.json();
  const fbUserId = meData.id;
  console.log(`[social-auth] Meta user: ${meData.name} (${fbUserId}) — NOT saving personal profile`);

  // Fetch Fan Pages with rich Instagram Business Account data
  const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture,category,fan_count,followers_count,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}&access_token=${accessToken}`;
  // Also fetch user's ad accounts for marketing module
  let adAccounts: Array<Record<string, unknown>> = [];
  try {
    const adAccountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,account_status,currency,business_name&access_token=${accessToken}`
    );
    if (adAccountsRes.ok) {
      const adData = await adAccountsRes.json();
      adAccounts = adData.data || [];
      console.log(`[social-auth] Found ${adAccounts.length} ad accounts`);
    }
  } catch (adErr) {
    console.warn("[social-auth] Could not fetch ad accounts:", adErr);
  }

  // Fetch user's businesses for BM access
  let businesses: Array<Record<string, unknown>> = [];
  try {
    const bizRes = await fetch(
      `https://graph.facebook.com/v21.0/me/businesses?fields=id,name&access_token=${accessToken}`
    );
    if (bizRes.ok) {
      const bizData = await bizRes.json();
      businesses = bizData.data || [];
      console.log(`[social-auth] Found ${businesses.length} businesses`);
    }
  } catch (bizErr) {
    console.warn("[social-auth] Could not fetch businesses:", bizErr);
  }
  console.log(`[social-auth] Fetching pages from: ${pagesUrl.replace(accessToken, "TOKEN_HIDDEN")}`);

  const pagesResponse = await fetch(pagesUrl);
  const pagesRawText = await pagesResponse.text();

  console.log(`[social-auth] Pages API Response Status: ${pagesResponse.status}`);
  console.log(`[social-auth] Pages API Raw Response (first 2000 chars): ${pagesRawText.substring(0, 2000)}`);

  if (!pagesResponse.ok) {
    console.error(`[social-auth] Pages API FAILED: ${pagesResponse.status} ${pagesRawText}`);
    throw new Error(
      "No se pudieron obtener las Fan Pages de Facebook. Asegúrate de seleccionar al menos una página durante la autorización.",
    );
  }

  let pagesData: { data?: Array<Record<string, unknown>> };
  try {
    pagesData = JSON.parse(pagesRawText);
  } catch (parseErr) {
    console.error(`[social-auth] Failed to parse pages response as JSON:`, parseErr);
    throw new Error("Respuesta inválida de la API de Facebook al obtener páginas.");
  }

  const allPages = pagesData.data || [];
  console.log(`[social-auth] Number of pages found: ${allPages.length}`);

  // Log each page with its Instagram details
  if (allPages.length > 0) {
    allPages.forEach((page: Record<string, unknown>, index: number) => {
      const igBiz = page.instagram_business_account as Record<string, unknown> | undefined;
      console.log(`[social-auth] Page ${index + 1}: ${JSON.stringify({
        id: page.id,
        name: page.name,
        category: page.category,
        fan_count: page.fan_count,
        followers_count: page.followers_count,
        has_page_token: !!(page.access_token as string)?.length,
        page_token_len: (page.access_token as string)?.length || 0,
        hasInstagramBusiness: !!igBiz?.id,
        instagramId: igBiz?.id || "N/A",
        instagramUsername: igBiz?.username || "N/A",
        instagramFollowers: igBiz?.followers_count || 0,
        instagramMediaCount: igBiz?.media_count || 0,
      })}`);
    });
  } else {
    // If no pages, try alternative endpoint
    console.log("[social-auth] No pages found via /me/accounts. Trying /me?fields=accounts...");
    try {
      const altResponse = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name,accounts{id,name,instagram_business_account{id,username}}&access_token=${accessToken}`,
      );
      const altText = await altResponse.text();
      console.log(`[social-auth] Alternative /me?accounts response (${altResponse.status}): ${altText.substring(0, 2000)}`);
    } catch (altErr) {
      console.warn("[social-auth] Alternative endpoint also failed:", altErr);
    }
  }

  if (allPages.length === 0) {
    console.warn(`[social-auth] NO pages returned by /me/accounts for user ${fbUserId}`);
    throw new Error(
      "No se encontraron Fan Pages. Durante la autorizacion de Facebook, asegurate de seleccionar las paginas que quieres conectar. " +
      "Vuelve a intentarlo y en el dialogo de Facebook marca las paginas.",
    );
  }

  // Save ALL pages (FB pages always, IG only when linked)
  let igCount = 0;
  for (const page of allPages) {
    const pageId = page.id as string;
    const pageName = page.name as string;
    const pageToken = page.access_token as string;
    const pagePicture = page.picture as Record<string, unknown> | undefined;
    const pageAvatar = (pagePicture?.data as Record<string, unknown>)?.url as string || null;
    const igAccount = page.instagram_business_account as Record<string, unknown> | undefined;

    console.log(`[social-auth] === Saving Page: ${pageName} (${pageId}) ===`);
    console.log(`[social-auth] Page token (first 20): ${pageToken?.substring(0, 20)}... (len: ${pageToken?.length})`);

    // Save the Facebook Fan Page account (using page token)
    await upsertSocialAccount(supabase, {
      user_id: userId,
      organization_id: orgId || null,
      platform: "facebook",
      platform_user_id: fbUserId,
      platform_username: pageName,
      platform_display_name: pageName,
      platform_avatar_url: pageAvatar,
      platform_page_id: pageId,
      platform_page_name: pageName,
      access_token: pageToken,
      refresh_token: null,
      token_expires_at: null, // Page tokens from long-lived user tokens don't expire
      scopes: [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "pages_manage_metadata",
        "pages_manage_ads",
        "read_insights",
        "business_management",
        "ads_management",
        "ads_read",
        "publish_video",
        "catalog_management",
        "leads_retrieval",
      ],
      metadata: {
        token_type: "page_token",
        fb_user_id: fbUserId,
        page_id: pageId,
        page_category: page.category || null,
        page_fan_count: page.fan_count || 0,
        page_followers_count: page.followers_count || 0,
        ig_business_account_id: igAccount?.id || null,
        // User-level token for ads/BM operations
        user_access_token: accessToken,
        user_token_expires_at: tokenExpiresAt || null,
        // Ad accounts & businesses for marketing module
        ad_accounts: adAccounts.map(a => ({ id: a.id, name: a.name, account_id: a.account_id, status: a.account_status, currency: a.currency, business_name: a.business_name })),
        businesses: businesses.map(b => ({ id: b.id, name: b.name })),
      },
      owner_type: ownerType || "user",
      brand_id: brandId || null,
      client_id: clientId || null,
      account_type: "page",
      connection_method: "facebook",
    });
    console.log(`[social-auth] FB Page "${pageName}" saved successfully`);

    // Save linked Instagram Business Account if exists (using page token)
    if (igAccount?.id) {
      const igId = igAccount.id as string;
      const igUsername = (igAccount.username || igAccount.name || pageName) as string;
      const igAvatarUrl = (igAccount.profile_picture_url as string) || pageAvatar;
      console.log(`[social-auth] Saving IG Business: @${igUsername} (${igId}), followers: ${igAccount.followers_count || 0}, media: ${igAccount.media_count || 0}`);

      await upsertSocialAccount(supabase, {
        user_id: userId,
        organization_id: orgId || null,
        platform: "instagram",
        platform_user_id: igId,
        platform_username: igUsername,
        platform_display_name: igUsername,
        platform_avatar_url: igAvatarUrl,
        platform_page_id: pageId,
        platform_page_name: pageName,
        access_token: pageToken,
        refresh_token: null,
        token_expires_at: null,
        scopes: [
          "instagram_basic",
          "instagram_content_publish",
          "instagram_manage_comments",
          "instagram_manage_insights",
        ],
        metadata: {
          token_type: "page_token",
          fb_user_id: fbUserId,
          ig_business_account_id: igId,
          linked_page_id: pageId,
          linked_page_name: pageName,
          ig_followers_count: igAccount.followers_count || 0,
          ig_media_count: igAccount.media_count || 0,
          // User-level token for ads/BM operations
          user_access_token: accessToken,
          user_token_expires_at: tokenExpiresAt || null,
        },
        owner_type: ownerType || "user",
        brand_id: brandId || null,
        client_id: clientId || null,
        account_type: "business",
        connection_method: "facebook",
      });
      igCount++;
    } else {
      console.log(`[social-auth] Page "${pageName}" has no IG Business linked — skipping IG account`);
    }
  }

  console.log(`[social-auth] Meta callback complete: saved ${allPages.length} page(s) + ${igCount} IG business account(s)`);
  console.log("=== META CALLBACK DEBUG END ===");
}

// ─── Instagram Direct Callback ───────────────────────────────────────────────

async function handleInstagramDirectCallback(
  supabase: ReturnType<typeof createClient>,
  tokenData: TokenResponse,
  userId: string,
  orgId?: string,
  oauthClientId?: string,
  oauthClientSecret?: string,
  ownerType?: string,
  brandId?: string,
  clientId?: string,
): Promise<void> {
  // Instagram API returns a short-lived token — exchange for long-lived
  let accessToken = tokenData.access_token;
  let tokenExpiresAt: string | null = null;

  // Instagram token response includes user_id
  const igUserId = String(tokenData.user_id || "");
  console.log(`[social-auth] Instagram Direct token response: user_id=${igUserId}, has_access_token=${!!tokenData.access_token}, expires_in=${tokenData.expires_in}`);

  // Exchange short-lived token for long-lived token (60 days)
  if (oauthClientSecret) {
    try {
      const llUrl = `https://graph.instagram.com/access_token?` +
        `grant_type=ig_exchange_token&client_secret=${oauthClientSecret}&access_token=${accessToken}`;
      console.log(`[social-auth] Exchanging IG short-lived token for long-lived...`);
      const llResponse = await fetch(llUrl);
      const llText = await llResponse.text();
      console.log(`[social-auth] IG long-lived token exchange: ${llResponse.status} ${llText.substring(0, 300)}`);

      if (llResponse.ok) {
        const llData = JSON.parse(llText);
        if (llData.access_token) {
          accessToken = llData.access_token;
          if (llData.expires_in) {
            tokenExpiresAt = new Date(
              Date.now() + llData.expires_in * 1000,
            ).toISOString();
          }
        }
      } else {
        console.warn(
          `[social-auth] Failed to get long-lived IG token: ${llResponse.status}`,
        );
        if (tokenData.expires_in) {
          tokenExpiresAt = new Date(
            Date.now() + tokenData.expires_in * 1000,
          ).toISOString();
        }
      }
    } catch (err) {
      console.warn("[social-auth] Failed to exchange IG token:", err);
      if (tokenData.expires_in) {
        tokenExpiresAt = new Date(
          Date.now() + tokenData.expires_in * 1000,
        ).toISOString();
      }
    }
  }

  // Fetch user profile from Instagram Graph API
  let igUsername = "";
  let igDisplayName = "";
  let igAvatarUrl: string | null = null;
  let igAccountType = "";
  let resolvedUserId = igUserId;

  const profileFields = "user_id,username,name,account_type,profile_picture_url";

  // Try /me first, then fall back to /{user_id}
  let profileFetched = false;
  for (const endpoint of [`me`, igUserId].filter(Boolean)) {
    if (profileFetched) break;
    try {
      const profileUrl = `https://graph.instagram.com/v21.0/${endpoint}?fields=${profileFields}&access_token=${accessToken}`;
      console.log(`[social-auth] Fetching IG profile from /${endpoint}...`);
      const meResponse = await fetch(profileUrl);
      const responseText = await meResponse.text();
      console.log(`[social-auth] IG profile /${endpoint} response: ${meResponse.status} ${responseText.substring(0, 500)}`);

      if (meResponse.ok) {
        const meData = JSON.parse(responseText);
        resolvedUserId = String(meData.user_id || meData.id || igUserId);
        igUsername = meData.username || "";
        igDisplayName = meData.name || meData.username || "";
        igAvatarUrl = meData.profile_picture_url || null;
        igAccountType = meData.account_type || "";
        profileFetched = true;
      }
    } catch (err) {
      console.warn(`[social-auth] Failed to fetch IG profile from /${endpoint}:`, err);
    }
  }

  if (!profileFetched) {
    console.warn(`[social-auth] Could not fetch IG profile, saving with user_id as fallback: ${igUserId}`);
    // Use user_id as fallback so the account at least shows something meaningful
    igUsername = igUserId;
    igDisplayName = `Instagram ${igUserId}`;
  }

  if (!resolvedUserId) {
    throw new Error("Could not determine Instagram user ID");
  }

  await upsertSocialAccount(supabase, {
    user_id: userId,
    organization_id: orgId || null,
    platform: "instagram",
    platform_user_id: resolvedUserId,
    platform_username: igUsername,
    platform_display_name: igDisplayName || igUsername,
    platform_avatar_url: igAvatarUrl,
    platform_page_id: null,
    platform_page_name: null,
    access_token: accessToken,
    refresh_token: null,
    token_expires_at: tokenExpiresAt,
    scopes: [
      "instagram_business_basic",
      "instagram_business_content_publish",
      "instagram_business_manage_messages",
      "instagram_business_manage_comments",
    ],
    metadata: {
      token_type: "long_lived",
      ig_user_id: resolvedUserId,
      account_type: igAccountType,
    },
    owner_type: ownerType || "user",
    brand_id: brandId || null,
    client_id: clientId || null,
    connection_method: "direct",
  });

  console.log(`[social-auth] Saved Instagram Direct account for user ${userId} (ig: ${igUsername})`);
}

// ─── TikTok Callback ─────────────────────────────────────────────────────────

async function handleTikTokCallback(
  supabase: ReturnType<typeof createClient>,
  tokenData: TokenResponse,
  userId: string,
  orgId?: string,
  ownerType?: string,
  brandId?: string,
  clientId?: string,
): Promise<void> {
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || null;
  const openId = tokenData.open_id || null;
  const expiresIn = tokenData.expires_in;
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  // Fetch user info
  let tikTokUsername = "";
  let tikTokDisplayName = "";
  let tikTokAvatarUrl = "";
  let tikTokUserId = openId || "";
  let tikTokUserInfo: Record<string, unknown> | null = null;

  try {
    const userResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,avatar_url,username,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    if (userResponse.ok) {
      const userData = await userResponse.json();
      tikTokUserInfo = userData.data?.user || {};
      tikTokUserId = (tikTokUserInfo.open_id as string) || openId || "";
      tikTokUsername = (tikTokUserInfo.username as string) || "";
      tikTokDisplayName = (tikTokUserInfo.display_name as string) || tikTokUsername || "";
      tikTokAvatarUrl = (tikTokUserInfo.avatar_url as string) || "";
      console.log(`[social-auth] TikTok user: @${tikTokUsername} (${tikTokUserId}), followers: ${tikTokUserInfo.follower_count}, videos: ${tikTokUserInfo.video_count}`);
    }
  } catch (err) {
    console.warn("[social-auth] Failed to fetch TikTok user info:", err);
  }

  if (!tikTokUserId) {
    throw new Error("Could not determine TikTok user ID");
  }

  await upsertSocialAccount(supabase, {
    user_id: userId,
    organization_id: orgId || null,
    platform: "tiktok",
    platform_user_id: tikTokUserId,
    platform_username: tikTokUsername,
    platform_display_name: tikTokDisplayName,
    platform_avatar_url: tikTokAvatarUrl,
    platform_page_id: null,
    platform_page_name: null,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: tokenExpiresAt,
    scopes: tokenData.scope
      ? tokenData.scope.split(",").map((s: string) => s.trim())
      : ["user.info.basic", "video.publish", "video.upload", "video.list"],
    metadata: {
      open_id: openId,
      refresh_expires_in: tokenData.refresh_expires_in || null,
      bio: tikTokUserInfo?.bio_description || null,
      profile_url: tikTokUserInfo?.profile_deep_link || null,
      is_verified: tikTokUserInfo?.is_verified || false,
      follower_count: tikTokUserInfo?.follower_count || 0,
      following_count: tikTokUserInfo?.following_count || 0,
      likes_count: tikTokUserInfo?.likes_count || 0,
      video_count: tikTokUserInfo?.video_count || 0,
    },
    owner_type: ownerType || "user",
    brand_id: brandId || null,
    client_id: clientId || null,
  });
}

// ─── YouTube (Google) Callback ───────────────────────────────────────────────

async function handleYouTubeCallback(
  supabase: ReturnType<typeof createClient>,
  tokenData: TokenResponse,
  userId: string,
  orgId?: string,
  ownerType?: string,
  brandId?: string,
  clientId?: string,
): Promise<void> {
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || null;
  const expiresIn = tokenData.expires_in;
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  // Fetch Google user info
  let googleUserId = "";
  let googleName = "";
  let googleAvatarUrl = "";

  try {
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (userResponse.ok) {
      const userData = await userResponse.json();
      googleUserId = userData.id || "";
      googleName = userData.name || userData.email || "";
      googleAvatarUrl = userData.picture || "";
    }
  } catch (err) {
    console.warn("[social-auth] Failed to fetch Google user info:", err);
  }

  // Fetch YouTube channel info
  let channelId = googleUserId;
  let channelTitle = googleName;
  let channelThumbnail = googleAvatarUrl;

  try {
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (channelResponse.ok) {
      const channelData = await channelResponse.json();
      if (channelData.items && channelData.items.length > 0) {
        const channel = channelData.items[0];
        channelId = channel.id || googleUserId;
        channelTitle = channel.snippet?.title || googleName;
        channelThumbnail =
          channel.snippet?.thumbnails?.default?.url || googleAvatarUrl;
      }
    }
  } catch (err) {
    console.warn("[social-auth] Failed to fetch YouTube channel:", err);
  }

  if (!channelId && !googleUserId) {
    throw new Error("Could not determine YouTube/Google user ID");
  }

  await upsertSocialAccount(supabase, {
    user_id: userId,
    organization_id: orgId || null,
    platform: "youtube",
    platform_user_id: channelId || googleUserId,
    platform_username: channelTitle,
    platform_display_name: channelTitle,
    platform_avatar_url: channelThumbnail,
    platform_page_id: null,
    platform_page_name: null,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: tokenExpiresAt,
    scopes: tokenData.scope
      ? tokenData.scope.split(" ").map((s: string) => s.trim())
      : [
          "https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/youtube.readonly",
          "https://www.googleapis.com/auth/yt-analytics.readonly",
        ],
    metadata: {
      google_user_id: googleUserId,
      channel_id: channelId,
      google_name: googleName,
    },
    owner_type: ownerType || "user",
    brand_id: brandId || null,
    client_id: clientId || null,
  });
}

// ─── Twitter/X Callback ─────────────────────────────────────────────────────

async function handleTwitterCallback(
  supabase: ReturnType<typeof createClient>,
  tokenData: TokenResponse,
  userId: string,
  orgId?: string,
  ownerType?: string,
  brandId?: string,
  clientId?: string,
): Promise<void> {
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || null;
  const expiresIn = tokenData.expires_in;
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  // Fetch Twitter user info
  let twitterUserId = "";
  let twitterUsername = "";
  let twitterDisplayName = "";
  let twitterAvatarUrl = "";

  try {
    const userResponse = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (userResponse.ok) {
      const userData = await userResponse.json();
      const userInfo = userData.data || {};
      twitterUserId = userInfo.id || "";
      twitterUsername = userInfo.username || "";
      twitterDisplayName = userInfo.name || userInfo.username || "";
      twitterAvatarUrl = userInfo.profile_image_url || "";
    }
  } catch (err) {
    console.warn("[social-auth] Failed to fetch Twitter user info:", err);
  }

  if (!twitterUserId) {
    throw new Error("Could not determine Twitter user ID");
  }

  await upsertSocialAccount(supabase, {
    user_id: userId,
    organization_id: orgId || null,
    platform: "twitter",
    platform_user_id: twitterUserId,
    platform_username: twitterUsername,
    platform_display_name: twitterDisplayName,
    platform_avatar_url: twitterAvatarUrl,
    platform_page_id: null,
    platform_page_name: null,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: tokenExpiresAt,
    scopes: tokenData.scope
      ? tokenData.scope.split(" ").map((s: string) => s.trim())
      : ["tweet.read", "tweet.write", "users.read", "offline.access"],
    metadata: {
      twitter_user_id: twitterUserId,
      twitter_username: twitterUsername,
    },
    owner_type: ownerType || "user",
    brand_id: brandId || null,
    client_id: clientId || null,
  });
}

// ─── LinkedIn Callback ───────────────────────────────────────────────────────

async function handleLinkedInCallback(
  supabase: ReturnType<typeof createClient>,
  tokenData: TokenResponse,
  userId: string,
  orgId?: string,
  ownerType?: string,
  brandId?: string,
  clientId?: string,
): Promise<void> {
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || null;
  const expiresIn = tokenData.expires_in;
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  // Fetch LinkedIn user info via OpenID userinfo endpoint
  let linkedinUserId = "";
  let linkedinName = "";
  let linkedinAvatarUrl = "";
  let linkedinEmail = "";

  try {
    const userResponse = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (userResponse.ok) {
      const userData = await userResponse.json();
      linkedinUserId = userData.sub || "";
      linkedinName = userData.name || "";
      linkedinAvatarUrl = userData.picture || "";
      linkedinEmail = userData.email || "";
    }
  } catch (err) {
    console.warn("[social-auth] Failed to fetch LinkedIn user info:", err);
  }

  if (!linkedinUserId) {
    throw new Error("Could not determine LinkedIn user ID");
  }

  await upsertSocialAccount(supabase, {
    user_id: userId,
    organization_id: orgId || null,
    platform: "linkedin",
    platform_user_id: linkedinUserId,
    platform_username: linkedinName,
    platform_display_name: linkedinName,
    platform_avatar_url: linkedinAvatarUrl,
    platform_page_id: null,
    platform_page_name: null,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: tokenExpiresAt,
    scopes: tokenData.scope
      ? tokenData.scope.split(" ").map((s: string) => s.trim())
      : ["openid", "profile", "w_member_social", "r_basicprofile"],
    metadata: {
      linkedin_sub: linkedinUserId,
      email: linkedinEmail,
    },
    owner_type: ownerType || "user",
    brand_id: brandId || null,
    client_id: clientId || null,
  });
}

// ─── Pinterest Callback ─────────────────────────────────────────────────────

async function handlePinterestCallback(
  supabase: ReturnType<typeof createClient>,
  tokenData: TokenResponse,
  userId: string,
  orgId?: string,
  ownerType?: string,
  brandId?: string,
  clientId?: string,
): Promise<void> {
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || null;
  const expiresIn = tokenData.expires_in;
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  // Fetch Pinterest user info
  let pinterestUserId = "";
  let pinterestUsername = "";
  let pinterestDisplayName = "";
  let pinterestAvatarUrl = "";

  try {
    const userResponse = await fetch(
      "https://api.pinterest.com/v5/user_account",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (userResponse.ok) {
      const userData = await userResponse.json();
      pinterestUserId = userData.id || "";
      pinterestUsername = userData.username || "";
      pinterestDisplayName =
        userData.business_name || userData.username || "";
      pinterestAvatarUrl = userData.profile_image || "";
    }
  } catch (err) {
    console.warn("[social-auth] Failed to fetch Pinterest user info:", err);
  }

  if (!pinterestUserId) {
    throw new Error("Could not determine Pinterest user ID");
  }

  await upsertSocialAccount(supabase, {
    user_id: userId,
    organization_id: orgId || null,
    platform: "pinterest",
    platform_user_id: pinterestUserId,
    platform_username: pinterestUsername,
    platform_display_name: pinterestDisplayName,
    platform_avatar_url: pinterestAvatarUrl,
    platform_page_id: null,
    platform_page_name: null,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: tokenExpiresAt,
    scopes: tokenData.scope
      ? tokenData.scope.split(",").map((s: string) => s.trim())
      : [
          "boards:read",
          "pins:read",
          "pins:write",
          "user_accounts:read",
        ],
    metadata: {
      pinterest_user_id: pinterestUserId,
    },
    owner_type: ownerType || "user",
    brand_id: brandId || null,
    client_id: clientId || null,
  });
}

// ─── Upsert Social Account ──────────────────────────────────────────────────

interface SocialAccountData {
  user_id: string;
  organization_id: string | null;
  platform: string;
  platform_user_id: string;
  platform_username: string;
  platform_display_name: string;
  platform_avatar_url: string | null;
  platform_page_id: string | null;
  platform_page_name: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
  // v2 fields
  owner_type?: string;
  brand_id?: string | null;
  client_id?: string | null;
  account_type?: string;
  connection_method?: string;
}

async function upsertSocialAccount(
  supabase: ReturnType<typeof createClient>,
  data: SocialAccountData,
): Promise<void> {
  // Check for existing active account with same user + platform + platform_user_id + page_id
  const { data: existing, error: findError } = await supabase
    .from("social_accounts")
    .select("id")
    .eq("user_id", data.user_id)
    .eq("platform", data.platform)
    .eq("platform_user_id", data.platform_user_id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  // Narrow further by page_id if present
  if (!findError && existing && data.platform_page_id) {
    const { data: existingWithPage } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("user_id", data.user_id)
      .eq("platform", data.platform)
      .eq("platform_user_id", data.platform_user_id)
      .eq("platform_page_id", data.platform_page_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (existingWithPage) {
      // Update existing
      const updatePayload: Record<string, unknown> = {
        platform_username: data.platform_username,
        platform_display_name: data.platform_display_name,
        platform_avatar_url: data.platform_avatar_url,
        platform_page_name: data.platform_page_name,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: data.token_expires_at,
        scopes: data.scopes,
        metadata: data.metadata,
        is_active: true,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      };
      if (data.owner_type) updatePayload.owner_type = data.owner_type;
      if (data.brand_id) updatePayload.brand_id = data.brand_id;
      if (data.client_id !== undefined) updatePayload.client_id = data.client_id;
      if (data.account_type) updatePayload.account_type = data.account_type;
      if (data.connection_method) updatePayload.connection_method = data.connection_method;
      const { error: updateError } = await supabase
        .from("social_accounts")
        .update(updatePayload)
        .eq("id", existingWithPage.id);

      if (updateError) {
        console.error(
          `[social-auth] Failed to update social account:`,
          updateError,
        );
        throw new Error(`Failed to update social account: ${updateError.message}`);
      }
      console.log(
        `[social-auth] Updated existing ${data.platform} account (page: ${data.platform_page_id})`,
      );
      return;
    }
  } else if (!findError && existing && !data.platform_page_id) {
    // No page_id, update the base account
    // Make sure there isn't a page_id mismatch: only update if the existing row also has no page
    const { data: existingNoPage } = await supabase
      .from("social_accounts")
      .select("id, platform_page_id")
      .eq("id", existing.id)
      .limit(1)
      .maybeSingle();

    if (existingNoPage && !existingNoPage.platform_page_id) {
      const updatePayload2: Record<string, unknown> = {
        platform_username: data.platform_username,
        platform_display_name: data.platform_display_name,
        platform_avatar_url: data.platform_avatar_url,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: data.token_expires_at,
        scopes: data.scopes,
        metadata: data.metadata,
        is_active: true,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      };
      if (data.owner_type) updatePayload2.owner_type = data.owner_type;
      if (data.brand_id) updatePayload2.brand_id = data.brand_id;
      if (data.client_id !== undefined) updatePayload2.client_id = data.client_id;
      if (data.account_type) updatePayload2.account_type = data.account_type;
      if (data.connection_method) updatePayload2.connection_method = data.connection_method;
      const { error: updateError } = await supabase
        .from("social_accounts")
        .update(updatePayload2)
        .eq("id", existingNoPage.id);

      if (updateError) {
        console.error(
          `[social-auth] Failed to update social account:`,
          updateError,
        );
        throw new Error(`Failed to update social account: ${updateError.message}`);
      }
      console.log(
        `[social-auth] Updated existing ${data.platform} account (no page)`,
      );
      return;
    }
  }

  // Insert new (v2: include owner_type, brand_id, account_type)
  const insertPayload: Record<string, unknown> = {
    user_id: data.user_id,
    organization_id: data.organization_id,
    platform: data.platform,
    platform_user_id: data.platform_user_id,
    platform_username: data.platform_username,
    platform_display_name: data.platform_display_name,
    platform_avatar_url: data.platform_avatar_url,
    platform_page_id: data.platform_page_id,
    platform_page_name: data.platform_page_name,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: data.token_expires_at,
    scopes: data.scopes,
    metadata: data.metadata,
    is_active: true,
    connected_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
  };
  if (data.owner_type) insertPayload.owner_type = data.owner_type;
  if (data.brand_id) insertPayload.brand_id = data.brand_id;
  if (data.client_id) insertPayload.client_id = data.client_id;
  if (data.account_type) insertPayload.account_type = data.account_type;
  if (data.connection_method) insertPayload.connection_method = data.connection_method;

  const { error: insertError } = await supabase
    .from("social_accounts")
    .insert(insertPayload);

  if (insertError) {
    // Handle unique constraint violation - update instead
    if (insertError.code === "23505") {
      console.log(
        `[social-auth] Duplicate detected for ${data.platform}, attempting update`,
      );
      const { error: fallbackError } = await supabase
        .from("social_accounts")
        .update({
          platform_username: data.platform_username,
          platform_display_name: data.platform_display_name,
          platform_avatar_url: data.platform_avatar_url,
          platform_page_name: data.platform_page_name,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_expires_at: data.token_expires_at,
          scopes: data.scopes,
          metadata: data.metadata,
          is_active: true,
          last_synced_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("user_id", data.user_id)
        .eq("platform", data.platform)
        .eq("platform_user_id", data.platform_user_id)
        .eq("is_active", true);

      if (fallbackError) {
        throw new Error(
          `Failed to upsert social account: ${fallbackError.message}`,
        );
      }
      return;
    }
    console.error(
      `[social-auth] Failed to insert social account:`,
      insertError,
    );
    throw new Error(
      `Failed to save social account: ${insertError.message}`,
    );
  }

  console.log(
    `[social-auth] Saved new ${data.platform} account for user ${data.user_id}` +
      (data.platform_page_id
        ? ` (page: ${data.platform_page_id})`
        : ""),
  );
}

// ─── Route: DISCONNECT ───────────────────────────────────────────────────────

async function handleDisconnect(req: Request): Promise<Response> {
  const user = await getUserFromRequest(req);
  if (!user) return errorResponse("Unauthorized", 401);

  let body: { account_id?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body");
  }

  const accountId = body.account_id;
  if (!accountId) return errorResponse("account_id is required");

  const supabase = getServiceClient();

  // Verify the account belongs to the user or their org
  const { data: account, error: findError } = await supabase
    .from("social_accounts")
    .select("id, platform, access_token, platform_user_id, metadata, user_id, organization_id")
    .eq("id", accountId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (findError || !account) {
    return errorResponse("Account not found", 404);
  }

  // Check ownership: direct owner OR same org member
  if (account.user_id !== user.id && account.organization_id) {
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", account.organization_id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!orgMember) {
      return errorResponse("Account not found or access denied", 404);
    }
  } else if (account.user_id !== user.id) {
    return errorResponse("Account not found or access denied", 404);
  }

  // Attempt to revoke token on the platform side (best-effort)
  const platform = account.platform as PlatformKey | "facebook" | "instagram";
  try {
    await revokeTokenForPlatform(platform, account.access_token, account.metadata);
  } catch (err) {
    console.warn(
      `[social-auth] Failed to revoke token for ${platform} (non-fatal):`,
      err,
    );
  }

  // Deactivate the account
  const { error: updateError } = await supabase
    .from("social_accounts")
    .update({
      is_active: false,
      access_token: "REVOKED",
      refresh_token: null,
      last_error: "Disconnected by user",
    })
    .eq("id", accountId);

  if (updateError) {
    return errorResponse(
      `Failed to disconnect account: ${updateError.message}`,
      500,
    );
  }

  return jsonResponse({ success: true, message: "Account disconnected" });
}

async function revokeTokenForPlatform(
  platform: string,
  accessToken: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  switch (platform) {
    case "facebook":
    case "instagram":
    case "meta": {
      // Facebook token revocation
      await fetch(
        `https://graph.facebook.com/v21.0/me/permissions?access_token=${accessToken}`,
        { method: "DELETE" },
      );
      break;
    }
    case "tiktok": {
      const clientKey = Deno.env.get("SOCIAL_TIKTOK_CLIENT_ID");
      const clientSecret = Deno.env.get("SOCIAL_TIKTOK_CLIENT_SECRET");
      if (clientKey && clientSecret) {
        const openId = (metadata as Record<string, unknown>)?.open_id || "";
        await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            token: accessToken,
          }).toString(),
        });
      }
      break;
    }
    case "youtube": {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${accessToken}`,
        { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      break;
    }
    case "twitter": {
      const clientId = Deno.env.get("SOCIAL_TWITTER_CLIENT_ID");
      const clientSecret = Deno.env.get("SOCIAL_TWITTER_CLIENT_SECRET");
      if (clientId && clientSecret) {
        const credentials = btoa(`${clientId}:${clientSecret}`);
        await fetch("https://api.twitter.com/2/oauth2/revoke", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
          },
          body: new URLSearchParams({
            token: accessToken,
            token_type_hint: "access_token",
          }).toString(),
        });
      }
      break;
    }
    case "linkedin": {
      const clientId = Deno.env.get("SOCIAL_LINKEDIN_CLIENT_ID");
      const clientSecret = Deno.env.get("SOCIAL_LINKEDIN_CLIENT_SECRET");
      if (clientId && clientSecret) {
        await fetch(
          "https://www.linkedin.com/oauth/v2/revoke",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              token: accessToken,
            }).toString(),
          },
        );
      }
      break;
    }
    case "pinterest": {
      // Pinterest doesn't have a standard revoke endpoint via API v5
      // The token will eventually expire
      console.log("[social-auth] Pinterest token revocation: no API endpoint, token will expire naturally");
      break;
    }
    default:
      break;
  }
}

// ─── Route: REFRESH ──────────────────────────────────────────────────────────

async function handleRefresh(req: Request): Promise<Response> {
  const user = await getUserFromRequest(req);
  if (!user) return errorResponse("Unauthorized", 401);

  let body: { account_id?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body");
  }

  const accountId = body.account_id;
  if (!accountId) return errorResponse("account_id is required");

  const supabase = getServiceClient();

  // Fetch the account
  const { data: account, error: findError } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (findError || !account) {
    return errorResponse("Account not found", 404);
  }

  // Check ownership: direct owner OR same org member
  if (account.user_id !== user.id && account.organization_id) {
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", account.organization_id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!orgMember) {
      return errorResponse("Account not found or access denied", 404);
    }
  } else if (account.user_id !== user.id) {
    return errorResponse("Account not found or access denied", 404);
  }

  const platform = account.platform as string;

  try {
    const result = await refreshTokenForPlatform(platform, account);

    // Update account with new tokens
    const { error: updateError } = await supabase
      .from("social_accounts")
      .update({
        access_token: result.access_token,
        refresh_token: result.refresh_token || account.refresh_token,
        token_expires_at: result.token_expires_at,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", accountId);

    if (updateError) {
      return errorResponse(
        `Failed to save refreshed tokens: ${updateError.message}`,
        500,
      );
    }

    return jsonResponse({
      success: true,
      expires_at: result.token_expires_at,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Token refresh failed";

    // Mark the error on the account
    await supabase
      .from("social_accounts")
      .update({ last_error: message })
      .eq("id", accountId);

    return errorResponse(message, 500);
  }
}

interface RefreshResult {
  access_token: string;
  refresh_token?: string;
  token_expires_at: string | null;
}

async function refreshTokenForPlatform(
  platform: string,
  account: Record<string, unknown>,
): Promise<RefreshResult> {
  switch (platform) {
    case "facebook":
    case "instagram": {
      const connectionMethod = (account.connection_method as string) || "facebook";

      if (connectionMethod === "direct") {
        // Instagram Direct: exchange existing long-lived token for a new one
        const igClientSecret = Deno.env.get("SOCIAL_META_IG_CLIENT_SECRET");
        if (!igClientSecret) {
          throw new Error("Instagram Direct OAuth not configured");
        }

        const response = await fetch(
          `https://graph.instagram.com/access_token?` +
            `grant_type=ig_exchange_token&client_secret=${igClientSecret}&access_token=${account.access_token}`,
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Instagram token refresh failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        return {
          access_token: data.access_token,
          token_expires_at: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : null,
        };
      }

      // Facebook method: exchange for new long-lived token via Facebook Graph API
      const fbClientId = Deno.env.get("SOCIAL_META_FB_CLIENT_ID");
      const fbClientSecret = Deno.env.get("SOCIAL_META_FB_CLIENT_SECRET");
      if (!fbClientId || !fbClientSecret) {
        throw new Error("Meta Facebook OAuth not configured");
      }

      const response = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?` +
          `grant_type=fb_exchange_token&client_id=${fbClientId}&client_secret=${fbClientSecret}&fb_exchange_token=${account.access_token}`,
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Meta token refresh failed: ${response.status} ${text}`);
      }

      const data = await response.json();
      return {
        access_token: data.access_token,
        token_expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null,
      };
    }

    case "tiktok": {
      const clientKey = Deno.env.get("SOCIAL_TIKTOK_CLIENT_ID");
      const clientSecret = Deno.env.get("SOCIAL_TIKTOK_CLIENT_SECRET");
      if (!clientKey || !clientSecret || !account.refresh_token) {
        throw new Error(
          "TikTok OAuth not configured or no refresh token available",
        );
      }

      const response = await fetch(
        "https://open.tiktokapis.com/v2/oauth/token/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            grant_type: "refresh_token",
            refresh_token: account.refresh_token as string,
          }).toString(),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `TikTok token refresh failed: ${response.status} ${text}`,
        );
      }

      let data = await response.json();
      // TikTok nests data
      if (data.data) data = { ...data, ...data.data };

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null,
      };
    }

    case "youtube": {
      const clientId = Deno.env.get("SOCIAL_YOUTUBE_CLIENT_ID");
      const clientSecret = Deno.env.get("SOCIAL_YOUTUBE_CLIENT_SECRET");
      if (!clientId || !clientSecret || !account.refresh_token) {
        throw new Error(
          "YouTube OAuth not configured or no refresh token available",
        );
      }

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: account.refresh_token as string,
        }).toString(),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `YouTube token refresh failed: ${response.status} ${text}`,
        );
      }

      const data = await response.json();
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null,
      };
    }

    case "twitter": {
      const clientId = Deno.env.get("SOCIAL_TWITTER_CLIENT_ID");
      const clientSecret = Deno.env.get("SOCIAL_TWITTER_CLIENT_SECRET");
      if (!clientId || !clientSecret || !account.refresh_token) {
        throw new Error(
          "Twitter OAuth not configured or no refresh token available",
        );
      }

      const credentials = btoa(`${clientId}:${clientSecret}`);
      const response = await fetch(
        "https://api.twitter.com/2/oauth2/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: account.refresh_token as string,
            client_id: clientId,
          }).toString(),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Twitter token refresh failed: ${response.status} ${text}`,
        );
      }

      const data = await response.json();
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null,
      };
    }

    case "linkedin": {
      const clientId = Deno.env.get("SOCIAL_LINKEDIN_CLIENT_ID");
      const clientSecret = Deno.env.get("SOCIAL_LINKEDIN_CLIENT_SECRET");
      if (!clientId || !clientSecret || !account.refresh_token) {
        throw new Error(
          "LinkedIn OAuth not configured or no refresh token available",
        );
      }

      const response = await fetch(
        "https://www.linkedin.com/oauth/v2/accessToken",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: account.refresh_token as string,
            client_id: clientId,
            client_secret: clientSecret,
          }).toString(),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `LinkedIn token refresh failed: ${response.status} ${text}`,
        );
      }

      const data = await response.json();
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null,
      };
    }

    case "pinterest": {
      const clientId = Deno.env.get("SOCIAL_PINTEREST_CLIENT_ID");
      const clientSecret = Deno.env.get("SOCIAL_PINTEREST_CLIENT_SECRET");
      if (!clientId || !clientSecret || !account.refresh_token) {
        throw new Error(
          "Pinterest OAuth not configured or no refresh token available",
        );
      }

      const credentials = btoa(`${clientId}:${clientSecret}`);
      const response = await fetch(
        "https://api.pinterest.com/v5/oauth/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: account.refresh_token as string,
          }).toString(),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Pinterest token refresh failed: ${response.status} ${text}`,
        );
      }

      const data = await response.json();
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null,
      };
    }

    default:
      throw new Error(`Token refresh not supported for platform: ${platform}`);
  }
}

// ─── Route: ACCOUNTS ─────────────────────────────────────────────────────────

async function handleAccounts(req: Request): Promise<Response> {
  const user = await getUserFromRequest(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const orgId = url.searchParams.get("org_id");
  const platform = url.searchParams.get("platform");

  const supabase = getServiceClient();

  let query = supabase
    .from("social_accounts")
    .select(
      "id, platform, platform_user_id, platform_username, platform_display_name, platform_avatar_url, platform_page_id, platform_page_name, token_expires_at, scopes, is_active, metadata, connected_at, last_synced_at, last_error, organization_id",
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("connected_at", { ascending: false });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  }

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data: accounts, error } = await query;

  if (error) {
    return errorResponse(`Failed to fetch accounts: ${error.message}`, 500);
  }

  // Enrich accounts with token expiry status
  const enriched = (accounts || []).map((acc) => ({
    ...acc,
    token_status: getTokenStatus(acc.token_expires_at),
  }));

  return jsonResponse({ accounts: enriched });
}

function getTokenStatus(
  expiresAt: string | null,
): "valid" | "expiring_soon" | "expired" | "no_expiry" {
  if (!expiresAt) return "no_expiry";

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();

  if (diffMs <= 0) return "expired";
  if (diffMs < 7 * 24 * 60 * 60 * 1000) return "expiring_soon"; // 7 days
  return "valid";
}

// ─── Route: DATA DELETION (Meta App Review requirement) ──────────────────

async function handleDataDeletion(req: Request): Promise<Response> {
  // Meta sends a POST with signed_request when a user requests data deletion
  // We also handle GET for the confirmation URL
  if (req.method === "GET") {
    // Confirmation URL - redirect to frontend data deletion page
    const frontendUrl =
      Deno.env.get("SOCIAL_REDIRECT_BASE_URL") ||
      Deno.env.get("FRONTEND_URL") ||
      "";
    const url = new URL(req.url);
    const confirmationCode = url.searchParams.get("code") || "";
    return redirectResponse(
      `${frontendUrl}/data-deletion${confirmationCode ? `?code=${encodeURIComponent(confirmationCode)}` : ""}`,
    );
  }

  // POST: Meta data deletion callback
  try {
    let signedRequest: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.text();
      const params = new URLSearchParams(formData);
      signedRequest = params.get("signed_request");
    } else {
      try {
        const body = await req.json();
        signedRequest = body.signed_request || null;
      } catch {
        // Not JSON either
      }
    }

    if (signedRequest) {
      // Parse signed_request to get user_id
      const parts = signedRequest.split(".");
      if (parts.length === 2) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          const fbUserId = payload.user_id;

          if (fbUserId) {
            console.log(
              `[social-auth] Data deletion request for Meta user: ${fbUserId}`,
            );

            // Deactivate all social accounts for this Meta user
            const supabase = getServiceClient();
            await supabase
              .from("social_accounts")
              .update({
                is_active: false,
                access_token: "DELETED_BY_USER_REQUEST",
                refresh_token: null,
                last_error: "Data deletion requested via Meta",
              })
              .eq("platform_user_id", fbUserId)
              .in("platform", ["facebook", "instagram"]);

            // Generate a confirmation code
            const confirmationCode = crypto.randomUUID();
            const frontendUrl =
              Deno.env.get("SOCIAL_REDIRECT_BASE_URL") ||
              Deno.env.get("FRONTEND_URL") ||
              "";
            const statusUrl = `${frontendUrl}/data-deletion?code=${confirmationCode}`;

            // Return the expected JSON response for Meta
            return jsonResponse({
              url: statusUrl,
              confirmation_code: confirmationCode,
            });
          }
        } catch (err) {
          console.error(
            "[social-auth] Failed to parse signed_request:",
            err,
          );
        }
      }
    }

    // Fallback: return a generic confirmation
    const confirmationCode = crypto.randomUUID();
    const frontendUrl =
      Deno.env.get("SOCIAL_REDIRECT_BASE_URL") ||
      Deno.env.get("FRONTEND_URL") ||
      "";

    return jsonResponse({
      url: `${frontendUrl}/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (err) {
    console.error("[social-auth] Data deletion error:", err);
    return jsonResponse(
      {
        url: `${Deno.env.get("FRONTEND_URL") || ""}/data-deletion`,
        confirmation_code: crypto.randomUUID(),
      },
    );
  }
}

// ─── Main Router ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const route = url.pathname.split("/").pop();

  try {
    switch (route) {
      case "connect":
        return await handleConnect(req);

      case "callback":
        return await handleCallback(req);

      case "disconnect":
        if (req.method !== "POST") {
          return errorResponse("Method not allowed", 405);
        }
        return await handleDisconnect(req);

      case "refresh":
        if (req.method !== "POST") {
          return errorResponse("Method not allowed", 405);
        }
        return await handleRefresh(req);

      case "accounts":
        return await handleAccounts(req);

      case "data-deletion":
      case "deauth":
        return await handleDataDeletion(req);

      default:
        return errorResponse(
          `Unknown route: ${route}. Available: connect, callback, disconnect, refresh, accounts, data-deletion`,
          404,
        );
    }
  } catch (err) {
    console.error("[social-auth] Unhandled error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500);
  }
});
