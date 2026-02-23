import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FETCH_TIMEOUT_MS = 30_000;
const AI_FETCH_TIMEOUT_MS = 60_000;
const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_ACTOR_TIMEOUT = 180; // seconds — consistent with social-scraper
const BATCH_SIZE = 50;

// ── Helpers ─────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status = 400) {
  return json({ error: message }, status);
}

async function fetchWithTimeout(input: string | URL, init?: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractJSON(text: string): Record<string, unknown> | null {
  const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");
  let depth = 0;
  let start = -1;
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (stripped[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(stripped.slice(start, i + 1)); } catch { start = -1; }
      }
    }
  }
  return null;
}

// ── Apify helpers ───────────────────────────────────────────

function getApifyToken(): string {
  const token = Deno.env.get("APIFY_TOKEN");
  if (!token) throw new Error("APIFY_TOKEN no configurado en Supabase Secrets");
  return token;
}

async function runApifyActor(actorId: string, input: Record<string, unknown>, timeoutSecs = APIFY_ACTOR_TIMEOUT): Promise<unknown[]> {
  const token = getApifyToken();
  const url = new URL(`${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items`);
  url.searchParams.set("format", "json");
  url.searchParams.set("clean", "true");
  url.searchParams.set("timeout", String(timeoutSecs));

  const resp = await fetchWithTimeout(url.toString(), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  }, (timeoutSecs + 30) * 1000);

  if (resp.status === 408) throw new Error(`Apify actor ${actorId} timed out (>${timeoutSecs}s)`);
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Apify ${resp.status}: ${err.slice(0, 300)}`);
  }

  const data = await resp.json();

  // Validate response is an array (Apify may return object on error)
  if (!Array.isArray(data)) {
    console.error(`Apify ${actorId} returned non-array:`, JSON.stringify(data).slice(0, 200));
    throw new Error(`Apify ${actorId} devolvió respuesta inesperada (no es array)`);
  }

  return data;
}

// ── Normalized ad type ──────────────────────────────────────

interface NormalizedAd {
  platform: string;
  platform_ad_id: string;
  search_id?: string;
  page_id: string | null;
  page_name: string | null;
  ad_creative_bodies: string[];
  ad_creative_link_titles: string[];
  ad_creative_link_descriptions: string[];
  ad_snapshot_url: string | null;
  publisher_platforms: string[];
  languages: string[];
  media_type: string | null;
  ad_delivery_start: string | null;
  ad_delivery_stop: string | null;
  is_active: boolean;
  spend_lower: number | null;
  spend_upper: number | null;
  impressions_lower: number | null;
  impressions_upper: number | null;
  currency: string | null;
  raw_data: Record<string, unknown>;
}

// ── Meta Ad Library (API oficial) ───────────────────────────

interface MetaSearchParams {
  search_terms?: string;
  search_page_ids?: string[];
  ad_reached_countries?: string[];
  ad_delivery_date_min?: string;
  ad_delivery_date_max?: string;
  ad_type?: string;
  ad_active_status?: string;
  media_type?: string;
  publisher_platforms?: string[];
  limit?: number;
}

async function searchMetaAdLibrary(params: MetaSearchParams, accessToken: string): Promise<NormalizedAd[]> {
  const {
    search_terms,
    search_page_ids,
    ad_reached_countries = ["ALL"],
    ad_delivery_date_min,
    ad_delivery_date_max,
    ad_active_status = "ALL",
    ad_type = "ALL",
    media_type,
    publisher_platforms,
    limit = 50,
  } = params;

  if (!search_terms && (!search_page_ids || search_page_ids.length === 0)) {
    throw new Error("Meta requiere search_terms o search_page_ids");
  }

  const url = new URL("https://graph.facebook.com/v23.0/ads_archive");
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("ad_reached_countries", JSON.stringify(ad_reached_countries));
  url.searchParams.set("ad_active_status", ad_active_status);
  url.searchParams.set("ad_type", ad_type);
  url.searchParams.set("fields", [
    "id", "ad_creation_time", "ad_creative_bodies", "ad_creative_link_captions",
    "ad_creative_link_descriptions", "ad_creative_link_titles", "ad_delivery_start_time",
    "ad_delivery_stop_time", "ad_snapshot_url", "page_id", "page_name",
    "publisher_platforms", "languages", "spend", "impressions", "currency",
    "target_ages", "target_gender", "target_locations", "media_type",
  ].join(","));
  url.searchParams.set("limit", String(Math.min(limit, 100)));

  if (search_terms) url.searchParams.set("search_terms", search_terms);
  if (search_page_ids?.length) url.searchParams.set("search_page_ids", JSON.stringify(search_page_ids));
  if (ad_delivery_date_min) url.searchParams.set("ad_delivery_date_min", ad_delivery_date_min);
  if (ad_delivery_date_max) url.searchParams.set("ad_delivery_date_max", ad_delivery_date_max);
  if (media_type && media_type !== "ALL") url.searchParams.set("media_type", media_type);
  if (publisher_platforms?.length) url.searchParams.set("publisher_platforms", JSON.stringify(publisher_platforms));

  const rawAds: any[] = [];
  let nextUrl: string | null = url.toString();
  let pages = 0;
  const maxPages = Math.ceil(limit / 100);

  while (nextUrl && pages < maxPages && rawAds.length < limit) {
    const resp = await fetchWithTimeout(nextUrl);
    if (!resp.ok) {
      const errBody = await resp.text();
      if (pages === 0) throw new Error(`Meta API ${resp.status}: ${errBody.slice(0, 200)}`);
      console.error(`Meta API pagination error at page ${pages + 1}: ${resp.status}`);
      break;
    }
    const data = await resp.json();
    if (data.error) {
      if (pages === 0) throw new Error(`Meta API: ${data.error.message}`);
      console.error(`Meta API error at page ${pages + 1}:`, data.error.message);
      break;
    }
    if (data.data) rawAds.push(...data.data);
    nextUrl = data.paging?.next || null;
    pages++;
  }

  console.log(`Meta Ad Library: ${pages} pages fetched, ${rawAds.length} ads found`);

  return rawAds.slice(0, limit).map((raw: any): NormalizedAd => ({
    platform: "meta",
    platform_ad_id: raw.id,
    page_id: raw.page_id || null,
    page_name: raw.page_name || null,
    ad_creative_bodies: raw.ad_creative_bodies || [],
    ad_creative_link_titles: raw.ad_creative_link_titles || [],
    ad_creative_link_descriptions: raw.ad_creative_link_descriptions || [],
    ad_snapshot_url: raw.ad_snapshot_url || null,
    publisher_platforms: raw.publisher_platforms || [],
    languages: raw.languages || [],
    media_type: raw.media_type || null,
    ad_delivery_start: raw.ad_delivery_start_time || null,
    ad_delivery_stop: raw.ad_delivery_stop_time || null,
    is_active: !raw.ad_delivery_stop_time,
    spend_lower: raw.spend?.lower_bound ? parseInt(raw.spend.lower_bound) : null,
    spend_upper: raw.spend?.upper_bound ? parseInt(raw.spend.upper_bound) : null,
    impressions_lower: raw.impressions?.lower_bound ? parseInt(raw.impressions.lower_bound) : null,
    impressions_upper: raw.impressions?.upper_bound ? parseInt(raw.impressions.upper_bound) : null,
    currency: raw.currency || null,
    raw_data: raw,
  }));
}

// ── TikTok via Apify ────────────────────────────────────────

interface TikTokSearchParams {
  search_terms?: string;
  country_code?: string;
  period?: number;
  ad_format?: string;
  sort_by?: string;
  limit?: number;
}

async function searchTikTokViaApify(params: TikTokSearchParams): Promise<NormalizedAd[]> {
  const {
    search_terms,
    country_code = "CO",
    period = 30,
    ad_format,
    sort_by = "like",
    limit = 50,
  } = params;

  const input: Record<string, unknown> = {
    region: country_code,
    period,
    sortBy: sort_by,
    maxResults: Math.min(limit, 100),
  };
  if (search_terms) input.keyword = search_terms;
  if (ad_format) input.adFormat = ad_format;

  const items = await runApifyActor("codebyte~tiktok-creative-center-top-ads", input);

  return (items as any[]).slice(0, limit).map((raw: any, idx: number): NormalizedAd => ({
    platform: "tiktok",
    platform_ad_id: raw.adId || raw.videoId || raw.material_id || `tt_${Date.now()}_${idx}`,
    page_id: raw.advertiserId || null,
    page_name: raw.brandName || raw.creatorUsername || null,
    ad_creative_bodies: raw.caption ? [raw.caption] : raw.adTitle ? [raw.adTitle] : [],
    ad_creative_link_titles: raw.adTitle ? [raw.adTitle] : [],
    ad_creative_link_descriptions: [],
    ad_snapshot_url: raw.videoUrl || raw.coverUrl || null,
    publisher_platforms: ["TIKTOK"],
    languages: raw.adLanguage ? [raw.adLanguage] : [],
    media_type: "video",
    ad_delivery_start: raw.firstShown || null,
    ad_delivery_stop: raw.lastShown || null,
    is_active: !raw.lastShown,
    spend_lower: null,
    spend_upper: null,
    impressions_lower: raw.viewCount || null,
    impressions_upper: raw.viewCount || null,
    currency: null,
    raw_data: raw,
  }));
}

// ── Google via Apify ────────────────────────────────────────

interface GoogleSearchParams {
  search_terms?: string;
  advertiser_id?: string;
  region?: string;
  date_min?: string;
  date_max?: string;
  format?: string;
  limit?: number;
}

async function searchGoogleViaApify(params: GoogleSearchParams): Promise<NormalizedAd[]> {
  const {
    search_terms,
    advertiser_id,
    region,
    date_min,
    date_max,
    format,
    limit = 50,
  } = params;

  const searchInputs: string[] = [];
  if (advertiser_id) searchInputs.push(advertiser_id);
  if (search_terms) searchInputs.push(search_terms);
  if (searchInputs.length === 0) throw new Error("Google requiere search_terms o advertiser_id");

  const input: Record<string, unknown> = {
    searchInputs,
    maxPagesPerInput: Math.ceil(limit / 40),
    proxyConfiguration: { useApifyProxy: true },
  };
  if (format && format !== "ALL") input.adFormat = format.toUpperCase();
  if (region) input.targetCountries = [region];
  if (date_min) input.fromDate = date_min;
  if (date_max) input.toDate = date_max;

  const items = await runApifyActor("xtech~google-ad-transparency-scraper", input);

  return (items as any[]).slice(0, limit).map((raw: any, idx: number): NormalizedAd => ({
    platform: "google",
    platform_ad_id: raw.adId || raw.creative_id || `goog_${Date.now()}_${idx}`,
    page_id: raw.advertiserId ? String(raw.advertiserId) : null,
    page_name: raw.advertiserName || raw.name || null,
    ad_creative_bodies: raw.adText ? [raw.adText] : [],
    ad_creative_link_titles: raw.adTitle ? [raw.adTitle] : raw.headline ? [raw.headline] : [],
    ad_creative_link_descriptions: raw.description ? [raw.description] : [],
    ad_snapshot_url: raw.imageUrl || raw.videoUrl || raw.creative_url || null,
    publisher_platforms: raw.platforms || ["GOOGLE"],
    languages: [],
    media_type: raw.format === "VIDEO" ? "video" : raw.format === "IMAGE" ? "image" : "text",
    ad_delivery_start: raw.firstShown || raw.first_shown || null,
    ad_delivery_stop: raw.lastShown || raw.last_shown || null,
    is_active: !(raw.lastShown || raw.last_shown),
    spend_lower: null,
    spend_upper: null,
    impressions_lower: null,
    impressions_upper: null,
    currency: null,
    raw_data: raw,
  }));
}

// ── Platform dispatcher ─────────────────────────────────────

type Platform = "meta" | "tiktok" | "google";

async function searchPlatform(platform: Platform, searchParams: Record<string, unknown>): Promise<NormalizedAd[]> {
  switch (platform) {
    case "meta": {
      const metaToken = Deno.env.get("META_AD_LIBRARY_ACCESS_TOKEN");
      if (!metaToken) throw new Error("META_AD_LIBRARY_ACCESS_TOKEN no configurado");
      return searchMetaAdLibrary(searchParams as unknown as MetaSearchParams, metaToken);
    }
    case "tiktok":
      return searchTikTokViaApify(searchParams as unknown as TikTokSearchParams);
    case "google":
      return searchGoogleViaApify(searchParams as unknown as GoogleSearchParams);
    default:
      throw new Error(`Plataforma no soportada: ${platform}`);
  }
}

// ── Shared DB operations (DRY — used by search and sync) ────

async function upsertAds(supabase: SupabaseClient, ads: NormalizedAd[]): Promise<{ total: number; errors: number }> {
  let total = 0;
  let errors = 0;

  for (let i = 0; i < ads.length; i += BATCH_SIZE) {
    const batch = ads.slice(i, i + BATCH_SIZE).map(ad => ({
      ...ad,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("ad_library_ads")
      .upsert(batch, { onConflict: "platform,platform_ad_id", ignoreDuplicates: false })
      .select("id");

    if (error) {
      console.error(`Upsert batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      total += data?.length || 0;
    }
  }

  return { total, errors };
}

