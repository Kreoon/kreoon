// ============================================================================
// pipeline-orchestrator — máquina de estados del pipeline autónomo del cliente
// ============================================================================
//
// Recorrido: onboarding → adn → estrategia → guiones → produccion.
// El run avanza solo entre etapas pero se DETIENE en cada una esperando la
// aprobación del cliente (`stage_status = 'awaiting_client'`).
//
// Tablas (ya aplicadas, ver 20260812060000_client_pipeline_runs.sql):
//   · client_pipeline_runs         — una fila por cliente (UNIQUE client_id)
//   · client_pipeline_stage_events — histórico append-only
//
// Acciones (POST { action, ... }):
//   start           { client_id, onboarding_form_id?, organization_id }
//                   Staff de la organización, o el dueño del cliente (fila en
//                   `client_users`) arrancando el SUYO — su `client_id` se
//                   valida contra el vínculo real, nunca se confía en el body
//                   a ciegas (ver `esUsuarioDelCliente`).
//   create_form     { client_id, organization_id }
//                   Crea la fila de `client_onboarding_forms` si el cliente no
//                   tiene ninguna vigente (no expirada, no procesada); si ya
//                   existe, la devuelve tal cual (idempotente). Mismo criterio
//                   de autorización que `start`. El `token` lo genera el
//                   DEFAULT de la columna (no se genera acá).
//   save_form_section { client_id, section, data }
//                   Guarda una sección desde una sesión autenticada (staff o
//                   dueño del cliente) — el equivalente con sesión al "Modo 1"
//                   de client-onboarding-submit (guardado con token público).
//                   Mismo merge y misma sanitización: se importan de
//                   _shared/client-onboarding.ts para que las dos rutas de
//                   guardado no se puedan desincronizar en silencio.
//   submit_form     { client_id }
//                   Envío final con sesión: valida los mismos campos
//                   obligatorios que client-onboarding-submit (misma fuente
//                   compartida) y, si pasan, marca 'submitted' y encadena
//                   `start` con un self-invoke fire-and-forget (mismo patrón
//                   que `invocarSinEsperar`/`programarAutoPoll`) en vez de
//                   duplicar su lógica — `start` ya es idempotente. Solo en
//                   el PRIMER envío también notifica al staff con
//                   `notificarEquipo` (mismo texto que la ruta pública): el
//                   cliente no depende del staff para arrancar, pero el staff
//                   sigue enterándose — "autónomo" no es "desatendido".
//   advance         { run_id }
//   approve         { run_id, stage, actor, actor_id }
//   request_changes { run_id, stage, feedback, actor_id }
//   retry_stage     { run_id, stage? }
//                   Reintenta una etapa caída ('error' o 'paused_no_tokens').
//                   Retoma donde se quedó — no repite las fases ya hechas — y
//                   no gasta una de las 3 regeneraciones: mide tropiezos del
//                   sistema, no cambios pedidos por el cliente.
//   poll            { run_id, auto?, ciclo? }      ← interno / portal
//                   `auto:true` (solo service role) encadena el auto-poll que
//                   reconcilia las etapas asíncronas sin depender de que haya
//                   un cliente con el portal abierto. Ver "Auto-poll" abajo.
//   status          { run_id }
//
// FUNCIONES ENCADENADAS Y SU AUTH REAL (contratos verificados):
//   generate-client-dna    { client_id, transcription }  — solo exige header
//                          Authorization presente → sirve el service role.
//   generate-product-dna   { productDnaId }              — sin auth. OJO:
//                          INSERTA en `products` en CADA llamada. Por eso el
//                          run guarda product_id y product_dna_id y jamás se
//                          la vuelve a invocar si ya hay producto.
//   generate-full-research { product_id }                — 202 + 21 fases async.
//                          Exige JWT de un usuario con ownership del producto
//                          (staff de la org o fila en client_users).
//   generate-script        { organizationId, ... }       — exige JWT de un
//                          usuario MIEMBRO de la organización. El service role
//                          NO sirve (assertOrgMembership necesita un user id).
//
// ── Sobre el JWT que necesitan generate-full-research y generate-script ─────
// El pipeline avanza por acciones de humanos (aprobación del cliente o del
// staff), así que casi siempre hay un Authorization utilizable:
//   · caller staff  → su JWT sirve para las dos.
//   · caller cliente→ su JWT sirve para generate-full-research (client_users),
//                     pero NO para generate-script (no es miembro de la org).
//   · caller interno (poll con service role) → no hay JWT de usuario.
// Para esos dos casos se acuña un JWT de un miembro staff de la organización
// con el flujo admin `generateLink(magiclink)` + `verifyOtp` (ver
// `resolverAuthStaff`). Es una impersonación acotada y deliberada: sin ella la
// etapa de guiones no puede ser autónoma. Se puede fijar qué usuario se usa con
// el secret opcional PIPELINE_STAFF_USER_ID; si no, se toma un admin de la org.
//
// ── Notificaciones ─────────────────────────────────────────────────────────
// SIEMPRE `user_notifications` con type 'content_update' (uno ya mapeado en el
// frontend) y entity_type 'client_pipeline'. Un type nuevo revienta
// KiroNotificationBridge y tumba el lote de 50 notificaciones.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import {
  findMissingRequiredFields,
  sanitizeDeep,
  VALID_SECTIONS,
} from "../_shared/client-onboarding.ts";

// deno-lint-ignore no-explicit-any
type Sb = any;
// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

type Etapa = "onboarding" | "adn" | "estrategia" | "guiones" | "produccion";
type EstadoEtapa =
  | "generating"
  | "awaiting_client"
  | "changes_requested"
  | "approved"
  | "error"
  | "paused_no_tokens";
type EventoEtapa =
  | "generated"
  | "approved"
  | "changes_requested"
  | "error"
  | "escalated"
  | "paused_no_tokens";
type Actor = "system" | "client" | "staff";

interface Run {
  id: string;
  organization_id: string;
  client_id: string;
  onboarding_form_id: string | null;
  product_id: string | null;
  stage: Etapa;
  stage_status: EstadoEtapa;
  client_dna_id: string | null;
  product_dna_id: string | null;
  stage_attempts: Record<string, number>;
  error_log: Json[];
  last_feedback: string | null;
  scripts_target: number;
}

/** Orden real del pipeline. 'onboarding' es el punto de partida del run. */
const ORDEN_ETAPAS: Etapa[] = ["onboarding", "adn", "estrategia", "guiones", "produccion"];

/** Roles que cuentan como staff (mismos que client_onboarding_forms). */
const ROLES_STAFF = [
  "admin",
  "team_leader",
  "strategist",
  "digital_strategist",
  "creative_strategist",
];

/** Al 4º intento se escala en vez de regenerar. */
const LIMITE_REGENERACIONES = 4;

// ── Auto-poll ──────────────────────────────────────────────────────────────
// El ADN y la estrategia son asíncronos (la estrategia tarda 5–15 min en sus
// 21 fases) y nadie devuelve un callback al terminar. Si la reconciliación
// dependiera solo del portal, un run cuyo cliente cerró la pestaña se quedaría
// en 'generating' para siempre — un run colgado en silencio.
// Por eso, al entrar en 'generating' la función se auto-invoca en cadena con el
// service role: cada eslabón duerme un intervalo, reconcilia y encadena el
// siguiente mientras siga generando. Es el mismo patrón de self-invocation que
// ya usa generate-full-research entre fases.
const INTERVALO_AUTOPOLL_MS = 25_000;
/** 60 × 25 s ≈ 25 min. Pasado ese techo el run se marca en error, no se cuelga. */
const MAX_CICLOS_AUTOPOLL = 60;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

const NOTIFICATION_TYPE = "content_update";
const NOTIFICATION_ENTITY_TYPE = "client_pipeline";

/** Fases CAST del lote inicial de guiones (se cicla si scripts_target > 5). */
const CICLO_SPHERE = ["engage", "engage", "solution", "remarketing", "fidelize"];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ahora = () => new Date().toISOString();

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/** Recorta y aplana un valor cualquiera a texto para los prompts. */
function aTexto(valor: unknown, maxChars = 6000): string {
  if (valor === null || valor === undefined) return "";
  const s = typeof valor === "string" ? valor : JSON.stringify(valor);
  return s.length > maxChars ? `${s.slice(0, maxChars)}…` : s;
}

