/**
 * Validación de destinos de retorno (`next`, `redirect`, `returnTo`).
 *
 * Solo se aceptan rutas INTERNAS (path absoluto del mismo origen). Se rechaza todo lo que pueda
 * salir del sitio o reentrar en el flujo de autenticación/registro (bucles):
 *  - esquemas (`https:`, `javascript:`, `data:`), URLs protocolo-relativas (`//evil.com`), `\`
 *  - caracteres de control, longitud excesiva
 *  - rutas de auth/registro, que generarían bucles
 *
 * La autorización real del destino la sigue haciendo ProtectedRoute: esto solo evita open redirects.
 */
const MAX_LENGTH = 500;

// Única excepción a la lista de bloqueo: el paso "continuar" del registro, al que se vuelve tras
// iniciar sesión. Requiere sesión, así que no puede formar un bucle.
const REGISTRATION_CONTINUE_RE = /^\/registro\/[a-z0-9][a-z0-9-]{1,62}\/continuar\/?$/;

const BLOCKED_PREFIXES = [
  "/auth",
  "/registro",
  "/register",
  "/unete",
  "/unete-talento",
  "/unlock-access",
  "/marca-referida",
  "/api",
];

export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;

  let value = raw.trim();
  if (!value || value.length > MAX_LENGTH) return null;

  // Decodifica una sola vez: "%2F%2Fevil.com" no debe colarse como "//evil.com".
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }

  if (value.length > MAX_LENGTH) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;

  // Normaliza con el parser de URL contra un origen ficticio y comprueba que siga interno.
  let parsed: URL;
  try {
    parsed = new URL(value, "https://internal.invalid");
  } catch {
    return null;
  }
  if (parsed.origin !== "https://internal.invalid") return null;

  const path = parsed.pathname;
  // Tras normalizar ("/.//evil.com" → "//evil.com") el resultado puede volver a ser protocolo-relativo:
  // se revalida la RUTA ya normalizada, no solo la entrada.
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  const lower = path.toLowerCase();
  if (REGISTRATION_CONTINUE_RE.test(lower)) return `${path}${parsed.search}${parsed.hash}`;
  if (BLOCKED_PREFIXES.some((p) => lower === p || lower.startsWith(`${p}/`))) return null;

  return `${path}${parsed.search}${parsed.hash}`;
}
