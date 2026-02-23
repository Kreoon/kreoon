import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_BASE = "https://api.apify.com/v2";
const BATCH_SIZE = 50;
const APIFY_ACTOR_TIMEOUT = 180; // seconds — consistent for all platforms
const AI_FETCH_TIMEOUT = 60_000; // 60s for multi-ai calls

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

function getApifyToken(): string {
  const token = Deno.env.get("APIFY_TOKEN");
  if (!token) throw new Error("APIFY_TOKEN no configurado en Supabase Secrets");
  return token;
}

/** Fetch with AbortController timeout */
async function fetchWithTimeout(input: string | URL, init?: RequestInit, timeoutMs = 30_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Calculate engagement rate from metrics */
function calcEngagementRate(likes: number, comments: number, shares: number, views: number): number | null {
  const denominator = views > 0 ? views : (likes + comments);
  if (denominator <= 0) return null;
  return parseFloat(((likes + comments + shares) / denominator * 100).toFixed(2));
}

/** Extract hashtags from text using regex */
function extractHashtagsFromText(text: string | null): string[] {
  if (!text) return [];
  const matches = text.match(/#(\w+)/g);
  return matches ? matches.map(h => h.replace("#", "")) : [];
}

/** Extract mentions from text using regex */
function extractMentionsFromText(text: string | null): string[] {
  if (!text) return [];
  const matches = text.match(/@(\w+)/g);
  return matches ? matches.map(m => m.replace("@", "")) : [];
}

/** Parse a date value safely → ISO string or null */
function safeISODate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "number") {
    // Unix timestamp (seconds) — heuristic: if < 1e12 it's seconds, else ms
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/** Extract first valid JSON object from a string (balanced brace parser) */
function extractJSON(text: string): Record<string, unknown> | null {
  const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");
  let depth = 0, start = -1;
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === "{") { if (depth === 0) start = i; depth++; }
    else if (stripped[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(stripped.slice(start, i + 1)); } catch { start = -1; }
      }
    }
  }
  return null;
}

// ── Apify Actor Runner ──────────────────────────────────────

