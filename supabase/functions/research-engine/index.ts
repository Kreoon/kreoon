// ============================================================================
// KREOON — research-engine · Motor de investigación real (Apify)
//
// Spec: docs/MOTOR_INTELIGENCIA.md · PROMPT R1, TANDA 1 (etapas A / C / E).
//
// Qué hace hoy:
//   A · Línea base propia   — perfil + últimos posts de IG y TikTok del cliente
//   C · Competidores dados  — mismos scrapes para los que el cliente escribió
//   E · Ranking de viralidad — determinístico, EN CÓDIGO. La IA no rankea.
//
// Qué NO hace todavía (tanda 2): B descubrimiento de competidores, D ads de la
// biblioteca de Meta, F transcripción del top, G síntesis de los 4 ADNs.
// Los huecos quedan marcados como 'skipped' en `stage`, no fingidos.
//
// ── Cómo corre sin morir por timeout ──────────────────────────────────────
// Un scrape de Apify tarda minutos; una edge function no vive tanto. Igual que
// `pipeline-orchestrator` y `generate-full-research`, esto avanza por
// eslabones: cada invocación trabaja ~100 s y, si queda faena, se auto-invoca
// con el service role. Cada paso es idempotente (el estado vive en
// `research_runs.stage`), así que un eslabón repetido no duplica trabajo ni
// gasto.
//
// ── Dinero ────────────────────────────────────────────────────────────────
// Techo doble: `maxTotalChargeUsd` por run de Apify (lo corta la plataforma) y
// `budget_usd` por corrida (lo cortamos nosotros). Al llegar al techo la
// corrida termina en 'partial' con lo que alcanzó. Nunca gasto sin techo.
//
// ── Seguridad ─────────────────────────────────────────────────────────────
// verify_jwt = false porque se auto-invoca y la llama el orquestador con el
// service role. Por eso valida por dentro: con JWT de usuario exige ser staff
// de la organización (patrón `assertOrgMembership`); `tick` solo se acepta con
// el service key exacto, para que nadie monte una cadena de gasto desde fuera.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { assertOrgMembership } from "../_shared/assertOrgMembership.ts";

// deno-lint-ignore no-explicit-any
type Sb = any;
// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN") ?? "";

const APIFY_API = "https://api.apify.com/v2";

/** Roles que cuentan como staff (mismos que client_onboarding_forms). */
const ROLES_STAFF = [
  "admin",
  "team_leader",
  "strategist",
  "digital_strategist",
  "creative_strategist",
];

/** Techo de gasto por corrida si nadie pide otro. */
const PRESUPUESTO_DEFAULT = 6;

/** Competidores máximos a scrapear en una corrida (spec: 5 finales). */
const MAX_COMPETIDORES = 5;

/** Posts por cuenta. El spec pide 30; más no mejora el ranking y sí el costo. */
const POSTS_POR_CUENTA = 30;

/** Bloques de lectura del dataset. Leer de golpe dispara el rate limit. */
const BLOQUE_DATASET = 15;

/** Trabajo máximo dentro de una invocación antes de encadenar la siguiente. */
const MS_POR_ESLABON = 100_000;

/** Techo de eslabones: ~30 × (100 s + esperas) ≈ 1 h. Pasado eso, 'partial'. */
const MAX_CICLOS = 30;

/** Espera entre sondeos del mismo run de Apify. */
const ESPERA_SONDEO_MS = 12_000;

const ahora = () => new Date().toISOString();
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Actores de Apify (verificados en el Store, ver docs/MOTOR_INTELIGENCIA.md §4)
// El id va con `~` en la URL: `apify/instagram-scraper` → `apify~instagram-scraper`.
// ---------------------------------------------------------------------------
const ACTORES = {
  ig_profile: "apify~instagram-profile-scraper",
  ig_posts: "apify~instagram-scraper",
  tiktok: "clockworks~tiktok-profile-scraper",
} as const;

/**
 * Proyección de campos. Un item completo de estos actores pesa ~20 KB; sin
 * `fields` una corrida de 6 cuentas se come la memoria de la función.
 * `fields` solo recorta el primer nivel, por eso `authorMeta` y `videoMeta`
 * (TikTok) se piden enteros: los datos que necesitamos viven dentro.
 */
