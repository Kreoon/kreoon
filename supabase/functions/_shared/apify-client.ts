// _shared/apify-client.ts
// Cliente de Apify para el pipeline ADN Recargado V2
//
// Helpers para:
// 1. Construir el contexto desde productDNA + clientDNA
// 2. Llamar al Edge Function apify-scraper
// 3. Formatear el output para inyectar en prompts de Gemini

export interface ApifyContext {
  productName: string;
  productCategory: string;
  competitors: Array<{
    name: string;
    instagram?: string;
    tiktok?: string;
    website?: string;
    facebook_page?: string;
  }>;
  keywords: string[];
  country: string;
}

export interface ApifyScrapingResult {
  success: boolean;
  data: object | null;
  error?: string;
  elapsed_seconds?: number;
  message?: string;
}

export type ApifyRelevance =
  | "competitors"
  | "differentiation"
  | "angles"
  | "creatives"
  | "calendar"
  | "ads"
  | "landing";

// ── Helper: extraer contexto desde DNAs + competidores opcionales ──────────
export function buildApifyContext(
  productDNA: any,
  clientDNA: any,
  competitorsFromDNA?: any[],
): ApifyContext {
  // Competidores: prioridad a los del paso `competitors` ya generado, luego a los del DNA
  const competitors = (competitorsFromDNA || [])
    .slice(0, 5)
    .map((c: any) => ({
      name: c.name || "",
      instagram: c.instagram || "",
      tiktok: c.tiktok || "",
      website: c.website || "",
      facebook_page: c.facebook_page || c.name || "",
    }))
    .filter((c) => c.name);

  // Keywords desde productDNA + estrategia de marca
  const dnaKeywords =
    clientDNA?.dna_data?.marketing_strategy?.hashtag_strategy?.slice(0, 3) || [];
  const productName = productDNA?.name || productDNA?.brief_data?.product_name || "";
  const productCategory =
    productDNA?.service_group ||
    productDNA?.brief_data?.product_category ||
    productDNA?.category ||
    "";

  const keywords = [productName, productCategory, ...dnaKeywords].filter(Boolean).map(String);

  // País: primer mercado geográfico del clientDNA
  const country =
    clientDNA?.audience_locations?.[0]?.name ||
    clientDNA?.audience_locations?.[0] ||
    clientDNA?.dna_data?.ideal_customer?.demographic?.location ||
    "Colombia";

  return {
    productName,
    productCategory,
    competitors,
    keywords,
    country: typeof country === "string" ? country : "Colombia",
  };
}

// ── Helper: llamar al Edge Function apify-scraper ──────────────────────────
export async function callApifyScraper(
  ctx: ApifyContext,
  supabaseUrl: string,
  authHeader: string,
  timeoutMs = 150000,
): Promise<ApifyScrapingResult> {
  if (!ctx.competitors.length) {
    return {
      success: false,
      data: null,
      message: "Sin competidores para scrapear",
    };
  }

  const url = `${supabaseUrl}/functions/v1/apify-scraper`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(ctx),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return {
        success: false,
        data: null,
        error: `HTTP ${res.status}: ${errBody.substring(0, 200)}`,
      };
    }

    const result = await res.json();
    return {
      success: result.success === true,
      data: result.data || null,
      elapsed_seconds: result.elapsed_seconds,
      message: result.message,
      error: result.error,
    };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err?.name === "AbortError" ? `TIMEOUT ${timeoutMs / 1000}s` : err.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Helper: formatear datos de Apify para inyectar en prompts ──────────────
// Filtra por relevancia para no inflar el contexto innecesariamente.
export function formatApifyForPrompt(
  apifyData: object | null,
  relevantFor: ApifyRelevance,
): string {
  if (!apifyData) return "Datos de scraping no disponibles para este paso.";

  const data = apifyData as any;
  if (!data.competitors?.length) return "No se encontraron competidores scrapeados.";

  const sections: string[] = [];

  sections.push(`=== INTELIGENCIA COMPETITIVA REAL (Apify scraping) ===`);
  sections.push(`Competidores analizados: ${data.scraping_summary?.competitors_scraped || 0}`);
  sections.push(`Ads activos encontrados: ${data.scraping_summary?.total_ads_found || 0}`);
  sections.push(`Posts TikTok: ${data.scraping_summary?.total_tiktok_posts || 0}`);
  sections.push(`Posts Instagram: ${data.scraping_summary?.total_instagram_posts || 0}`);
  sections.push("");

  for (const comp of data.competitors) {
    sections.push(`--- COMPETIDOR: ${comp.name} ---`);

    // Meta Ads — relevante para ads, angles, landing, differentiation, competitors
    if (["competitors", "angles", "ads", "landing", "differentiation"].includes(relevantFor)) {
      if (comp.active_ads?.length) {
        sections.push(`ADS ACTIVOS EN META (${comp.active_ads.length}):`);
        comp.active_ads.slice(0, 5).forEach((ad: any, i: number) => {
          sections.push(`  Ad ${i + 1}:`);
          if (ad.headline) sections.push(`    Headline: ${ad.headline}`);
          if (ad.body) sections.push(`    Copy: ${ad.body.slice(0, 200)}`);
          if (ad.description) sections.push(`    Desc: ${ad.description.slice(0, 150)}`);
          if (ad.impressions_range) sections.push(`    Impresiones: ${ad.impressions_range}`);
          sections.push("");
        });
      } else {
        sections.push(`ADS META: No encontrados o sin paid activo.`);
      }
    }

    // TikTok — relevante para creatives, calendar, angles, competitors
    if (["competitors", "creatives", "calendar", "angles"].includes(relevantFor)) {
      if (comp.top_tiktoks?.length) {
        sections.push(`TOP TIKTOKS (por reproducciones):`);
        comp.top_tiktoks.slice(0, 5).forEach((post: any, i: number) => {
          sections.push(
            `  TikTok ${i + 1}: ${(post.plays || 0).toLocaleString()} vistas | ${(post.likes || 0).toLocaleString()} likes | ${post.duration_seconds || "?"}s`,
          );
          if (post.description) sections.push(`    Caption: ${post.description.slice(0, 200)}`);
          if (post.hashtags?.length) sections.push(`    Hashtags: ${post.hashtags.slice(0, 5).join(", ")}`);
          sections.push("");
        });
      }
    }

    // Instagram — relevante para creatives, calendar, competitors
    if (["competitors", "creatives", "calendar"].includes(relevantFor)) {
      if (comp.top_instagram?.length) {
        sections.push(`TOP INSTAGRAM (por likes):`);
        comp.top_instagram.slice(0, 5).forEach((post: any, i: number) => {
          sections.push(`  Post ${i + 1}: ${(post.likes || 0).toLocaleString()} likes | ${post.type}`);
          if (post.caption) sections.push(`    Caption: ${post.caption.slice(0, 200)}`);
          if (post.hashtags?.length) sections.push(`    Hashtags: ${post.hashtags.slice(0, 5).join(", ")}`);
          sections.push("");
        });
      }
    }

    if (comp.errors?.length) {
      sections.push(`Errores de scraping: ${comp.errors.join(", ")}`);
    }
    sections.push("");
  }

  return sections.join("\n");
}
