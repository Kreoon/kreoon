/**
 * ============================================================
 * Marketing LinkedIn Integration Edge Function
 * ============================================================
 *
 * Handles LinkedIn Ads integration:
 * - OAuth flow for LinkedIn Marketing API
 * - Campaign management (create/update)
 * - Conversion tracking via LinkedIn CAPI
 * - Metrics retrieval
 */

import { createClient } from "npm:@supabase/supabase-js@2.46.2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// LinkedIn API endpoints
const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";
const LINKEDIN_OAUTH_URL = "https://www.linkedin.com/oauth/v2";
const LINKEDIN_ADS_API = "https://api.linkedin.com/rest";

interface LinkedInOAuthConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

interface LinkedInCampaign {
  id?: string;
  name: string;
  account_id: string;
  objective_type: "BRAND_AWARENESS" | "ENGAGEMENT" | "LEAD_GENERATION" | "WEBSITE_CONVERSIONS" | "VIDEO_VIEWS";
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DRAFT";
  daily_budget?: { amount: string; currency_code: string };
  total_budget?: { amount: string; currency_code: string };
  targeting?: LinkedInTargeting;
}

interface LinkedInTargeting {
  locations?: string[];
  job_titles?: string[];
  industries?: string[];
  company_sizes?: string[];
  seniorities?: string[];
}

interface LinkedInConversionEvent {
  event_type: "SIGNUP" | "PURCHASE" | "LEAD" | "KEY_PAGE_VIEW" | "ADD_TO_CART" | "INSTALL" | "OTHER";
  conversion_id: string;
  user: {
    email?: string;
    linkedin_first_party_id?: string;
  };
  event_time: number;
  event_source_url?: string;
  value?: { amount: string; currency_code: string };
}

