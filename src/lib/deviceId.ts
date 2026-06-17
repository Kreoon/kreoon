/**
 * Identificador de dispositivo persistente, guardado en una cookie del navegador
 * (`kreoon_did`). Se envía al access-gate para poder bloquear un dispositivo
 * concreto aunque la persona cambie de cuenta o de IP (mientras no borre cookies).
 */
const COOKIE_NAME = "kreoon_did";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fallback abajo */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

/**
 * Devuelve el device id persistente, creándolo (y guardándolo en cookie) si no existe.
 */
export function getDeviceId(): string {
  const existing = readCookie(COOKIE_NAME);
  if (existing) return existing;

  const id = generateId();
  if (typeof document !== "undefined") {
    const secure =
      typeof location !== "undefined" && location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
  }
  return id;
}
