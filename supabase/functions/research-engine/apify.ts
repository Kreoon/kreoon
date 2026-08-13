// ============================================================================
// KREOON — research-engine · Cliente de Apify y normalización de datos
//
// Todo lo que habla con Apify vive aquí: lanzar runs, sondearlos, leer sus
// datasets y convertir lo que devuelven (tres formas distintas de decir "un
// video que a la gente le gustó") en un solo tipo con el que se pueda rankear.
//
// Los input schemas de cada actor están VERIFICADOS contra
// https://api.apify.com/v2/acts/{actor}/builds/default el 2026-08-13. Ese
// endpoint es público: cuando un actor cambie su input, se comprueba ahí antes
// de tocar nada aquí.
// ============================================================================

// deno-lint-ignore no-explicit-any
export type Json = Record<string, any>;

const APIFY_API = "https://api.apify.com/v2";
const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN") ?? "";

/** Bloques de lectura del dataset. Leer de golpe dispara el rate limit. */
const BLOQUE_DATASET = 15;

export const hayToken = () => APIFY_TOKEN.length > 0;

// ---------------------------------------------------------------------------
// Actores (el id va con `~` en la URL: `apify/x` → `apify~x`)
// ---------------------------------------------------------------------------
export const ACTORES = {
  ig_profile: "apify~instagram-profile-scraper",
  ig_posts: "apify~instagram-scraper",
  tiktok: "clockworks~tiktok-profile-scraper",
  tt_search: "clockworks~tiktok-scraper",
  fb_ads: "apify~facebook-ads-scraper",
  ig_transcripts: "apple_yang~instagram-transcripts-scraper",
} as const;

export type TipoJob = keyof typeof ACTORES | "discovery" | "rank" | "synthesis";

/**
 * Proyección de campos. Un item completo pesa ~20 KB; sin `fields` una corrida
 * de 6 cuentas se come la memoria de la función. `fields` solo recorta el
 * primer nivel, por eso `authorMeta` y `videoMeta` van enteros: lo que
 * necesitamos vive dentro.
 */
export const CAMPOS: Record<string, string> = {
  ig_profile:
    "username,fullName,biography,followersCount,followsCount,postsCount,verified,externalUrl,businessCategoryName,relatedProfiles,profilePicUrlHD",
  ig_posts:
    "id,shortCode,url,type,caption,hashtags,commentsCount,likesCount,videoViewCount,videoPlayCount,videoDuration,timestamp,isPinned,ownerUsername",
  tiktok:
    "id,text,createTimeISO,authorMeta,videoMeta,diggCount,shareCount,playCount,commentCount,webVideoUrl,isPinned",
  tt_search:
    "id,text,createTimeISO,authorMeta,videoMeta,diggCount,shareCount,playCount,commentCount,webVideoUrl,isPinned",
  fb_ads:
    "adArchiveId,pageName,pageId,startDate,startDateFormatted,endDate,isActive,publisherPlatform,snapshot,adUrl,totalActiveTime",
  ig_transcripts:
    "url,videoUrl,transcript,text,segments,code,error,shortCode",
};

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------
export interface RunApify {
  id: string;
  status: string;
  defaultDatasetId?: string;
  usageTotalUsd?: number;
}

function leerRunPayload(payload: Json): RunApify {
  const d = (payload?.data ?? payload ?? {}) as Json;
  return {
    id: String(d.id ?? ""),
    status: String(d.status ?? "UNKNOWN"),
    defaultDatasetId: d.defaultDatasetId ? String(d.defaultDatasetId) : undefined,
    usageTotalUsd: typeof d.usageTotalUsd === "number" ? d.usageTotalUsd : undefined,
  };
}

export const TERMINADO = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT", "TIMING-OUT"];

/**
 * Lanza un run. `waitForFinish=55` deja que Apify espere por nosotros: los
 * scrapes cortos (un perfil) terminan ahí mismo y ahorran un sondeo entero.
 * `maxTotalChargeUsd` es el techo que aplica la propia plataforma — el segundo
 * techo, el nuestro, es `budget_usd` de la corrida.
 */
