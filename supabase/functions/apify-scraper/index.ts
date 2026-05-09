// ============================================
// apify-scraper — Inteligencia Competitiva en Tiempo Real
// ============================================
// Llama a 3 actors de Apify en paralelo por cada competidor:
//   1. apify/facebook-ads-scraper  → ads activos en Meta Ads Library
//   2. clockworks/free-tiktok-scraper → top posts de TikTok
//   3. apify/instagram-scraper → posts de Instagram
//
// Output normalizado para inyectar en prompts de Gemini.
// Diseñado para ser llamado UNA SOLA VEZ al inicio del ADN Recargado.
// ============================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_BASE_URL = "https://api.apify.com/v2";
const APIFY_TIMEOUT_MS = 120000; // 2 min por actor
const MAX_RESULTS_PER_SOURCE = 20;

interface Competitor {
  name: string;
  instagram?: string;
  tiktok?: string;
  website?: string;
  facebook_page?: string;
}

interface ApifyRunInput {
  productName: string;
  productCategory: string;
  competitors: Competitor[];
  keywords: string[];
  country: string;
}

interface ScrapedCompetitorData {
  competitor_name: string;
  meta_ads: any[];
  tiktok_posts: any[];
  instagram_posts: any[];
  scraped_at: string;
  errors: string[];
}

