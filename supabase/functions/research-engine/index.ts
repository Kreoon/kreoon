// ============================================================================
// KREOON — research-engine · Motor de investigación real (Apify + Perplexity)
//
// Spec: docs/MOTOR_INTELIGENCIA.md · PROMPT R1.
//
//   A · Línea base propia    — perfil + últimos posts de IG y TikTok del cliente
//   B · Descubrimiento       — Perplexity + relatedProfiles + búsqueda TikTok
//   C · Competidores         — perfil + posts de los 5 finales
//   D · Ads del gremio       — biblioteca de Meta; la señal es DÍAS CORRIENDO
//   E · Ranking de viralidad — determinístico, EN CÓDIGO. La IA no rankea
//   F · Transcripción        — SOLO el top; nunca el feed completo
//   G · Síntesis             — ADN de Mercado y ADN Viral, con evidencia citada
//
// ── Cómo corre sin morir por timeout ──────────────────────────────────────
// Un scrape tarda minutos; una edge function no vive tanto. Igual que
// `pipeline-orchestrator` y `generate-full-research`, esto avanza por
// eslabones: cada invocación trabaja ~100 s y, si queda faena, se auto-invoca
// con el service role. Todo el estado vive en `research_runs`, así que un
// eslabón repetido no duplica trabajo ni gasto.
//
// ── Dinero ────────────────────────────────────────────────────────────────
// Techo doble: `maxTotalChargeUsd` por run de Apify (lo corta la plataforma) y
// `budget_usd` por corrida (lo cortamos nosotros). Al llegar al techo la
// corrida termina en 'partial' con lo que alcanzó. Nunca gasto sin techo.
//
// ── El activo que se acumula ──────────────────────────────────────────────
// Lo aprendido del nicho (competidores descubiertos, ads y ADN Viral) se
// guarda en `niche_intelligence` por nicho+país. El siguiente cliente del
// mismo nicho se salta las etapas B y D si eso tiene menos de 30 días: cada
// cliente nuevo hace la plataforma más lista y más barata.
//
// ── Seguridad ─────────────────────────────────────────────────────────────
// verify_jwt = false porque se auto-invoca y la llama el orquestador con el
// service role. Por eso valida por dentro: con JWT de usuario exige ser staff
// de la organización; `tick` solo se acepta con el service key exacto, para
// que nadie monte una cadena de gasto desde fuera.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { assertOrgMembership } from "../_shared/assertOrgMembership.ts";
import {
  ACTORES,
  type AdNormalizado,
  CAMPOS,
  codigoPais,
  detectarGating,
  hayToken,
  type Json,
  lanzarRun,
  leerDataset,
  leerRun,
  normalizarAd,
  normalizarHandle,
  normalizarPostIg,
  normalizarPostTiktok,
  num,
  type PostNormalizado,
  type PostRankeado,
  rankear,
  seguidoresTiktok,
  TERMINADO,
  type TipoJob,
  urlBibliotecaMeta,
} from "./apify.ts";
import {
  type Candidato,
  candidatosDesdeBusquedaTiktok,
  consolidar,
  descubrirConPerplexity,
  descubrirDesdeRelacionados,
  inputBusquedaTiktok,
} from "./discovery.ts";
import {
  analizarTranscripcion,
  metricasPorCuenta,
  sintetizarAdnMercado,
  sintetizarAdnViral,
} from "./synthesis.ts";

// deno-lint-ignore no-explicit-any
type Sb = any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/** Roles que cuentan como staff (mismos que client_onboarding_forms). */
const ROLES_STAFF = [
  "admin",
  "team_leader",
  "strategist",
  "digital_strategist",
  "creative_strategist",
];

const PRESUPUESTO_DEFAULT = 6;
const MAX_COMPETIDORES = 5;
const POSTS_POR_CUENTA = 30;
const BLOQUE_DATASET = 15;

/** Top a transcribir. Transcribir el feed entero es como se quema el dinero. */
const TOP_A_TRANSCRIBIR = 12;