export async function lanzarRun(actor: string, input: Json, topeUsd: number): Promise<RunApify> {
  const url = new URL(`${APIFY_API}/acts/${actor}/runs`);
  url.searchParams.set("token", APIFY_TOKEN);
  url.searchParams.set("waitForFinish", "55");
  url.searchParams.set("maxTotalChargeUsd", topeUsd.toFixed(2));

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(70_000),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Apify ${actor} respondió ${res.status}: ${JSON.stringify(payload).slice(0, 300)}`,
    );
  }
  return leerRunPayload(payload as Json);
}

export async function leerRun(runId: string): Promise<RunApify> {
  const res = await fetch(`${APIFY_API}/actor-runs/${runId}?token=${APIFY_TOKEN}`, {
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Apify run ${runId} respondió ${res.status}`);
  return leerRunPayload(payload as Json);
}

/**
 * Lee un dataset por bloques con los campos proyectados. Se llama también
 * cuando el run terminó en FAILED: un run caído casi siempre deja dataset
 * parcial válido, y rescatarlo es gratis frente a re-scrapear.
 */
export async function leerDataset(
  datasetId: string,
  fields: string,
  maxItems: number,
): Promise<Json[]> {
  const items: Json[] = [];
  for (let offset = 0; offset < maxItems; offset += BLOQUE_DATASET) {
    const url = new URL(`${APIFY_API}/datasets/${datasetId}/items`);
    url.searchParams.set("token", APIFY_TOKEN);
    if (fields) url.searchParams.set("fields", fields);
    url.searchParams.set("clean", "true");
    url.searchParams.set("limit", String(Math.min(BLOQUE_DATASET, maxItems - offset)));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) break;

    const bloque = (await res.json().catch(() => [])) as Json[];
    if (!Array.isArray(bloque) || bloque.length === 0) break;

    items.push(...bloque);
    if (bloque.length < BLOQUE_DATASET) break;
  }
  return items;
}

// ---------------------------------------------------------------------------
// Handles: del texto que escribió el cliente a algo scrapeable
// ---------------------------------------------------------------------------
export type Plataforma = "instagram" | "tiktok" | "desconocido";

export interface Handle {
  plataforma: Plataforma;
  usuario: string;
  original: string;
}

/**
 * El cliente escribe de todo: "@marca", "instagram.com/marca/", "Marca Bonita".
 * Lo que no se resuelve a una cuenta NO se inventa: se marca 'desconocido' y
 * pasa a la etapa B, que es la que sabe buscar.
 */
export function normalizarHandle(valor: string, sugerida?: Plataforma): Handle | null {
  const bruto = (valor ?? "").trim();
  if (!bruto) return null;

  const original = bruto;
  const urlMatch = bruto.match(
    /(?:https?:\/\/)?(?:www\.)?(instagram|tiktok)\.com\/@?([A-Za-z0-9._-]+)/i,
  );
  if (urlMatch) {
    return {
      plataforma: urlMatch[1].toLowerCase() === "tiktok" ? "tiktok" : "instagram",
      usuario: urlMatch[2].replace(/\/+$/, ""),
      original,
    };
  }

  const texto = bruto.replace(/^@/, "").trim();

  // Un nombre con espacios o acentos es una marca, no un handle.
  if (!/^[A-Za-z0-9._-]+$/.test(texto)) {
    return { plataforma: "desconocido", usuario: texto, original };
  }
  return { plataforma: sugerida ?? "instagram", usuario: texto, original };
}

// ---------------------------------------------------------------------------
// Posts normalizados (IG y TikTok hablan idiomas distintos)
// ---------------------------------------------------------------------------
export interface PostNormalizado {
  plataforma: "instagram" | "tiktok";
  id: string;
  url: string;
  texto: string;
  likes: number;
  comentarios: number;
  vistas: number;
  duracion: number | null;
  publicado_en: string | null;
  fijado: boolean;
  handle: string;
  origen: "own" | "competitor" | "niche";
}

export const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export type Origen = PostNormalizado["origen"];

