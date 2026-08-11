// ============================================================================
// KREOON — Helpers compartidos del onboarding publico de clientes
// ============================================================================
//
// Usado por client-onboarding-get y client-onboarding-submit, ambas con
// verify_jwt = false. El caller es un cliente SIN sesion que solo tiene el
// token del formulario, asi que toda la validacion vive aqui + en la RLS
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
 */
const REQUIRED_FIELDS: Record<string, string[]> = {
  legal: [
    "razon_social",
    "nit",
    "representante",
    "correo_representante",
    "direccion_fiscal",
    "ciudad",
    "pais",
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
      "id, organization_id, client_id, status, form_data, expires_at, submitted_at",
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