/** Anuncios a traer de la biblioteca de Meta por corrida. */
const ADS_POR_CORRIDA = 60;

/** La caché de nicho se considera vigente 30 días. */
const DIAS_CACHE_NICHO = 30;

const MS_POR_ESLABON = 100_000;
const MAX_CICLOS = 40;
const ESPERA_SONDEO_MS = 12_000;

const ahora = () => new Date().toISOString();
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

type EstadoJob = "pending" | "running" | "done" | "error";
type Fase = "base" | "descubrimiento" | "competidores" | "ads" | "ranking" | "transcripcion" | "sintesis" | "fin";

interface Job {
  key: string;
  tipo: TipoJob;
  origen: "own" | "competitor" | "niche";
  handle: string;
  estado: EstadoJob;
  apify_run_id?: string;
  cost_usd?: number;
  error?: string;
  items?: number;
  /** Input ya resuelto para los jobs que no se derivan del handle. */
  input?: Json;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function encadenar(runId: string, ciclo: number): void {
  fetch(`${SUPABASE_URL}/functions/v1/research-engine`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ action: "tick", run_id: runId, auto: true, ciclo }),
  }).catch((err) => console.error("[research] encadenado falló:", err));
}

// ---------------------------------------------------------------------------
// Persistencia
// ---------------------------------------------------------------------------
async function guardarRun(admin: Sb, runId: string, cambios: Json): Promise<Json> {
  const { data, error } = await admin
    .from("research_runs").update(cambios).eq("id", runId).select("*").single();
  if (error) throw new Error(`No se pudo guardar el run: ${error.message}`);
  return data as Json;
}

function anotarEtapa(stage: Json, etapa: string, cambios: Json): Json {
  return { ...stage, [etapa]: { ...((stage[etapa] ?? {}) as Json), ...cambios } };
}

// ---------------------------------------------------------------------------
// Inputs por tipo de job (schemas verificados 2026-08-13)
// ---------------------------------------------------------------------------
function inputDeJob(job: Job): Json {
  if (job.input) return job.input;

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
        profileScrapeSections: ["videos"],
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSlideshowImages: false,
        shouldDownloadAvatars: false,
      };
    default:
      throw new Error(`El job ${job.key} (${job.tipo}) necesita un input explícito`);
  }
}

/** Cuántos items tiene sentido leer de cada dataset. */
function limiteItems(tipo: TipoJob): number {
  if (tipo === "ig_profile") return BLOQUE_DATASET;
  if (tipo === "fb_ads") return ADS_POR_CORRIDA;
  if (tipo === "ig_transcripts") return TOP_A_TRANSCRIBIR * 2;
  return POSTS_POR_CUENTA * 2;
}

// ---------------------------------------------------------------------------
// Cosecha: del dataset crudo al `result` de la corrida
// ---------------------------------------------------------------------------
function cuboDe(result: Json, origen: Job["origen"]): Json {
  if (origen === "own") return result.own;
  if (origen === "competitor") return result.competitors;
  return result.niche;
}

function resultVacio(previo: Json): Json {
  return {
    own: previo.own ?? { perfiles: [], posts: [] },
    competitors: previo.competitors ?? { perfiles: [], posts: [] },
    niche: previo.niche ?? { perfiles: [], posts: [] },
    followers: previo.followers ?? {},
    ads: previo.ads ?? [],
    candidatos: previo.candidatos ?? [],
    transcripciones: previo.transcripciones ?? [],
    analisis: previo.analisis ?? [],
    ranking: previo.ranking ?? [],
    ...previo,
  };
}