export function normalizarPostIg(item: Json, handle: string, origen: Origen): PostNormalizado {
  return {
    plataforma: "instagram",
    id: String(item.id ?? item.shortCode ?? ""),
    url: String(
      item.url ?? (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : ""),
    ),
    texto: String(item.caption ?? "").slice(0, 2000),
    likes: num(item.likesCount),
    comentarios: num(item.commentsCount),
    // El actor trae uno u otro contador de reproducciones según el tipo.
    vistas: Math.max(num(item.videoPlayCount), num(item.videoViewCount)),
    duracion: num(item.videoDuration) || null,
    publicado_en: item.timestamp ? String(item.timestamp) : null,
    fijado: item.isPinned === true,
    handle: String(item.ownerUsername ?? handle).toLowerCase(),
    origen,
  };
}

export function normalizarPostTiktok(item: Json, handle: string, origen: Origen): PostNormalizado {
  const autor = (item.authorMeta ?? {}) as Json;
  const video = (item.videoMeta ?? {}) as Json;
  return {
    plataforma: "tiktok",
    id: String(item.id ?? ""),
    url: String(item.webVideoUrl ?? ""),
    texto: String(item.text ?? "").slice(0, 2000),
    likes: num(item.diggCount),
    comentarios: num(item.commentCount),
    vistas: num(item.playCount),
    duracion: num(video.duration) || null,
    publicado_en: item.createTimeISO ? String(item.createTimeISO) : null,
    fijado: item.isPinned === true,
    handle: String(autor.name ?? handle).toLowerCase(),
    origen,
  };
}

