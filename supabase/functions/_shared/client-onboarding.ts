// ============================================================================
// KREOON — Helpers compartidos del onboarding publico de clientes
// ============================================================================
//
// Usado por client-onboarding-get, -submit, -claim (verify_jwt = false: el
// caller es un cliente SIN sesion que solo tiene el token del formulario) y por
// client-onboarding-process (staff). Toda la validacion vive aqui + en la RLS
// (que no expone la tabla a anon en absoluto).
// ============================================================================

// deno-lint-ignore no-explicit-any
type SupabaseClientLike = any;

/** Tamano maximo del body aceptado (100 KB), antes de parsear. */
export const MAX_PAYLOAD_BYTES = 100 * 1024;

/** Secciones validas de form_data. Cualquier otra clave se rechaza. */
export const VALID_SECTIONS = [
  "legal",
  "equipo",
  "marca",
  "producto",
  "contenido",
  "logistica",
] as const;

export type OnboardingSection = (typeof VALID_SECTIONS)[number];

/** Limites defensivos del sanitizador. */
const MAX_STRING_LENGTH = 20_000;
const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 200;
const MAX_OBJECT_KEYS = 100;

/**
 * Caracteres de control ASCII, excepto tab (09), LF (0A) y CR (0D) que se
 * dejan pasar para no romper textos multilinea (historia de marca, etc.).
 * Se construye con `new RegExp` a proposito: asi el codigo fuente contiene
 * solo ASCII imprimible y no caracteres de control literales.
 */
const CONTROL_CHARS = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]",
  "g",
);

/** Etiquetas HTML/XML completas o abiertas. */
const HTML_TAGS = /<[^>]*>/g;

/**
 * Limpia recursivamente un valor de entrada:
 *   - strings: strip de tags HTML + strip de control chars + trim + cap
 *   - arrays/objetos: recursion con limites de profundidad y cardinalidad
 *   - numbers/booleans/null: pasan tal cual
 *   - cualquier otro tipo (function, undefined, symbol): se descarta
 *
 * No pretende ser un sanitizador de HTML rico — el formulario solo captura
 * texto plano, asi que se elimina TODO lo que parezca markup.
 */
export function sanitizeDeep(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return null;

  if (value === null) return null;

  if (typeof value === "string") {
    return value
      .replace(HTML_TAGS, "")
      .replace(CONTROL_CHARS, "")
      .trim()
      .slice(0, MAX_STRING_LENGTH);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeDeep(item, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      MAX_OBJECT_KEYS,
    );
    for (const [rawKey, rawValue] of entries) {
      // La clave tambien se limpia: evita claves con markup o control chars.
      const key = rawKey
        .replace(HTML_TAGS, "")
        .replace(CONTROL_CHARS, "")
        .trim()
        .slice(0, 200);
      if (!key) continue;
      out[key] = sanitizeDeep(rawValue, depth + 1);
    }
    return out;
  }

  return null;
}

/**
 * Campos obligatorios para el envio final, por seccion.
 * Notacion con punto para campos anidados.
 *
 * Alineado con `schemas.ts` del wizard (2026-08-24): tipo_documento y categoria
 * tambien son obligatorios ahi; antes el backend los dejaba pasar vacios y la
 * ficha de la empresa quedaba con un NIT sin tipo y sin categoria.
 */
const REQUIRED_FIELDS: Record<string, string[]> = {
  legal: [
    "razon_social",
    "tipo_documento",
    "nit",
    "representante",
    "correo_representante",
    "direccion_fiscal",
    "ciudad",
    "pais",
    "categoria",
  ],
  equipo: ["aprobador.nombre", "aprobador.correo", "correo_portal"],
  producto: ["nombre", "beneficios"],
};

function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/**
 * Valida que las secciones obligatorias (legal, equipo, producto) esten
 * completas. Devuelve la lista de campos faltantes en notacion `seccion.campo`
 * para que el frontend pueda resaltarlos.
 */
export function findMissingRequiredFields(formData: unknown): string[] {
  const missing: string[] = [];
  for (const [section, fields] of Object.entries(REQUIRED_FIELDS)) {
    const sectionData = getPath(formData, section);
    for (const field of fields) {
      if (!isFilled(getPath(sectionData, field))) {
        missing.push(`${section}.${field}`);
      }
    }
  }
  return missing;
}

// ----------------------------------------------------------------------------
// Rate limiting
// ----------------------------------------------------------------------------

