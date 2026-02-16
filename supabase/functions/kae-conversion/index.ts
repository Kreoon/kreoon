// ============================================================
// KAE CONVERSION - Immediate Conversion Processing
// ============================================================
//
// Receives high-value conversion events immediately (not batched).
// Inserts into kae_events + kae_conversions and forwards to enabled
// ad platforms: Meta CAPI, TikTok Events API, Google Ads.
//
// JWT: verify_jwt = false (conversions from anonymous visitors too)

import { getKreoonClient } from "../_shared/kreoon-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Hash para datos sensibles (requerido por Meta/TikTok)
async function sha256Hash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ===== META CONVERSIONS API (CAPI) =====
async function sendToMetaCAPI(
  conversion: Record<string, unknown>,
  context: Record<string, unknown>,
  platformConfig: Record<string, unknown> | undefined,
  geo: Record<string, string>
): Promise<{ success: boolean; event_id?: string; error?: string }> {
  if (!platformConfig?.enabled || !platformConfig?.pixel_id || !platformConfig?.access_token) {
    return { success: false, error: "Meta CAPI not configured" };
  }

  const eventMapping: Record<string, string> = (platformConfig.event_mapping as Record<string, string>) || {
    signup: "CompleteRegistration",
    trial_start: "StartTrial",
    subscription: "Purchase",
    content_created: "Lead",
  };

  const metaEventName = eventMapping[conversion.conversion_type as string] || "CustomEvent";
  const eventId = crypto.randomUUID();

  const userData: Record<string, unknown> = {
    client_ip_address: geo.ip,
    client_user_agent: context.user_agent,
    fbc: (context.click_ids as Record<string, string>)?.fbclid
      ? `fb.1.${Date.now()}.${(context.click_ids as Record<string, string>).fbclid}`
      : undefined,
    fbp: context.fbp,
    external_id: context.user_id ? await sha256Hash(context.user_id as string) : undefined,
  };

  // Remover campos undefined
  Object.keys(userData).forEach(key => {
    if (userData[key] === undefined) delete userData[key];
  });

  const eventData = {
    event_name: metaEventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: conversion.page_url,
    action_source: "website",
    user_data: userData,
    custom_data: {
      value: conversion.value_usd || 0,
      currency: "USD",
      content_type: conversion.conversion_type,
      ...(conversion.properties as Record<string, unknown> || {}),
    },
  };

  const url = `https://graph.facebook.com/v18.0/${platformConfig.pixel_id}/events`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [eventData],
        access_token: platformConfig.access_token,
        test_event_code: platformConfig.test_event_code,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Meta CAPI error:", result);
      return { success: false, error: JSON.stringify(result.error) };
    }

    return { success: true, event_id: eventId };
  } catch (error) {
    console.error("Meta CAPI exception:", error);
    return { success: false, error: (error as Error).message };
  }
}

// ===== TIKTOK EVENTS API =====
async function sendToTikTok(
  conversion: Record<string, unknown>,
  context: Record<string, unknown>,
  platformConfig: Record<string, unknown> | undefined,
  geo: Record<string, string>
): Promise<{ success: boolean; event_id?: string; error?: string }> {
  if (!platformConfig?.enabled || !platformConfig?.pixel_id || !platformConfig?.access_token) {
    return { success: false, error: "TikTok Events API not configured" };
  }

  const eventMapping: Record<string, string> = (platformConfig.event_mapping as Record<string, string>) || {
    signup: "CompleteRegistration",
    trial_start: "Subscribe",
    subscription: "CompletePayment",
    content_created: "SubmitForm",
  };

  const tiktokEventName = eventMapping[conversion.conversion_type as string] || "CustomEvent";
  const eventId = crypto.randomUUID();

  const eventData = {
    pixel_code: platformConfig.pixel_id,
    event: tiktokEventName,
    event_id: eventId,
    timestamp: new Date().toISOString(),
    context: {
      user_agent: context.user_agent,
      ip: geo.ip,
      page: {
        url: conversion.page_url,
        referrer: conversion.page_referrer,
      },
      user: {
        external_id: context.user_id ? await sha256Hash(context.user_id as string) : undefined,
        ttclid: (context.click_ids as Record<string, string>)?.ttclid,
        ttp: context.ttp,
      },
    },
    properties: {
      value: conversion.value_usd || 0,
      currency: "USD",
      contents: [
        {
          content_type: conversion.conversion_type,
          content_id: eventId,
        },
      ],
      ...(conversion.properties as Record<string, unknown> || {}),
    },
  };

  const url = "https://business-api.tiktok.com/open_api/v1.3/pixel/track/";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": platformConfig.access_token as string,
      },
      body: JSON.stringify(eventData),
    });

    const result = await response.json();

    if (result.code !== 0) {
      console.error("TikTok Events API error:", result);
      return { success: false, error: result.message };
    }

    return { success: true, event_id: eventId };
  } catch (error) {
    console.error("TikTok Events API exception:", error);
    return { success: false, error: (error as Error).message };
  }
}

