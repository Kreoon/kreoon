// ============================================================================
// KREOON — research-engine · ETAPA B: descubrimiento de competidores
//
// El cliente casi nunca sabe quién es su competencia real en redes. Escribe
// dos marcas grandes, o ninguna. Esta etapa la encuentra por tres caminos
// independientes, y a propósito distintos entre sí (lo que uno no ve, otro sí):
//
//   1. Perplexity — "principales marcas de [nicho] en [país] con presencia en
//      IG/TikTok". Trae el mercado formal.
//   2. relatedProfiles — Instagram mismo entrega los pares del nicho en el
//      scrape del cliente. Es gratis: ya lo pagamos en la etapa A.
//   3. Búsqueda en TikTok por palabras clave del nicho. Trae a quien está
//      pegando ahora, aunque sea una cuenta chica y nueva.
//
// Nada se da por bueno aquí: un handle descubierto solo entra al informe si
// después la etapa C consigue scrapearlo. Si no existe, se cae solo.
// ============================================================================

import { normalizarHandle, num, type Json } from "./apify.ts";
import { searchWithPerplexity } from "../_shared/perplexity-client.ts";

export interface Candidato {
  plataforma: "instagram" | "tiktok";
  usuario: string;
  fuente: "perplexity" | "related_profiles" | "tiktok_search";
  /** Señal de tamaño cuando la fuente la da (TikTok la trae en el item). */
  seguidores?: number;
}

/** Cuentas que aparecen en cualquier nicho y no son competencia de nadie. */
const RUIDO = new Set([
  "instagram", "tiktok", "explore", "reels", "shop", "accounts", "p", "reel",
  "stories", "tv", "direct", "facebook", "youtube", "whatsapp", "linkedin",
  "amazon", "mercadolibre", "shein", "temu", "google",
]);

function limpiarCandidato(usuario: string): string | null {
  const u = usuario.trim().toLowerCase().replace(/^@/, "").replace(/\/+$/, "");
  if (u.length < 3 || u.length > 30) return null;
  if (RUIDO.has(u)) return null;
  if (!/^[a-z0-9._]+$/.test(u)) return null;
  return u;
}

// ---------------------------------------------------------------------------
// 1 · Perplexity
// ---------------------------------------------------------------------------
/**
 * El contexto desambiguado es obligatorio: sin él, "belleza" devuelve revistas
 * de moda de España. Se pide una lista de handles, no un ensayo — y se acepta
 * que devuelva menos de los pedidos antes que rellenar con inventos.
 */
export async function descubrirConPerplexity(
  supabase: Json,
  organizationId: string,
  niche: string,
  country: string,
  marca: string,
): Promise<Candidato[]> {
  const consulta = [
    `Necesito las marcas que compiten en el nicho "${niche}" en ${country}`,
    marca ? `(el negocio de referencia es "${marca}", NO lo incluyas en la lista)` : "",
    "y que tengan cuenta activa en Instagram o TikTok.",
    "",
    "Responde SOLO con una lista, una marca por línea, en este formato exacto:",
    "nombre de la marca | @usuario_instagram | @usuario_tiktok",
    "Si no conoces uno de los dos usuarios, escribe - en su lugar.",
    "No incluyas marcas de las que no estés seguro de su usuario real.",
    "Máximo 8 marcas. Sin introducción ni explicación.",
  ].filter(Boolean).join(" ");

  const resultado = await searchWithPerplexity(supabase, organizationId, consulta, {
    maxTokens: 900,
    temperature: 0.1,
    recencyFilter: "year",
  });

  const candidatos: Candidato[] = [];

  for (const linea of (resultado.content ?? "").split("\n")) {
    const partes = linea.split("|").map((p) => p.trim());
    if (partes.length < 2) continue;

    for (let i = 1; i < partes.length && i <= 2; i++) {
      const plataforma = i === 1 ? "instagram" : "tiktok";
      const bruto = partes[i];
      if (!bruto || bruto === "-") continue;

      const handle = normalizarHandle(bruto, plataforma);
      if (!handle || handle.plataforma === "desconocido") continue;

      const usuario = limpiarCandidato(handle.usuario);
      if (usuario) candidatos.push({ plataforma, usuario, fuente: "perplexity" });
    }
  }

  return candidatos;
}