function acumular(result: Json, job: Job, items: Json[]): Json {
  const salida = resultVacio(result);
  const cubo = cuboDe(salida, job.origen);

  switch (job.tipo) {
    case "ig_profile": {
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
          // Semilla gratis para la etapa B: Instagram entrega los pares del
          // nicho sin cobrar por ello.
          perfiles_relacionados: Array.isArray(item.relatedProfiles)
            ? item.relatedProfiles.slice(0, 20).map((p: Json) => p?.username ?? p).filter(Boolean)
            : [],
        });
      }
      break;
    }

    case "ig_posts": {
      for (const item of items) cubo.posts.push(normalizarPostIg(item, job.handle, job.origen));
      break;
    }

    case "tiktok": {
      const fans = seguidoresTiktok(items);
      Object.assign(salida.followers, fans);
      const primero = (items[0]?.authorMeta ?? {}) as Json;
      cubo.perfiles.push({
        plataforma: "tiktok",
        handle: job.handle.toLowerCase(),
        nombre: primero.nickName ?? null,
        bio: primero.signature ?? null,
        seguidores: fans[job.handle.toLowerCase()] ?? num(primero.fans),
        verificado: primero.verified === true,
        publicaciones: num(primero.video),
      });
      for (const item of items) cubo.posts.push(normalizarPostTiktok(item, job.handle, job.origen));
      break;
    }

    case "tt_search": {
      // La búsqueda del nicho aporta dos cosas: candidatos a competidor y
      // videos que ya entran al ranking como muestra del nicho.
      Object.assign(salida.followers, seguidoresTiktok(items));
      salida.candidatos = [...salida.candidatos, ...candidatosDesdeBusquedaTiktok(items)];
      for (const item of items) {
        salida.niche.posts.push(normalizarPostTiktok(item, "", "niche"));
      }
      break;
    }

    case "fb_ads": {
      const nuevos = items.map(normalizarAd).filter((a) => a.id);
      const vistos = new Set((salida.ads as AdNormalizado[]).map((a) => a.id));
      salida.ads = [...salida.ads, ...nuevos.filter((a) => !vistos.has(a.id))];
      break;
    }

    case "ig_transcripts": {
      for (const item of items) {
        const texto = String(item.transcript ?? item.text ?? "").trim();
        if (!texto) continue;
        salida.transcripciones.push({
          url: String(item.url ?? item.videoUrl ?? ""),
          texto: texto.slice(0, 8000),
        });
      }
      break;
    }
  }

  return salida;
}

// ---------------------------------------------------------------------------
// Etapas internas (sin Apify): descubrimiento, ranking y síntesis
// ---------------------------------------------------------------------------
async function ejecutarDescubrimiento(
  admin: Sb,
  run: Json,
  result: Json,
): Promise<{ result: Json; candidatos: Candidato[] }> {
  const salida = resultVacio(result);
  const candidatos: Candidato[] = [...(salida.candidatos as Candidato[])];

  candidatos.push(...descubrirDesdeRelacionados(salida));

  if (run.niche) {
    try {
      const marca = (salida.own?.perfiles?.[0]?.nombre ?? "") as string;
      candidatos.push(
        ...await descubrirConPerplexity(
          admin,
          run.organization_id,
          String(run.niche),
          String(run.country ?? "LATAM"),
          marca,
        ),
      );
    } catch (e) {
      // Perplexity caído no puede tumbar la corrida: quedan las otras dos vías.
      console.error("[research] Perplexity falló en el descubrimiento:", (e as Error).message);
    }
  }

  const yaConocidos = new Set<string>();
  for (const p of [...(salida.own.perfiles ?? []), ...(salida.competitors.perfiles ?? [])] as Json[]) {
    yaConocidos.add(`${p.plataforma}:${String(p.handle).toLowerCase()}`);
  }

  const cuantosFaltan = Math.max(
    0,
    MAX_COMPETIDORES - (salida.competitors.perfiles as Json[]).length,
  );
  const elegidos = consolidar(candidatos, yaConocidos, cuantosFaltan);

  salida.candidatos = candidatos;
  salida.competidores_descubiertos = elegidos;

  return { result: salida, candidatos: elegidos };
}