interface RequestPayload {
  action: "oauth_url" | "oauth_callback" | "list_accounts" | "create_campaign" | "update_campaign" | "get_metrics" | "track_conversion" | "test_connection";
  data?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "No autorizado" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, data } = (await req.json()) as RequestPayload;

    switch (action) {
      case "oauth_url":
        return handleOAuthUrl(data as Partial<LinkedInOAuthConfig>);

      case "oauth_callback":
        return handleOAuthCallback(supabase, data as { code: string; redirect_uri: string });

      case "list_accounts":
        return handleListAccounts(supabase);

      case "create_campaign":
        return handleCreateCampaign(supabase, data as LinkedInCampaign);

      case "update_campaign":
        return handleUpdateCampaign(supabase, data as LinkedInCampaign);

      case "get_metrics":
        return handleGetMetrics(supabase, data as { campaign_id: string; date_range?: { start: string; end: string } });

      case "track_conversion":
        return handleTrackConversion(supabase, data as LinkedInConversionEvent);

      case "test_connection":
        return handleTestConnection(supabase);

      default:
        return jsonResponse({ error: "Accion no soportada" }, 400);
    }
  } catch (err) {
    console.error("[marketing-linkedin] Error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

// ── OAuth URL Generation ──

function handleOAuthUrl(config: Partial<LinkedInOAuthConfig>) {
  const clientId = config.client_id || Deno.env.get("LINKEDIN_CLIENT_ID");
  const redirectUri = config.redirect_uri || Deno.env.get("LINKEDIN_REDIRECT_URI");

  if (!clientId || !redirectUri) {
    return jsonResponse({ error: "Faltan credenciales de LinkedIn OAuth" }, 400);
  }

  const scopes = [
    "r_emailaddress",
    "r_liteprofile",
    "r_ads",
    "r_ads_reporting",
    "rw_ads",
    "r_conversions",
    "rw_conversions",
  ].join("%20");

  const state = crypto.randomUUID();
  const authUrl = `${LINKEDIN_OAUTH_URL}/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}`;

  return jsonResponse({ url: authUrl, state });
}

// ── OAuth Callback Handler ──

async function handleOAuthCallback(
  supabase: ReturnType<typeof createClient>,
  data: { code: string; redirect_uri: string }
) {
  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return jsonResponse({ error: "Faltan credenciales de LinkedIn" }, 400);
  }

  try {
    const tokenResponse = await fetch(`${LINKEDIN_OAUTH_URL}/accessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: data.code,
        redirect_uri: data.redirect_uri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return jsonResponse({
        error: tokenData.error_description || "Error al obtener token",
        details: tokenData,
      }, 400);
    }

    // Store token in kae_ad_platforms
    const { error: updateError } = await supabase
      .from("kae_ad_platforms")
      .update({
        access_token: tokenData.access_token,
        config: {
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          token_obtained_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("platform", "linkedin");

    if (updateError) {
      console.error("[marketing-linkedin] Error guardando token:", updateError);
    }

    return jsonResponse({
      success: true,
      message: "Token de LinkedIn obtenido correctamente",
      expires_in: tokenData.expires_in,
    });
  } catch (err) {
    return jsonResponse({ error: `Error OAuth: ${(err as Error).message}` }, 500);
  }
}

// ── List Ad Accounts ──

async function handleListAccounts(supabase: ReturnType<typeof createClient>) {
  const accessToken = await getAccessToken(supabase);
  if (!accessToken) {
    return jsonResponse({ error: "No hay token de LinkedIn configurado" }, 400);
  }

  try {
    const response = await fetch(`${LINKEDIN_ADS_API}/adAccounts?q=search`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse({
        error: data.message || "Error al obtener cuentas",
        details: data,
      }, response.status);
    }

    const accounts = (data.elements || []).map((acc: Record<string, unknown>) => ({
      id: acc.id,
      name: acc.name,
      status: acc.status,
      currency: acc.currency,
      reference: acc.reference,
    }));

    return jsonResponse({ accounts });
  } catch (err) {
    return jsonResponse({ error: `Error listando cuentas: ${(err as Error).message}` }, 500);
  }
}

// ── Create Campaign ──

async function handleCreateCampaign(
  supabase: ReturnType<typeof createClient>,
  campaign: LinkedInCampaign
) {
  const accessToken = await getAccessToken(supabase);
  if (!accessToken) {
    return jsonResponse({ error: "No hay token de LinkedIn configurado" }, 400);
  }

  try {
    const campaignPayload = {
      account: `urn:li:sponsoredAccount:${campaign.account_id}`,
      name: campaign.name,
      objectiveType: campaign.objective_type,
      status: campaign.status || "DRAFT",
      type: "SPONSORED_UPDATES",
      costType: "CPM",
      dailyBudget: campaign.daily_budget ? {
        amount: campaign.daily_budget.amount,
        currencyCode: campaign.daily_budget.currency_code,
      } : undefined,
      totalBudget: campaign.total_budget ? {
        amount: campaign.total_budget.amount,
        currencyCode: campaign.total_budget.currency_code,
      } : undefined,
    };

    const response = await fetch(`${LINKEDIN_ADS_API}/adCampaigns`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(campaignPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse({
        error: data.message || "Error creando campana",
        details: data,
      }, response.status);
    }

    // Log the action
    await logPlatformAction(supabase, "create_campaign", true, data);

    return jsonResponse({
      success: true,
      campaign_id: data.id,
      message: `Campana "${campaign.name}" creada correctamente`,
    });
  } catch (err) {
    await logPlatformAction(supabase, "create_campaign", false, { error: (err as Error).message });
    return jsonResponse({ error: `Error creando campana: ${(err as Error).message}` }, 500);
  }
}

// ── Update Campaign ──

async function handleUpdateCampaign(
  supabase: ReturnType<typeof createClient>,
  campaign: LinkedInCampaign
) {
  if (!campaign.id) {
    return jsonResponse({ error: "Se requiere campaign.id para actualizar" }, 400);
  }

  const accessToken = await getAccessToken(supabase);
  if (!accessToken) {
    return jsonResponse({ error: "No hay token de LinkedIn configurado" }, 400);
  }

  try {
    const updatePayload: Record<string, unknown> = {};
    if (campaign.name) updatePayload.name = campaign.name;
    if (campaign.status) updatePayload.status = campaign.status;
    if (campaign.daily_budget) {
      updatePayload.dailyBudget = {
        amount: campaign.daily_budget.amount,
        currencyCode: campaign.daily_budget.currency_code,
      };
    }

    const response = await fetch(`${LINKEDIN_ADS_API}/adCampaigns/${campaign.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const data = await response.json();
      return jsonResponse({
        error: data.message || "Error actualizando campana",
        details: data,
      }, response.status);
    }

    await logPlatformAction(supabase, "update_campaign", true, { campaign_id: campaign.id });

    return jsonResponse({
      success: true,
      message: `Campana ${campaign.id} actualizada correctamente`,
    });
  } catch (err) {
    await logPlatformAction(supabase, "update_campaign", false, { error: (err as Error).message });
    return jsonResponse({ error: `Error actualizando campana: ${(err as Error).message}` }, 500);
  }
}

// ── Get Campaign Metrics ──

async function handleGetMetrics(
  supabase: ReturnType<typeof createClient>,
  params: { campaign_id: string; date_range?: { start: string; end: string } }
) {
  const accessToken = await getAccessToken(supabase);
  if (!accessToken) {
    return jsonResponse({ error: "No hay token de LinkedIn configurado" }, 400);
  }

  try {
    const dateRange = params.date_range || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      end: new Date().toISOString().split("T")[0],
    };

    const metricsUrl = new URL(`${LINKEDIN_ADS_API}/adAnalytics`);
    metricsUrl.searchParams.set("q", "analytics");
    metricsUrl.searchParams.set("campaigns", `List(urn:li:sponsoredCampaign:${params.campaign_id})`);
    metricsUrl.searchParams.set("dateRange.start.day", dateRange.start.split("-")[2]);
    metricsUrl.searchParams.set("dateRange.start.month", dateRange.start.split("-")[1]);
    metricsUrl.searchParams.set("dateRange.start.year", dateRange.start.split("-")[0]);
    metricsUrl.searchParams.set("dateRange.end.day", dateRange.end.split("-")[2]);
    metricsUrl.searchParams.set("dateRange.end.month", dateRange.end.split("-")[1]);
    metricsUrl.searchParams.set("dateRange.end.year", dateRange.end.split("-")[0]);
    metricsUrl.searchParams.set("timeGranularity", "DAILY");
    metricsUrl.searchParams.set("fields", "impressions,clicks,costInLocalCurrency,conversions,leads");

    const response = await fetch(metricsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse({
        error: data.message || "Error obteniendo metricas",
        details: data,
      }, response.status);
    }

    // Process and aggregate metrics
    const elements = data.elements || [];
    const aggregated = elements.reduce(
      (acc: Record<string, number>, el: Record<string, number>) => ({
        impressions: acc.impressions + (el.impressions || 0),
        clicks: acc.clicks + (el.clicks || 0),
        spend: acc.spend + (el.costInLocalCurrency || 0),
        conversions: acc.conversions + (el.conversions || 0),
        leads: acc.leads + (el.leads || 0),
      }),
      { impressions: 0, clicks: 0, spend: 0, conversions: 0, leads: 0 }
    );

    return jsonResponse({
      campaign_id: params.campaign_id,
      date_range: dateRange,
      metrics: {
        ...aggregated,
        ctr: aggregated.impressions > 0 ? (aggregated.clicks / aggregated.impressions * 100).toFixed(2) : 0,
        cpc: aggregated.clicks > 0 ? (aggregated.spend / aggregated.clicks).toFixed(2) : 0,
        cpl: aggregated.leads > 0 ? (aggregated.spend / aggregated.leads).toFixed(2) : 0,
      },
      daily_data: elements,
    });
  } catch (err) {
    return jsonResponse({ error: `Error obteniendo metricas: ${(err as Error).message}` }, 500);
  }
}

// ── Track Conversion (CAPI) ──

async function handleTrackConversion(
  supabase: ReturnType<typeof createClient>,
  event: LinkedInConversionEvent
) {
  const config = await getPlatformConfig(supabase);
  if (!config?.access_token) {
    return jsonResponse({ error: "No hay token de LinkedIn configurado" }, 400);
  }

  const partnerId = config.pixel_id;
  if (!partnerId) {
    return jsonResponse({ error: "No hay Partner ID configurado" }, 400);
  }

  try {
    // Hash email if provided
    const hashedEmail = event.user.email
      ? await hashSHA256(event.user.email.toLowerCase().trim())
      : undefined;

    const conversionPayload = {
      conversion: `urn:li:conversion:${event.conversion_id}`,
      conversionHappenedAt: event.event_time,
      eventId: crypto.randomUUID(),
      user: {
        ...(hashedEmail && { userIds: [{ idType: "SHA256_EMAIL", idValue: hashedEmail }] }),
        ...(event.user.linkedin_first_party_id && {
          userInfo: { linkedInFirstPartyId: event.user.linkedin_first_party_id },
        }),
      },
      ...(event.value && {
        conversionValue: {
          amount: event.value.amount,
          currencyCode: event.value.currency_code,
        },
      }),
    };

    const response = await fetch(
      `${LINKEDIN_ADS_API}/conversionEvents?partnerId=${partnerId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202401",
        },
        body: JSON.stringify({ elements: [conversionPayload] }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      await logPlatformAction(supabase, "track_conversion", false, data);
      return jsonResponse({
        error: data.message || "Error enviando conversion",
        details: data,
      }, response.status);
    }

    await logPlatformAction(supabase, "track_conversion", true, {
      event_type: event.event_type,
      conversion_id: event.conversion_id,
    });

    return jsonResponse({
      success: true,
      message: "Conversion registrada correctamente",
    });
  } catch (err) {
    await logPlatformAction(supabase, "track_conversion", false, { error: (err as Error).message });
    return jsonResponse({ error: `Error enviando conversion: ${(err as Error).message}` }, 500);
  }
}

// ── Test Connection ──

async function handleTestConnection(supabase: ReturnType<typeof createClient>) {
  const config = await getPlatformConfig(supabase);

  if (!config?.pixel_id) {
    return jsonResponse({
      success: false,
      message: "No hay Partner ID configurado",
    });
  }

  if (!config?.access_token) {
    return jsonResponse({
      success: true,
      message: `Partner ID "${config.pixel_id}" configurado. LinkedIn CAPI esta en beta - se requiere OAuth para verificacion completa.`,
      details: { partner_id: config.pixel_id, status: "pending_oauth" },
    });
  }

  try {
    // Try to fetch user info to verify token
    const response = await fetch(`${LINKEDIN_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${config.access_token}` },
    });

    if (!response.ok) {
      const error = await response.json();
      return jsonResponse({
        success: false,
        message: error.message || "Token invalido o expirado",
        details: { status: response.status, error },
      });
    }

    const userData = await response.json();

    return jsonResponse({
      success: true,
      message: `LinkedIn conectado correctamente. Usuario: ${userData.localizedFirstName || "N/A"}`,
      details: {
        partner_id: config.pixel_id,
        user_id: userData.id,
        status: "connected",
      },
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      message: `Error de conexion: ${(err as Error).message}`,
    });
  }
}

// ── Helper Functions ──

async function getAccessToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const config = await getPlatformConfig(supabase);
  return config?.access_token || null;
}

async function getPlatformConfig(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase
    .from("kae_ad_platforms")
    .select("*")
    .eq("platform", "linkedin")
    .single();
  return data;
}

async function logPlatformAction(
  supabase: ReturnType<typeof createClient>,
  action: string,
  success: boolean,
  details: Record<string, unknown>
) {
  await supabase.from("kae_platform_logs").insert({
    platform: "linkedin",
    event_name: action,
    success,
    response_status: success ? 200 : 400,
    response_body: details,
    error_message: success ? null : (details.error as string) || null,
    latency_ms: 0,
  });
}

async function hashSHA256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