// ---------------------------------------------------------------------------
// 2 · relatedProfiles (gratis: ya venían en el scrape de la etapa A)
// ---------------------------------------------------------------------------
export function descubrirDesdeRelacionados(result: Json): Candidato[] {
  const perfiles = [
    ...((result.own?.perfiles ?? []) as Json[]),
    ...((result.competitors?.perfiles ?? []) as Json[]),
  ];

  const candidatos: Candidato[] = [];
  for (const perfil of perfiles) {
    for (const relacionado of (perfil.perfiles_relacionados ?? []) as unknown[]) {
      const usuario = limpiarCandidato(String(relacionado ?? ""));
      if (usuario) {
        candidatos.push({ plataforma: "instagram", usuario, fuente: "related_profiles" });
      }
    }
  }
  return candidatos;
}

// ---------------------------------------------------------------------------
// 3 · Búsqueda en TikTok (los items del search traen el autor dentro)
// ---------------------------------------------------------------------------
export function candidatosDesdeBusquedaTiktok(items: Json[]): Candidato[] {
  const porCuenta: Record<string, number> = {};

  for (const item of items) {
    const autor = (item.authorMeta ?? {}) as Json;
    const usuario = limpiarCandidato(String(autor.name ?? ""));
    if (!usuario) continue;
    // Nos quedamos con la señal de tamaño más alta que veamos de esa cuenta.
    porCuenta[usuario] = Math.max(porCuenta[usuario] ?? 0, num(autor.fans));
  }

  return Object.entries(porCuenta).map(([usuario, seguidores]) => ({
    plataforma: "tiktok" as const,
    usuario,
    fuente: "tiktok_search" as const,
    seguidores,
  }));
}

/** Input del actor de búsqueda de TikTok (schema verificado 2026-08-13). */
export function inputBusquedaTiktok(niche: string, country: string): Json {
  return {
    searchQueries: [niche, `${niche} ${country}`].filter((q) => q.trim().length > 2),
    searchSection: "/video",
    resultsPerPage: 20,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSlideshowImages: false,
  };
}

// ---------------------------------------------------------------------------
// Consolidación
// ---------------------------------------------------------------------------
/**
 * Ordena por cuántas fuentes independientes coinciden: una cuenta que aparece
 * en Perplexity Y en los perfiles relacionados es competencia de verdad; una
 * que solo salió en una búsqueda de TikTok puede ser ruido.
 */
export function consolidar(
  candidatos: Candidato[],
  yaConocidos: Set<string>,
  limite: number,
): Candidato[] {
  const agrupados = new Map<string, { c: Candidato; fuentes: Set<string> }>();

  for (const candidato of candidatos) {
    const clave = `${candidato.plataforma}:${candidato.usuario}`;
    if (yaConocidos.has(clave)) continue;

    const previo = agrupados.get(clave);
    if (previo) {
      previo.fuentes.add(candidato.fuente);
      if ((candidato.seguidores ?? 0) > (previo.c.seguidores ?? 0)) {
        previo.c.seguidores = candidato.seguidores;
      }
    } else {
      agrupados.set(clave, { c: { ...candidato }, fuentes: new Set([candidato.fuente]) });
    }
  }

  return [...agrupados.values()]
    .sort((a, b) => {
      const porFuentes = b.fuentes.size - a.fuentes.size;
      if (porFuentes !== 0) return porFuentes;
      return (b.c.seguidores ?? 0) - (a.c.seguidores ?? 0);
    })
    .slice(0, limite)
    .map((x) => ({ ...x.c, fuente: [...x.fuentes].join("+") as Candidato["fuente"] }));
}