function ejecutarRanking(result: Json): Json {
  const salida = resultVacio(result);
  const todos: PostNormalizado[] = [
    ...(salida.own.posts ?? []),
    ...(salida.competitors.posts ?? []),
    ...(salida.niche.posts ?? []),
  ];

  const rankeados = rankear(todos, (salida.followers ?? {}) as Record<string, number>);

  salida.ranking = rankeados.slice(0, 60);
  salida.top = rankeados.slice(0, TOP_A_TRANSCRIBIR + 3).map((p) => ({
    plataforma: p.plataforma,
    url: p.url,
    handle: p.handle,
    score: p.score,
    vistas: p.vistas,
    seguidores: p.seguidores,
  }));
  salida.gating_detectado = detectarGating(rankeados);
  salida.metricas_por_cuenta = metricasPorCuenta(
    todos,
    (salida.followers ?? {}) as Record<string, number>,
  );

  return salida;
}

async function ejecutarSintesis(admin: Sb, run: Json, result: Json): Promise<Json> {
  const salida = resultVacio(result);
  const niche = String(run.niche ?? "sin nicho declarado");
  const country = String(run.country ?? "LATAM");

  // ── Análisis por transcripción ──
  const rankeadoPorUrl = new Map<string, PostRankeado>(
    (salida.ranking as PostRankeado[]).map((p) => [p.url, p]),
  );

  const analisis: Json[] = [...(salida.analisis as Json[])];
  for (const t of (salida.transcripciones as Json[]).slice(0, TOP_A_TRANSCRIBIR)) {
    try {
      const uno = await analizarTranscripcion(
        { url: t.url, texto: t.texto, post: rankeadoPorUrl.get(t.url) },
        niche,
        country,
      );
      if (uno) analisis.push({ ...uno, url: t.url });
    } catch (e) {
      console.error("[research] análisis de transcripción falló:", (e as Error).message);
    }
  }
  salida.analisis = analisis;

  // ── ADN Viral ──
  if (analisis.length > 0 || (salida.ads as AdNormalizado[]).length > 0) {
    try {
      salida.adn_viral = await sintetizarAdnViral(
        analisis,
        salida.ads as AdNormalizado[],
        niche,
        country,
      );
    } catch (e) {
      console.error("[research] síntesis del ADN Viral falló:", (e as Error).message);
    }
  }

  // ── ADN de Mercado ──
  try {
    salida.adn_mercado = await sintetizarAdnMercado(
      {
        marca: String(salida.own?.perfiles?.[0]?.nombre ?? salida.own?.perfiles?.[0]?.handle ?? ""),
        perfiles: [...(salida.own.perfiles ?? []), ...(salida.competitors.perfiles ?? [])],
        postsPorCuenta: salida.metricas_por_cuenta ?? {},
        ads: salida.ads as AdNormalizado[],
      },
      niche,
      country,
    );
  } catch (e) {
    console.error("[research] síntesis del ADN de Mercado falló:", (e as Error).message);
  }

  // ── El activo de plataforma ──
  // Solo se guarda si hay nicho declarado: una fila con nicho inventado
  // envenenaría la caché para todos los clientes que vengan detrás.
  if (run.niche && run.country && (salida.adn_viral || (salida.ads as AdNormalizado[]).length > 0)) {
    const { error } = await admin.from("niche_intelligence").upsert({
      niche: String(run.niche).toLowerCase(),
      country: String(run.country),
      adn_viral: salida.adn_viral ?? {},
      market_ads: { ads: (salida.ads as AdNormalizado[]).slice(0, 60) },
      discovered_competitors: salida.competidores_descubiertos ?? [],
      source_run_id: run.id,
      refreshed_at: ahora(),
    }, { onConflict: "niche,country" });

    if (error) console.error("[research] no se pudo guardar niche_intelligence:", error.message);
  }

  return salida;
}

