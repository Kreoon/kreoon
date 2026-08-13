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
//   4. Extrae texto:
//      · .txt / .md               → se lee directo, sin IA.
//      · PDF / Word / Excel / PPT → Gemini 2.5 Flash vía `inline_data`.
//        Gemini solo garantiza soporte nativo de PDF; para Word/Excel/PPT se
//        intenta igual (pedido explícito) y si Gemini lo rechaza, se degrada
//        a estado 'error' con detalle claro — no revienta la función.
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

// deno-lint-ignore no-explicit-any
type Sb = any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");

const BUCKET = "client-documents";
const MAX_RESUMEN_PALABRAS = 400;

/** Mismo criterio de staff que `pipeline-orchestrator` (organization_members + organization_member_roles). */
const ROLES_STAFF = [
  "admin",
  "team_leader",
  "strategist",
  "digital_strategist",
  "creative_strategist",
];

/** Gemini garantiza soporte nativo de PDF vía `inline_data`; Word/Excel/PPT se
 *  intentan igual por pedido explícito y se degradan si Gemini los rechaza. */
const MIME_TIPOS_BINARIOS = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const MIME_TIPOS_TEXTO = new Set(["text/plain", "text/markdown", "text/csv"]);

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
  return s.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
}

const PROMPT_SISTEMA = `Eres un asistente que analiza documentos que un cliente sube como contexto para su marca (briefs, catálogos, manuales de marca, listas de precios, guías de estilo, etc.). Tu tarea tiene dos partes:

1. Extraer TODO el texto legible del documento, tal cual está (sin resumir ni opinar).
2. Generar un resumen ejecutivo en español, de máximo ${MAX_RESUMEN_PALABRAS} palabras, útil como CONTEXTO DE MARKETING: qué es el documento y qué información aporta sobre la marca, el producto, el público objetivo o las reglas de comunicación (tono, cosas que se deben o no se deben decir, etc.). Si el documento no aporta nada relevante a marketing, dilo explícitamente en el resumen.

Responde ÚNICAMENTE con un JSON con esta forma exacta, sin markdown ni texto adicional:
{"texto_extraido": "...", "resumen": "..."}`;

async function llamarGemini(parts: Record<string, unknown>[]): Promise<ResultadoGemini> {
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
      // .txt / .md — se lee directo, sin IA, y solo se le pide el resumen a Gemini.
      const textoPlano = await archivo.text();
      resultado = await llamarGemini([
        { text: `Documento (texto plano, cópialo literal en "texto_extraido"):\n\n${textoPlano}` },
      ]);
      // El texto extraído es el original exacto, nunca lo que Gemini "reescriba".
      resultado.texto_extraido = textoPlano;
    } else if (MIME_TIPOS_BINARIOS.has(mimeType)) {
      const buffer = await archivo.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      try {
        resultado = await llamarGemini([
          { text: "Analiza este documento." },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ]);
      } catch (geminiError) {
        // Degradación elegante: solo PDF tiene soporte nativo garantizado en
        // Gemini vía inline_data; Word/Excel/PPT pueden ser rechazados — se
        // deja constancia clara en vez de reventar la función.
        throw new Error(
          `Gemini no pudo procesar este tipo de archivo (${mimeType}): ${(geminiError as Error).message}`,
        );
      }
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