// ── Helper: llamar a un actor de Apify y esperar el resultado ──────────────
async function runApifyActor(
  actorId: string,
  input: object,
  apiKey: string,
  timeoutMs = APIFY_TIMEOUT_MS,
): Promise<any[]> {
  const runUrl = `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${apiKey}`;

  // Iniciar el run
  const runResponse = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, maxItems: MAX_RESULTS_PER_SOURCE }),
  });

  if (!runResponse.ok) {
    const errBody = await runResponse.text().catch(() => "");
    throw new Error(`Apify actor ${actorId} failed to start: ${runResponse.status} - ${errBody.substring(0, 200)}`);
  }

  const runData = await runResponse.json();
  const runId = runData.data?.id;
  const datasetId = runData.data?.defaultDatasetId;

  if (!runId) throw new Error(`No run ID returned from actor ${actorId}`);
  if (!datasetId) throw new Error(`No dataset ID returned from actor ${actorId}`);

  // Polling hasta que termine
  const startTime = Date.now();
  const pollInterval = 5000;

  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusUrl = `${APIFY_BASE_URL}/actor-runs/${runId}?token=${apiKey}`;
    const statusRes = await fetch(statusUrl);
    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    const status = statusData.data?.status;

    if (status === "SUCCEEDED") {
      const dataUrl = `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${apiKey}&limit=${MAX_RESULTS_PER_SOURCE}`;
      const dataRes = await fetch(dataUrl);
      const items = await dataRes.json();
      return Array.isArray(items) ? items : [];
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify actor ${actorId} ended with status: ${status}`);
    }
  }

  throw new Error(`Apify actor ${actorId} timed out after ${timeoutMs}ms`);
}

// ── Scrapers individuales por fuente ───────────────────────────────────────

async function scrapeMetaAds(
  competitor: Competitor,
  keywords: string[],
  country: string,
  apiKey: string,
): Promise<any[]> {
  const searchTerms = [
    competitor.name,
    ...(competitor.facebook_page ? [competitor.facebook_page] : []),
    ...keywords.slice(0, 3),
  ].filter(Boolean);

  const input = {
    searchTerms,
    adType: "all",
    publisherPlatforms: ["facebook", "instagram"],
    adActiveStatus: "active",
    mediaType: "all",
    countries: [country.toUpperCase().slice(0, 2) || "CO"],
    maxResultsPerPage: MAX_RESULTS_PER_SOURCE,
  };

  try {
    return await runApifyActor("apify/facebook-ads-scraper", input, apiKey);
  } catch (err: any) {
    console.error(`[apify-scraper] Meta Ads failed for ${competitor.name}: ${err.message}`);
    return [];
  }
}

async function scrapeTikTok(
  competitor: Competitor,
  keywords: string[],
  apiKey: string,
): Promise<any[]> {
  if (!competitor.tiktok && !competitor.name) return [];

  const input: any = {
    profiles: competitor.tiktok ? [competitor.tiktok.replace("@", "").replace(/\/$/, "")] : [],
    hashtags: keywords.slice(0, 3),
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    maxProfilesPerQuery: 1,
    resultsPerPage: MAX_RESULTS_PER_SOURCE,
  };

  try {
    return await runApifyActor("clockworks/free-tiktok-scraper", input, apiKey);
  } catch (err: any) {
    console.error(`[apify-scraper] TikTok failed for ${competitor.name}: ${err.message}`);
    return [];
  }
}

async function scrapeInstagram(competitor: Competitor, apiKey: string): Promise<any[]> {
  if (!competitor.instagram) return [];

  const username = competitor.instagram
    .replace("https://www.instagram.com/", "")
    .replace("https://instagram.com/", "")
    .replace("@", "")
    .replace(/\/$/, "")
    .trim();

  if (!username) return [];

  const input = {
    usernames: [username],
    resultsLimit: MAX_RESULTS_PER_SOURCE,
    resultsType: "posts",
    expandOwners: false,
  };

  try {
    return await runApifyActor("apify/instagram-scraper", input, apiKey);
  } catch (err: any) {
    console.error(`[apify-scraper] Instagram failed for ${competitor.name}: ${err.message}`);
    return [];
  }
}

// ── Orquestador: scraping completo de N competidores ───────────────────────

async function scrapeAllCompetitors(
  input: ApifyRunInput,
  apiKey: string,
): Promise<ScrapedCompetitorData[]> {
  const results: ScrapedCompetitorData[] = [];
  const competitorsToScrape = input.competitors.slice(0, 5); // Cap a 5 por costo

  for (const competitor of competitorsToScrape) {
    const competitorData: ScrapedCompetitorData = {
      competitor_name: competitor.name,
      meta_ads: [],
      tiktok_posts: [],
      instagram_posts: [],
      scraped_at: new Date().toISOString(),
      errors: [],
    };

    // 3 actors en paralelo para este competidor
    const [metaAds, tiktokPosts, instagramPosts] = await Promise.allSettled([
      scrapeMetaAds(competitor, input.keywords, input.country, apiKey),
      scrapeTikTok(competitor, input.keywords, apiKey),
      scrapeInstagram(competitor, apiKey),
    ]);

    if (metaAds.status === "fulfilled") {
      competitorData.meta_ads = metaAds.value;
    } else {
      competitorData.errors.push(`Meta Ads: ${metaAds.reason?.message || "unknown"}`);
    }

    if (tiktokPosts.status === "fulfilled") {
      competitorData.tiktok_posts = tiktokPosts.value;
    } else {
      competitorData.errors.push(`TikTok: ${tiktokPosts.reason?.message || "unknown"}`);
    }

    if (instagramPosts.status === "fulfilled") {
      competitorData.instagram_posts = instagramPosts.value;
    } else {
      competitorData.errors.push(`Instagram: ${instagramPosts.reason?.message || "unknown"}`);
    }

    results.push(competitorData);
  }

  return results;
}

// ── Normalizar output para Gemini (resumen compacto) ───────────────────────

function normalizeForContext(scraped: ScrapedCompetitorData[]): object {
  return {
    scraping_summary: {
      competitors_scraped: scraped.length,
      total_ads_found: scraped.reduce((sum, c) => sum + c.meta_ads.length, 0),
      total_tiktok_posts: scraped.reduce((sum, c) => sum + c.tiktok_posts.length, 0),
      total_instagram_posts: scraped.reduce((sum, c) => sum + c.instagram_posts.length, 0),
      scraped_at: new Date().toISOString(),
    },
    competitors: scraped.map((comp) => ({
      name: comp.competitor_name,
      errors: comp.errors,

      // Top 10 ads más recientes
      active_ads: comp.meta_ads.slice(0, 10).map((ad: any) => ({
        page: ad.page_name,
        headline: ad.ad_creative_link_title || ad.title || "",
        body: (ad.ad_creative_body || ad.body || "").slice(0, 300),
        description: (ad.ad_creative_link_description || ad.description || "").slice(0, 200),
        platforms: ad.platforms,
        impressions_range: ad.estimated_impressions || ad.impressions,
        active_since: ad.ad_delivery_start_time || ad.startDate,
      })),

      // Top 10 TikToks por play count
      top_tiktoks: comp.tiktok_posts
        .sort((a: any, b: any) => (b.playCount || b.play_count || 0) - (a.playCount || a.play_count || 0))
        .slice(0, 10)
        .map((post: any) => ({
          description: (post.text || post.description || "").slice(0, 300),
          plays: post.playCount || post.play_count,
          likes: post.diggCount || post.digg_count,
          shares: post.shareCount || post.share_count,
          comments: post.commentCount || post.comment_count,
          duration_seconds: post.videoMeta?.duration || post.duration,
          hashtags: (post.hashtags || []).slice(0, 10),
          url: post.webVideoUrl || post.url,
        })),

      // Top 10 Instagram posts por likes
      top_instagram: comp.instagram_posts
        .sort((a: any, b: any) => (b.likesCount || b.likes_count || 0) - (a.likesCount || a.likes_count || 0))
        .slice(0, 10)
        .map((post: any) => ({
          caption: (post.caption || "").slice(0, 300),
          likes: post.likesCount || post.likes_count,
          comments: post.commentsCount || post.comments_count,
          type: post.type,
          hashtags: (post.hashtags || []).slice(0, 10),
        })),
    })),
  };
}

// ── HTTP Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Health check vía GET
  if (req.method === "GET") {
    const apiKey = Deno.env.get("APIFY_API_KEY");
    return new Response(
      JSON.stringify({
        status: "ok",
        service: "apify-scraper",
        api_key_configured: !!apiKey,
        max_competitors: 5,
        max_results_per_source: MAX_RESULTS_PER_SOURCE,
        actors: [
          "apify/facebook-ads-scraper",
          "clockworks/free-tiktok-scraper",
          "apify/instagram-scraper",
        ],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const apiKey = Deno.env.get("APIFY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: "APIFY_API_KEY no configurada en Edge Function secrets",
          hint: "Configurar en: Supabase Dashboard → Edge Functions → Secrets",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const input: ApifyRunInput = await req.json();

    if (!input.competitors?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          message: "No competitors provided for scraping",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[apify-scraper] Starting scraping for ${input.competitors.length} competitors`);
    const startTime = Date.now();

    const scrapedData = await scrapeAllCompetitors(input, apiKey);
    const normalizedData = normalizeForContext(scrapedData);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[apify-scraper] Completed in ${elapsed}s — ${scrapedData.length} competitors`);

    return new Response(
      JSON.stringify({
        success: true,
        data: normalizedData,
        raw: scrapedData,
        elapsed_seconds: parseFloat(elapsed),
        message: `Scraped ${scrapedData.length} competitors successfully`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[apify-scraper] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