/**
 * Llama la RPC `check_rate_limit` REAL de la base de datos.
 *
 * NO se usa `_shared/rate-limiter.ts`: ese wrapper invoca la RPC con los
 * parametros `{ p_key, p_limit, p_window_start }`, pero la firma real en la BD
 * es `check_rate_limit(_identifier, _identifier_type, _action_type,
 * _max_attempts, _window_minutes, _block_minutes)`. Los nombres no coinciden,
 * PostgREST no resuelve la funcion, el wrapper cae en su rama fail-open y
 * devuelve `allowed: true` siempre. (Sintoma corroborante: la tabla
 * `rate_limits` esta en 0 filas pese a que content-ai "limita" cada request.)
 * Ese wrapper roto se deja intacto a proposito — arreglarlo empezaria a
 * bloquear trafico de produccion que hoy pasa libre, y eso es otro cambio.
 *
 * @param supabase Cliente con SERVICE ROLE.
 * @param identifier Clave del caller (aqui: `${token}:${ip}`).
 * @param actionType Etiqueta de la accion, parte de la clave unica.
 */
export async function checkOnboardingRateLimit(
  supabase: SupabaseClientLike,
  identifier: string,
  actionType: string,
  maxAttempts: number,
  windowMinutes: number,
  blockMinutes: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    _identifier: identifier.slice(0, 255),
    _identifier_type: "onboarding_token_ip",
    _action_type: actionType,
    _max_attempts: maxAttempts,
    _window_minutes: windowMinutes,
    _block_minutes: blockMinutes,
  });

  if (error) {
    // Fail-open deliberado: una caida del rate limiter no debe dejar al cliente
    // sin poder llenar su formulario. Se logea para que sea visible.
    console.error("[client-onboarding] check_rate_limit fallo:", error.message);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const result = (data ?? {}) as {
    allowed?: boolean;
    block_remaining_seconds?: number;
  };

  return {
    allowed: result.allowed !== false,
    retryAfterSeconds: result.block_remaining_seconds ?? 0,
  };
}

// ----------------------------------------------------------------------------
// Carga y validacion del formulario por token
// ----------------------------------------------------------------------------

export interface OnboardingForm {
  id: string;
  organization_id: string;
  client_id: string;
  status: string;
  form_data: Record<string, unknown>;
  expires_at: string;
  submitted_at: string | null;
  /** Usuario que creo su cuenta desde el paso 0 del link (null = nadie aun). */
  claimed_user_id: string | null;
}

export type TokenFailure =
  | { ok: false; code: "invalid_token"; status: 404 }
  | { ok: false; code: "expired"; status: 410 }
  | { ok: false; code: "already_processed"; status: 409 };

export type TokenResult = { ok: true; form: OnboardingForm } | TokenFailure;

/** Valida el formato del token antes de tocar la base de datos. */
export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

/**
 * Carga el formulario por token y aplica las tres validaciones de acceso:
 * existe, no vencido, y no procesado todavia.
 */
export async function loadFormByToken(
  supabase: SupabaseClientLike,
  token: string,
): Promise<TokenResult> {
  const { data, error } = await supabase
    .from("client_onboarding_forms")
    .select(
      "id, organization_id, client_id, status, form_data, expires_at, submitted_at, claimed_user_id",
    )
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error(
      "[client-onboarding] error cargando formulario:",
      error.message,
    );
    return { ok: false, code: "invalid_token", status: 404 };
  }

  if (!data) return { ok: false, code: "invalid_token", status: 404 };

  if (data.status === "processed") {
    return { ok: false, code: "already_processed", status: 409 };
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return { ok: false, code: "expired", status: 410 };
  }

  return { ok: true, form: data as OnboardingForm };
}

/** Mensajes de cara al cliente final (español, sin jerga). */
export const FAILURE_MESSAGES: Record<TokenFailure["code"], string> = {
  invalid_token:
    "Este enlace no es válido. Pídele uno nuevo a la persona que te contactó.",
  expired:
    "Este enlace ya venció. Pídele uno nuevo a la persona que te contactó.",
  already_processed:
    "Este formulario ya fue procesado. Si necesitas cambiar algo, escríbenos.",
};

// ----------------------------------------------------------------------------
// Documentos legales del registro (paso 0 del link)
// ----------------------------------------------------------------------------

export interface RegistrationDocument {
  id: string;
  document_type: string;
  title: string;
  version: string;
  summary: string | null;
  content_html: string;
}

/**
 * Documentos que un tipo de cuenta debe aceptar al registrarse. Misma logica
 * que `get_pending_consents` pero sin usuario (RPC `list_registration_documents`).
 */