// ---------------------------------------------------------------------------
// Planificador: qué toca hacer cuando no quedan jobs pendientes
// ---------------------------------------------------------------------------
function jobsDeCompetidor(handle: string, plataforma: string, indice: number): Job[] {
  if (plataforma === "tiktok") {
    return [{
      key: `C${indice}_tiktok`,
      tipo: "tiktok",
      origen: "competitor",
      handle,
      estado: "pending",
    }];
  }
  return [
    { key: `C${indice}_ig_profile`, tipo: "ig_profile", origen: "competitor", handle, estado: "pending" },
    { key: `C${indice}_ig_posts`, tipo: "ig_posts", origen: "competitor", handle, estado: "pending" },
  ];
}

function jobAds(run: Json, result: Json): Job | null {
  const pais = codigoPais(run.country);
  const terminos: string[] = [];

  if (run.niche) terminos.push(String(run.niche));
  for (const perfil of (result.competitors?.perfiles ?? []) as Json[]) {
    const nombre = String(perfil.nombre ?? perfil.handle ?? "").trim();
    if (nombre) terminos.push(nombre);
    if (terminos.length >= 4) break;
  }

  if (terminos.length === 0) return null;

  return {
    key: "D_ads",
    tipo: "fb_ads",
    origen: "niche",
    handle: terminos[0],
    estado: "pending",
    input: {
      startUrls: terminos.map((t) => ({ url: urlBibliotecaMeta(t, pais) })),
      resultsLimit: Math.ceil(ADS_POR_CORRIDA / terminos.length),
      activeStatus: "active",
    },
  };
}

function jobTranscripciones(result: Json): Job | null {
  const urls = ((result.top ?? []) as Json[])
    .filter((p) => p.plataforma === "instagram" && p.url)
    .slice(0, TOP_A_TRANSCRIBIR)
    .map((p) => String(p.url));

  // TikTok se transcribe a $0.048/min, diez veces el precio de Instagram. En
  // la primera corrida se usa TikTok para métricas y formatos, y se transcribe
  // solo Instagram. Está escrito en la spec y aquí se cumple.
  if (urls.length === 0) return null;

  return {
    key: "F_transcripts",
    tipo: "ig_transcripts",
    origen: "niche",
    handle: "top",
    estado: "pending",
    input: { bulkUrls: urls, resultsLimit: urls.length },
  };
}