// ---------------------------------------------------------------------------
// Transcripción para el ADN — mismo texto que compone client-onboarding-process
// ---------------------------------------------------------------------------
async function componerTextoParaAdn(admin: Sb, formData: Json, clientId: string): Promise<string> {
  const marca = (formData.marca ?? {}) as Json;
  const prod = (formData.producto ?? {}) as Json;
  const cont = (formData.contenido ?? {}) as Json;
  const aud = (prod.audiencia ?? {}) as Json;

  const lista = (v: unknown) =>
    Array.isArray(v) ? v.filter((x) => String(x ?? "").trim()).join(", ") : "";

  const linea = (etiqueta: string, valor: unknown) => {
    const v = typeof valor === "string" ? valor.trim() : lista(valor);
    return v ? `${etiqueta}: ${v}` : null;
  };

  const texto = [
    "== MARCA ==",
    linea("Historia", marca.historia),
    linea("Tono deseado", marca.tono_deseado),
    linea("Tono a evitar", marca.tono_evitar),
    linea("Competidores", marca.competidores),
    linea("Referentes", marca.referentes),
    linea("Restricciones legales", marca.restricciones_legales),
    linea("Instagram", marca.instagram),
    linea("TikTok", marca.tiktok),
    linea("Sitio web", marca.website),
    "",
    "== QUE VENDE ==",
    linea("Tipo de oferta", prod.tipo_oferta),
    linea("Nombre", prod.nombre),
    linea("Presentaciones o planes", prod.presentaciones),
    linea("Que incluye", prod.componentes),
    linea("Beneficios", prod.beneficios),
    linea("Diferenciales", prod.diferenciales),
    linea("Precio", prod.precio),
    linea("Promociones", prod.promociones),
    linea("Garantías", prod.garantias),
    linea("Dónde se compra", prod.link_tienda),
    linea("Testimonios", prod.testimonios),
    linea("Objeciones frecuentes", prod.objeciones),
    "",
    "== CLIENTE IDEAL ==",
    linea("Edad", aud.edad),
    linea("Género", aud.genero),
    linea("País", aud.pais),
    linea("Problema que le resolvemos", aud.dolor),
    "",
    "== CONTENIDO ==",
    linea("Objetivo", cont.objetivo),
    linea("Plataformas", cont.plataformas),
    linea("Qué probaron antes", cont.historial_contenido),
  ].filter((l) => l !== null).join("\n");

  // Documentos que el cliente subió como contexto (client_documents,
  // procesados por process-client-document): solo los que ya tienen resumen
  // listo y cuyo alcance incluye 'marca'. Si no hay ninguno, el texto queda
  // EXACTAMENTE igual que antes — sin sección vacía.
  const { data: documentos } = await admin
    .from("client_documents")
    .select("file_name, resumen, texto_extraido")
    .eq("client_id", clientId)
    .eq("estado", "listo")
    .in("alcance", ["marca", "todo"])
    .not("resumen", "is", null);

  type Doc = { file_name: string; resumen: string; texto_extraido: string | null };
  const utiles = ((documentos ?? []) as Doc[]).filter((d) => d.resumen?.trim());
  if (utiles.length === 0) return texto;

  // Va el documento ENTERO mientras quepa, no solo su resumen. En un brief, el
  // valor está en el detalle —"di 'En X te ayudamos a…', no 'Los agentes de X
  // permiten…'"— y eso es lo primero que se pierde al resumir. El resumen
  // queda de reserva para los documentos largos (un catálogo de 200 páginas no
  // cabe en el prompt ni aporta tanto).
  const TOPE_POR_DOCUMENTO = 12_000;
  const TOPE_TOTAL = 30_000;

  let gastado = 0;
  const bloques: string[] = [];

  for (const doc of utiles) {
    const completo = (doc.texto_extraido ?? "").trim();
    const cabe = completo && completo.length <= TOPE_POR_DOCUMENTO &&
      gastado + completo.length <= TOPE_TOTAL;

    const cuerpo = cabe ? completo : doc.resumen.trim();
    gastado += cuerpo.length;
    bloques.push(`--- ${doc.file_name} ---\n${cuerpo}`);

    if (gastado >= TOPE_TOTAL) break;
  }

  const seccionDocumentos = [
    "",
    "== DOCUMENTOS QUE COMPARTIÓ EL CLIENTE ==",
    "Lo que digan estos documentos MANDA sobre lo que se deduzca del resto:",
    "los escribió el propio cliente para explicar cómo quiere que se hable de su marca.",
    "",
    ...bloques,
  ].join("\n");

  return `${texto}\n${seccionDocumentos}`;
}

// ---------------------------------------------------------------------------
// Persistencia: eventos, errores, notificaciones
// ---------------------------------------------------------------------------
async function registrarEvento(
  admin: Sb,
  runId: string,
  stage: Etapa,
  event: EventoEtapa,
  extra: { feedback?: string | null; payload?: Json; actor?: Actor; actorId?: string | null } = {},
): Promise<void> {
  const { error } = await admin.from("client_pipeline_stage_events").insert({
    run_id: runId,
    stage,
    event,
    feedback: extra.feedback ?? null,
    payload: extra.payload ?? {},
    actor: extra.actor ?? "system",
    actor_id: extra.actorId ?? null,
  });
  if (error) console.error("[pipeline] no se pudo registrar el evento:", error.message);
}

/** Notifica a todo el staff habilitado de la organización. */
async function notificarEquipo(
  admin: Sb,
  organizationId: string,
  titulo: string,
  mensaje: string,
  entityId: string,
): Promise<void> {
  try {
    const [{ data: miembros }, { data: rolesExtra }] = await Promise.all([
      admin.from("organization_members").select("user_id")
        .eq("organization_id", organizationId).in("role", ROLES_STAFF),
      admin.from("organization_member_roles").select("user_id")
        .eq("organization_id", organizationId).in("role", ROLES_STAFF),
    ]);
    const ids = [
      ...new Set([
        ...((miembros ?? []) as { user_id: string }[]).map((m) => m.user_id),
        ...((rolesExtra ?? []) as { user_id: string }[]).map((m) => m.user_id),
      ]),
    ];
    if (ids.length === 0) return;

    await admin.from("user_notifications").insert(
      ids.map((userId) => ({
        user_id: userId,
        organization_id: organizationId,
        type: NOTIFICATION_TYPE,
        title: titulo,
        message: mensaje,
        entity_type: NOTIFICATION_ENTITY_TYPE,
        entity_id: entityId,
      })),
    );
  } catch (e) {
    console.error("[pipeline] notificación al equipo falló:", (e as Error).message);
  }
}

/** Notifica a los usuarios del portal de ese cliente. */
async function notificarCliente(
  admin: Sb,
  run: Run,
  titulo: string,
  mensaje: string,
): Promise<void> {
  try {
    const { data: usuarios } = await admin
      .from("client_users").select("user_id").eq("client_id", run.client_id);
    const ids = [...new Set(((usuarios ?? []) as { user_id: string }[]).map((u) => u.user_id))];
    if (ids.length === 0) return;

    await admin.from("user_notifications").insert(
      ids.map((userId) => ({
        user_id: userId,
        organization_id: run.organization_id,
        type: NOTIFICATION_TYPE,
        title: titulo,
        message: mensaje,
        entity_type: NOTIFICATION_ENTITY_TYPE,
        entity_id: run.id,
      })),
    );
  } catch (e) {
    console.error("[pipeline] notificación al cliente falló:", (e as Error).message);
  }
}

async function actualizarRun(admin: Sb, runId: string, cambios: Json): Promise<Run> {
  const { data, error } = await admin
    .from("client_pipeline_runs").update(cambios).eq("id", runId).select("*").single();
  if (error) throw new Error(`no se pudo actualizar el run: ${error.message}`);
  return data as Run;
}

/**
 * Un fallo NUNCA deja el run colgado en silencio: estado 'error', entrada en
 * error_log, evento 'error' y notificación al equipo.
 */
async function marcarError(
  admin: Sb,
  run: Run,
  stage: Etapa,
  mensaje: string,
  detalle?: unknown,
): Promise<Run> {
  console.error(`[pipeline] ${run.id} · ${stage} · ${mensaje}`, detalle ?? "");

  const log = Array.isArray(run.error_log) ? run.error_log : [];
  const actualizado = await actualizarRun(admin, run.id, {
    stage,
    stage_status: "error",
    error_log: [...log.slice(-49), { stage, at: ahora(), error: mensaje, detail: aTexto(detalle, 1500) }],
  });

  await registrarEvento(admin, run.id, stage, "error", {
    payload: { error: mensaje, detail: aTexto(detalle, 1500) },
  });
  await notificarEquipo(
    admin,
    run.organization_id,
    "Pipeline detenido por un error",
    `La etapa "${stage}" falló: ${mensaje}. Revisa el pipeline del cliente para reintentarla.`,
    run.id,
  );
  return actualizado;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
interface ContextoAuth {
  authHeader: string | null;
  token: string | null;
  userId: string | null;
  esServiceRole: boolean;
}

async function leerContextoAuth(req: Request): Promise<ContextoAuth> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? null;
  if (!token) return { authHeader: null, token: null, userId: null, esServiceRole: false };

  if (token === SERVICE_KEY) {
    return { authHeader, token, userId: null, esServiceRole: true };
  }

  const userClient: Sb = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } = { user: null } } = await userClient.auth.getUser();
  return { authHeader, token, userId: user?.id ?? null, esServiceRole: false };
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

/**
 * Devuelve un `Authorization` que sirva para funciones que exigen un usuario
 * MIEMBRO de la organización (generate-script, y generate-full-research cuando
 * la llamada es interna).
 *
 *  1. Si el caller ya es staff de la org, se reutiliza su header: cero efectos
 *     secundarios y es el camino normal cuando aprueba el equipo.
 *  2. Si no (cliente aprobando, o poll interno), se acuña un JWT de un miembro
 *     staff vía generateLink(magiclink) + verifyOtp. El token de un solo uso se
 *     consume en el acto; no cambia credenciales del usuario.
 *
 * Devuelve null si no hay forma de conseguirlo (la etapa se marca en error).
 */