async function updateSearchStats(supabase: SupabaseClient, searchId: string, fallbackCount: number): Promise<void> {
  const { count } = await supabase
    .from("ad_library_ads")
    .select("id", { count: "exact", head: true })
    .eq("search_id", searchId);

  const { error } = await supabase.from("ad_library_searches").update({
    last_synced_at: new Date().toISOString(),
    total_ads_found: count ?? fallbackCount,
    updated_at: new Date().toISOString(),
  }).eq("id", searchId);

  if (error) console.error("Error updating search stats:", error.message);
}

// ── AI Analysis ─────────────────────────────────────────────

async function analyzeAdWithAI(ad: Record<string, any>): Promise<Record<string, unknown>> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const truncate = (text: string, max = 1500) => text.length > max ? text.slice(0, max) + "..." : text;

  const adContext = [
    `PLATAFORMA: ${ad.platform}`,
    `ANUNCIANTE: ${ad.page_name || "Desconocido"}`,
    `COPY: ${truncate((ad.ad_creative_bodies || []).join("\n"))}`,
    `HEADLINES: ${truncate((ad.ad_creative_link_titles || []).join(", "))}`,
    `DESCRIPCIONES: ${truncate((ad.ad_creative_link_descriptions || []).join(", "))}`,
    `PLATAFORMAS: ${(ad.publisher_platforms || []).join(", ")}`,
    `TIPO DE MEDIA: ${ad.media_type || "desconocido"}`,
    `IDIOMAS: ${(ad.languages || []).join(", ") || "N/A"}`,
    `ACTIVO DESDE: ${ad.ad_delivery_start || "N/A"}`,
    `ACTIVO: ${ad.is_active ? "Sí" : `No (terminado: ${ad.ad_delivery_stop})`}`,
    ad.spend_lower != null ? `GASTO: $${ad.spend_lower}-$${ad.spend_upper} ${ad.currency || ""}` : "GASTO: N/A",
    ad.impressions_lower != null ? `IMPRESIONES: ${ad.impressions_lower.toLocaleString()}-${ad.impressions_upper?.toLocaleString() || "?"}` : "IMPRESIONES: N/A",
  ].join("\n");

  const analysisPrompt = `Eres un experto en marketing digital y copywriting. Analiza este anuncio publicitario y responde SOLO con JSON válido (sin markdown, sin texto extra):
{"hook_type":"tipo de gancho","hook_text":"primeras palabras del copy","cta_type":"tipo CTA","emotion_primary":"emoción principal","format_notes":"notas de formato y estructura","target_audience":"audiencia objetivo","strengths":["fortaleza 1","fortaleza 2"],"weaknesses":["debilidad 1"],"effectiveness_score":7,"why_it_works":"explicación detallada"}

ANUNCIO:
${adContext}`;

  const replicatePrompt = `Eres un copywriter experto. Genera 3 versiones adaptadas en español latino del siguiente anuncio. SOLO JSON válido (sin markdown):
{"versions":[{"title":"headline adaptado","body":"copy adaptado","cta":"call to action","adaptation_notes":"qué se cambió y por qué"},{"title":"...","body":"...","cta":"...","adaptation_notes":"..."},{"title":"...","body":"...","cta":"...","adaptation_notes":"..."}]}

REFERENCIA:
${adContext}`;

  const callMultiAI = async (prompt: string, label: string): Promise<Record<string, unknown> | null> => {
    try {
      const resp = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/multi-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], models: ["gemini"], mode: "first" }),
      }, AI_FETCH_TIMEOUT_MS);

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => "no body");
        console.error(`multi-ai [${label}] returned ${resp.status}:`, errBody.slice(0, 300));
        return null;
      }

      const data = await resp.json();
      const parsed = extractJSON(data.response || "");
      if (!parsed) {
        console.error(`multi-ai [${label}] returned unparseable response:`, (data.response || "").slice(0, 200));
      }
      return parsed;
    } catch (err) {
      console.error(`multi-ai [${label}] exception:`, err instanceof Error ? err.message : err);
      return null;
    }
  };

  const [analysis, replicated] = await Promise.all([
    callMultiAI(analysisPrompt, "analysis"),
    callMultiAI(replicatePrompt, "replicate"),
  ]);

  return { analysis: analysis || {}, replicated: replicated || {}, analyzed_at: new Date().toISOString() };
}