async function runApifyActor(actorId: string, input: Record<string, unknown>, timeoutSecs = APIFY_ACTOR_TIMEOUT): Promise<unknown[]> {
  const token = getApifyToken();
  const url = new URL(`${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items`);
  url.searchParams.set("format", "json");
  url.searchParams.set("clean", "true");
  url.searchParams.set("timeout", String(timeoutSecs));

  const resp = await fetchWithTimeout(
    url.toString(),
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    (timeoutSecs + 30) * 1000,
  );

  if (resp.status === 408) throw new Error(`Actor ${actorId} timed out`);
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

// ── Normalized content item ─────────────────────────────────

interface NormalizedItem {
  platform: string;
  platform_item_id: string;
  target_id?: string;
  author_username: string | null;
  author_name: string | null;
  content_type: string;
  text_content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  hashtags: string[];
  mentions: string[];
  likes: number;
  comments: number;
  shares: number;
  views: number;
  saves: number;
  engagement_rate: number | null;
  published_at: string | null;
  raw_data: Record<string, unknown>;
}

// ── Instagram via Apify ─────────────────────────────────────

const INSTAGRAM_ACTORS = {
  posts: "apify~instagram-post-scraper",
  hashtag: "apify~instagram-hashtag-scraper",
};

async function scrapeInstagram(targetType: string, targetValue: string, limit = 30): Promise<NormalizedItem[]> {
  let actorId: string;
  let input: Record<string, unknown>;

  if (targetType === "hashtag") {
    actorId = INSTAGRAM_ACTORS.hashtag;
    input = { hashtags: [targetValue.replace("#", "")], resultsLimit: limit };
  } else {
    actorId = INSTAGRAM_ACTORS.posts;
    input = { directUrls: [`https://www.instagram.com/${targetValue.replace("@", "")}/`], resultsLimit: limit };
  }

  const items = await runApifyActor(actorId, input);

  return (items as any[]).slice(0, limit).map((raw, idx): NormalizedItem => {
    const likes = raw.likesCount || raw.likes || 0;
    const comments = raw.commentsCount || raw.comments || 0;
    const views = raw.videoViewCount || raw.playCount || raw.views || 0;
    const shares = raw.sharesCount || 0;

    return {
      platform: "instagram",
      platform_item_id: raw.id || raw.shortCode || `ig_${Date.now()}_${idx}`,
      author_username: raw.ownerUsername || raw.owner?.username || null,
      author_name: raw.ownerFullName || raw.owner?.fullName || null,
      content_type: raw.type === "Video" ? "reel" : raw.type === "Sidecar" ? "carousel" : "post",
      text_content: raw.caption || null,
      media_url: raw.videoUrl || raw.displayUrl || raw.url || null,
      thumbnail_url: raw.displayUrl || raw.thumbnailUrl || null,
      permalink: raw.url || (raw.shortCode ? `https://www.instagram.com/p/${raw.shortCode}/` : null),
      hashtags: raw.hashtags || [],
      mentions: raw.mentions || [],
      likes,
      comments,
      shares,
      views,
      saves: raw.savesCount || 0,
      engagement_rate: calcEngagementRate(likes, comments, shares, views),
      published_at: safeISODate(raw.timestamp) || safeISODate(raw.takenAtTimestamp),
      raw_data: raw,
    };
  });
}

// ── TikTok via Apify ────────────────────────────────────────

async function scrapeTikTok(targetType: string, targetValue: string, limit = 30): Promise<NormalizedItem[]> {
  let input: Record<string, unknown>;

  if (targetType === "hashtag") {
    input = { hashtags: [targetValue.replace("#", "")], resultsPerPage: limit };
  } else if (targetType === "keyword") {
    input = { searchQueries: [targetValue], resultsPerPage: limit };
  } else {
    input = { profiles: [targetValue.replace("@", "")], resultsPerPage: limit };
  }

  const items = await runApifyActor("clockworks~tiktok-scraper", input);

  return (items as any[]).slice(0, limit).map((raw, idx): NormalizedItem => {
    const likes = raw.diggCount || raw.stats?.diggCount || 0;
    const comments = raw.commentCount || raw.stats?.commentCount || 0;
    const shares = raw.shareCount || raw.stats?.shareCount || 0;
    const views = raw.playCount || raw.stats?.playCount || 0;
    const saves = raw.collectCount || raw.stats?.collectCount || 0;

    return {
      platform: "tiktok",
      platform_item_id: raw.id || `tt_${Date.now()}_${idx}`,
      author_username: raw.authorMeta?.name || raw.author?.uniqueId || null,
      author_name: raw.authorMeta?.nickName || raw.author?.nickname || null,
      content_type: "video",
      text_content: raw.text || raw.desc || null,
      media_url: raw.videoUrl || raw.video?.playAddr || null,
      thumbnail_url: raw.covers?.default || raw.video?.cover || null,
      permalink: raw.webVideoUrl || (raw.id ? `https://www.tiktok.com/@${raw.authorMeta?.name || "user"}/video/${raw.id}` : null),
      hashtags: (raw.hashtags || []).map((h: any) => h.name || h),
      mentions: raw.mentions || [],
      likes,
      comments,
      shares,
      views,
      saves,
      engagement_rate: calcEngagementRate(likes, comments, shares, views),
      published_at: safeISODate(raw.createTimeISO) || safeISODate(raw.createTime),
      raw_data: raw,
    };
  });
}

// ── Facebook via Apify ──────────────────────────────────────

async function scrapeFacebook(targetType: string, targetValue: string, limit = 30): Promise<NormalizedItem[]> {
  const input: Record<string, unknown> = {
    startUrls: [{ url: targetValue.startsWith("http") ? targetValue : `https://www.facebook.com/${targetValue}` }],
    resultsLimit: limit,
  };

  const items = await runApifyActor("apify~facebook-posts-scraper", input);

  return (items as any[]).slice(0, limit).map((raw, idx): NormalizedItem => {
    const likes = raw.likes || raw.reactionsCount || 0;
    const comments = raw.comments || raw.commentsCount || 0;
    const shares = raw.shares || raw.sharesCount || 0;
    const views = raw.videoViews || 0;
    const textContent = raw.text || raw.message || null;

    return {
      platform: "facebook",
      platform_item_id: raw.postId || raw.id || `fb_${Date.now()}_${idx}`,
      author_username: raw.pageName || null,
      author_name: raw.pageName || null,
      content_type: raw.type || "post",
      text_content: textContent,
      media_url: raw.videoUrl || raw.imageUrl || null,
      thumbnail_url: raw.imageUrl || null,
      permalink: raw.url || raw.postUrl || null,
      hashtags: extractHashtagsFromText(textContent),
      mentions: extractMentionsFromText(textContent),
      likes,
      comments,
      shares,
      views,
      saves: 0,
      engagement_rate: calcEngagementRate(likes, comments, shares, views),
      published_at: safeISODate(raw.time) || safeISODate(raw.timestamp),
      raw_data: raw,
    };
  });
}

// ── YouTube via Apify ───────────────────────────────────────

async function scrapeYouTube(targetType: string, targetValue: string, limit = 30): Promise<NormalizedItem[]> {
  let input: Record<string, unknown>;

  if (targetType === "keyword") {
    input = { searchKeywords: [targetValue], maxResults: limit };
  } else {
    const url = targetValue.startsWith("http") ? targetValue : `https://www.youtube.com/@${targetValue.replace("@", "")}`;
    input = { startUrls: [{ url }], maxResults: limit };
  }

  const items = await runApifyActor("bernardo~youtube-scraper", input);

  return (items as any[]).slice(0, limit).map((raw, idx): NormalizedItem => {
    const likes = raw.likes || 0;
    const comments = raw.commentsCount || raw.numberOfComments || 0;
    const views = raw.viewCount || raw.views || 0;

    return {
      platform: "youtube",
      platform_item_id: raw.id || raw.videoId || `yt_${Date.now()}_${idx}`,
      author_username: raw.channelName || raw.channelUrl || null,
      author_name: raw.channelName || null,
      content_type: raw.isShort ? "short" : "video",
      text_content: raw.title ? `${raw.title}\n\n${raw.description || ""}` : raw.description || null,
      media_url: raw.url || (raw.id ? `https://www.youtube.com/watch?v=${raw.id}` : null),
      thumbnail_url: raw.thumbnailUrl || null,
      permalink: raw.url || (raw.id ? `https://www.youtube.com/watch?v=${raw.id}` : null),
      hashtags: raw.hashtags || [],
      mentions: [],
      likes,
      comments,
      shares: 0,
      views,
      saves: 0,
      engagement_rate: calcEngagementRate(likes, comments, 0, views),
      published_at: safeISODate(raw.date) || safeISODate(raw.uploadDate),
      raw_data: raw,
    };
  });
}

// ── X/Twitter via Apify ─────────────────────────────────────

async function scrapeTwitter(targetType: string, targetValue: string, limit = 30): Promise<NormalizedItem[]> {
  let input: Record<string, unknown>;

  if (targetType === "keyword" || targetType === "hashtag") {
    const query = targetType === "hashtag" ? `#${targetValue.replace("#", "")}` : targetValue;
    input = { searchTerms: [query], maxTweets: limit };
  } else {
    input = { handles: [targetValue.replace("@", "")], maxTweets: limit };
  }

  const items = await runApifyActor("apify~twitter-scraper", input);

  return (items as any[]).slice(0, limit).map((raw, idx): NormalizedItem => {
    const likes = raw.likeCount || raw.favoriteCount || 0;
    const comments = raw.replyCount || 0;
    const shares = raw.retweetCount || 0;
    const views = raw.viewCount || raw.impressions || 0;

    return {
      platform: "twitter",
      platform_item_id: raw.id || raw.tweetId || `tw_${Date.now()}_${idx}`,
      author_username: raw.author?.userName || raw.user?.screen_name || null,
      author_name: raw.author?.name || raw.user?.name || null,
      content_type: raw.isRetweet ? "retweet" : raw.isQuote ? "quote" : "tweet",
      text_content: raw.text || raw.fullText || raw.full_text || null,
      media_url: raw.media?.[0]?.url || raw.entities?.media?.[0]?.media_url_https || null,
      thumbnail_url: raw.media?.[0]?.thumbnailUrl || null,
      permalink: raw.url || (raw.id ? `https://x.com/i/status/${raw.id}` : null),
      hashtags: (raw.hashtags || raw.entities?.hashtags || []).map((h: any) => h.text || h),
      mentions: (raw.mentions || raw.entities?.user_mentions || []).map((m: any) => m.screen_name || m),
      likes,
      comments,
      shares,
      views,
      saves: raw.bookmarkCount || 0,
      engagement_rate: calcEngagementRate(likes, comments, shares, views),
      published_at: safeISODate(raw.createdAt) || safeISODate(raw.created_at),
      raw_data: raw,
    };
  });
}

// ── Platform dispatcher ─────────────────────────────────────

type SocialPlatform = "instagram" | "tiktok" | "facebook" | "youtube" | "twitter";

async function scrapePlatform(platform: SocialPlatform, targetType: string, targetValue: string, limit: number): Promise<NormalizedItem[]> {
  switch (platform) {
    case "instagram": return scrapeInstagram(targetType, targetValue, limit);
    case "tiktok": return scrapeTikTok(targetType, targetValue, limit);
    case "facebook": return scrapeFacebook(targetType, targetValue, limit);
    case "youtube": return scrapeYouTube(targetType, targetValue, limit);
    case "twitter": return scrapeTwitter(targetType, targetValue, limit);
    default: throw new Error(`Plataforma no soportada: ${platform}`);
  }
}

// ── Shared DB operations (DRY — used by both scrape and sync) ──

async function upsertItems(
  supabase: SupabaseClient,
  items: NormalizedItem[],
  targetId: string | null,
): Promise<{ saved: number; errors: number }> {
  const itemsToSave = items.map(item => ({
    ...item,
    target_id: targetId,
    updated_at: new Date().toISOString(),
  }));

  let saved = 0;
  let errors = 0;

  for (let i = 0; i < itemsToSave.length; i += BATCH_SIZE) {
    const batch = itemsToSave.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("social_scrape_items")
      .upsert(batch, { onConflict: "platform,platform_item_id", ignoreDuplicates: false })
      .select("id");
    if (error) {
      console.error(`Upsert error (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, error.message);
      errors += batch.length;
    } else {
      saved += data?.length || 0;
    }
  }

  return { saved, errors };
}

async function updateTargetStats(supabase: SupabaseClient, targetId: string, fallbackCount: number): Promise<void> {
  const { count } = await supabase
    .from("social_scrape_items")
    .select("id", { count: "exact", head: true })
    .eq("target_id", targetId);

  const { error } = await supabase.from("social_scrape_targets").update({
    last_synced_at: new Date().toISOString(),
    total_items_found: count ?? fallbackCount,
    updated_at: new Date().toISOString(),
  }).eq("id", targetId);

  if (error) console.error("Error updating target stats:", error.message);
}

// ── Main Handler ────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, ...params } = await req.json();
    if (!action) return jsonError("action requerido");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── SCRAPE — Scrape a target and save results ──
    if (action === "scrape") {
      const { platform, target_type = "profile", target_value, target_id, limit = 30 } = params;
      if (!platform || !target_value) return jsonError("platform y target_value requeridos");

      const items = await scrapePlatform(platform as SocialPlatform, target_type, target_value, limit);
      const { saved, errors } = await upsertItems(supabase, items, target_id || null);

      if (target_id) await updateTargetStats(supabase, target_id, items.length);

      return json({ items_found: items.length, saved, errors, items });
    }

    // ── SYNC — Re-scrape an existing target ──
    if (action === "sync") {
      const { target_id } = params;
      if (!target_id) return jsonError("target_id requerido");

      const { data: target, error } = await supabase.from("social_scrape_targets").select("*").eq("id", target_id).single();
      if (error || !target) return jsonError("Target no encontrado", 404);

      const items = await scrapePlatform(
        target.platform as SocialPlatform,
        target.target_type,
        target.target_value,
        (target.metadata as any)?.limit || 30,
      );

      const { saved, errors } = await upsertItems(supabase, items, target_id);
      await updateTargetStats(supabase, target_id, items.length);

      return json({ items_found: items.length, saved, errors });
    }

    // ── ANALYZE — AI analysis of scraped content ──
    if (action === "analyze") {
      const { item_id } = params;
      if (!item_id) return jsonError("item_id requerido");

      const { data: item, error } = await supabase.from("social_scrape_items").select("*").eq("id", item_id).single();
      if (error || !item) return jsonError("Item no encontrado", 404);

      const prompt = `Eres un experto en contenido viral y redes sociales. Analiza este contenido orgánico y responde SOLO con JSON válido (sin markdown, sin texto adicional):
{"virality_score":8,"content_pillars":["entretenimiento","educación"],"hook_type":"curiosidad","hook_text":"primeras palabras del contenido","format_notes":"duración, formato, estilo visual","target_audience":"descripción de audiencia","why_it_works":"explicación detallada","improvement_suggestions":["sugerencia 1","sugerencia 2"],"best_posting_time":"horario y día sugerido","replication_ideas":["idea adaptada 1","idea adaptada 2","idea adaptada 3"]}

CONTENIDO A ANALIZAR:
PLATAFORMA: ${item.platform}
AUTOR: ${item.author_username || "Desconocido"}
TIPO: ${item.content_type}
TEXTO: ${(item.text_content || "N/A").slice(0, 2000)}
HASHTAGS: ${(item.hashtags || []).join(", ") || "N/A"}
LIKES: ${item.likes} | COMENTARIOS: ${item.comments} | SHARES: ${item.shares} | VIEWS: ${item.views} | SAVES: ${item.saves}
ENGAGEMENT RATE: ${item.engagement_rate ?? "N/A"}%
PUBLICADO: ${item.published_at || "N/A"}`;

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const resp = await fetchWithTimeout(
        `${SUPABASE_URL}/functions/v1/multi-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            models: ["gemini"],
            mode: "first",
          }),
        },
        AI_FETCH_TIMEOUT,
      );

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => "no body");
        console.error(`multi-ai returned ${resp.status}:`, errBody.slice(0, 300));
        return jsonError(`Error de AI (${resp.status})`, 502);
      }

      const data = await resp.json();
      const content = data.response || "";
      const analysis = extractJSON(content);

      if (!analysis) {
        console.error("Could not parse AI response as JSON:", content.slice(0, 300));
        return jsonError("No se pudo parsear la respuesta AI como JSON", 500);
      }

      const { error: updateError } = await supabase.from("social_scrape_items").update({
        ai_analysis: analysis,
        ai_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", item_id);

      if (updateError) console.error("Error saving analysis:", updateError.message);

      return json(analysis);
    }

    return jsonError(`Acción desconocida: ${action}`);
  } catch (err) {
    console.error("social-scraper error:", err);
    return jsonError(err instanceof Error ? err.message : "Error interno", 500);
  }
});
