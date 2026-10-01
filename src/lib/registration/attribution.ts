/**
 * Atribución (UTM y referido) que se conserva a través del registro.
 *
 * Lista blanca estricta: solo estas claves, valores cortos y con caracteres seguros.
 * NUNCA se arrastran parámetros de rol, tenant, organización o intención (`role`, `intent`,
 * `org`, `organization_id`, `type`...): darían privilegios o mezclarían contexto.
 * El servidor vuelve a filtrar con la misma lista (complete_creator_signup).
 */
export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type Attribution = Partial<Record<AttributionKey, string>>;

const VALUE_RE = /^[\p{L}\p{N} _.\-+~:@]{1,100}$/u;

export function pickAttribution(params: URLSearchParams | string | null | undefined): Attribution {
  const sp = typeof params === "string" ? new URLSearchParams(params) : params ?? new URLSearchParams();
  const out: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const v = sp.get(key);
    if (v && VALUE_RE.test(v)) out[key] = v;
  }
  return out;
}

export function attributionToSearchParams(attr: Attribution, into = new URLSearchParams()): URLSearchParams {
  for (const key of ATTRIBUTION_KEYS) {
    const v = attr[key];
    if (v) into.set(key, v);
  }
  return into;
}

export function hasAttribution(attr: Attribution): boolean {
  return Object.keys(attr).length > 0;
}