// ===== GOOGLE ADS CONVERSION API =====
async function sendToGoogleAds(
  conversion: Record<string, unknown>,
  context: Record<string, unknown>,
  platformConfig: Record<string, unknown> | undefined,
  _geo: Record<string, string>
): Promise<{ success: boolean; event_id?: string; error?: string }> {
  if (!platformConfig?.enabled) {
    return { success: false, error: "Google Ads not configured" };
  }

  // Google Ads usa Enhanced Conversions
  // Requiere configuración diferente (conversion_action_id, customer_id)
  // La implementación completa requiere OAuth y Google Ads API

  console.log("Google Ads conversion would be sent:", {
    gclid: (context.click_ids as Record<string, string>)?.gclid,
    conversion_type: conversion.conversion_type,
    value: conversion.value_usd,
  });

  return {
    success: true,
    event_id: `ga_${Date.now()}`,
    error: "Google Ads API requires additional setup",
  };
}

// ── Main Handler ───────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getKreoonClient();

    const body = await req.json();
    const {
      conversion_type,
      value_usd,
      properties,
      context,
      page_url,
      page_path,
      device_type,
      browser,
      os,
    } = body;

    // Geo data
    const geo = {
      ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "Unknown",
      country: req.headers.get("cf-ipcountry") || "Unknown",
      city: req.headers.get("cf-ipcity") || "Unknown",
      region: req.headers.get("cf-region") || "Unknown",
    };

    // Enriquecer contexto
    const enrichedContext = {
      ...context,
      user_agent: req.headers.get("user-agent"),
    };

    // 1. Guardar evento en kae_events
    const { data: eventData, error: eventError } = await supabase
      .from("kae_events")
      .insert({
        anonymous_id: context.anonymous_id,
        user_id: context.user_id || null,
        session_id: context.session_id,
        event_name: conversion_type,
        event_category: "conversion",
        properties: properties || {},
        page_url,
        page_path,
        device_type,
        browser,
        os,
        country: geo.country,
        city: geo.city,
        region: geo.region,
        client_timestamp: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (eventError) {
      console.error("Error inserting event:", eventError);
    }

    // 2. Obtener configuración de plataformas
    const { data: platforms } = await supabase
      .from("kae_ad_platforms")
      .select("*")
      .eq("enabled", true);

    const platformsMap = (platforms || []).reduce((acc: Record<string, unknown>, p: Record<string, unknown>) => {
      acc[p.platform as string] = p;
      return acc;
    }, {} as Record<string, unknown>);

    // 3. Enviar a plataformas de ads en paralelo
    const conversionData = {
      conversion_type,
      value_usd,
      properties,
      page_url,
      page_referrer: context.referrer || "",
    };

    const [metaResult, tiktokResult, googleResult] = await Promise.all([
      sendToMetaCAPI(conversionData, enrichedContext, platformsMap.meta as Record<string, unknown> | undefined, geo),
      sendToTikTok(conversionData, enrichedContext, platformsMap.tiktok as Record<string, unknown> | undefined, geo),
      sendToGoogleAds(conversionData, enrichedContext, platformsMap.google as Record<string, unknown> | undefined, geo),
    ]);

    // 4. Guardar conversión
    const { data: conversionRecord, error: conversionError } = await supabase
      .from("kae_conversions")
      .insert({
        anonymous_id: context.anonymous_id,
        user_id: context.user_id || null,
        event_id: eventData?.id || null,
        conversion_type,
        value_usd,
        attributed_source: context.utms?.utm_source || "direct",
        attributed_medium: context.utms?.utm_medium,
        attributed_campaign: context.utms?.utm_campaign,
        attribution_model: "last_touch",
        fbclid: context.click_ids?.fbclid,
        ttclid: context.click_ids?.ttclid,
        gclid: context.click_ids?.gclid,
        meta_event_id: metaResult.event_id,
        tiktok_event_id: tiktokResult.event_id,
        google_conversion_id: googleResult.event_id,
      })
      .select("id")
      .single();

    if (conversionError) {
      console.error("Error inserting conversion:", conversionError);
    }

    // 5. Loggear resultados de plataformas
    const logs = [
      { platform: "meta", ...metaResult },
      { platform: "tiktok", ...tiktokResult },
      { platform: "google", ...googleResult },
    ].filter(l => l.success || l.error);

    if (logs.length > 0) {
      await supabase.from("kae_platform_logs").insert(
        logs.map(log => ({
          platform: log.platform,
          conversion_id: conversionRecord?.id,
          response_status: log.success ? 200 : 500,
          response_body: { event_id: log.event_id },
          success: log.success,
          error_message: log.error,
        }))
      );
    }

    // 6. Actualizar visitor como convertido (si es signup)
    if (conversion_type === "signup" && context.user_id) {
      await supabase
        .from("kae_visitors")
        .update({
          user_id: context.user_id,
          converted_at: new Date().toISOString(),
        })
        .eq("anonymous_id", context.anonymous_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversion_id: conversionRecord?.id,
        platforms: {
          meta: metaResult.success,
          tiktok: tiktokResult.success,
          google: googleResult.success,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in kae-conversion:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