export async function listRegistrationDocuments(
  supabase: SupabaseClientLike,
  accountType: "client" | "talent" | "organization",
): Promise<RegistrationDocument[]> {
  const { data, error } = await supabase.rpc("list_registration_documents", {
    p_account_type: accountType,
  });
  if (error) {
    console.error(
      "[client-onboarding] list_registration_documents fallo:",
      error.message,
    );
    return [];
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((d) => ({
    id: String(d.document_id),
    document_type: String(d.document_type),
    title: String(d.title),
    version: String(d.version),
    summary: typeof d.summary === "string" ? d.summary : null,
    content_html: String(d.content_html ?? ""),
  }));
}

// ----------------------------------------------------------------------------
// Volcado del formulario a la ficha de la empresa (`clients`)
// ----------------------------------------------------------------------------

const texto = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** Correo con el que el cliente entra al portal (o el del aprobador). */
export function correoPortalDelFormulario(
  formData: Record<string, unknown>,
): string | null {
  const equipo = (formData.equipo ?? {}) as Record<string, unknown>;
  const aprobador = (equipo.aprobador ?? {}) as Record<string, unknown>;
  const correo = texto(equipo.correo_portal) ?? texto(aprobador.correo);
  return correo ? correo.toLowerCase() : null;
}

/** Nombre de la persona de contacto (aprobador) del formulario. */
export function nombreContactoDelFormulario(
  formData: Record<string, unknown>,
): string | null {
  const equipo = (formData.equipo ?? {}) as Record<string, unknown>;
  const aprobador = (equipo.aprobador ?? {}) as Record<string, unknown>;
  return texto(aprobador.nombre);
}

/**
 * Espejo 1:1 de la pestana Info de la empresa (ClientDetailDialog) y del
 * editor de perfil completo (CompanyProfileEditor). Si aca falta una columna,
 * el admin la ve vacia y la tiene que escribir a mano.
 *
 * DATOS FISCALES: si se copian a `clients` (legal_name, document_*, address,
 * legal_representative, billing_email). Es seguro desde
 * 20260812080000_fix_clients_is_public_leak.sql: lo publico vive en la vista
 * `public_client_profiles` (solo marketing). Aun asi se deja is_public=false.
 *
 * No pisa con null lo que el admin ya tenga cargado.
 */
export async function volcarFormularioAClients(
  supabase: SupabaseClientLike,
  clientId: string,
  formData: Record<string, unknown>,
): Promise<{ ok: true; detalle: string } | { ok: false; error: string }> {
  const equipo = (formData.equipo ?? {}) as Record<string, unknown>;
  const aprobador = (equipo.aprobador ?? {}) as Record<string, unknown>;
  const legal = (formData.legal ?? {}) as Record<string, unknown>;
  const marca = (formData.marca ?? {}) as Record<string, unknown>;
  const prod = (formData.producto ?? {}) as Record<string, unknown>;

  // Resumen corto para `notes`. Nada fiscal.
  const notas = [
    texto(prod.nombre) ? `Producto: ${texto(prod.nombre)}` : null,
    texto(prod.precio) ? `Precio: ${texto(prod.precio)}` : null,
    texto(marca.tono_deseado) ? `Tono: ${texto(marca.tono_deseado)}` : null,
  ].filter(Boolean).join(" · ");

  // La historia de marca puede ser larguisima; `bio` en el editor de perfil
  // esta topado en 500 caracteres, asi que se recorta igual.
  const historiaCompleta = texto(marca.historia);
  const historiaCorta = historiaCompleta ? historiaCompleta.slice(0, 500) : null;

  const cambios: Record<string, unknown> = {
    contact_email: texto(aprobador.correo) ?? texto(equipo.correo_portal),
    contact_phone: texto(aprobador.celular),
    whatsapp_phone: texto(aprobador.celular),
    main_contact: texto(aprobador.nombre),
    instagram: texto(marca.instagram),
    tiktok: texto(marca.tiktok),
    facebook: texto(marca.facebook),
    linkedin: texto(marca.linkedin),
    website: texto(marca.website),
    category: texto(legal.categoria),
    // `bio` es la "Descripcion" de la ficha. Si el cliente no escribio una,
    // sirve la historia de marca — es el mismo tipo de texto.
    bio: texto(legal.descripcion) ?? historiaCorta,
    legal_name: texto(legal.razon_social),
    legal_representative: texto(legal.representante),
    billing_email: texto(legal.correo_facturacion) ??
      texto(legal.correo_representante),
    // El wizard usa los mismos `value` que CompanyProfileEditor, asi que no
    // hay traduccion: si viniera vacio, un NIT sin tipo no dice nada.
    document_type: texto(legal.tipo_documento) ??
      (texto(legal.nit) ? "nit" : null),
    document_number: texto(legal.nit),
    address: texto(legal.direccion_fiscal),
    city: texto(legal.ciudad),
    country: texto(legal.pais),
    notes: notas || null,
    // El cliente onboardeado deja de ser un perfil publico.
    is_public: false,
  };
  for (const k of Object.keys(cambios)) {
    if (cambios[k] === null && k !== "is_public") delete cambios[k];
  }

  const { error } = await supabase.from("clients").update(cambios).eq(
    "id",
    clientId,
  );
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    detalle:
      "Ficha de la empresa completada (contacto, marca, fiscales); is_public en false.",
  };
}