// ---------------------------------------------------------------------------
// El eslabón
// ---------------------------------------------------------------------------
async function avanzar(admin: Sb, runId: string, ciclo: number): Promise<Json> {
  const arranque = Date.now();

  const { data: inicial, error } = await admin
    .from("research_runs").select("*").eq("id", runId).single();
  if (error || !inicial) throw new Error(`Run ${runId} no existe`);

  let run = inicial as Json;
  if (["done", "error", "partial"].includes(String(run.status))) return run;

  if (ciclo > MAX_CICLOS) {
    return await cerrar(admin, run, "partial", "Se alcanzó el techo de eslabones");
  }

  let jobs = ((run.stage?.jobs ?? []) as Job[]).map((j) => ({ ...j }));
  let apifyRunIds = (run.apify_run_ids ?? {}) as Json;
  let result = (run.result ?? {}) as Json;
  let costo = Number(run.cost_usd ?? 0);
  let fase = String(run.stage?.fase ?? "base") as Fase;
  const presupuesto = Number(run.budget_usd ?? PRESUPUESTO_DEFAULT);
  const errores = ((run.error_log ?? []) as Json[]).slice(-49);

  const persistir = async (extra: Json = {}) => {
    run = await guardarRun(admin, runId, {
      stage: { ...(run.stage ?? {}), jobs, fase },
      apify_run_ids: apifyRunIds,
      result,
      cost_usd: costo,
      error_log: errores,
      ...extra,
    });
  };

  while (Date.now() - arranque < MS_POR_ESLABON) {
    // ── Techo de gasto ──
    if (costo >= presupuesto) {
      await persistir();
      return await cerrar(admin, run, "partial", `Techo de presupuesto ($${presupuesto}) alcanzado`);
    }

    const job = jobs.find((j) => j.estado === "pending" || j.estado === "running");

    // ── Sin jobs: toca planificar la siguiente fase ──
    if (!job) {
      const siguiente = await planificar(admin, run, result, jobs, fase);
      fase = siguiente.fase;
      result = siguiente.result;
      if (siguiente.jobs.length > 0) jobs = [...jobs, ...siguiente.jobs];
      await persistir();

      if (fase === "fin") break;
      if (siguiente.jobs.length === 0) continue;
      continue;
    }

    // ── Jobs internos (no cuestan un centavo de Apify) ──
    if (job.tipo === "discovery" || job.tipo === "rank" || job.tipo === "synthesis") {
      try {
        if (job.tipo === "discovery") {
          const d = await ejecutarDescubrimiento(admin, run, result);
          result = d.result;
        } else if (job.tipo === "rank") {
          result = ejecutarRanking(result);
        } else {
          result = await ejecutarSintesis(admin, run, result);
        }
        job.estado = "done";
      } catch (e) {
        job.estado = "error";
        job.error = (e as Error).message.slice(0, 400);
        errores.push({ at: ahora(), job: job.key, error: job.error });
      }
      await persistir();
      continue;
    }

    // ── Jobs de Apify ──
    try {
      if (job.estado === "pending") {
        const restante = Math.max(presupuesto - costo, 0.05);
        const runApify = await lanzarRun(
          ACTORES[job.tipo as keyof typeof ACTORES],
          inputDeJob(job),
          restante,
        );
        job.apify_run_id = runApify.id;
        job.estado = "running";
        apifyRunIds = { ...apifyRunIds, [job.key]: runApify.id };
        await persistir();

        if (!TERMINADO.includes(runApify.status)) {
          await dormir(ESPERA_SONDEO_MS);
          continue;
        }
      }

      const estadoApify = await leerRun(job.apify_run_id!);
      if (!TERMINADO.includes(estadoApify.status)) {
        await dormir(ESPERA_SONDEO_MS);
        continue;
      }

      // Se cosecha también en FAILED: un run caído casi siempre deja dataset
      // parcial válido, y rescatarlo es gratis frente a re-scrapear.
      costo += estadoApify.usageTotalUsd ?? 0;
      job.cost_usd = estadoApify.usageTotalUsd ?? 0;

      const items = estadoApify.defaultDatasetId
        ? await leerDataset(
          estadoApify.defaultDatasetId,
          CAMPOS[job.tipo] ?? "",
          limiteItems(job.tipo),
        )
        : [];

      job.items = items.length;

      if (items.length === 0) {
        job.estado = "error";
        job.error = `Apify terminó en ${estadoApify.status} sin items`;
        errores.push({ at: ahora(), job: job.key, error: job.error });
      } else {
        result = acumular(result, job, items);
        job.estado = "done";
      }
      await persistir();
    } catch (e) {
      job.estado = "error";
      job.error = (e as Error).message.slice(0, 400);
      errores.push({ at: ahora(), job: job.key, error: job.error });
      await persistir();
    }
  }

  const quedaFaena = jobs.some((j) => j.estado === "pending" || j.estado === "running") ||
    fase !== "fin";

  if (quedaFaena) {
    encadenar(runId, ciclo + 1);
    return run;
  }

  const conError = jobs.filter((j) => j.estado === "error").length;
  const estadoFinal = conError === jobs.length && jobs.length > 0
    ? "error"
    : conError > 0
    ? "partial"
    : "done";

  return await guardarRun(admin, runId, {
    stage: { ...(run.stage ?? {}), jobs, fase: "fin" },
    result,
    cost_usd: costo,
    status: estadoFinal,
    finished_at: ahora(),
  });
}

/**
 * Decide qué se hace después. Cada fase deja anotado en `stage` si se ejecutó,
 * se saltó por caché o se saltó por falta de datos — para que quien lea la
 * corrida sepa qué hay detrás de un ADN y qué no.
 */
