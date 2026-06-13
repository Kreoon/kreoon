/**
 * Devuelve la URL si tiene un scheme seguro (http/https/mailto), o `null` si no.
 * Bloquea `javascript:`, `data:`, `vbscript:` y cualquier otro scheme custom
 * que podría ejecutar código al hacer click.
 *
 * Úsalo SIEMPRE que renderices un href que provenga de input de usuario
 * (perfiles, posts, eventos, etc.) para evitar XSS.
 */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  // Permitimos sólo http(s) absolutos y mailto:
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^mailto:[^\s]+@[^\s]+/i.test(trimmed)) return trimmed;
  return null;
}