/** Seguidores de la cuenta: en TikTok viajan dentro de cada video. */
export function seguidoresTiktok(items: Json[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  for (const item of items) {
    const autor = (item.authorMeta ?? {}) as Json;
    const nombre = String(autor.name ?? "").toLowerCase();
    const fans = num(autor.fans);
    if (nombre && fans > 0) mapa[nombre] = fans;
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// ETAPA E — Ranking de viralidad REAL (determinístico, sin IA)
//
//   score = (vistas / seguidores)      viralidad RELATIVA, no bruta
//         × (1 + comentarios/likes)     conversación = conexión
//         × recencia (1.0 <60d · 0.7 <180d · 0.4 resto)
//         × 1.2 si el autor lo fijó     él sabe cuál es su ganador
//
// 200 K vistas en una cuenta de 40 K vale más que 500 K en una de 2 M. Por eso
// el denominador son los seguidores de LA CUENTA, no un promedio global.
// ---------------------------------------------------------------------------
export function factorRecencia(publicadoEn: string | null): number {
  if (!publicadoEn) return 0.4;
  const dias = (Date.now() - new Date(publicadoEn).getTime()) / 86_400_000;
  if (!Number.isFinite(dias) || dias < 0) return 0.4;
  if (dias < 60) return 1.0;
  if (dias < 180) return 0.7;
  return 0.4;
}

export interface PostRankeado extends PostNormalizado {
  seguidores: number;
  score: number;
  ratio_comentarios: number;
}

export function rankear(
  posts: PostNormalizado[],
  seguidoresPorHandle: Record<string, number>,
): PostRankeado[] {
  const rankeados: PostRankeado[] = [];

  for (const post of posts) {
    const seguidores = seguidoresPorHandle[post.handle.toLowerCase()] ?? 0;
    // Sin seguidores o sin vistas no hay viralidad relativa que medir. El post
    // sigue guardado en `result`, pero fuera del ranking: mejor un ranking
    // corto y honesto que uno inflado con ceros.
    if (seguidores <= 0 || post.vistas <= 0) continue;

    const ratio = post.comentarios / Math.max(post.likes, 1);
    const score = (post.vistas / seguidores) *
      (1 + ratio) *
      factorRecencia(post.publicado_en) *
      (post.fijado ? 1.2 : 1);

    rankeados.push({
      ...post,
      seguidores,
      ratio_comentarios: Number(ratio.toFixed(4)),
      score: Number(score.toFixed(4)),
    });
  }

  return rankeados.sort((a, b) => b.score - a.score);
}

/**
 * Ratio comentarios/likes ≥ 30 % delata comment-gating (ManyChat y compañía).
 * Es un dato de estrategia, no de contenido: se marca, no se descarta.
 */
export function detectarGating(rankeados: PostRankeado[]): string[] {
  const porCuenta: Record<string, { alto: number; total: number }> = {};
  for (const p of rankeados) {
    const k = p.handle.toLowerCase();
    porCuenta[k] ??= { alto: 0, total: 0 };
    porCuenta[k].total += 1;
    if (p.ratio_comentarios >= 0.3) porCuenta[k].alto += 1;
  }
  return Object.entries(porCuenta)
    .filter(([, v]) => v.total >= 3 && v.alto / v.total >= 0.3)
    .map(([handle]) => handle);
}

// ---------------------------------------------------------------------------
// ETAPA D — Ads de la biblioteca de Meta
//
// La señal reina no es el texto del anuncio: son los DÍAS CORRIENDO. Nadie
// paga un mes de pauta por un anuncio que no vende, así que 30+ días es un
// ganador comprobado y ese es el ranking.
// ---------------------------------------------------------------------------
export interface AdNormalizado {
  id: string;
  pagina: string;
  texto: string;
  titulo: string | null;
  url: string;
  activo: boolean;
  inicio: string | null;
  dias_corriendo: number;
  plataformas: string[];
}

export function normalizarAd(item: Json): AdNormalizado {
  const snapshot = (item.snapshot ?? {}) as Json;
  const cuerpo = (snapshot.body ?? {}) as Json;

  const inicioCrudo = item.startDateFormatted ?? item.startDate ?? null;
  let inicio: string | null = null;
  if (typeof inicioCrudo === "number") inicio = new Date(inicioCrudo * 1000).toISOString();
  else if (inicioCrudo) inicio = String(inicioCrudo);

  const dias = inicio
    ? Math.max(0, Math.floor((Date.now() - new Date(inicio).getTime()) / 86_400_000))
    : 0;

  const plataformas = Array.isArray(item.publisherPlatform)
    ? item.publisherPlatform.map(String)
    : item.publisherPlatform
    ? [String(item.publisherPlatform)]
    : [];

  return {
    id: String(item.adArchiveId ?? ""),
    pagina: String(item.pageName ?? ""),
    texto: String(cuerpo.text ?? snapshot.caption ?? "").slice(0, 1500),
    titulo: snapshot.title ? String(snapshot.title) : null,
    url: String(
      item.adUrl ??
        (item.adArchiveId ? `https://www.facebook.com/ads/library/?id=${item.adArchiveId}` : ""),
    ),
    activo: item.isActive !== false,
    inicio,
    dias_corriendo: Number.isFinite(dias) ? dias : 0,
    plataformas,
  };
}

/** URL de la biblioteca de Meta por palabra clave y país. */
export function urlBibliotecaMeta(termino: string, pais: string): string {
  const params = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country: pais,
    q: termino,
    search_type: "keyword_unordered",
    media_type: "all",
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

/**
 * ISO-2 del país. El onboarding recoge texto libre ("Colombia", "co", "México")
 * y la biblioteca de Meta exige el código. Lo que no esté en la tabla cae a
 * "ALL": buscar en todo el mundo da un resultado peor, pero honesto — mejor
 * que inventar un país.
 */
const PAISES: Record<string, string> = {
  colombia: "CO",
  mexico: "MX",
  méxico: "MX",
  argentina: "AR",
  chile: "CL",
  peru: "PE",
  perú: "PE",
  ecuador: "EC",
  "estados unidos": "US",
  usa: "US",
  eeuu: "US",
  españa: "ES",
  espana: "ES",
  guatemala: "GT",
  "costa rica": "CR",
  panama: "PA",
  panamá: "PA",
  uruguay: "UY",
  paraguay: "PY",
  bolivia: "BO",
  venezuela: "VE",
  "republica dominicana": "DO",
  "república dominicana": "DO",
  honduras: "HN",
  "el salvador": "SV",
  nicaragua: "NI",
  "puerto rico": "PR",
  brasil: "BR",
};

export function codigoPais(pais: string | null): string {
  const limpio = (pais ?? "").trim().toLowerCase();
  if (!limpio) return "ALL";
  if (/^[a-z]{2}$/.test(limpio)) return limpio.toUpperCase();
  return PAISES[limpio] ?? "ALL";
}
