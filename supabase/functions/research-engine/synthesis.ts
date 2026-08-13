// ============================================================================
// KREOON — research-engine · ETAPA G: análisis y síntesis
//
// Aquí entra la IA, y solo aquí. El ranking lo hizo la aritmética (etapa E) y
// los datos los trajeron los scrapers: la IA no mide, no rankea y no inventa
// métricas. Lo único que hace es LEER lo que ya tenemos y encontrar el patrón
// que se repite.
//
// Regla que atraviesa los tres prompts: **lo que se repite es la fórmula; lo
// que aparece una vez es anécdota**. Nada se afirma sin citar el video o el
// anuncio del que salió.
//
// Qué produce:
//   · ADN de Mercado    — la competencia con números y con lo que está pautando
//   · ADN Viral del Nicho — los hooks que de verdad conectan, con ejemplos reales
//
// Qué NO produce: el ADN de Marca y el de Producto, que ya los genera el
// pipeline (`generate-client-dna` / `generate-product-dna`) con los datos que
// el cliente declaró. Duplicarlos aquí sería inventar atributos de producto,
// justo lo que la spec prohíbe. Lo que sí hace el motor es entregarles la línea
// base real de las redes del cliente para que dejen de escribir a ciegas.
// ============================================================================

import { callAIWithFallback, getAPIKey } from "../_shared/ai-providers.ts";
import type { AdNormalizado, Json, PostRankeado } from "./apify.ts";

/**
 * Orden de proveedores para la síntesis. Mistral primero por una razón
 * concreta: estos prompts piden JSON largo y el free tier de Gemini corta a
 * mitad de camino (incidente conocido del pipeline de estrategia). Gemini
 * queda de última red, no de primera opción.
 */
function proveedores(): Array<{ provider: string; model: string; apiKey: string }> {
  const cadena = [
    { provider: "mistral", model: "mistral-large-latest" },
    { provider: "openai", model: "gpt-4o-mini" },
    { provider: "gemini", model: "gemini-2.5-flash" },
  ];
  return cadena
    .map((c) => ({ ...c, apiKey: getAPIKey(c.provider) ?? "" }))
    .filter((c) => c.apiKey.length > 0);
}

/**
 * Los modelos devuelven el JSON envuelto en explicaciones o en ```json por más
 * que se les pida lo contrario. Esto rescata el objeto sin morir en el intento;
 * si no hay JSON válido, devuelve null y el llamador decide (nunca inventa).
 */