// ── Main Handler ────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, ...params } = await req.json();
    if (!action) return jsonError("action es requerido");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── TOKEN STATUS ──
    if (action === "token_status") {
      const metaToken = Deno.env.get("META_AD_LIBRARY_ACCESS_TOKEN");
      const apifyToken = Deno.env.get("APIFY_TOKEN");

      let metaValid = false;
      if (metaToken) {
        try {
          const resp = await fetchWithTimeout(`https://graph.facebook.com/v23.0/me?access_token=${metaToken}`, undefined, 10_000);
          metaValid = resp.ok;
        } catch {}
      }

      return json({
        meta: { configured: !!metaToken, valid: metaValid },
        tiktok: { configured: !!apifyToken, valid: !!apifyToken, via: "apify" },
        google: { configured: !!apifyToken, valid: !!apifyToken, via: "apify" },
      });
    }

    // ── SEARCH ──
    if (action === "search") {
      const { platform = "meta", search_id, ...searchParams } = params;
      let ads = await searchPlatform(platform as Platform, searchParams);
      if (search_id) ads = ads.map(ad => ({ ...ad, search_id }));

      const result = await upsertAds(supabase, ads);
      if (search_id) await updateSearchStats(supabase, search_id, ads.length);

      return json({ ads_found: ads.length, saved: result.total, errors: result.errors, ads });
    }

    // ── SYNC ──
    if (action === "sync") {
      const { search_id } = params;
      if (!search_id) return jsonError("search_id requerido");

      const { data: search, error } = await supabase.from("ad_library_searches").select("*").eq("id", search_id).single();
      if (error || !search) return jsonError("Búsqueda no encontrada", 404);

      let ads = await searchPlatform((search.platform || "meta") as Platform, search.search_config || {});
      ads = ads.map(ad => ({ ...ad, search_id }));
      const result = await upsertAds(supabase, ads);
      await updateSearchStats(supabase, search_id, ads.length);

      return json({ ads_found: ads.length, saved: result.total, errors: result.errors });
    }

    // ── ANALYZE ──
    if (action === "analyze") {
      const { ad_id } = params;
      if (!ad_id) return jsonError("ad_id requerido");

      const { data: ad, error } = await supabase.from("ad_library_ads").select("*").eq("id", ad_id).single();
      if (error || !ad) return jsonError("Anuncio no encontrado", 404);

      const result = await analyzeAdWithAI(ad);
      const { error: updateError } = await supabase.from("ad_library_ads")
        .update({ ai_analysis: result, ai_analyzed_at: result.analyzed_at, updated_at: new Date().toISOString() })
        .eq("id", ad_id);
      if (updateError) console.error("Failed to save analysis:", updateError.message);

      return json(result);
    }

    return jsonError(`Acción desconocida: ${action}`);
  } catch (err) {
    console.error("ad-intelligence error:", err);
    return jsonError(err instanceof Error ? err.message : "Error interno", 500);
  }
});