async function planificar(
  admin: Sb,
  run: Json,
  result: Json,
  jobs: Job[],
  fase: Fase,
): Promise<{ fase: Fase; jobs: Job[]; result: Json }> {
  const stage = (run.stage ?? {}) as Json;
  const cacheAplicada = stage.cache_nicho === true;

  switch (fase) {
    case "base": {
      // ¿Hace falta descubrir? Solo si no llegamos a 5 competidores.
      const yaHay = ((result.competitors?.perfiles ?? []) as Json[]).length;
      if (cacheAplicada || yaHay >= MAX_COMPETIDORES || !run.niche) {
        return { fase: "competidores", jobs: [], result };
      }

      const nuevos: Job[] = [];
      if (run.niche) {
        nuevos.push({
          key: "B_tt_search",
          tipo: "tt_search",
          origen: "niche",
          handle: String(run.niche),
          estado: "pending",
          input: inputBusquedaTiktok(String(run.niche), String(run.country ?? "")),
        });
      }
      nuevos.push({
        key: "B_discovery",
        tipo: "discovery",
        origen: "niche",
        handle: String(run.niche ?? ""),
        estado: "pending",
      });
      return { fase: "descubrimiento", jobs: nuevos, result };
    }

    case "descubrimiento": {
      const descubiertos = (result.competidores_descubiertos ?? []) as Candidato[];
      const base = jobs.filter((j) => j.origen === "competitor").length;
      const nuevos: Job[] = [];
      descubiertos.forEach((c, i) => {
        nuevos.push(...jobsDeCompetidor(c.usuario, c.plataforma, base + i + 1));
      });
      return { fase: "competidores", jobs: nuevos, result };
    }

    case "competidores": {
      if (cacheAplicada) return { fase: "ranking", jobs: [], result };
      const ads = jobAds(run, result);
      return { fase: "ads", jobs: ads ? [ads] : [], result };
    }

    case "ads":
      return {
        fase: "ranking",
        jobs: [{ key: "E_rank", tipo: "rank", origen: "niche", handle: "", estado: "pending" }],
        result,
      };

    case "ranking": {
      const t = jobTranscripciones(result);
      return { fase: "transcripcion", jobs: t ? [t] : [], result };
    }

    case "transcripcion":
      return {
        fase: "sintesis",
        jobs: [{ key: "G_synthesis", tipo: "synthesis", origen: "niche", handle: "", estado: "pending" }],
        result,
      };

    case "sintesis":
    case "fin":
    default:
      return { fase: "fin", jobs: [], result };
  }
}

async function cerrar(admin: Sb, run: Json, status: string, motivo: string): Promise<Json> {
  const errores = ((run.error_log ?? []) as Json[]).slice(-49);
  errores.push({ at: ahora(), error: motivo });
  return await guardarRun(admin, run.id, { status, finished_at: ahora(), error_log: errores });
}

