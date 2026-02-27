// ============================================================================
// KREOON CORS - Shared CORS configuration for Edge Functions
// ============================================================================

/**
 * Allowed origins for CORS.
 * FRONTEND_URL env var takes priority, then known production domains.
 * Localhost is allowed for development.
 */
const ALLOWED_ORIGINS: string[] = [
  "https://kreoon.com",
  "https://app.kreoon.com",
  "https://www.kreoon.com",
  // Vercel preview deployments
  "https://kreoon.vercel.app",
];

// Add localhost for development (always allowed - no security risk since localhost only works in dev browsers)
ALLOWED_ORIGINS.push(
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
);

// Add custom FRONTEND_URL if configured
const customFrontend = Deno.env.get("FRONTEND_URL");
if (customFrontend && !ALLOWED_ORIGINS.includes(customFrontend)) {
  ALLOWED_ORIGINS.push(customFrontend);
}

/**
 * Returns CORS headers with origin validation.
 * If the request origin is in the allowed list, reflects it back.
 * Otherwise returns the primary production domain.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = ALLOWED_ORIGINS.some(
    (allowed) => origin === allowed || origin.endsWith(".kreoon.com") || origin.endsWith("-kreoon.vercel.app"),
  );

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

/**
 * Handles CORS preflight (OPTIONS) requests.
 * Use at the top of serve() handler:
 *
 *   if (req.method === "OPTIONS") return handleCorsOptions(req);
 */
export function handleCorsOptions(req: Request): Response {
  return new Response("ok", { headers: getCorsHeaders(req) });
}

/**
 * Creates a JSON response with proper CORS headers.
 */
export function corsJsonResponse(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}