const CAMPOS = {
  ig_profile:
    "username,fullName,biography,followersCount,followsCount,postsCount,verified,externalUrl,businessCategoryName,relatedProfiles,profilePicUrlHD",
  ig_posts:
    "id,shortCode,url,type,caption,hashtags,commentsCount,likesCount,videoViewCount,videoPlayCount,videoDuration,timestamp,isPinned,ownerUsername",
  tiktok:
    "id,text,createTimeISO,authorMeta,videoMeta,diggCount,shareCount,playCount,commentCount,webVideoUrl,isPinned",
} as const;

type TipoJob = "ig_profile" | "ig_posts" | "tiktok";
type EstadoJob = "pending" | "running" | "done" | "error";

interface Job {
  key: string;
  tipo: TipoJob;
  /** 'own' = línea base del cliente (etapa A) · 'competitor' = etapa C. */
  origen: "own" | "competitor";
  handle: string;
  estado: EstadoJob;
  apify_run_id?: string;
  cost_usd?: number;
  error?: string;
  items?: number;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

/** Dispara el siguiente eslabón sin esperar respuesta. */
function encadenar(runId: string, ciclo: number): void {
  fetch(`${SUPABASE_URL}/functions/v1/research-engine`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ action: "tick", run_id: runId, auto: true, ciclo }),
  }).catch((err) => console.error("[research] encadenado falló:", err));
}

// ---------------------------------------------------------------------------
// Cliente Apify (REST directo — sin SDK: en Deno pesa más de lo que ahorra)
// ---------------------------------------------------------------------------
interface RunApify {
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

/**
 * Lanza un run. `waitForFinish=55` deja que Apify espere por nosotros: los
 * scrapes cortos (un perfil) terminan aquí mismo y ahorran un sondeo entero.
 * `maxTotalChargeUsd` es el techo que aplica la propia plataforma.
 */
async function lanzarRun(
  actor: string,
  input: Json,
  topeUsd: number,
): Promise<RunApify> {
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

async function leerRun(runId: string): Promise<RunApify> {
  const url = `${APIFY_API}/actor-runs/${runId}?token=${APIFY_TOKEN}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Apify run ${runId} respondió ${res.status}`);
  }
  return leerRunPayload(payload as Json);
}

/**
 * Lee un dataset por bloques con los campos proyectados. Un run "fallido"
 * suele dejar dataset válido, así que esto se llama igual y se queda con lo
 * que haya: rescatar es más barato que re-scrapear.
 */
