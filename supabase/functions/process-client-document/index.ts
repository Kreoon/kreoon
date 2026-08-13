// ============================================================================
// process-client-document — extrae texto y genera un resumen de un documento
// que el cliente sube como contexto (PDF, Word, Excel, PPT, texto plano).
// ============================================================================
//
// POST { document_id }
//
// Flujo:
//   1. Carga la fila de `client_documents` (bucket privado `client-documents`,
//      ver 20260812110000_client_documents.sql).
//   2. Autoriza: staff de la organización dueña, o el cliente dueño del
//      documento (vía `client_users`) — mismo patrón que
//      `esStaffDeOrg`/`esUsuarioDelCliente` de `pipeline-orchestrator`.
//   3. Descarga el archivo del bucket con service role.
//   4. Extrae texto, por tres caminos según el formato:
//      · .txt / .md / .csv        → se leen directo, sin gastar IA.
//      · .docx / .xlsx / .pptx    → son ZIP con XML dentro: se descomprimen
//        aquí y se limpia el XML. Mandarlos a Gemini NO funciona — responde
//        400 "Unsupported MIME type" (comprobado con un .docx real).
//      · PDF                      → Gemini 2.5 Flash vía `inline_data`. Es el
//        único binario que digiere de verdad, junto a imágenes y audio.
//      · .doc / .xls / .ppt       → se rechazan: binarios propietarios de
//        antes de 2007, ni ZIP ni legibles por el modelo. El mensaje pide
//        guardarlos como PDF, en vez de soltar una excusa técnica.
//   5. En la misma llamada, Gemini genera el resumen: máx. ~400 palabras, en
//      español, pensado como contexto de MARKETING (qué es el documento y
//      qué dice sobre la marca, el producto, el público o las reglas de
//      comunicación).
//   6. Guarda `texto_extraido`, `resumen`, `estado='listo'` (o 'error' +
//      `error_detalle`).
//
// verify_jwt = false: la invoca el frontend justo después de subir el
// archivo al bucket, con la sesión del cliente o de staff — no hay un
// "usuario de sistema" natural para este paso. Por eso el handler valida
// SIEMPRE internamente (punto 2) antes de tocar nada, igual que el patrón
// `assertOrgMembership`/`esUsuarioDelCliente` usado en el resto del pipeline.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { callAIWithFallback, getAPIKey } from "../_shared/ai-providers.ts";

// deno-lint-ignore no-explicit-any
type Sb = any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");

const BUCKET = "client-documents";
/** 400 se quedaba corto en un brief con muchas reglas de comunicación: obligaba
 *  a agrupar en párrafos justo lo que hay que listar una por una. Y como el ADN
 *  recibe el documento entero aparte, aquí no hay prisa por comprimir. */
const MAX_RESUMEN_PALABRAS = 700;

/** Mismo criterio de staff que `pipeline-orchestrator` (organization_members + organization_member_roles). */
const ROLES_STAFF = [
  "admin",
  "team_leader",
  "strategist",
  "digital_strategist",
  "creative_strategist",
];

/** Lo único binario que Gemini digiere de verdad. Se probó mandarle un .docx y
 *  respondió 400 "Unsupported MIME type": su lista de binarios es corta (PDF,
 *  imágenes, audio y vídeo) y Office no está en ella. */
const MIME_GEMINI_NATIVO = new Set(["application/pdf"]);

/** Word, Excel y PowerPoint modernos (.docx/.xlsx/.pptx) son ZIP con XML
 *  dentro, así que el texto se saca descomprimiendo, sin pedirle permiso a
 *  ningún modelo. Se extrae aquí y luego se resume como texto normal. */
const MIME_OOXML = new Map<string, string[]>([
  // mime → qué ficheros del ZIP llevan el texto
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ["word/document.xml"]],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ["xl/sharedStrings.xml"]],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", ["ppt/slides/"]],
]);

/** Los .doc/.xls/.ppt de antes de 2007 son binarios propietarios, no ZIP: no
 *  hay forma razonable de leerlos aquí. Se rechazan con un mensaje que dice
 *  qué hacer, en vez de fallar con una excusa técnica. */
