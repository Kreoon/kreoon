/**
 * Public Showcase API - Read-only data for ugccolombia.co
 *
 * TABLAS UTILIZADAS:
 * - organizations: Para obtener el ID de UGC Colombia (slug='ugc-colombia')
 * - content: Videos aprobados de la organización
 *   Campos: id, title, video_url, video_urls[], thumbnail_url, creator_id, client_id, status
 *   Filtro: organization_id = UGC Colombia AND status IN ('approved', 'paid')
 * - clients: Información de marcas/clientes
 *   Campos: id, name, logo_url
 * - profiles: Información de creadores
 *   Campos: id, full_name, username
 * - organization_members: Miembros de la organización (para contar creadores)
 *
 * ENDPOINTS:
 * - GET ?action=videos&limit=N  -> Videos aprobados aleatorios
 * - GET ?action=stats           -> Estadísticas de UGC Colombia
 *
 * CORS: Permite ugccolombia.co, *.vercel.app, localhost:3000
 * CACHE: 60s server, 5min stale-while-revalidate
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// UGC Colombia organization slug
const UGC_COLOMBIA_SLUG = "ugc-colombia";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://ugccolombia.co",
  "https://www.ugccolombia.co",
  "http://localhost:3000",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  let allowedOrigin = "https://ugccolombia.co";

  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) {
      allowedOrigin = origin;
    } else if (origin.endsWith(".vercel.app")) {
      allowedOrigin = origin;
    }
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://wjkbqcrxwsmvtxmqgiqc.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Cache organization ID to avoid repeated lookups
let cachedOrgId: string | null = null;

async function getUgcColombiaOrgId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", UGC_COLOMBIA_SLUG)
    .single();

  if (error || !data) {
    console.error("[public-showcase] Error finding UGC Colombia org:", error);
    return null;
  }

  cachedOrgId = data.id;
  console.log("[public-showcase] UGC Colombia org ID:", cachedOrgId);
  return cachedOrgId;
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!action || !["videos", "stats"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use ?action=videos or ?action=stats" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get UGC Colombia organization ID
    const orgId = await getUgcColombiaOrgId(supabase);
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "videos") {
      return await handleVideos(supabase, url, corsHeaders, orgId);
    } else {
      return await handleStats(supabase, corsHeaders, orgId);
    }
  } catch (error) {
    console.error("[public-showcase] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET ?action=videos&limit=N
 * Returns random approved videos from UGC Colombia organization
 */
async function handleVideos(
  supabase: ReturnType<typeof createClient>,
  url: URL,
  corsHeaders: Record<string, string>,
  orgId: string
): Promise<Response> {
  let limit = parseInt(url.searchParams.get("limit") || "12", 10);
  if (isNaN(limit) || limit < 1) limit = 1;
  if (limit > 24) limit = 24;

  console.log(`[public-showcase] Fetching ${limit} approved videos from org ${orgId}`);

  const overFetch = Math.min(limit * 4, 96);

  // Fetch approved content from UGC Colombia
  const { data: items, error } = await supabase
    .from("content")
    .select("id, title, video_url, video_urls, thumbnail_url, creator_id, client_id")
    .eq("organization_id", orgId)
    .in("status", ["approved", "paid"])
    .order("approved_at", { ascending: false, nullsFirst: false })
    .limit(overFetch);

  if (error) {
    console.error("[public-showcase] Error fetching content:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Filter items that have a video URL
  const itemsWithVideo = (items || []).filter((item: any) => {
    return item.video_url || (item.video_urls && item.video_urls.length > 0);
  });

  const shuffled = shuffleArray(itemsWithVideo).slice(0, limit);

  // Get unique IDs for batch fetching
  const creatorIds = [...new Set(shuffled.map((item: any) => item.creator_id).filter(Boolean))];
  const clientIds = [...new Set(shuffled.map((item: any) => item.client_id).filter(Boolean))];

  // Fetch creators (profiles) and clients in parallel
  const [creatorsResult, clientsResult] = await Promise.all([
    creatorIds.length > 0
      ? supabase.from("profiles").select("id, full_name, username").in("id", creatorIds)
      : { data: [] },
    clientIds.length > 0
      ? supabase.from("clients").select("id, name").in("id", clientIds)
      : { data: [] },
  ]);

  // Build lookup maps
  const creatorsMap: Record<string, { full_name: string; username?: string }> = {};
  if (creatorsResult.data) {
    for (const c of creatorsResult.data) {
      creatorsMap[c.id] = { full_name: c.full_name, username: c.username };
    }
  }

  const clientsMap: Record<string, string> = {};
  if (clientsResult.data) {
    for (const c of clientsResult.data) {
      clientsMap[c.id] = c.name;
    }
  }

  // Transform to expected shape
  const videos = shuffled.map((item: any) => {
    const creator = creatorsMap[item.creator_id];
    const brandName = clientsMap[item.client_id];

    // Get video URL (prefer video_url, fallback to first of video_urls)
    const videoUrl = item.video_url || (item.video_urls && item.video_urls[0]) || null;

    return {
      id: item.id,
      title: item.title || "Sin titulo",
      video_url: videoUrl,
      thumbnail_url: item.thumbnail_url,
      creator_handle: creator?.username || creator?.full_name || "Creador",
      brand_name: brandName || "Marca",
    };
  });

  console.log(`[public-showcase] Returning ${videos.length} videos`);

  return new Response(
    JSON.stringify(videos),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * GET ?action=stats
 * Returns statistics for UGC Colombia organization
 */
async function handleStats(
  supabase: ReturnType<typeof createClient>,
  corsHeaders: Record<string, string>,
  orgId: string
): Promise<Response> {
  console.log("[public-showcase] Fetching stats for org", orgId);

  // Run all counts in parallel
  // Creators and brands: entire platform
  // Videos: UGC Colombia organization only
  const [creatorsResult, brandsResult, videosApprovedResult, videosPaidResult] = await Promise.all([
    // Creators: active creator profiles (entire platform)
    supabase
      .from("creator_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),

    // Brands: all registered brands (entire platform)
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true }),

    // Approved content (UGC Colombia only)
    supabase
      .from("content")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "approved"),

    // Paid content (UGC Colombia only)
    supabase
      .from("content")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "paid"),
  ]);

  // Log errors but don't fail
  if (creatorsResult.error) console.error("[public-showcase] creators error:", creatorsResult.error);
  if (brandsResult.error) console.error("[public-showcase] brands error:", brandsResult.error);
  if (videosApprovedResult.error) console.error("[public-showcase] approved error:", videosApprovedResult.error);
  if (videosPaidResult.error) console.error("[public-showcase] paid error:", videosPaidResult.error);

  const stats = {
    creators_count: creatorsResult.count || 0,
    brands_count: brandsResult.count || 0,
    campaigns_completed: (videosPaidResult.count || 0),
    videos_approved: (videosApprovedResult.count || 0) + (videosPaidResult.count || 0),
    updated_at: new Date().toISOString(),
  };

  console.log("[public-showcase] Stats:", stats);

  return new Response(
    JSON.stringify(stats),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