async function leerDataset(
  datasetId: string,
  fields: string,
  maxItems: number,
): Promise<Json[]> {
  const items: Json[] = [];
  for (let offset = 0; offset < maxItems; offset += BLOQUE_DATASET) {
    const url = new URL(`${APIFY_API}/datasets/${datasetId}/items`);
    url.searchParams.set("token", APIFY_TOKEN);
    url.searchParams.set("fields", fields);
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
type Plataforma = "instagram" | "tiktok" | "desconocido";

interface Handle {
  plataforma: Plataforma;
  usuario: string;
  original: string;
}

/**
 * El cliente escribe de todo: "@marca", "instagram.com/marca/", "Marca Bonita".
 * Lo que no se puede resolver a una cuenta NO se inventa: se devuelve
 * 'desconocido' y queda anotado como pendiente de la etapa B (tanda 2).
 */
function normalizarHandle(valor: string, plataformaSugerida?: Plataforma): Handle | null {
  const bruto = (valor ?? "").trim();
  if (!bruto) return null;

  const original = bruto;
  let texto = bruto;

  const urlMatch = texto.match(
    /(?:https?:\/\/)?(?:www\.)?(instagram|tiktok)\.com\/@?([A-Za-z0-9._-]+)/i,
  );
  if (urlMatch) {
    return {
      plataforma: urlMatch[1].toLowerCase() === "tiktok" ? "tiktok" : "instagram",
      usuario: urlMatch[2].replace(/\/+$/, ""),
      original,
    };
  }

  texto = texto.replace(/^@/, "").trim();

  // Un nombre con espacios o acentos es una marca, no un handle.
  if (!/^[A-Za-z0-9._-]+$/.test(texto)) {
    return { plataforma: "desconocido", usuario: texto, original };
  }

  return { plataforma: plataformaSugerida ?? "instagram", usuario: texto, original };
}

// ---------------------------------------------------------------------------
// Normalización de posts (IG y TikTok hablan idiomas distintos)
// ---------------------------------------------------------------------------
interface PostNormalizado {
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
  origen: "own" | "competitor";
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function normalizarPostIg(item: Json, handle: string, origen: "own" | "competitor"): PostNormalizado {
  return {
    plataforma: "instagram",
    id: String(item.id ?? item.shortCode ?? ""),
    url: String(item.url ?? (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : "")),
    texto: String(item.caption ?? "").slice(0, 2000),
    likes: num(item.likesCount),
    comentarios: num(item.commentsCount),
    // El actor a veces trae uno u otro contador de reproducciones.
    vistas: Math.max(num(item.videoPlayCount), num(item.videoViewCount)),
    duracion: num(item.videoDuration) || null,
    publicado_en: item.timestamp ? String(item.timestamp) : null,
    fijado: item.isPinned === true,
    handle: String(item.ownerUsername ?? handle),
    origen,
  };
}

function normalizarPostTiktok(item: Json, handle: string, origen: "own" | "competitor"): PostNormalizado {
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
    handle: String(autor.name ?? handle),
    origen,
  };
}

/** Seguidores de la cuenta: en TikTok viajan dentro de cada video. */
function seguidoresTiktok(items: Json[]): number {
  for (const item of items) {
    const fans = num((item.authorMeta ?? {}).fans);
    if (fans > 0) return fans;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// ETAPA E — Ranking de viralidad REAL (determinístico, sin IA)
//
//   score = (vistas / seguidores)          viralidad RELATIVA, no bruta
//         × (1 + comentarios/likes)         conversación = conexión
//         × recencia (1.0 <60d · 0.7 <180d · 0.4 resto)
//         × 1.2 si el autor lo fijó         él sabe cuál es su ganador
//
// 200 K vistas en una cuenta de 40 K vale más que 500 K en una de 2 M. Por eso
// el denominador son los seguidores de LA CUENTA, no un promedio global.
// ---------------------------------------------------------------------------
function factorRecencia(publicadoEn: string | null): number {
  if (!publicadoEn) return 0.4;
  const dias = (Date.now() - new Date(publicadoEn).getTime()) / 86_400_000;
  if (!Number.isFinite(dias) || dias < 0) return 0.4;
  if (dias < 60) return 1.0;
  if (dias < 180) return 0.7;
  return 0.4;
}

interface PostRankeado extends PostNormalizado {
  seguidores: number;
  score: number;
  ratio_comentarios: number;
}

function rankear(
  posts: PostNormalizado[],
  seguidoresPorHandle: Record<string, number>,
): PostRankeado[] {
  const rankeados: PostRankeado[] = [];

  for (const post of posts) {
    const seguidores = seguidoresPorHandle[post.handle.toLowerCase()] ?? 0;
    // Sin seguidores o sin vistas no hay viralidad relativa que medir. Se
    // conserva el post en `result`, pero fuera del ranking: mejor un ranking
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
function detectarGating(rankeados: PostRankeado[]): string[] {
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
// Construcción del plan de trabajo a partir del onboarding
// ---------------------------------------------------------------------------
interface PlanInicial {
  jobs: Job[];
  niche: string | null;
  country: string | null;
  sinResolver: string[];
}

function construirPlan(formData: Json, competidoresExtra: string[]): PlanInicial {
  const marca = (formData.marca ?? {}) as Json;
  const producto = (formData.producto ?? {}) as Json;
  const audiencia = (producto.audiencia ?? {}) as Json;

  const jobs: Job[] = [];
  const sinResolver: string[] = [];

  // ── Etapa A · línea base propia ──
  const propioIg = normalizarHandle(String(marca.instagram ?? ""), "instagram");
  if (propioIg && propioIg.plataforma === "instagram") {
    jobs.push({ key: "A_ig_profile", tipo: "ig_profile", origen: "own", handle: propioIg.usuario, estado: "pending" });
    jobs.push({ key: "A_ig_posts", tipo: "ig_posts", origen: "own", handle: propioIg.usuario, estado: "pending" });
  }

  const propioTt = normalizarHandle(String(marca.tiktok ?? ""), "tiktok");
  if (propioTt && propioTt.plataforma !== "desconocido") {
    jobs.push({ key: "A_tiktok", tipo: "tiktok", origen: "own", handle: propioTt.usuario, estado: "pending" });
  }

  // ── Etapa C · competidores que el cliente sí dio ──
  const brutos = [
    ...(Array.isArray(marca.competidores) ? marca.competidores : []),
    ...competidoresExtra,
  ].map((c) => String(c ?? "").trim()).filter(Boolean);

  const vistos = new Set<string>();
  let cuenta = 0;

  for (const bruto of brutos) {
    if (cuenta >= MAX_COMPETIDORES) break;
    const h = normalizarHandle(bruto);
    if (!h) continue;

    if (h.plataforma === "desconocido") {
      // Nombre de marca sin cuenta: lo resuelve la etapa B (tanda 2).
      sinResolver.push(h.original);
      continue;
    }

    const clave = `${h.plataforma}:${h.usuario.toLowerCase()}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    cuenta += 1;

    if (h.plataforma === "instagram") {
      jobs.push({ key: `C${cuenta}_ig_profile`, tipo: "ig_profile", origen: "competitor", handle: h.usuario, estado: "pending" });
      jobs.push({ key: `C${cuenta}_ig_posts`, tipo: "ig_posts", origen: "competitor", handle: h.usuario, estado: "pending" });
    } else {
      jobs.push({ key: `C${cuenta}_tiktok`, tipo: "tiktok", origen: "competitor", handle: h.usuario, estado: "pending" });
    }
  }

  // El nicho todavía no es un campo del onboarding (lo será en el Onboarding
  // 2.0). Hasta entonces se deriva de lo que el cliente ya escribió; si no da
  // para nada, queda null y `niche_intelligence` no se toca — antes eso que
  // envenenar la caché de nicho con una etiqueta inventada.
  const niche = String(
    producto.categoria ?? marca.nicho ?? producto.tipo_oferta ?? "",
  ).trim().toLowerCase() || null;

  const country = String(audiencia.pais ?? "").trim() || null;

  return { jobs, niche, country, sinResolver };
}

function inputDeJob(job: Job): Json {
  switch (job.tipo) {
    case "ig_profile":
      return { usernames: [job.handle] };
    case "ig_posts":
      return {
        directUrls: [`https://www.instagram.com/${job.handle}/`],
        resultsType: "posts",
        resultsLimit: POSTS_POR_CUENTA,
        addParentData: false,
      };
    case "tiktok":
      return {
        profiles: [job.handle],
        resultsPerPage: POSTS_POR_CUENTA,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSubtitles: false,
        shouldDownloadSlideshowImages: false,
      };
  }
}

// ---------------------------------------------------------------------------
// Persistencia del run
// ---------------------------------------------------------------------------
async function guardarRun(admin: Sb, runId: string, cambios: Json): Promise<Json> {
  const { data, error } = await admin
    .from("research_runs")
    .update(cambios)
    .eq("id", runId)
    .select("*")
    .single();
  if (error) throw new Error(`No se pudo guardar el run: ${error.message}`);
  return data as Json;
}

function anotarEtapa(stage: Json, etapa: string, cambios: Json): Json {
  const actual = (stage[etapa] ?? {}) as Json;
  return { ...stage, [etapa]: { ...actual, ...cambios } };
}

// ---------------------------------------------------------------------------
// Cosecha de un job terminado
// ---------------------------------------------------------------------------
function acumularResultado(result: Json, job: Job, items: Json[]): Json {
  const salida: Json = {
    own: result.own ?? { perfiles: [], posts: [] },
    competitors: result.competitors ?? { perfiles: [], posts: [] },
    followers: result.followers ?? {},
  };
  const cubo = job.origen === "own" ? salida.own : salida.competitors;

  if (job.tipo === "ig_profile") {
    for (const item of items) {
      const handle = String(item.username ?? job.handle).toLowerCase();
      salida.followers[handle] = num(item.followersCount);
      cubo.perfiles.push({
        plataforma: "instagram",
        handle,
        nombre: item.fullName ?? null,
        bio: item.biography ?? null,
        seguidores: num(item.followersCount),
        siguiendo: num(item.followsCount),
        publicaciones: num(item.postsCount),
        verificado: item.verified === true,
        web: item.externalUrl ?? null,
        categoria: item.businessCategoryName ?? null,
        // Semilla gratis para la etapa B (descubrimiento) de la tanda 2:
        // Instagram entrega los pares del nicho sin cobrar por ello.
        perfiles_relacionados: Array.isArray(item.relatedProfiles)
          ? item.relatedProfiles.slice(0, 20).map((p: Json) => p?.username ?? p).filter(Boolean)
          : [],
      });
    }
  } else if (job.tipo === "ig_posts") {
    for (const item of items) cubo.posts.push(normalizarPostIg(item, job.handle, job.origen));
  } else {
    const fans = seguidoresTiktok(items);
    if (fans > 0) salida.followers[job.handle.toLowerCase()] = fans;
    const primero = (items[0]?.authorMeta ?? {}) as Json;
    cubo.perfiles.push({
      plataforma: "tiktok",
      handle: job.handle.toLowerCase(),
      nombre: primero.nickName ?? null,
      bio: primero.signature ?? null,
      seguidores: fans,
      verificado: primero.verified === true,
      publicaciones: num(primero.video),
    });
    for (const item of items) cubo.posts.push(normalizarPostTiktok(item, job.handle, job.origen));
  }

  return salida;
}

// ---------------------------------------------------------------------------
// El eslabón: avanza la corrida ~100 s y encadena si queda faena
// ---------------------------------------------------------------------------
async function avanzar(admin: Sb, runId: string, ciclo: number): Promise<Json> {
  const arranque = Date.now();

  const { data: runInicial, error } = await admin
    .from("research_runs").select("*").eq("id", runId).single();
  if (error || !runInicial) throw new Error(`Run ${runId} no existe`);

  let run = runInicial as Json;
  if (run.status === "done" || run.status === "error" || run.status === "partial") return run;

  if (ciclo > MAX_CICLOS) {
    return await cerrar(admin, run, "partial", "Se alcanzó el techo de eslabones");
  }

  let jobs = ((run.stage?.jobs ?? []) as Job[]).map((j) => ({ ...j }));
  let apifyRunIds = (run.apify_run_ids ?? {}) as Json;
  let result = (run.result ?? {}) as Json;
  let costo = Number(run.cost_usd ?? 0);
  const presupuesto = Number(run.budget_usd ?? PRESUPUESTO_DEFAULT);
  const errores = ((run.error_log ?? []) as Json[]).slice(-49);

  while (Date.now() - arranque < MS_POR_ESLABON) {
    if (costo >= presupuesto) {
      run = await guardarRun(admin, runId, {
        stage: anotarEtapa(run.stage ?? {}, "jobs_meta", { detenido_por_presupuesto: true }),
        cost_usd: costo,
      });
      return await cerrar(admin, run, "partial", `Techo de presupuesto ($${presupuesto}) alcanzado`);
    }

    const job = jobs.find((j) => j.estado === "pending" || j.estado === "running");
    if (!job) break;

    try {
      // ── Lanzar ──
      if (job.estado === "pending") {
        const restante = Math.max(presupuesto - costo, 0.05);
        const runApify = await lanzarRun(ACTORES[job.tipo], inputDeJob(job), restante);
        job.apify_run_id = runApify.id;
        job.estado = "running";
        apifyRunIds = { ...apifyRunIds, [job.key]: runApify.id };
        await guardarRun(admin, runId, {
          stage: { ...(run.stage ?? {}), jobs },
          apify_run_ids: apifyRunIds,
        });

        if (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(runApify.status)) {
          await dormir(ESPERA_SONDEO_MS);
          continue;
        }
      }

      // ── Sondear ──
      const estadoApify = await leerRun(job.apify_run_id!);

      if (estadoApify.status === "RUNNING" || estadoApify.status === "READY") {
        await dormir(ESPERA_SONDEO_MS);
        continue;
      }

      // ── Cosechar ── (también en FAILED: un run caído suele dejar dataset útil)
      costo += estadoApify.usageTotalUsd ?? 0;
      job.cost_usd = estadoApify.usageTotalUsd ?? 0;

      const items = estadoApify.defaultDatasetId
        ? await leerDataset(
          estadoApify.defaultDatasetId,
          CAMPOS[job.tipo],
          job.tipo === "ig_profile" ? BLOQUE_DATASET : POSTS_POR_CUENTA * 2,
        )
        : [];

      job.items = items.length;

      if (items.length === 0) {
        job.estado = "error";
        job.error = `Apify terminó en ${estadoApify.status} sin items`;
        errores.push({ at: ahora(), job: job.key, error: job.error });
      } else {
        result = acumularResultado(result, job, items);
        job.estado = "done";
      }

      run = await guardarRun(admin, runId, {
        stage: { ...(run.stage ?? {}), jobs },
        apify_run_ids: apifyRunIds,
        result,
        cost_usd: costo,
        error_log: errores,
      });
    } catch (e) {
      job.estado = "error";
      job.error = (e as Error).message.slice(0, 400);
      errores.push({ at: ahora(), job: job.key, error: job.error });
      run = await guardarRun(admin, runId, {
        stage: { ...(run.stage ?? {}), jobs },
        error_log: errores,
        cost_usd: costo,
      });
    }
  }

  jobs = ((run.stage?.jobs ?? jobs) as Job[]);
  const quedaFaena = jobs.some((j) => j.estado === "pending" || j.estado === "running");

  if (quedaFaena) {
    encadenar(runId, ciclo + 1);
    return run;
  }

  // ── Etapa E · ranking (no cuesta un centavo: es aritmética) ──
  const propios = (result.own?.posts ?? []) as PostNormalizado[];
  const rivales = (result.competitors?.posts ?? []) as PostNormalizado[];
  const rankeados = rankear([...propios, ...rivales], (result.followers ?? {}) as Record<string, number>);
  const top = rankeados.slice(0, 15);

  result = {
    ...result,
    ranking: rankeados.slice(0, 60),
    top: top.map((p) => ({ plataforma: p.plataforma, url: p.url, handle: p.handle, score: p.score })),
    gating_detectado: detectarGating(rankeados),
  };

  const conError = jobs.filter((j) => j.estado === "error");
  const estadoFinal = conError.length === jobs.length && jobs.length > 0
    ? "error"
    : conError.length > 0
    ? "partial"
    : "done";

  const stageFinal = anotarEtapa(
    anotarEtapa(
      anotarEtapa({ ...(run.stage ?? {}), jobs }, "A", {
        status: jobs.some((j) => j.origen === "own" && j.estado === "done") ? "done" : "error",
      }),
      "C",
      { status: jobs.some((j) => j.origen === "competitor" && j.estado === "done") ? "done" : "skipped" },
    ),
    "E",
    { status: "done", finished_at: ahora(), posts_rankeados: rankeados.length, top: top.length },
  );

  // Las etapas de la tanda 2 se declaran saltadas, no ausentes: quien lea el
  // run tiene que ver que este ADN todavía no vio ads ni transcripciones.
  const stageConHuecos = ["B", "D", "F", "G"].reduce(
    (acc, etapa) => anotarEtapa(acc, etapa, { status: "skipped", motivo: "tanda 2" }),
    stageFinal,
  );

  return await guardarRun(admin, runId, {
    stage: stageConHuecos,
    result,
    cost_usd: costo,
    status: estadoFinal,
    finished_at: ahora(),
  });
}

async function cerrar(admin: Sb, run: Json, status: string, motivo: string): Promise<Json> {
  const errores = ((run.error_log ?? []) as Json[]).slice(-49);
  errores.push({ at: ahora(), error: motivo });
  return await guardarRun(admin, run.id, {
    status,
    finished_at: ahora(),
    error_log: errores,
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  const preflight = handleCorsOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return json(req, { error: "method not allowed" }, 405);

  let body: Json;
  try {
    body = (await req.json()) as Json;
  } catch {
    return json(req, { error: "body inválido" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const esServicio = token === SERVICE_KEY;
  const action = String(body.action ?? "");

  // ── tick: solo la cadena interna ──
  if (action === "tick") {
    if (!esServicio) return json(req, { error: "forbidden" }, 403);
    const runId = String(body.run_id ?? "");
    if (!runId) return json(req, { error: "run_id es obligatorio" }, 400);
    try {
      const run = await avanzar(admin, runId, Number(body.ciclo ?? 0));
      return json(req, { ok: true, run_id: runId, status: run.status });
    } catch (e) {
      console.error("[research] tick falló:", e);
      return json(req, { error: (e as Error).message }, 500);
    }
  }

  // ── start / status: staff de la organización (o service role) ──
  const clientId = String(body.client_id ?? "");
  const runIdPedido = String(body.run_id ?? "");

  if (!esServicio) {
    if (!token) return json(req, { error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json(req, { error: "unauthorized" }, 401);

    // La organización sale del dato, nunca del body: un organization_id de
    // regalo en el body es justo el IDOR que cerró la auditoría de julio.
    const fuente = runIdPedido
      ? await admin.from("research_runs").select("organization_id").eq("id", runIdPedido).maybeSingle()
      : await admin.from("clients").select("organization_id").eq("id", clientId).maybeSingle();

    const organizationId = (fuente.data as Json | null)?.organization_id ?? null;
    if (!organizationId) return json(req, { error: "cliente o corrida no encontrada" }, 404);

    const rechazo = await assertOrgMembership(req, admin, user.id, organizationId);
    if (rechazo) return rechazo;

    const { data: miembro } = await admin
      .from("organization_members").select("role")
      .eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
    if (!miembro || !ROLES_STAFF.includes(String((miembro as Json).role))) {
      return json(req, { error: "forbidden: se requiere staff de la organización" }, 403);
    }
  }

  if (action === "status") {
    const consulta = runIdPedido
      ? admin.from("research_runs").select("*").eq("id", runIdPedido).maybeSingle()
      : admin.from("research_runs").select("*").eq("client_id", clientId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data } = await consulta;
    if (!data) return json(req, { error: "no hay corridas para este cliente" }, 404);
    return json(req, { run: data });
  }

  if (action !== "start") return json(req, { error: `acción desconocida: ${action}` }, 400);

  if (!APIFY_TOKEN) {
    return json(req, { error: "APIFY_TOKEN no está configurado en los secrets" }, 503);
  }
  if (!clientId) return json(req, { error: "client_id es obligatorio" }, 400);

  // ── start ──
  const { data: cliente } = await admin
    .from("clients").select("id, organization_id, name").eq("id", clientId).maybeSingle();
  if (!cliente) return json(req, { error: "cliente no encontrado" }, 404);

  // Una corrida viva por cliente: sin esto, dos clics del equipo pagan dos
  // veces el mismo scrape.
  const { data: viva } = await admin
    .from("research_runs").select("id, status")
    .eq("client_id", clientId).in("status", ["pending", "running"])
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (viva && body.force !== true) {
    return json(req, { run_id: (viva as Json).id, status: (viva as Json).status, reused: true }, 200);
  }

  const { data: formulario } = await admin
    .from("client_onboarding_forms").select("id, form_data")
    .eq("client_id", clientId).in("status", ["submitted", "processed"])
    .order("submitted_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();

  const formData = ((formulario as Json | null)?.form_data ?? {}) as Json;
  const extra = Array.isArray(body.competitors) ? body.competitors.map(String) : [];
  const plan = construirPlan(formData, extra);

  if (plan.jobs.length === 0) {
    return json(req, {
      error: "no hay nada que investigar: el onboarding no trae Instagram, TikTok ni competidores con cuenta",
      sin_resolver: plan.sinResolver,
    }, 422);
  }

  const { data: creado, error: errorCrear } = await admin
    .from("research_runs")
    .insert({
      organization_id: (cliente as Json).organization_id,
      client_id: clientId,
      pipeline_run_id: body.pipeline_run_id ?? null,
      niche: body.niche ?? plan.niche,
      country: body.country ?? plan.country,
      status: "running",
      budget_usd: Number(body.budget_usd ?? PRESUPUESTO_DEFAULT),
      stage: {
        jobs: plan.jobs,
        pendientes_de_descubrimiento: plan.sinResolver,
        A: { status: "running", started_at: ahora() },
        C: { status: plan.jobs.some((j) => j.origen === "competitor") ? "running" : "skipped" },
      },
    })
    .select("*").single();

  if (errorCrear || !creado) {
    return json(req, { error: `no se pudo crear la corrida: ${errorCrear?.message}` }, 500);
  }

  encadenar((creado as Json).id, 0);

  return json(req, {
    run_id: (creado as Json).id,
    status: "running",
    jobs: plan.jobs.length,
    niche: (creado as Json).niche,
    country: (creado as Json).country,
    sin_resolver: plan.sinResolver,
  }, 202);
});