const MIME_OFFICE_ANTIGUO = new Set([
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
]);

const MIME_TIPOS_TEXTO = new Set(["text/plain", "text/markdown", "text/csv"]);

/**
 * Saca el texto de un OOXML (docx/xlsx/pptx) descomprimiéndolo y limpiando las
 * etiquetas XML. No es un parser fiel —no respeta tablas ni orden de diapositivas
 * al detalle— pero para lo que hace falta aquí (entender de qué habla el
 * documento) sobra, y evita arrastrar una librería de ofimática entera.
 */
async function extraerTextoOoxml(bytes: Uint8Array, rutas: string[]): Promise<string> {
  const { default: JSZip } = await import("npm:jszip@3.10.1");
  const zip = await JSZip.loadAsync(bytes);

  const partes: string[] = [];
  for (const nombre of Object.keys(zip.files)) {
    const coincide = rutas.some((r) => (r.endsWith("/") ? nombre.startsWith(r) : nombre === r));
    if (!coincide || !nombre.endsWith(".xml")) continue;

    const xml = await zip.files[nombre].async("string");
    const texto = xml
      // Los saltos de párrafo y de celda se pierden si se quitan las etiquetas
      // a secas: se convierten en espacios antes.
      .replace(/<\/(w:p|a:p|w:tr|c)>/g, " \n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (texto) partes.push(texto);
  }

  return partes.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

async function esStaffDeOrg(admin: Sb, userId: string, organizationId: string): Promise<boolean> {
  const [miembro, rolesExtra] = await Promise.all([
    admin.from("organization_members").select("role")
      .eq("organization_id", organizationId).eq("user_id", userId).maybeSingle(),
    admin.from("organization_member_roles").select("role")
      .eq("organization_id", organizationId).eq("user_id", userId),
  ]);
  const roles = [
    miembro.data?.role,
    ...((rolesExtra.data ?? []) as { role: string }[]).map((r) => r.role),
  ].filter(Boolean) as string[];
  return roles.some((r) => ROLES_STAFF.includes(r));
}

async function esUsuarioDelCliente(admin: Sb, userId: string, clientId: string): Promise<boolean> {
  const { data } = await admin
    .from("client_users").select("user_id")
    .eq("client_id", clientId).eq("user_id", userId).maybeSingle();
  return !!data;
}

/** Base64 seguro para archivos grandes: fromCharCode(...bytes) revienta el
 *  límite de argumentos de V8 si se pasa el arreglo completo de una vez. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

interface ResultadoGemini {
  texto_extraido: string;
  resumen: string;
}

/** Repara fences ```json que Gemini a veces agrega pese a responseMimeType. */
function limpiarJson(s: string): string {
  const sinCercas = s.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Los modelos meten saltos de línea CRUDOS dentro de los strings del JSON
  // (sobre todo cuando el contenido pedido lleva saltos, como aquí). Un salto
  // sin escapar es un carácter de control ilegal en JSON y revienta el parseo
  // con "Bad control character in string literal". Se escapan solo los que van
  // DENTRO de comillas; los de la estructura del JSON se dejan en paz.
  let dentroDeString = false;
  let escapado = false;
  let salida = "";

  for (const ch of sinCercas) {
    if (escapado) { salida += ch; escapado = false; continue; }
    if (ch === "\\") { salida += ch; escapado = true; continue; }
    if (ch === '"') { dentroDeString = !dentroDeString; salida += ch; continue; }

    if (dentroDeString) {
      if (ch === "\n") { salida += "\\n"; continue; }
      if (ch === "\r") { salida += "\\r"; continue; }
      if (ch === "\t") { salida += "\\t"; continue; }
    }
    salida += ch;
  }

  return salida;
}

/**
 * Cómo ordenar el documento. Se usa en los dos caminos:
 *  · tal cual, cuando el texto ya lo extrajimos nosotros y solo falta ordenarlo
 *    (respuesta en texto plano, sin JSON: el resumen lleva saltos de línea y
 *    dentro de un JSON los rompen);
 *  · envuelto en PROMPT_SISTEMA, para el PDF, donde hace falta que el modelo
 *    devuelva ADEMÁS el texto extraído.
 */
const PROMPT_ORDENAR = `Eres un estratega de marca que lee documentos que un cliente sube como contexto (briefs, catálogos, manuales de marca, listas de precios, guías de estilo). No los resumes: los ENTIENDES y los ORDENAS para que otro sistema construya con ellos el ADN de la marca.

Ordena lo que dice el documento, en español y en máximo ${MAX_RESUMEN_PALABRAS} palabras.

FORMATO OBLIGATORIO del campo "resumen" — esto importa tanto como el contenido:
- Cada sección empieza con su título en MAYÚSCULAS seguido de dos puntos, en su PROPIA LÍNEA.
- Debajo del título, una viñeta por idea, cada una en su propia línea, empezando por "- ".
- Entre una sección y la siguiente, una LÍNEA EN BLANCO.
- Usa saltos de línea reales (\\n en el JSON). NUNCA devuelvas todo seguido en un párrafo: es ilegible y se descarta.

Ejemplo exacto de la forma esperada:
QUÉ ES:
- Plataforma de X para empresas que Y.

CÓMO HABLA:
- Tono cercano y directo.
- Dicen "En X te ayudamos a…", nunca "Los agentes de X permiten…".

Las secciones, en este orden. Incluye SOLO aquellas sobre las que el documento diga algo — omite el resto por completo, sin escribir "no especificado":

QUÉ ES: qué vende la marca y a quién.
PÚBLICO: a quién le habla y qué problema le resuelve.
CÓMO HABLA: tono, estilo, y las REGLAS EXPLÍCITAS de comunicación — fórmulas que prefieren, expresiones que evitan, cómo se refieren a sí mismos.
QUÉ PIDEN: entregables concretos, cantidades, formatos, llamados a la acción, objetivos de campaña.
NO HACER: prohibiciones, restricciones, ángulos que rechazan.
DATOS DUROS: precios, garantías, plazos, cifras citables.

Reglas al ordenar:
- Las instrucciones de comunicación son lo más valioso: cópialas LITERALES, con sus comillas, no las parafrasees. Si el documento dice 'preferimos "En X te ayudamos a…" en vez de "Los agentes de X permiten…"', va tal cual.
- Una idea por viñeta. Si una sección tiene ocho reglas, son ocho viñetas, no un párrafo con comas.
- No inventes ni completes lo que el documento no diga.
- Si el documento no aporta nada útil para marketing, dilo en una línea y ya.

`;

/** Para el PDF: además de ordenar, el modelo tiene que devolver el texto que
 *  leyó del binario, así que aquí sí hace falta JSON. Los saltos de línea del
 *  resumen se escapan al parsear (ver `limpiarJson`). */
const PROMPT_SISTEMA = `${PROMPT_ORDENAR}

Además de ordenarlo, extrae TODO el texto legible del documento, tal cual está.

Responde ÚNICAMENTE con un JSON con esta forma exacta, sin markdown ni texto adicional:
{"texto_extraido": "...", "resumen": "..."}
Dentro de los valores del JSON, los saltos de línea DEBEN ir escapados como \\n.`;

/**
 * Ordena un texto que YA tenemos extraído, probando varios proveedores.
 *
 * Solo el PDF obliga a usar Gemini, porque hay que mandarle el binario. Para
 * todo lo demás (Word, Excel, PowerPoint, txt) el texto lo sacamos nosotros
 * descomprimiendo el archivo, así que resumirlo es una tarea de texto normal y
 * la puede hacer cualquier modelo. `callAIWithFallback` salta al siguiente en
 * cuanto uno responde 429 o se queda sin créditos.
 *
 * El orden no es casual: Gemini primero por costo, Mistral después porque es
 * económico y multilingüe, OpenAI de última red.
 */
async function ordenarTextoConFallback(textoPlano: string): Promise<ResultadoGemini> {
  const candidatos = [
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "mistral", model: "mistral-large-latest" },
    { provider: "openai", model: "gpt-4o-mini" },
  ]
    .map((c) => ({ ...c, apiKey: getAPIKey(c.provider) ?? "" }))
    .filter((c) => c.apiKey);

  if (candidatos.length === 0) throw new Error("no hay ningún proveedor de IA configurado");

  // Aquí NO se pide JSON, a propósito. El resumen lleva saltos de línea (son
  // los que separan sus secciones) y un salto sin escapar dentro de un string
  // JSON lo rompe: "Bad control character in string literal". Como el texto
  // extraído ya lo tenemos nosotros, lo único que falta es el resumen — y eso
  // se pide en texto plano, que no tiene forma de romperse.
  const { result, usedProvider } = await callAIWithFallback(
    candidatos,
    `${PROMPT_ORDENAR}\n\nResponde ÚNICAMENTE con el texto ordenado, sin JSON, sin markdown, sin preámbulo.`,
    `Documento:\n\n${textoPlano}`,
  );

  console.log(`[process-client-document] Documento ordenado con ${usedProvider}`);

  const resumen = (typeof result === "string" ? result : String(result ?? "")).trim();
  if (!resumen) throw new Error("el modelo no devolvió un resumen");

  // El texto extraído es SIEMPRE el nuestro, nunca lo que el modelo reescriba.
  return { texto_extraido: textoPlano, resumen };
}

/** Segundos que Gemini pide esperar en un 429, si lo dice. Viene en el cuerpo
 *  como "Please retry in 46.79s" o en `retryDelay: "47s"`. */
function segundosDeEspera(cuerpo: string): number | null {
  const m = cuerpo.match(/retry in ([\d.]+)s/i) ?? cuerpo.match(/"retryDelay"\s*:\s*"(\d+)s"/);
  const s = m ? Number(m[1]) : NaN;
  return Number.isFinite(s) ? Math.min(Math.ceil(s), 60) : null;
}

const REINTENTOS_429 = 2;

async function llamarGemini(
  parts: Record<string, unknown>[],
  intento = 0,
): Promise<ResultadoGemini> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no configurada");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT_SISTEMA }] },
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 32768,
          responseMimeType: "application/json",
          // CRÍTICO del proyecto: sin esto Gemini 2.5 Flash trunca el output
          // (mismo fix que finance-ai/_shared/skills/executor.ts).
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();

    // 429 = cuota por minuto agotada. Es transitorio y la propia respuesta dice
    // cuánto esperar, así que se espera y se reintenta en vez de dar el
    // documento por fallido: para el cliente, "no pudimos leerlo" cuando en
    // realidad solo había que esperar medio minuto es un error incomprensible.
    if (res.status === 429 && intento < REINTENTOS_429) {
      const espera = segundosDeEspera(errText) ?? 20 * (intento + 1);
      console.warn(
        `[process-client-document] Gemini sin cuota; reintento ${intento + 1}/${REINTENTOS_429} en ${espera}s`,
      );
      await new Promise((r) => setTimeout(r, espera * 1000));
      return llamarGemini(parts, intento + 1);
    }

    if (res.status === 429) {
      throw new Error(
        "el servicio de lectura está saturado ahora mismo. Espera un minuto y vuelve a subirlo",
      );
    }

    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const candidato = data?.candidates?.[0];
  const texto = candidato?.content?.parts?.[0]?.text;
  if (!texto) {
    const razon = candidato?.finishReason ? ` (finishReason: ${candidato.finishReason})` : "";
    throw new Error(`Gemini no devolvió contenido${razon}`);
  }

  const parsed = JSON.parse(limpiarJson(texto));
  if (typeof parsed.resumen !== "string" || !parsed.resumen.trim()) {
    throw new Error("Gemini no devolvió un resumen válido");
  }
  return {
    texto_extraido: typeof parsed.texto_extraido === "string" ? parsed.texto_extraido : "",
    resumen: parsed.resumen.trim(),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const admin: Sb = createClient(SUPABASE_URL, SERVICE_KEY);

  let documentId: string | null = null;
  try {
    const body = await req.json();
    documentId = body?.document_id ? String(body.document_id) : null;
  } catch {
    return json(req, { error: "body_invalido" }, 400);
  }
  if (!documentId) return json(req, { error: "document_id es requerido" }, 400);

  const { data: documento, error: fetchError } = await admin
    .from("client_documents")
    .select("id, organization_id, client_id, storage_path, file_name, mime_type, file_size")
    .eq("id", documentId)
    .maybeSingle();

  if (fetchError || !documento) {
    return json(req, { error: "document_not_found" }, 404);
  }

  // ── Autorización: staff de la organización o el cliente dueño del documento ──
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? null;
  if (!token) return json(req, { error: "unauthorized" }, 401);

  if (token !== SERVICE_KEY) {
    const userClient: Sb = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } = { user: null } } = await userClient.auth.getUser();
    if (!user) return json(req, { error: "unauthorized" }, 401);

    const [esStaff, esDueno] = await Promise.all([
      esStaffDeOrg(admin, user.id, documento.organization_id),
      esUsuarioDelCliente(admin, user.id, documento.client_id),
    ]);
    if (!esStaff && !esDueno) {
      return json(req, { error: "forbidden" }, 403);
    }
  }

  await admin.from("client_documents").update({ estado: "procesando" }).eq("id", documentId);

  try {
    const { data: archivo, error: downloadError } = await admin.storage
      .from(BUCKET)
      .download(documento.storage_path);
    if (downloadError || !archivo) {
      throw new Error(`no se pudo descargar el archivo: ${downloadError?.message || "vacío"}`);
    }

    const mimeType = documento.mime_type as string;
    let resultado: ResultadoGemini;

    if (MIME_TIPOS_TEXTO.has(mimeType)) {
      // .txt / .md / .csv — se leen directo; la IA solo los ordena.
      const textoPlano = await archivo.text();
      resultado = await ordenarTextoConFallback(textoPlano);
    } else if (MIME_OOXML.has(mimeType)) {
      // Word/Excel/PowerPoint: se descomprimen y se saca el texto aquí. Mandar
      // el binario a Gemini no sirve — devuelve 400 "Unsupported MIME type".
      const bytes = new Uint8Array(await archivo.arrayBuffer());
      const textoPlano = await extraerTextoOoxml(bytes, MIME_OOXML.get(mimeType)!);

      if (!textoPlano) {
        throw new Error(
          "el documento no tiene texto que podamos leer (puede ser solo imágenes o estar vacío)",
        );
      }

      resultado = await ordenarTextoConFallback(textoPlano);
    } else if (MIME_GEMINI_NATIVO.has(mimeType)) {
      const buffer = await archivo.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      resultado = await llamarGemini([
        { text: "Analiza este documento." },
        { inline_data: { mime_type: mimeType, data: base64 } },
      ]);
    } else if (MIME_OFFICE_ANTIGUO.has(mimeType)) {
      // .doc/.xls/.ppt anteriores a 2007: binarios propietarios, ni ZIP ni
      // legibles por el modelo. El mensaje dice qué hacer, no qué falló.
      throw new Error(
        "este formato es muy antiguo. Ábrelo y guárdalo como PDF o .docx, y vuelve a subirlo",
      );
    } else {
      throw new Error(`tipo de archivo no soportado: ${mimeType}`);
    }

    await admin.from("client_documents").update({
      texto_extraido: resultado.texto_extraido,
      resumen: resultado.resumen,
      estado: "listo",
      error_detalle: null,
    }).eq("id", documentId);

    return json(req, { success: true, document_id: documentId, resumen: resultado.resumen });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "error procesando el documento";
    console.error(`[process-client-document] ${documentId}:`, mensaje);

    await admin.from("client_documents").update({
      estado: "error",
      error_detalle: mensaje.slice(0, 1500),
    }).eq("id", documentId);

    return json(req, { success: false, error: mensaje }, 500);
  }
});
