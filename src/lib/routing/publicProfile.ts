/**
 * URL pública ÚNICA del perfil de creador: `/p/:slug` (decisión de Alexander, 2026-10-01).
 * `/@:slug` y `/marketplace/creator/:id` solo redirigen aquí (ver PublicProfileRoutes.tsx).
 */

/** Dominio de producción para enlaces que se comparten fuera de la app. */
export const PUBLIC_SITE_ORIGIN = "https://kreoon.com";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Limpia un slug venido de la URL: sin `@` inicial, sin espacios, en minúsculas. */
export function normalizeProfileSlug(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }
  value = value.replace(/^@+/, "").trim().toLowerCase();
  if (!value || value.length > 100 || /[\s/\\?#]/.test(value)) return null;
  return value;
}

/** Ruta interna del perfil público. */
export function getPublicProfilePath(slug: string): string {
  return `/p/${encodeURIComponent(slug)}`;
}

/** URL absoluta para compartir (siempre el dominio de producción). */
export function getPublicProfileUrl(slug: string): string {
  return `${PUBLIC_SITE_ORIGIN}${getPublicProfilePath(slug)}`;
}
