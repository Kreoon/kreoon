/**
 * Rutas canónicas del registro por organización.
 *
 * Única fuente de verdad: todo CTA, redirección legada y `emailRedirectTo` construye la URL aquí.
 * El slug viaja en la RUTA (no en localStorage ni en user_metadata) y el servidor lo valida.
 */
export const REGISTRATION_BASE = "/registro";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

export function isValidOrgSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_RE.test(value);
}

export function normalizeOrgSlug(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase();
  return isValidOrgSlug(v) ? v : null;
}

/** /registro/:slug[?query] */
export function registrationPath(slug: string, query?: URLSearchParams | string): string {
  const qs = typeof query === "string" ? query.replace(/^\?/, "") : query?.toString() ?? "";
  return `${REGISTRATION_BASE}/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`;
}

/** /registro/:slug/continuar[?query] — paso que requiere sesión (OAuth, enlace de correo). */
export function registrationContinuePath(slug: string, query?: URLSearchParams | string): string {
  const qs = typeof query === "string" ? query.replace(/^\?/, "") : query?.toString() ?? "";
  return `${REGISTRATION_BASE}/${encodeURIComponent(slug)}/continuar${qs ? `?${qs}` : ""}`;
}