// ---------------------------------------------------------------------------
// Plan inicial a partir del onboarding
// ---------------------------------------------------------------------------
function construirPlan(formData: Json, competidoresExtra: string[]) {
  const marca = (formData.marca ?? {}) as Json;
  const producto = (formData.producto ?? {}) as Json;
  const audiencia = (producto.audiencia ?? {}) as Json;

  const jobs: Job[] = [];
  const sinResolver: string[] = [];

  // ── Etapa A ──
  const propioIg = normalizarHandle(String(marca.instagram ?? ""), "instagram");
  if (propioIg && propioIg.plataforma === "instagram") {
    jobs.push({ key: "A_ig_profile", tipo: "ig_profile", origen: "own", handle: propioIg.usuario, estado: "pending" });
    jobs.push({ key: "A_ig_posts", tipo: "ig_posts", origen: "own", handle: propioIg.usuario, estado: "pending" });
  }

  const propioTt = normalizarHandle(String(marca.tiktok ?? ""), "tiktok");
  if (propioTt && propioTt.plataforma !== "desconocido") {
    jobs.push({ key: "A_tiktok", tipo: "tiktok", origen: "own", handle: propioTt.usuario, estado: "pending" });
  }

  // ── Etapa C con los que el cliente sí dio ──
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
      // Nombre de marca sin cuenta: lo resuelve la etapa B.
      sinResolver.push(h.original);
      continue;
    }

    const clave = `${h.plataforma}:${h.usuario.toLowerCase()}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    cuenta += 1;
    jobs.push(...jobsDeCompetidor(h.usuario, h.plataforma, cuenta));
  }

  // El nicho todavía no es un campo del onboarding (lo será en el Onboarding
  // 2.0). Hasta entonces se deriva de lo que el cliente ya escribió; si no da
  // para nada, queda null y `niche_intelligence` no se toca — antes eso que
  // envenenar la caché de nicho con una etiqueta inventada.
  const niche = String(producto.categoria ?? marca.nicho ?? producto.tipo_oferta ?? "")
    .trim().toLowerCase() || null;
  const country = String(audiencia.pais ?? "").trim() || null;

  return { jobs, niche, country, sinResolver };
}

/** Reutiliza la inteligencia del nicho si tiene menos de 30 días. */
async function buscarCacheNicho(admin: Sb, niche: string | null, country: string | null) {
  if (!niche || !country) return null;

  const { data } = await admin
    .from("niche_intelligence").select("*")
    .eq("niche", niche.toLowerCase()).eq("country", country).maybeSingle();

  if (!data) return null;

  const dias = (Date.now() - new Date((data as Json).refreshed_at).getTime()) / 86_400_000;
  return dias <= DIAS_CACHE_NICHO ? (data as Json) : null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  // handleCorsOptions no mira el método: devuelve "ok" a lo que le pasen. Solo
  // se llama en el preflight de verdad.
  if (req.method === "OPTIONS") return handleCorsOptions(req);
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
      return json(req, { ok: true, run_id: runId, status: run.status, fase: run.stage?.fase });
    } catch (e) {
      console.error("[research] tick falló:", e);
      return json(req, { error: (e as Error).message }, 500);
    }
  }

  const clientId = String(body.client_id ?? "");
  const runIdPedido = String(body.run_id ?? "");

  // ── start / status: staff de la organización (o service role) ──
  if (!esServicio) {
    if (!token) return json(req, { error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
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

  if (!hayToken()) {
    return json(req, { error: "APIFY_TOKEN no está configurado en los secrets" }, 503);
  }
  if (!clientId) return json(req, { error: "client_id es obligatorio" }, 400);

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
    return json(req, { run_id: (viva as Json).id, status: (viva as Json).status, reused: true });
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

  const niche = (body.niche ?? plan.niche) as string | null;
  const country = (body.country ?? plan.country) as string | null;

  // Si el nicho ya está investigado y fresco, esta corrida se ahorra las
  // etapas B y D enteras. Ese es el ahorro que crece con cada cliente.
  const cache = await buscarCacheNicho(admin, niche, country);

  const { data: creado, error: errorCrear } = await admin
    .from("research_runs")
    .insert({
      organization_id: (cliente as Json).organization_id,
      client_id: clientId,
      pipeline_run_id: body.pipeline_run_id ?? null,
      niche,
      country,
      status: "running",
      budget_usd: Number(body.budget_usd ?? PRESUPUESTO_DEFAULT),
      stage: {
        jobs: plan.jobs,
        fase: "base",
        cache_nicho: !!cache,
        pendientes_de_descubrimiento: plan.sinResolver,
        A: { status: "running", started_at: ahora() },
        B: cache ? { status: "skipped", motivo: "caché de nicho vigente" } : { status: "pending" },
        D: cache ? { status: "skipped", motivo: "caché de nicho vigente" } : { status: "pending" },
      },
      result: cache
        ? {
          ads: (cache.market_ads as Json)?.ads ?? [],
          competidores_descubiertos: cache.discovered_competitors ?? [],
          adn_viral_heredado: cache.adn_viral ?? null,
        }
        : {},
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
    niche,
    country,
    cache_nicho: !!cache,
    sin_resolver: plan.sinResolver,
  }, 202);
});