async function resolverAuthStaff(
  admin: Sb,
  ctx: ContextoAuth,
  organizationId: string,
): Promise<string | null> {
  if (ctx.authHeader && ctx.userId && await esStaffDeOrg(admin, ctx.userId, organizationId)) {
    return ctx.authHeader;
  }

  try {
    const fijado = Deno.env.get("PIPELINE_STAFF_USER_ID");
    let staffUserId = fijado || null;

    if (!staffUserId) {
      const { data } = await admin
        .from("organization_members").select("user_id, role")
        .eq("organization_id", organizationId).in("role", ROLES_STAFF)
        .order("role", { ascending: true }).limit(1).maybeSingle();
      staffUserId = data?.user_id ?? null;
    }
    if (!staffUserId) return null;

    const { data: usuario } = await admin.auth.admin.getUserById(staffUserId);
    const email = usuario?.user?.email;
    if (!email) return null;

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) return null;

    const anon: Sb = createClient(SUPABASE_URL, ANON_KEY);
    const { data: sesion, error: otpError } = await anon.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    const accessToken = sesion?.session?.access_token;
    if (otpError || !accessToken) return null;

    return `Bearer ${accessToken}`;
  } catch (e) {
    console.error("[pipeline] no se pudo resolver un JWT de staff:", (e as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Llamadas a otras edge functions
// ---------------------------------------------------------------------------
interface RespuestaFn {
  ok: boolean;
  status: number;
  body: Json;
  error?: string;
}

async function invocar(
  nombre: string,
  body: Json,
  authHeader: string,
  timeoutMs = 30_000,
): Promise<RespuestaFn> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${nombre}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body: payload as Json };
  } catch (e) {
    return { ok: false, status: 0, body: {}, error: (e as Error).message };
  }
}

/**
 * Arranca (o continúa) la cadena de auto-poll. Fire-and-forget con service
 * role: `auto:true` solo se acepta si el Bearer es exactamente el service key,
 * para que nadie desde fuera pueda montar una cadena infinita.
 *
 * Puede haber dos cadenas vivas si dos acciones entran en 'generating' a la
 * vez; no es un problema: cada eslabón es idempotente y todos se apagan en
 * cuanto el run sale de 'generating'.
 */
function programarAutoPoll(runId: string, ciclo: number): void {
  invocarSinEsperar(
    "pipeline-orchestrator",
    { action: "poll", run_id: runId, auto: true, ciclo },
    `Bearer ${SERVICE_KEY}`,
  );
}