export function extraerJson(texto: string): Json | null {
  if (!texto) return null;

  const limpio = texto.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(limpio) as Json;
  } catch {
    // Fallback: el primer objeto balanceado que aparezca en el texto.
    const inicio = limpio.indexOf("{");
    if (inicio === -1) return null;
    let profundidad = 0;
    for (let i = inicio; i < limpio.length; i++) {
      if (limpio[i] === "{") profundidad++;
      else if (limpio[i] === "}") {
        profundidad--;
        if (profundidad === 0) {
          try {
            return JSON.parse(limpio.slice(inicio, i + 1)) as Json;
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }
}

async function pedirJson(system: string, user: string): Promise<Json | null> {
  const configs = proveedores();
  if (configs.length === 0) throw new Error("No hay ningún proveedor de IA configurado");

  const { result } = await callAIWithFallback(configs, system, user);
  const texto = typeof result === "string" ? result : JSON.stringify(result);
  return extraerJson(texto);
}

// ---------------------------------------------------------------------------
// Análisis por transcripción (uno por video del top)
// ---------------------------------------------------------------------------
const SISTEMA_ANALISIS =
  "Eres analista de contenido viral para LATAM. Devuelves SOLO JSON válido, sin " +
  "explicaciones. No inventas nada que no esté en la transcripción: si una " +
  "dimensión no aplica, va en null.";

export interface Transcripcion {
  url: string;
  texto: string;
  post?: PostRankeado;
}

export async function analizarTranscripcion(
  t: Transcripcion,
  niche: string,
  country: string,
): Promise<Json | null> {
  const p = t.post;
  const metricas = p
    ? `vistas ${p.vistas}, seguidores de la cuenta ${p.seguidores}, likes ${p.likes}, ` +
      `comentarios ${p.comentarios}, duración ${p.duracion ?? "?"}s, ` +
      `${p.fijado ? "fijado por el autor" : "no fijado"}`
    : "sin métricas";

  const user = [
    `Analiza esta transcripción de un video que está en el top de viralidad real del nicho ${niche} en ${country}.`,
    "",
    `TRANSCRIPCIÓN: ${t.texto.slice(0, 6000)}`,
    `MÉTRICAS: ${metricas}`,
    `URL: ${t.url}`,
    "",
    "Devuelve JSON con exactamente estas llaves:",
    `{
  "hook": { "texto_exacto_0_5s": "", "taxonomia": "inclusivo-perdida|kill-shot|noticia-shock|experimento-resultado|anclaje-precio|historia-demostrativa|personalidad-cruda|brecha", "gatillos": ["curiosidad|interrupcion-patron|auto-relevancia|emocion"] },
  "estructura": { "tipo": "", "re_enganches": [], "numeros_hiperespecificos": [] },
  "cta": { "tipo": "", "texto": "", "usa_gating": false },
  "lead_magnet": null,
  "lenguaje": { "registro": "", "muletillas": [], "pais_del_espanol": "" },
  "tipo_contenido": "tutorial|emocion-opinion|demo|storytime|testimonial"
}`,
    "El hook debe ser TEXTUAL de la transcripción, copiado tal cual. Si no hay hook claro, null.",
  ].join("\n");

  return await pedirJson(SISTEMA_ANALISIS, user);
}

// ---------------------------------------------------------------------------
// ADN Viral del Nicho
// ---------------------------------------------------------------------------
const SISTEMA_VIRAL =
  "Eres estratega de contenido para LATAM. Devuelves SOLO JSON válido. " +
  "REGLA CENTRAL: lo que se REPITE es la fórmula; lo que aparece una vez es " +
  "anécdota. Solo puedes afirmar patrones que aparezcan en 3 o más videos o 3 " +
  "o más anuncios. Está prohibido inventar ejemplos: cada ejemplo se cita con " +
  "la URL de la que salió. Si la evidencia no alcanza, dilo en 'alcance' en " +
  "vez de rellenar.";

export async function sintetizarAdnViral(
  analisis: Json[],
  ads: AdNormalizado[],
  niche: string,
  country: string,
): Promise<Json | null> {
  const adsGanadores = ads
    .filter((a) => a.dias_corriendo >= 30)
    .slice(0, 25)
    .map((a) => `- [${a.dias_corriendo} días] ${a.pagina}: ${a.texto.slice(0, 300)} (${a.url})`);

  const user = [
    `Tienes ${analisis.length} análisis JSON de los videos más virales (viralidad relativa real) del nicho ${niche} en ${country}, y ${ads.length} anuncios activos de la biblioteca de Meta con sus días corriendo.`,
    "",
    "ANÁLISIS DE VIDEOS:",
    JSON.stringify(analisis).slice(0, 22_000),
    "",
    adsGanadores.length ? "ANUNCIOS CON 30+ DÍAS CORRIENDO (ya imprimen dinero):" : "No hay anuncios con 30+ días en la muestra.",
    ...adsGanadores,
    "",
    "Sintetiza en JSON con estas llaves:",
    `{
  "hooks_dominantes": [ { "taxonomia": "", "porcentaje_del_top": 0, "ejemplos": [ { "texto": "", "url": "" } ], "por_que_funciona": "" } ],
  "estructura_ganadora": { "descripcion": "", "re_enganches_literales": [], "evidencia": [] },
  "ctas": { "tipos_usados": [], "gating_normalizado": false, "ejemplos": [] },
  "duracion": { "moda_segundos": 0, "rango": "", "mezcla_tutorial_vs_emocion": "" },
  "angulos_de_ads_ganadores": [ { "angulo": "", "dias_corriendo": 0, "url": "" } ],
  "gaps": [ { "oportunidad": "", "por_que_nadie_lo_usa": "" } ],
  "alcance": "qué tan sólida es esta evidencia y qué falta"
}`,
  ].join("\n");

  return await pedirJson(SISTEMA_VIRAL, user);
}

// ---------------------------------------------------------------------------
// ADN de Mercado
// ---------------------------------------------------------------------------
const SISTEMA_MERCADO =
  "Eres analista competitivo. Devuelves SOLO JSON válido. Todo lo que afirmes " +
  "debe salir de los datos entregados: nada imaginado, nada deducido de tu " +
  "conocimiento previo de la marca. Si un dato no está, va null.";

export interface EntradaMercado {
  marca: string;
  perfiles: Json[];
  postsPorCuenta: Record<string, { publicaciones: number; vistas_medias: number; engagement_medio: number }>;
  ads: AdNormalizado[];
}

export async function sintetizarAdnMercado(
  entrada: EntradaMercado,
  niche: string,
  country: string,
): Promise<Json | null> {
  const user = [
    `Nicho: ${niche} · País: ${country} · Marca de referencia: ${entrada.marca}`,
    "",
    "PERFILES (datos reales scrapeados):",
    JSON.stringify(entrada.perfiles).slice(0, 12_000),
    "",
    "ACTIVIDAD CALCULADA POR CUENTA (frecuencia y medias, ya computadas en código):",
    JSON.stringify(entrada.postsPorCuenta).slice(0, 6000),
    "",
    "ANUNCIOS ACTIVOS EN LA BIBLIOTECA DE META:",
    JSON.stringify(
      entrada.ads.slice(0, 30).map((a) => ({
        pagina: a.pagina,
        dias: a.dias_corriendo,
        texto: a.texto.slice(0, 300),
        url: a.url,
      })),
    ).slice(0, 12_000),
    "",
    "Devuelve JSON:",
    `{
  "competidores": [ { "handle": "", "posicionamiento": "", "seguidores": 0, "frecuencia_real": "", "engagement_medio": 0, "que_esta_pautando": [], "ads_30_dias": 0, "funnel": "", "arma_secreta": "" } ],
  "tabla_comparativa": [ { "criterio": "", "lider": "", "detalle": "" } ],
  "huecos_de_mercado": [ { "hueco": "", "por_que_esta_libre": "", "como_atacarlo": "" } ],
  "que_no_copiar": [ { "practica": "", "razon": "" } ],
  "alcance": "qué competidores se pudieron validar y cuáles no"
}`,
    "Si el nicho no da para 5 competidores reales, entrega los validados y dilo en 'alcance'. Prohibido rellenar.",
  ].join("\n");

  return await pedirJson(SISTEMA_MERCADO, user);
}

// ---------------------------------------------------------------------------
// Métricas por cuenta — se calculan en código, no se le preguntan a la IA
// ---------------------------------------------------------------------------
export function metricasPorCuenta(
  posts: Array<{ handle: string; vistas: number; likes: number; comentarios: number; publicado_en: string | null }>,
  seguidores: Record<string, number>,
): Record<string, { publicaciones: number; vistas_medias: number; engagement_medio: number; publicaciones_por_semana: number }> {
  const acc: Record<string, { v: number; e: number; n: number; min: number; max: number }> = {};

  for (const p of posts) {
    const k = p.handle.toLowerCase();
    acc[k] ??= { v: 0, e: 0, n: 0, min: Infinity, max: -Infinity };
    acc[k].v += p.vistas;
    acc[k].e += p.likes + p.comentarios;
    acc[k].n += 1;
    if (p.publicado_en) {
      const t = new Date(p.publicado_en).getTime();
      if (Number.isFinite(t)) {
        acc[k].min = Math.min(acc[k].min, t);
        acc[k].max = Math.max(acc[k].max, t);
      }
    }
  }

  const salida: Record<string, {
    publicaciones: number;
    vistas_medias: number;
    engagement_medio: number;
    publicaciones_por_semana: number;
  }> = {};

  for (const [handle, a] of Object.entries(acc)) {
    const fans = seguidores[handle] ?? 0;
    const semanas = Number.isFinite(a.min) && Number.isFinite(a.max) && a.max > a.min
      ? (a.max - a.min) / (7 * 86_400_000)
      : 0;

    salida[handle] = {
      publicaciones: a.n,
      vistas_medias: Math.round(a.v / a.n),
      // Engagement sobre seguidores, que es como se compara entre cuentas de
      // tamaños distintos. Sin seguidores no hay porcentaje: va 0, no un
      // número inventado.
      engagement_medio: fans > 0 ? Number(((a.e / a.n / fans) * 100).toFixed(2)) : 0,
      publicaciones_por_semana: semanas > 0 ? Number((a.n / semanas).toFixed(2)) : 0,
    };
  }

  return salida;
}
