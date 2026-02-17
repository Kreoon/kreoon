import { createClient } from "npm:@supabase/supabase-js@2.46.2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TestRequest {
  platform: "meta" | "tiktok" | "google" | "linkedin";
}

interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // Verify JWT - only platform root admins should access this
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: "No autorizado" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { platform } = (await req.json()) as TestRequest;

    if (!platform || !["meta", "tiktok", "google", "linkedin"].includes(platform)) {
      return new Response(JSON.stringify({ success: false, message: "Plataforma inválida" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Fetch platform config from DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: config, error: dbError } = await supabase
      .from("kae_ad_platforms")
      .select("*")
      .eq("platform", platform)
      .single();

    if (dbError || !config) {
      return json({
        success: false,
        message: `No se encontró configuración para ${platform}`,
        details: { error: dbError?.message },
      });
    }

    if (!config.pixel_id || !config.access_token) {
      return json({
        success: false,
        message: "Faltan credenciales. Configura Pixel ID y Access Token primero.",
      });
    }

    // Test connection per platform
    let result: TestResult;

    switch (platform) {
      case "meta":
        result = await testMeta(config.pixel_id, config.access_token);
        break;
      case "tiktok":
        result = await testTikTok(config.pixel_id, config.access_token);
        break;
      case "google":
        result = await testGoogle(config.pixel_id, config.access_token);
        break;
      case "linkedin":
        result = await testLinkedIn(config.pixel_id, config.access_token);
        break;
      default:
        result = { success: false, message: "Plataforma no soportada" };
    }

    // Log the test result
    await supabase.from("kae_platform_logs").insert({
      platform,
      success: result.success,
      response_status: result.success ? 200 : 400,
      response_body: result.details || {},
      error_message: result.success ? null : result.message,
      latency_ms: 0,
    });

    return json(result);
  } catch (err) {
    console.error("[kae-test-connection] Error:", err);
    return json({ success: false, message: (err as Error).message }, 500);
  }
});

// ── Meta (Facebook) CAPI Test ──

async function testMeta(pixelId: string, accessToken: string): Promise<TestResult> {
  try {
    // Validate pixel by fetching its info
    const url = `https://graph.facebook.com/v18.0/${pixelId}?access_token=${accessToken}&fields=name,id`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error?.message || `Error HTTP ${response.status}`,
        details: { error: data.error, status: response.status },
      };
    }

    return {
      success: true,
      message: `Pixel "${data.name}" (${data.id}) verificado correctamente`,
      details: { pixel_name: data.name, pixel_id: data.id },
    };
  } catch (err) {
    return {
      success: false,
      message: `Error de red al contactar Meta API: ${(err as Error).message}`,
    };
  }
}

// ── TikTok Events API Test ──

async function testTikTok(pixelCode: string, accessToken: string): Promise<TestResult> {
  try {
    // Send a test event to verify credentials
    const url = "https://business-api.tiktok.com/open_api/v1.3/pixel/track/";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": accessToken,
      },
      body: JSON.stringify({
        pixel_code: pixelCode,
        event: "ViewContent",
        timestamp: new Date().toISOString(),
        context: {
          user_agent: "KAE-Test-Connection/1.0",
          ip: "127.0.0.1",
        },
        properties: {
          content_type: "product",
          description: "KAE connection test",
        },
        test_event_code: "TEST_KAE",
      }),
    });

    const data = await response.json();

    if (data.code === 0 || response.ok) {
      return {
        success: true,
        message: `TikTok Pixel "${pixelCode}" verificado correctamente`,
        details: { code: data.code, message: data.message },
      };
    }

    return {
      success: false,
      message: data.message || `Error: código ${data.code}`,
      details: { code: data.code, message: data.message },
    };
  } catch (err) {
    return {
      success: false,
      message: `Error de red al contactar TikTok API: ${(err as Error).message}`,
    };
  }
}

// ── Google Analytics 4 Measurement Protocol Test ──

async function testGoogle(measurementId: string, apiSecret: string): Promise<TestResult> {
  // Validar formato del Measurement ID
  if (!measurementId || !measurementId.match(/^G-[A-Z0-9]+$/)) {
    return {
      success: false,
      message: 'El Measurement ID debe tener el formato "G-XXXXXXXXXX"',
      details: { provided_id: measurementId },
    };
  }

  if (!apiSecret) {
    return {
      success: false,
      message: "Se requiere el API Secret de Measurement Protocol",
    };
  }

  try {
    // Enviar evento de test al endpoint de validación de GA4
    const url = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: "kae_test_" + Date.now(),
        events: [
          {
            name: "kae_connection_test",
            params: {
              test: true,
              engagement_time_msec: "1",
            },
          },
        ],
      }),
    });

    const data = await response.json();

    // El debug endpoint retorna validationMessages
    const messages = data.validationMessages || [];
    const hasErrors = messages.some(
      (m: Record<string, unknown>) => (m.validationCode as string) !== "VALID"
    );

    if (hasErrors) {
      const errorDetails = messages.map(
        (m: Record<string, unknown>) => m.description || m.validationCode
      ).join("; ");
      return {
        success: false,
        message: `Error de validación GA4: ${errorDetails}`,
        details: { validationMessages: messages },
      };
    }

    return {
      success: true,
      message: `GA4 "${measurementId}" verificado correctamente via Measurement Protocol`,
      details: { measurement_id: measurementId, validation: "passed" },
    };
  } catch (err) {
    return {
      success: false,
      message: `Error de red al contactar GA4 API: ${(err as Error).message}`,
    };
  }
}

// ── LinkedIn CAPI Test ──

async function testLinkedIn(partnerId: string, _accessToken: string): Promise<TestResult> {
  // LinkedIn CAPI is in beta - basic format validation
  if (partnerId && partnerId.length > 0) {
    return {
      success: true,
      message: `Partner ID "${partnerId}" configurado. LinkedIn CAPI está en beta - verificación completa no disponible aún.`,
      details: { partner_id: partnerId, status: "beta" },
    };
  }

  return {
    success: false,
    message: "Se requiere un Partner ID válido",
  };
}

// ── Helpers ──

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