/** Dispara sin esperar respuesta (funciones que tardan minutos). */
function invocarSinEsperar(nombre: string, body: Json, authHeader: string): void {
  fetch(`${SUPABASE_URL}/functions/v1/${nombre}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body: JSON.stringify(body),
  }).catch((err) => console.error(`[pipeline] disparo de ${nombre} falló:`, err));
}

// ---------------------------------------------------------------------------
// Transición a "esperando al cliente"
// ---------------------------------------------------------------------------
const TITULO_ETAPA: Record<Etapa, string> = {
  onboarding: "onboarding",
  adn: "el ADN de tu marca",
  estrategia: "tu estrategia",
  guiones: "tus guiones",
  produccion: "la producción",
};

async function pasarAEsperandoCliente(
  admin: Sb,
  run: Run,
  etapa: Etapa,
  payload: Json,
): Promise<Run> {
  const actualizado = await actualizarRun(admin, run.id, {
    stage: etapa,
    stage_status: "awaiting_client",
  });
  await registrarEvento(admin, run.id, etapa, "generated", { payload });
  await notificarCliente(
    admin,
    run,
    "Tienes algo para revisar",
    `Ya está listo ${TITULO_ETAPA[etapa]}. Entra al portal para aprobarlo o pedir cambios.`,
  );
  return actualizado;
}

// ---------------------------------------------------------------------------
// ETAPA 1 — ADN (marca + producto)
// ---------------------------------------------------------------------------
//
// Idempotencia:
//   · client_dna  → si run.client_dna_id ya existe, no se regenera.
//   · product_dna → se reutiliza el que ya creó client-onboarding-process
//                   (form.processing.pasos.adn.product_dna_id) antes de crear
//                   uno nuevo.
//   · products    → generate-product-dna INSERTA un producto en cada llamada.
//                   Solo se dispara si el run no tiene product_id NI un
//                   product_dna en curso. El id del producto se resuelve
//                   después buscando brief_data->>product_dna_id.
async function ejecutarEtapaAdn(
  admin: Sb,
  runInicial: Run,
  opciones: { feedback?: string | null } = {},
): Promise<Run> {
  let run = runInicial;

  // Cerrojo: si ya hay una generación en curso, no se dispara otra.
  const { data: tomado } = await admin
    .from("client_pipeline_runs")
    .update({ stage: "adn", stage_status: "generating", adn_started_at: ahora() })
    .eq("id", run.id).neq("stage_status", "generating").select("*");
  if (!tomado || tomado.length === 0) {
    console.log(`[pipeline] ${run.id} · adn ya estaba generando; no se repite`);
    return run;
  }
  run = tomado[0] as Run;

  // ── Datos de origen: el formulario de onboarding ──────────────────────────
  let formData: Json = {};
  if (run.onboarding_form_id) {
    const { data: form } = await admin
      .from("client_onboarding_forms")
      .select("form_data, processing")
      .eq("id", run.onboarding_form_id).maybeSingle();
    formData = (form?.form_data ?? {}) as Json;

    // Reutiliza el product_dna que ya haya creado client-onboarding-process.
    if (!run.product_dna_id) {
      const previo = ((form?.processing ?? {}) as Json)?.pasos?.adn?.product_dna_id;
      if (typeof previo === "string" && previo) {
        run = await actualizarRun(admin, run.id, { product_dna_id: previo });
      }
    }
  }

  let transcripcion = await componerTextoParaAdn(admin, formData, run.client_id);
  // Las líneas con contenido real son las que trae `linea()`, con formato
  // "Etiqueta: valor". Sin ninguna, el formulario está vacío.
  const tieneDatos = transcripcion.split("\n").some((l) => /^[^=\s][^:]*: .+/.test(l));
  if (!tieneDatos) {
    return marcarError(
      admin, run, "adn",
      "el formulario de onboarding no tiene datos suficientes para generar el ADN",
    );
  }
  if (opciones.feedback) {
    transcripcion += `\n\n== AJUSTES PEDIDOS POR EL CLIENTE ==\n${opciones.feedback}`;
    // Regenerar la etapa significa un ADN de marca nuevo. `generate-client-dna`
    // versiona por su cuenta (desactiva el anterior e inserta version+1), así
    // que basta con soltar la referencia para que se vuelva a generar.
    // El PRODUCTO no se toca: generate-product-dna insertaría otro `products`.
    if (run.client_dna_id) {
      run = await actualizarRun(admin, run.id, { client_dna_id: null });
    }
  }

  // ── 1. ADN de marca ──────────────────────────────────────────────────────
  if (!run.client_dna_id) {
    // Marca previa a la llamada: si hay que caer al plan B, solo vale un ADN
    // creado DESPUÉS de este instante (si no, en una regeneración se
    // recuperaría la versión vieja y el feedback se perdería en silencio).
    const desde = ahora();

    // generate-client-dna solo exige que haya un header Authorization: el
    // service role vale y evita depender de quién disparó la etapa.
    const res = await invocar(
      "generate-client-dna",
      { client_id: run.client_id, transcription: transcripcion },
      `Bearer ${SERVICE_KEY}`,
      120_000,
    );

    if (res.ok && res.body?.dna_id) {
      run = await actualizarRun(admin, run.id, { client_dna_id: res.body.dna_id });
    } else {
      // Puede haber terminado igual y solo habernos cortado el timeout: la
      // función inserta la fila con is_active=true, así que se busca.
      const { data: dna } = await admin
        .from("client_dna").select("id")
        .eq("client_id", run.client_id).eq("is_active", true)
        .gte("created_at", desde)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (dna?.id) {
        run = await actualizarRun(admin, run.id, { client_dna_id: dna.id });
      } else {
        return marcarError(
          admin, run, "adn",
          "generate-client-dna no devolvió un ADN",
          res.error ?? res.body,
        );
      }
    }
  }

  // ── 2. ADN de producto (y con él, la fila de `products`) ─────────────────
  if (!run.product_id) {
    if (!run.product_dna_id) {
      const prod = (formData.producto ?? {}) as Json;
      const cont = (formData.contenido ?? {}) as Json;

      const { data: dna, error: dnaError } = await admin
        .from("product_dna")
        .insert({
          client_id: run.client_id,
          service_group: "content_creation",
          service_types: Array.isArray(cont.plataformas) ? cont.plataformas : [],
          wizard_responses: {
            origen: "client_pipeline",
            pipeline_run_id: run.id,
            onboarding_form_id: run.onboarding_form_id,
            product_name: typeof prod.nombre === "string" ? prod.nombre : undefined,
            platforms: Array.isArray(cont.plataformas) ? cont.plataformas : [],
            goals: cont.objetivo ? [cont.objetivo] : [],
            transcription: transcripcion,
          },
          status: "analyzing",
        })
        .select("id").single();

      if (dnaError || !dna) {
        return marcarError(admin, run, "adn", "no se pudo crear el product_dna", dnaError?.message);
      }
      run = await actualizarRun(admin, run.id, { product_dna_id: dna.id });

      // Fire-and-forget: tarda minutos. Sin auth (la función no la exige).
      invocarSinEsperar("generate-product-dna", { productDnaId: dna.id }, `Bearer ${SERVICE_KEY}`);
    }

    // El producto puede tardar minutos; el poll lo recoge.
    const productId = await buscarProductoDelDna(admin, run.product_dna_id!);
    if (productId) {
      run = await actualizarRun(admin, run.id, { product_id: productId });
    } else {
      // El producto sigue cociéndose: la cadena de auto-poll lo recoge.
      programarAutoPoll(run.id, 0);
      return await actualizarRun(admin, run.id, { stage: "adn", stage_status: "generating" });
    }
  }

  return pasarAEsperandoCliente(admin, run, "adn", {
    client_dna_id: run.client_dna_id,
    product_dna_id: run.product_dna_id,
    product_id: run.product_id,
  });
}

/** generate-product-dna deja la referencia en products.brief_data.product_dna_id. */
async function buscarProductoDelDna(admin: Sb, productDnaId: string): Promise<string | null> {
  const { data } = await admin
    .from("products").select("id")
    .eq("brief_data->>product_dna_id", productDnaId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// ETAPA 2 — ESTRATEGIA (generate-full-research, 21 fases asíncronas)
// ---------------------------------------------------------------------------
async function ejecutarEtapaEstrategia(
  admin: Sb,
  runInicial: Run,
  ctx: ContextoAuth,
  opciones: { regenerar?: boolean } = {},
): Promise<Run> {
  let run = runInicial;

  if (!run.product_id) {
    return marcarError(
      admin, run, "estrategia",
      "el run no tiene product_id: la etapa de ADN no llegó a crear el producto",
    );
  }

  // Idempotencia: si ya hay un research en curso y no es una regeneración
  // explícita, no se vuelve a arrancar (consume 1500–3500 tokens IA).
  const progreso = await leerProgresoResearch(admin, run.product_id);
  const enCurso = progreso && !progreso.error &&
    typeof progreso.step === "number" && progreso.step > 0 &&
    progreso.step < (progreso.total ?? 21);
  if (enCurso && !opciones.regenerar) {
    programarAutoPoll(run.id, 0);
    return await actualizarRun(admin, run.id, { stage: "estrategia", stage_status: "generating" });
  }

  const { data: tomado } = await admin
    .from("client_pipeline_runs")
    .update({ stage: "estrategia", stage_status: "generating", estrategia_started_at: ahora() })
    .eq("id", run.id).neq("stage_status", "generating").select("*");
  if (!tomado || tomado.length === 0) return run;
  run = tomado[0] as Run;

  // Necesita un JWT de usuario con ownership del producto. El del cliente sirve
  // (client_users); el del staff también. En llamadas internas se acuña uno.
  const auth = (ctx.authHeader && ctx.userId)
    ? ctx.authHeader
    : await resolverAuthStaff(admin, ctx, run.organization_id);
  if (!auth) {
    return marcarError(
      admin, run, "estrategia",
      "no hay un JWT de usuario válido para invocar generate-full-research",
    );
  }

  const res = await invocar(
    "generate-full-research",
    {
      product_id: run.product_id,
      include_client_dna: true,
      force_regenerate: !!opciones.regenerar,
    },
    auth,
    30_000,
  );

  // Responde 202 y sigue trabajando 5–15 min: aquí no se espera nada más.
  if (!res.ok && res.status !== 202) {
    return marcarError(
      admin, run, "estrategia",
      `generate-full-research respondió ${res.status}`,
      res.error ?? res.body,
    );
  }

  await registrarEvento(admin, run.id, "estrategia", "generated", {
    payload: { product_id: run.product_id, regenerado: !!opciones.regenerar, status: res.status },
  });
  // 5–15 min de 21 fases sin callback: la cadena de auto-poll vigila el avance.
  programarAutoPoll(run.id, 0);
  return run;
}

interface ProgresoResearch {
  step?: number;
  total?: number;
  label?: string;
  error?: boolean;
}

async function leerProgresoResearch(admin: Sb, productId: string): Promise<ProgresoResearch | null> {
  const { data } = await admin
    .from("products").select("research_progress").eq("id", productId).maybeSingle();
  const p = data?.research_progress;
  return p && typeof p === "object" ? p as ProgresoResearch : null;
}

/** "Sin tokens" no llega nunca por HTTP: ya se devolvió el 202. Se detecta acá. */
function esFaltaDeTokens(progreso: ProgresoResearch): boolean {
  const label = (progreso.label ?? "").toLowerCase();
  return label.includes("tokens insuficientes") ||
    (label.includes("token") && (label.includes("insuficien") || label.includes("saldo")));
}

// ---------------------------------------------------------------------------
// ETAPA 3 — GUIONES
// ---------------------------------------------------------------------------
//
// Idempotencia: los content_ids ya creados quedan en los eventos 'generated' de
// la etapa. Se verifican contra `content` (por si alguien borró filas) y solo se
// genera lo que falte hasta scripts_target.
// Una regeneración por feedback NO crea guiones nuevos: reescribe el `script` de
// los existentes subiendo `script_version` (no infla el board ni pierde el hilo).
async function ejecutarEtapaGuiones(
  admin: Sb,
  runInicial: Run,
  ctx: ContextoAuth,
  opciones: { feedback?: string | null } = {},
): Promise<Run> {
  let run = runInicial;

  if (!run.product_id) {
    return marcarError(admin, run, "guiones", "el run no tiene product_id");
  }

  const { data: tomado } = await admin
    .from("client_pipeline_runs")
    .update({ stage: "guiones", stage_status: "generating", guiones_started_at: ahora() })
    .eq("id", run.id).neq("stage_status", "generating").select("*");
  if (!tomado || tomado.length === 0) return run;
  run = tomado[0] as Run;

  const { data: producto, error: prodError } = await admin
    .from("products")
    .select("id, name, strategy, market_research, ideal_avatar, sales_angles, sales_angles_data, content_strategy, description")
    .eq("id", run.product_id).maybeSingle();
  if (prodError || !producto) {
    return marcarError(admin, run, "guiones", "no se encontró el producto del run", prodError?.message);
  }

  // generate-script exige un usuario miembro de la organización.
  const auth = await resolverAuthStaff(admin, ctx, run.organization_id);
  if (!auth) {
    return marcarError(
      admin, run, "guiones",
      "no hay un JWT de un miembro de la organización para invocar generate-script",
    );
  }

  const existentes = await guionesYaCreados(admin, run.id);
  const objetivo = run.scripts_target ?? 5;
  const regenerando = !!opciones.feedback && existentes.length > 0;

  const angulos: string[] = Array.isArray(producto.sales_angles) && producto.sales_angles.length > 0
    ? producto.sales_angles
    : extraerAngulos(producto.sales_angles_data);

  const base = {
    organizationId: run.organization_id,
    product_name: producto.name ?? "Producto",
    strategy: aTexto(producto.strategy || producto.content_strategy),
    market_research: aTexto(producto.market_research),
    ideal_avatar: aTexto(producto.ideal_avatar, 2000),
  };

  const creados: string[] = [];
  const actualizados: string[] = [];
  const fallos: string[] = [];

  const total = regenerando ? existentes.length : objetivo - existentes.length;
  for (let i = 0; i < total; i++) {
    const indice = regenerando ? i : existentes.length + i;
    const spherePhase = CICLO_SPHERE[indice % CICLO_SPHERE.length];
    const salesAngle = angulos.length > 0 ? angulos[indice % angulos.length] : "";

    const res = await invocar("generate-script", {
      ...base,
      sales_angle: salesAngle,
      sphere_phase: spherePhase,
      additional_context: opciones.feedback
        ? `Ajustes pedidos por el cliente sobre la versión anterior: ${opciones.feedback}`
        : "",
    }, auth, 120_000);

    const html = res.body?.script;
    if (!res.ok || typeof html !== "string" || !html.trim()) {
      fallos.push(res.error ?? res.body?.error ?? `HTTP ${res.status}`);
      continue;
    }

    if (regenerando) {
      const contentId = existentes[i];
      const { data: previo } = await admin
        .from("content").select("script_version").eq("id", contentId).maybeSingle();
      const { error } = await admin.from("content").update({
        script: html,
        script_version: (previo?.script_version ?? 1) + 1,
        script_pending_at: ahora(),
        status: "script_pending",
      }).eq("id", contentId);
      if (error) fallos.push(error.message);
      else actualizados.push(contentId);
    } else {
      // Patrón vigente del repo (CreateContentFromResearchDialog / ProductBriefWizard).
      const { data: fila, error } = await admin.from("content").insert({
        title: `${producto.name ?? "Guion"} — guion ${indice + 1}`,
        client_id: run.client_id,
        product_id: run.product_id,
        organization_id: run.organization_id,
        status: "script_pending",
        script: html,
        script_pending_at: ahora(),
        script_version: 1,
        sphere_phase: spherePhase,
        ideal_avatar: base.ideal_avatar || null,
        sales_angle: salesAngle || null,
        description: aTexto(producto.description, 500) || null,
        ai_prefilled: true,
        ai_prefilled_at: ahora(),
      }).select("id").single();

      if (error || !fila) fallos.push(error?.message ?? "insert sin id");
      else creados.push(fila.id);
    }
  }

  if (creados.length === 0 && actualizados.length === 0) {
    return marcarError(
      admin, run, "guiones",
      "no se pudo generar ningún guion",
      fallos.slice(0, 5).join(" | "),
    );
  }

  return pasarAEsperandoCliente(admin, run, "guiones", {
    content_ids: [...existentes, ...creados],
    creados,
    actualizados,
    fallos: fallos.slice(0, 5),
  });
}

/** content_ids de los eventos previos, filtrados contra las filas que existen. */
async function guionesYaCreados(admin: Sb, runId: string): Promise<string[]> {
  const { data: eventos } = await admin
    .from("client_pipeline_stage_events").select("payload")
    .eq("run_id", runId).eq("stage", "guiones").eq("event", "generated");

  const ids = [
    ...new Set(
      ((eventos ?? []) as { payload: Json }[])
        .flatMap((e) => Array.isArray(e.payload?.content_ids) ? e.payload.content_ids : [])
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  if (ids.length === 0) return [];

  const { data: vivos } = await admin.from("content").select("id").in("id", ids);
  const vivosSet = new Set(((vivos ?? []) as { id: string }[]).map((c) => c.id));
  return ids.filter((id) => vivosSet.has(id));
}

// ── Aprobación GUION A GUION (la que usa el portal del cliente) ────────────
//
// El portal aprueba/rechaza de a un `content_id`. La etapa 'guiones' solo se
// da por aprobada cuando NINGÚN guion del lote sigue en 'script_pending'.
// Se mira el lote del run (content_ids de los eventos), no todo el cliente:
// el cliente puede tener contenido en 'script_pending' de otros flujos.

/** Valida que el content_id pertenezca al lote de este run. */
async function guionDelRun(admin: Sb, runId: string, contentId: string): Promise<boolean> {
  const lote = await guionesYaCreados(admin, runId);
  return lote.includes(contentId);
}

/** content_ids del lote que siguen esperando aprobación. */
async function guionesPendientes(admin: Sb, runId: string): Promise<string[]> {
  const lote = await guionesYaCreados(admin, runId);
  if (lote.length === 0) return [];
  const { data } = await admin
    .from("content").select("id, status").in("id", lote);
  return ((data ?? []) as { id: string; status: string }[])
    .filter((c) => c.status === "script_pending")
    .map((c) => c.id);
}

/** Regenera UN guion incorporando el feedback. No crea filas nuevas. */
async function regenerarGuionIndividual(
  admin: Sb,
  runInicial: Run,
  ctx: ContextoAuth,
  contentId: string,
  feedback: string,
): Promise<Run> {
  let run = runInicial;

  const { data: tomado } = await admin
    .from("client_pipeline_runs")
    .update({ stage: "guiones", stage_status: "generating" })
    .eq("id", run.id).neq("stage_status", "generating").select("*");
  if (!tomado || tomado.length === 0) return run;
  run = tomado[0] as Run;

  const [{ data: producto }, { data: item }] = await Promise.all([
    admin.from("products")
      .select("id, name, strategy, market_research, ideal_avatar, sales_angles, sales_angles_data, content_strategy")
      .eq("id", run.product_id).maybeSingle(),
    admin.from("content")
      .select("id, script_version, sphere_phase, sales_angle").eq("id", contentId).maybeSingle(),
  ]);
  if (!producto || !item) {
    return marcarError(admin, run, "guiones", "no se encontró el guion o su producto");
  }

  const auth = await resolverAuthStaff(admin, ctx, run.organization_id);
  if (!auth) {
    return marcarError(
      admin, run, "guiones",
      "no hay un JWT de un miembro de la organización para invocar generate-script",
    );
  }

  const angulos: string[] = Array.isArray(producto.sales_angles) && producto.sales_angles.length > 0
    ? producto.sales_angles
    : extraerAngulos(producto.sales_angles_data);

  const res = await invocar("generate-script", {
    organizationId: run.organization_id,
    product_name: producto.name ?? "Producto",
    strategy: aTexto(producto.strategy || producto.content_strategy),
    market_research: aTexto(producto.market_research),
    ideal_avatar: aTexto(producto.ideal_avatar, 2000),
    // Se conserva el ángulo y la fase del guion original: el cliente pidió
    // cambios sobre ESE guion, no otro distinto.
    sales_angle: item.sales_angle ?? angulos[0] ?? "",
    sphere_phase: item.sphere_phase ?? "engage",
    additional_context: `Ajustes pedidos por el cliente sobre la versión anterior: ${feedback}`,
  }, auth, 120_000);

  const html = res.body?.script;
  if (!res.ok || typeof html !== "string" || !html.trim()) {
    return marcarError(
      admin, run, "guiones",
      "generate-script no devolvió un guion al regenerar",
      res.error ?? res.body?.error ?? `HTTP ${res.status}`,
    );
  }

  const { error } = await admin.from("content").update({
    script: html,
    script_version: (item.script_version ?? 1) + 1,
    script_pending_at: ahora(),
    status: "script_pending",
  }).eq("id", contentId);
  if (error) {
    return marcarError(admin, run, "guiones", "no se pudo guardar el guion regenerado", error.message);
  }

  const actualizado = await actualizarRun(admin, run.id, { stage_status: "awaiting_client" });
  await registrarEvento(admin, run.id, "guiones", "generated", {
    payload: { content_ids: await guionesYaCreados(admin, run.id), regenerado: contentId },
  });
  await notificarCliente(
    admin, run,
    "Tu guion está listo otra vez",
    "Regeneramos el guion con los cambios que pediste. Entra al portal para revisarlo.",
  );
  return actualizado;
}

function extraerAngulos(salesAnglesData: unknown): string[] {
  if (Array.isArray(salesAnglesData)) {
    return salesAnglesData
      .map((a) => typeof a === "string" ? a : (a as Json)?.angle ?? (a as Json)?.title ?? "")
      .filter((a: string) => !!a);
  }
  if (salesAnglesData && typeof salesAnglesData === "object") {
    const lista = (salesAnglesData as Json).angles;
    if (Array.isArray(lista)) return extraerAngulos(lista);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Despachador de etapas
// ---------------------------------------------------------------------------
async function ejecutarEtapa(
  admin: Sb,
  run: Run,
  etapa: Etapa,
  ctx: ContextoAuth,
  opciones: { feedback?: string | null; regenerar?: boolean } = {},
): Promise<Run> {
  switch (etapa) {
    case "adn":
      return ejecutarEtapaAdn(admin, run, { feedback: opciones.feedback });
    case "estrategia":
      return ejecutarEtapaEstrategia(admin, run, ctx, { regenerar: opciones.regenerar });
    case "guiones":
      return ejecutarEtapaGuiones(admin, run, ctx, { feedback: opciones.feedback });
    case "produccion":
      // Fin del pipeline autónomo: los guiones aprobados ya están en el board.
      return actualizarRun(admin, run.id, { stage: "produccion", stage_status: "approved" });
    default:
      return run;
  }
}

// ---------------------------------------------------------------------------
// poll — reconcilia lo que corre asíncrono contra el estado del run
// ---------------------------------------------------------------------------
async function ejecutarPoll(admin: Sb, runInicial: Run, ctx: ContextoAuth): Promise<Run> {
  let run = runInicial;

  // ADN: esperando a que generate-product-dna cree la fila de `products`.
  if (run.stage === "adn" && run.stage_status === "generating") {
    if (run.product_id) {
      return pasarAEsperandoCliente(admin, run, "adn", {
        client_dna_id: run.client_dna_id,
        product_id: run.product_id,
      });
    }
    if (!run.product_dna_id) return run;

    const productId = await buscarProductoDelDna(admin, run.product_dna_id);
    if (productId) {
      run = await actualizarRun(admin, run.id, { product_id: productId });
      return pasarAEsperandoCliente(admin, run, "adn", {
        client_dna_id: run.client_dna_id,
        product_id: productId,
      });
    }

    const { data: dna } = await admin
      .from("product_dna").select("status").eq("id", run.product_dna_id).maybeSingle();
    if (dna?.status === "draft") {
      // generate-product-dna revierte a 'draft' cuando falla.
      return marcarError(admin, run, "adn", "generate-product-dna terminó en error (product_dna volvió a 'draft')");
    }
    return run;
  }

  // ESTRATEGIA: progreso de las 21 fases en products.research_progress.
  if (run.stage === "estrategia" && run.stage_status === "generating" && run.product_id) {
    const progreso = await leerProgresoResearch(admin, run.product_id);
    if (!progreso) return run;

    if (esFaltaDeTokens(progreso)) {
      const actualizado = await actualizarRun(admin, run.id, { stage_status: "paused_no_tokens" });
      await registrarEvento(admin, run.id, "estrategia", "paused_no_tokens", {
        payload: { label: progreso.label ?? null, step: progreso.step ?? null },
      });
      await notificarEquipo(
        admin, run.organization_id,
        "Pipeline en pausa: sin tokens de IA",
        "La generación de la estrategia se detuvo por saldo de tokens insuficiente. Recarga y reintenta la etapa.",
        run.id,
      );
      return actualizado;
    }

    if (progreso.error) {
      return marcarError(
        admin, run, "estrategia",
        `generate-full-research reportó error en la fase ${progreso.step ?? "?"}`,
        progreso.label,
      );
    }

    const total = progreso.total ?? 21;
    const terminado = (typeof progreso.step === "number" && progreso.step >= total) ||
      (progreso.label ?? "").toLowerCase().includes("finalizado");
    if (terminado) {
      return pasarAEsperandoCliente(admin, run, "estrategia", {
        product_id: run.product_id,
        step: progreso.step ?? total,
        total,
      });
    }
    return run;
  }

  return run;
}

// ---------------------------------------------------------------------------
// advance — siguiente etapa
// ---------------------------------------------------------------------------
async function ejecutarAdvance(admin: Sb, run: Run, ctx: ContextoAuth): Promise<Run> {
  // Solo se avanza desde una etapa aprobada. Repetir `advance` no duplica nada:
  // la etapa siguiente ya estará en 'generating'/'awaiting_client' y su propio
  // cerrojo la protege.
  if (run.stage_status !== "approved") {
    return run;
  }

  const indice = ORDEN_ETAPAS.indexOf(run.stage);
  const siguiente = ORDEN_ETAPAS[indice + 1];
  if (!siguiente) return run;

  return ejecutarEtapa(admin, run, siguiente, ctx);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const admin: Sb = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: Json;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }

  const accion = String(body.action ?? "");
  const ctx = await leerContextoAuth(req);
  if (!ctx.userId && !ctx.esServiceRole) {
    return json(req, { error: "unauthorized" }, 401);
  }

  try {
    // ── start ───────────────────────────────────────────────────────────────
    if (accion === "start") {
      const clientId = String(body.client_id ?? "");
      const organizationId = String(body.organization_id ?? "");
      const formId = body.onboarding_form_id ? String(body.onboarding_form_id) : null;
      if (!clientId || !organizationId) {
        return json(req, { error: "client_id y organization_id son requeridos" }, 400);
      }

      if (!ctx.esServiceRole) {
        const esStaff = await esStaffDeOrg(admin, ctx.userId!, organizationId);
        if (!esStaff) {
          // No es staff: solo puede arrancar SU PROPIO cliente. `clientId`
          // sale del body, pero `esUsuarioDelCliente` lo valida contra el
          // vínculo real en `client_users` (keyed por ctx.userId, que sí
          // viene del JWT verificado) — un cliente no puede forjar el
          // client_id de otro: si no existe esa fila exacta, esto da false.
          const esDuenoDelCliente = await esUsuarioDelCliente(admin, ctx.userId!, clientId);
          if (!esDuenoDelCliente) {
            return json(
              req,
              {
                error: "forbidden",
                message: "No puedes arrancar el pipeline de un cliente que no es el tuyo.",
              },
              403,
            );
          }
        }
      }

      // El cliente debe pertenecer a la organización declarada (evita crear un
      // run cruzado apuntando a un cliente de otra org).
      const { data: cliente } = await admin
        .from("clients").select("id, organization_id").eq("id", clientId).maybeSingle();
      if (!cliente || cliente.organization_id !== organizationId) {
        return json(req, { error: "client_not_found" }, 404);
      }

      // Idempotencia: UNIQUE(client_id). Si ya existe se devuelve el run vivo.
      const { data: existente } = await admin
        .from("client_pipeline_runs").select("*").eq("client_id", clientId).maybeSingle();

      let run: Run;
      if (existente) {
        run = existente as Run;
        // Un run ya arrancado no se reinicia: se devuelve tal cual.
        if (run.stage !== "onboarding") {
          return json(req, { ok: true, run, reutilizado: true });
        }
      } else {
        const { data: creado, error } = await admin
          .from("client_pipeline_runs")
          .insert({
            organization_id: organizationId,
            client_id: clientId,
            onboarding_form_id: formId,
            stage: "onboarding",
            stage_status: "awaiting_client",
            onboarding_completed_at: ahora(),
          })
          .select("*").single();
        if (error || !creado) {
          // Carrera contra otro submit: releer el run que ganó.
          const { data: rehecho } = await admin
            .from("client_pipeline_runs").select("*").eq("client_id", clientId).maybeSingle();
          if (!rehecho) return json(req, { error: "no_se_pudo_crear_el_run", detalle: error?.message }, 500);
          return json(req, { ok: true, run: rehecho, reutilizado: true });
        }
        run = creado as Run;
      }

      const actualizado = await ejecutarEtapa(admin, run, "adn", ctx);
      return json(req, { ok: true, run: actualizado, reutilizado: !!existente });
    }

    // ── create_form ───────────────────────────────────────────────────────
    // Crea el formulario de onboarding para el cliente que lo pide, si no
    // tiene ya uno vigente. Antes solo lo creaba el staff desde el panel
    // (OnboardingLinkDialog); esto le da al dueño del cliente la misma puerta
    // de entrada sin depender de que el staff se lo genere primero.
    if (accion === "create_form") {
      const clientId = String(body.client_id ?? "");
      if (!clientId) {
        return json(req, { error: "client_id es requerido" }, 400);
      }

      // La organización se resuelve desde `clients`, NO del body: el portal del
      // cliente no tiene por qué conocer su organization_id, y así esta acción
      // se comporta igual que `save_form_section` y `submit_form`. Si el body
      // trae uno distinto del real, manda el real.
      const { data: clienteOrg } = await admin
        .from("clients").select("id, organization_id").eq("id", clientId).maybeSingle();
      if (!clienteOrg) {
        return json(req, { error: "client_not_found" }, 404);
      }
      const organizationId = clienteOrg.organization_id as string;

      if (!ctx.esServiceRole) {
        const esStaff = await esStaffDeOrg(admin, ctx.userId!, organizationId);
        if (!esStaff) {
          // Mismo criterio que en `start`: el dueño solo puede crear el
          // formulario de SU cliente, validado contra `client_users`.
          const esDuenoDelCliente = await esUsuarioDelCliente(admin, ctx.userId!, clientId);
          if (!esDuenoDelCliente) {
            return json(
              req,
              {
                error: "forbidden",
                message: "No puedes crear el formulario de un cliente que no es el tuyo.",
              },
              403,
            );
          }
        }
      }

      // (El cliente y su organización ya quedaron resueltos arriba, leyendo
      // `clients` una sola vez.)

      // Idempotencia: mismo criterio de "vigente" que usa el panel
      // (OnboardingLinkDialog.tsx → fetchActiveForm): no processed, no
      // vencido. Si ya existe, se devuelve tal cual — no se crea un segundo
      // link ni se toca el que ya está circulando.
      const { data: vigente } = await admin
        .from("client_onboarding_forms")
        .select("id, organization_id, client_id, token, status, expires_at")
        .eq("client_id", clientId)
        .eq("organization_id", organizationId)
        .neq("status", "processed")
        .gt("expires_at", ahora())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vigente) {
        return json(req, { ok: true, form: vigente, reutilizado: true });
      }

      // El `token` NO se genera acá: lo pone el DEFAULT de la columna (dos
      // UUIDv4 sin guiones, 64 hex) — el mismo mecanismo que usa el insert
      // del panel en OnboardingLinkDialog.tsx.
      const { data: creado, error: errorCreado } = await admin
        .from("client_onboarding_forms")
        .insert({
          organization_id: organizationId,
          client_id: clientId,
          created_by: ctx.esServiceRole ? null : ctx.userId,
        })
        .select("id, organization_id, client_id, token, status, expires_at")
        .single();

      if (errorCreado || !creado) {
        return json(
          req,
          { error: "no_se_pudo_crear_el_formulario", detalle: errorCreado?.message },
          500,
        );
      }

      return json(req, { ok: true, form: creado, reutilizado: false });
    }

    // ── save_form_section ────────────────────────────────────────────────
    // Guarda una sección desde una sesión autenticada. Mismo merge y misma
    // sanitización que el "Modo 1" (guardado por sección con token público) de
    // client-onboarding-submit — `sanitizeDeep` y `VALID_SECTIONS` vienen de
    // _shared/client-onboarding.ts, no se reinventa la mezcla acá.
    if (accion === "save_form_section") {
      const clientId = String(body.client_id ?? "");
      const section = body.section;
      if (!clientId) return json(req, { error: "client_id es requerido" }, 400);
      if (
        typeof section !== "string" ||
        !(VALID_SECTIONS as readonly string[]).includes(section)
      ) {
        return json(
          req,
          {
            error: "invalid_section",
            message: "Sección no válida.",
            valid_sections: VALID_SECTIONS,
          },
          400,
        );
      }
      if (
        body.data === null ||
        typeof body.data !== "object" ||
        Array.isArray(body.data)
      ) {
        return json(
          req,
          { error: "invalid_data", message: "El contenido de la sección debe ser un objeto." },
          400,
        );
      }

      // Mismo par de chequeos que `start`/`create_form`: resolver la org
      // REAL del cliente (nunca confiar en una que venga del body — acá ni
      // siquiera se pide) y autorizar contra ella.
      const { data: clienteForm } = await admin
        .from("clients").select("id, organization_id").eq("id", clientId).maybeSingle();
      if (!clienteForm) return json(req, { error: "client_not_found" }, 404);
      const organizationId = clienteForm.organization_id as string;

      if (!ctx.esServiceRole) {
        const esStaff = await esStaffDeOrg(admin, ctx.userId!, organizationId);
        if (!esStaff) {
          const esDuenoDelCliente = await esUsuarioDelCliente(admin, ctx.userId!, clientId);
          if (!esDuenoDelCliente) {
            return json(
              req,
              {
                error: "forbidden",
                message: "No puedes editar el formulario de un cliente que no es el tuyo.",
              },
              403,
            );
          }
        }
      }

      const { data: formSeccion } = await admin
        .from("client_onboarding_forms")
        .select("id, organization_id, client_id, token, status, form_data, expires_at")
        .eq("client_id", clientId)
        .eq("organization_id", organizationId)
        .neq("status", "processed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!formSeccion) {
        return json(
          req,
          {
            error: "form_not_found",
            message: "Este cliente todavía no tiene un formulario de onboarding. Créalo primero con create_form.",
          },
          404,
        );
      }

      // Merge IDÉNTICO al "Modo 1" de client-onboarding-submit: la sección
      // nueva se mezcla sobre la que ya había, no la reemplaza entera.
      const sanitized = sanitizeDeep(body.data) as Record<string, unknown>;
      const previous = (formSeccion.form_data ?? {}) as Record<string, unknown>;
      const previousSection = (previous[section] ?? {}) as Record<string, unknown>;
      const nextFormData = {
        ...previous,
        [section]: { ...previousSection, ...sanitized },
      };

      const { data: formGuardado, error: errorGuardado } = await admin
        .from("client_onboarding_forms")
        .update({
          form_data: nextFormData,
          // Solo avanza pending -> in_progress, igual que la ruta pública.
          status: formSeccion.status === "pending" ? "in_progress" : formSeccion.status,
        })
        .eq("id", formSeccion.id)
        .select("id, organization_id, client_id, token, status, form_data, expires_at")
        .single();

      if (errorGuardado || !formGuardado) {
        return json(req, { error: "no_se_pudo_guardar", detalle: errorGuardado?.message }, 500);
      }

      return json(req, { ok: true, form: formGuardado });
    }

    // ── submit_form ───────────────────────────────────────────────────────
    // Envío final con sesión: mismos campos obligatorios que valida
    // client-onboarding-submit, importados de _shared/client-onboarding.ts (si
    // esa lista cambia, cambia acá también, sin que se puedan desincronizar).
    if (accion === "submit_form") {
      const clientId = String(body.client_id ?? "");
      if (!clientId) return json(req, { error: "client_id es requerido" }, 400);

      const { data: clienteSubmit } = await admin
        .from("clients").select("id, organization_id, name").eq("id", clientId).maybeSingle();
      if (!clienteSubmit) return json(req, { error: "client_not_found" }, 404);
      const organizationId = clienteSubmit.organization_id as string;

      if (!ctx.esServiceRole) {
        const esStaff = await esStaffDeOrg(admin, ctx.userId!, organizationId);
        if (!esStaff) {
          const esDuenoDelCliente = await esUsuarioDelCliente(admin, ctx.userId!, clientId);
          if (!esDuenoDelCliente) {
            return json(
              req,
              {
                error: "forbidden",
                message: "No puedes enviar el formulario de un cliente que no es el tuyo.",
              },
              403,
            );
          }
        }
      }

      const { data: formEnvio } = await admin
        .from("client_onboarding_forms")
        .select("id, organization_id, client_id, token, status, form_data, expires_at, submitted_at")
        .eq("client_id", clientId)
        .eq("organization_id", organizationId)
        .neq("status", "processed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!formEnvio) {
        return json(
          req,
          {
            error: "form_not_found",
            message: "Este cliente todavía no tiene un formulario de onboarding.",
          },
          404,
        );
      }

      const missing = findMissingRequiredFields(formEnvio.form_data);
      if (missing.length > 0) {
        return json(
          req,
          {
            error: "missing_required_fields",
            message: "Faltan datos obligatorios por llenar.",
            missing_fields: missing,
          },
          400,
        );
      }

      // Reenvío idempotente: se conserva el submitted_at original, igual que
      // el modo final de client-onboarding-submit.
      const isFirstSubmission = formEnvio.submitted_at === null;
      const { data: formEnviado, error: errorEnvio } = await admin
        .from("client_onboarding_forms")
        .update({
          status: "submitted",
          submitted_at: formEnvio.submitted_at ?? ahora(),
        })
        .eq("id", formEnvio.id)
        .select("id, organization_id, client_id, token, status, form_data, expires_at, submitted_at")
        .single();

      if (errorEnvio || !formEnviado) {
        return json(req, { error: "no_se_pudo_enviar", detalle: errorEnvio?.message }, 500);
      }

      // Arranca el pipeline SOLO en la primera transición a submitted, para
      // que reenviar no lo dispare de nuevo (`start` ya es idempotente igual,
      // pero así se evita hasta el round-trip HTTP innecesario). Self-invoke
      // fire-and-forget con service role, mismo patrón que `programarAutoPoll`.
      if (isFirstSubmission) {
        invocarSinEsperar(
          "pipeline-orchestrator",
          {
            action: "start",
            client_id: clientId,
            organization_id: organizationId,
            onboarding_form_id: formEnviado.id,
          },
          `Bearer ${SERVICE_KEY}`,
        );

        // El cliente arranca su proceso solo, pero el staff se entera igual
        // que con la ruta pública (mismo título/mensaje que `notifyOrgStaff`
        // en client-onboarding-submit). `notificarEquipo` ya envuelve su
        // propio try/catch: un fallo acá no tumba la respuesta del submit.
        await notificarEquipo(
          admin,
          organizationId,
          "Onboarding completado",
          `${clienteSubmit?.name ?? "Un cliente"} terminó de llenar su formulario de onboarding.`,
          clientId,
        );
      }

      return json(req, { ok: true, form: formEnviado });
    }

    // ── El resto de acciones trabajan sobre un run existente ────────────────
    const runId = String(body.run_id ?? "");
    if (!runId) return json(req, { error: "run_id es requerido" }, 400);

    const { data: runData } = await admin
      .from("client_pipeline_runs").select("*").eq("id", runId).maybeSingle();
    if (!runData) return json(req, { error: "run_not_found" }, 404);
    const run = runData as Run;

    // Autorización: staff de la org, usuario del portal del cliente, o interno.
    let rolCaller: Actor = "system";
    if (!ctx.esServiceRole) {
      if (await esStaffDeOrg(admin, ctx.userId!, run.organization_id)) {
        rolCaller = "staff";
      } else if (await esUsuarioDelCliente(admin, ctx.userId!, run.client_id)) {
        rolCaller = "client";
      } else {
        return json(req, { error: "forbidden" }, 403);
      }
    }

    // ── status ─────────────────────────────────────────────────────────────
    if (accion === "status") {
      const { data: eventos } = await admin
        .from("client_pipeline_stage_events")
        .select("stage, event, feedback, payload, actor, created_at")
        .eq("run_id", run.id).order("created_at", { ascending: false }).limit(20);

      const progreso = run.product_id && run.stage === "estrategia"
        ? await leerProgresoResearch(admin, run.product_id)
        : null;

      return json(req, { ok: true, run, eventos: eventos ?? [], research_progress: progreso });
    }

    // ── poll ───────────────────────────────────────────────────────────────
    if (accion === "poll") {
      // Eslabón de la cadena de auto-poll: duerme, reconcilia y encadena el
      // siguiente mientras el run siga generando. Solo con service role.
      if (body.auto === true && ctx.esServiceRole) {
        const ciclo = Number(body.ciclo ?? 0);
        await dormir(INTERVALO_AUTOPOLL_MS);

        // El run cambió mientras dormíamos: hay que releerlo.
        const { data: fresco } = await admin
          .from("client_pipeline_runs").select("*").eq("id", run.id).maybeSingle();
        if (!fresco) return json(req, { ok: true, detenido: "run_borrado" });

        const actualizado = await ejecutarPoll(admin, fresco as Run, ctx);

        if (actualizado.stage_status !== "generating") {
          // Ya transicionó (o falló): la cadena cumplió y se apaga.
          return json(req, { ok: true, run: actualizado, cadena: "finalizada", ciclo });
        }
        if (ciclo + 1 >= MAX_CICLOS_AUTOPOLL) {
          const conError = await marcarError(
            admin, actualizado, actualizado.stage,
            `la etapa lleva más de ${Math.round(MAX_CICLOS_AUTOPOLL * INTERVALO_AUTOPOLL_MS / 60000)} min generando sin terminar`,
            "se agotó la cadena de auto-poll",
          );
          return json(req, { ok: false, run: conError, cadena: "agotada", ciclo });
        }
        programarAutoPoll(run.id, ciclo + 1);
        return json(req, { ok: true, run: actualizado, cadena: "continua", ciclo });
      }

      const actualizado = await ejecutarPoll(admin, run, ctx);
      return json(req, { ok: true, run: actualizado });
    }

    // ── advance ────────────────────────────────────────────────────────────
    if (accion === "advance") {
      const actualizado = await ejecutarAdvance(admin, run, ctx);
      return json(req, { ok: true, run: actualizado });
    }

    // ── approve ────────────────────────────────────────────────────────────
    if (accion === "approve") {
      const stage = String(body.stage ?? "") as Etapa;
      if (!ORDEN_ETAPAS.includes(stage)) {
        return json(req, { error: "stage inválido" }, 400);
      }
      // Excepción al guard de sincronía: aprobar el último guion cierra la
      // etapa y mueve el run a 'produccion'. Un doble clic sobre ese mismo
      // guion llega con stage='guiones' y run.stage='produccion' — es la misma
      // acción repetida, no un desfase, así que se deja pasar (es idempotente).
      const reaprobacionDeGuion = stage === "guiones" &&
        run.stage === "produccion" && typeof body.content_id === "string";
      if (stage !== run.stage && !reaprobacionDeGuion) {
        return json(req, { error: "stage_desincronizado", stage_actual: run.stage }, 409);
      }
      // El actor sale del JWT, no del body: el body solo puede confirmarlo.
      const actor: Actor = ctx.esServiceRole ? "system" : rolCaller;
      const actorId = ctx.userId ?? (body.actor_id ? String(body.actor_id) : null);

      // ── Aprobación GUION A GUION ─────────────────────────────────────────
      // El portal manda `content_id`: se aprueba ese guion, no la etapa. La
      // etapa solo se cierra cuando ya no queda ninguno en 'script_pending'.
      const contentId = typeof body.content_id === "string" ? body.content_id : null;
      if (stage === "guiones" && contentId) {
        if (!await guionDelRun(admin, run.id, contentId)) {
          return json(req, { error: "content_id no pertenece a este run" }, 403);
        }

        const { data: item } = await admin
          .from("content").select("id, status").eq("id", contentId).maybeSingle();
        if (!item) return json(req, { error: "content_not_found" }, 404);

        // Idempotencia: reaprobar un guion ya aprobado no reescribe nada.
        if (item.status === "script_pending") {
          const { error } = await admin.from("content").update({
            status: "script_approved",
            script_approved_at: ahora(),
            script_approved_by: actorId,
          }).eq("id", contentId).eq("status", "script_pending");
          if (error) {
            return json(req, { error: "no_se_pudo_aprobar_el_guion", detalle: error.message }, 500);
          }
          await registrarEvento(admin, run.id, "guiones", "approved", {
            actor, actorId, payload: { content_id: contentId },
          });
        }

        const pendientes = await guionesPendientes(admin, run.id);
        if (pendientes.length > 0) {
          // Quedan guiones por revisar: la etapa sigue esperando al cliente.
          const enEspera = run.stage_status === "awaiting_client"
            ? run
            : await actualizarRun(admin, run.id, { stage_status: "awaiting_client" });
          return json(req, {
            ok: true,
            run: enEspera,
            guion_aprobado: contentId,
            guiones_pendientes: pendientes.length,
          });
        }

        // Último guion aprobado → se cierra la etapa y avanza a producción.
        const cerrada = await actualizarRun(admin, run.id, {
          stage_status: "approved",
          last_feedback: null,
          guiones_approved_at: ahora(),
        });
        await registrarEvento(admin, run.id, "guiones", "approved", {
          actor, actorId, payload: { lote_completo: true },
        });
        const avanzado = await ejecutarAdvance(admin, cerrada, ctx);
        return json(req, {
          ok: true,
          run: avanzado,
          guion_aprobado: contentId,
          guiones_pendientes: 0,
          etapa_completada: true,
        });
      }

      // Idempotencia: aprobar dos veces no registra dos eventos ni re-dispara.
      if (run.stage_status === "approved") {
        const actualizado = await ejecutarAdvance(admin, run, ctx);
        return json(req, { ok: true, run: actualizado, ya_aprobado: true });
      }

      const marcaTiempo: Json = {};
      if (stage === "adn") marcaTiempo.adn_approved_at = ahora();
      if (stage === "estrategia") marcaTiempo.estrategia_approved_at = ahora();
      if (stage === "guiones") marcaTiempo.guiones_approved_at = ahora();

      const aprobado = await actualizarRun(admin, run.id, {
        stage_status: "approved",
        last_feedback: null,
        ...marcaTiempo,
      });
      await registrarEvento(admin, run.id, stage, "approved", { actor, actorId });

      const actualizado = await ejecutarAdvance(admin, aprobado, ctx);
      return json(req, { ok: true, run: actualizado });
    }

    // ── retry_stage ────────────────────────────────────────────────────────
    // Reintenta la etapa que quedó en 'error' o pausada por falta de tokens.
    //
    // Existe porque un fallo técnico dejaba al cliente sin salida: la tarjeta
    // decía "necesita atención" y no ofrecía ningún botón, así que la única
    // forma de seguir era que alguien tocara la base a mano. Y el fallo suele
    // ser transitorio (un proveedor de IA sin cuota, un timeout), no algo que
    // requiera intervención humana.
    //
    // NO fuerza regeneración: `regenerar` se queda en false a propósito, para
    // que la investigación retome desde la fase que falló en vez de repetir
    // las que ya terminaron. Tampoco cuenta como una de las 3 regeneraciones
    // por etapa: eso mide los cambios que pide el cliente, no los tropiezos
    // del sistema.
    if (accion === "retry_stage") {
      const stage = String(body.stage ?? run.stage) as Etapa;
      if (!ORDEN_ETAPAS.includes(stage)) {
        return json(req, { error: "stage inválido" }, 400);
      }
      if (stage !== run.stage) {
        return json(req, { error: "stage_desincronizado", stage_actual: run.stage }, 409);
      }
      if (run.stage_status !== "error" && run.stage_status !== "paused_no_tokens") {
        return json(
          req,
          { error: "nada_que_reintentar", stage_status: run.stage_status },
          409,
        );
      }

      await registrarEvento(admin, run.id, stage, "generated", {
        actor,
        actorId,
        payload: { reintento: true, desde_estado: run.stage_status },
      });

      const reintentado = await ejecutarEtapa(admin, run, stage, ctx);
      return json(req, { ok: true, run: reintentado });
    }

    // ── request_changes ────────────────────────────────────────────────────
    if (accion === "request_changes") {
      const stage = String(body.stage ?? "") as Etapa;
      const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
      if (!ORDEN_ETAPAS.includes(stage)) return json(req, { error: "stage inválido" }, 400);
      if (!feedback) return json(req, { error: "feedback es requerido" }, 400);
      if (stage !== run.stage) {
        return json(req, { error: "stage_desincronizado", stage_actual: run.stage }, 409);
      }
      if (run.stage_status === "approved") {
        return json(req, { error: "etapa_ya_aprobada" }, 409);
      }

      const actor: Actor = ctx.esServiceRole ? "system" : rolCaller;
      const actorId = ctx.userId ?? (body.actor_id ? String(body.actor_id) : null);

      // Con `content_id` los cambios son sobre UN guion: el contador de
      // intentos también es por guion (clave "guiones:<uuid>"), para que
      // rechazar el guion 1 no consuma los intentos del guion 2.
      const contentId = typeof body.content_id === "string" ? body.content_id : null;
      const porGuion = stage === "guiones" && !!contentId;
      if (porGuion && !await guionDelRun(admin, run.id, contentId!)) {
        return json(req, { error: "content_id no pertenece a este run" }, 403);
      }

      const clave = porGuion ? `guiones:${contentId}` : stage;
      const intentosPrevios = Number(run.stage_attempts?.[clave] ?? 0);
      const intento = intentosPrevios + 1;
      const attempts = { ...(run.stage_attempts ?? {}), [clave]: intento };

      // El 4º intento no se regenera: se escala a un humano.
      if (intento >= LIMITE_REGENERACIONES) {
        const escalado = await actualizarRun(admin, run.id, {
          stage_attempts: attempts,
          last_feedback: feedback,
          stage_status: "error",
        });
        await registrarEvento(admin, run.id, stage, "changes_requested", {
          feedback, actor, actorId, payload: { intento, content_id: contentId },
        });
        await registrarEvento(admin, run.id, stage, "escalated", {
          feedback,
          actor: "system",
          payload: { intento, limite: LIMITE_REGENERACIONES, content_id: contentId },
        });
        await notificarEquipo(
          admin, run.organization_id,
          "Pipeline escalado: 4º pedido de cambios",
          `El cliente pidió cambios por ${intento}ª vez en ${porGuion ? "un guion" : `la etapa "${stage}"`}. La IA ya no regenera: hace falta que un estratega intervenga. Último comentario: "${feedback.slice(0, 300)}"`,
          run.id,
        );
        return json(req, { ok: true, run: escalado, escalado: true });
      }

      const marcado = await actualizarRun(admin, run.id, {
        stage_attempts: attempts,
        last_feedback: feedback,
        stage_status: "changes_requested",
      });
      await registrarEvento(admin, run.id, stage, "changes_requested", {
        feedback, actor, actorId, payload: { intento, content_id: contentId },
      });

      // Se regenera SOLO lo que el cliente rechazó: ese guion, o esa etapa.
      const actualizado = porGuion
        ? await regenerarGuionIndividual(admin, marcado, ctx, contentId!, feedback)
        : await ejecutarEtapa(admin, marcado, stage, ctx, { feedback, regenerar: true });
      return json(req, { ok: true, run: actualizado, intento, content_id: contentId });
    }

    return json(req, { error: "action_desconocida", action: accion }, 400);
  } catch (e) {
    console.error("[pipeline-orchestrator] fallo no controlado:", e);
    return json(req, { error: "internal_error", detalle: (e as Error).message }, 500);
  }
});
