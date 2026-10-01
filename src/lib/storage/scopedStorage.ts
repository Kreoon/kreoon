/**
 * Almacenamiento local con ámbito de usuario y organización + limpieza centralizada.
 *
 * Por qué existe: varias pantallas guardaban datos privados en claves globales de localStorage
 * (borradores, organización activa, historial de KIRO, caché de React Query…). En un equipo o
 * teléfono compartido, la siguiente persona que iniciaba sesión en la misma pestaña podía ver
 * datos de la anterior. Regla nueva:
 *  - Lo privado se guarda con `scopeKey(base, { userId, orgId })` (clave por usuario y organización).
 *  - Al cerrar sesión o cambiar de cuenta se llama a `clearUserData()` + `purgeAuthenticatedCaches()`.
 *  - Las claves globales heredadas que todavía usan otros módulos se listan en
 *    `PRIVATE_LOCAL_KEYS` / `PRIVATE_LOCAL_PREFIXES` para borrarlas igualmente.
 *
 * Todas las operaciones toleran almacenamiento no disponible (modo privado, cuota llena, SSR).
 */

export type StorageArea = "local" | "session";

export interface StorageScope {
  userId: string | null | undefined;
  /** Organización activa; `null`/`undefined` = datos del usuario no ligados a una organización. */
  orgId?: string | null;
}

/** Prefijo de todas las claves con ámbito. */
export const SCOPED_PREFIX = "kreoon:u:";

/** Claves globales heredadas con datos privados de la sesión (se borran al salir). */
export const PRIVATE_LOCAL_KEYS: readonly string[] = [
  "activeRole",
  "kreoon-auth-store",
  "currentOrganizationId",
  "selectedClientId",
  "kreoon-rq-v1",
  "kiro-chat-history",
  "kreoon_kiro_notifications",
  "kreoon_kiro_feedback",
  "kreoon_onboarding_quiz",
  "kreoon_hiring_draft",
  "kreoon_creator_wizard_draft",
  "kreoon_product_brief_draft",
  "kreoon_product_brief_step",
  "kreoon_profile_banner_snoozed",
  "unsaved_changes_backup",
  "notificationPreferences",
];

/** Prefijos de claves heredadas con datos privados (borradores por id, filtros por organización…). */
export const PRIVATE_LOCAL_PREFIXES: readonly string[] = [
  SCOPED_PREFIX,
  "kreoon-rq-",
  "persist_",
  "kreoon_creator_wizard_draft_",
  "kreoon_product_brief_draft_",
  "kreoon_product_brief_step_",
  "content_notifications_",
  "finance-filters-",
];

/**
 * sessionStorage se vacía entero al salir salvo estas claves, que no son de la persona:
 * - `kreoon_access_gate`: puerta de acceso del dominio (no depende de la cuenta).
 * - `last-chunk-reload`: protección contra bucles de recarga tras un despliegue.
 */
export const SESSION_KEEP_KEYS: readonly string[] = ["kreoon_access_gate", "last-chunk-reload"];

/**
 * Cachés de Cache Storage que pudieron guardar respuestas autenticadas (service worker antiguo:
 * `supabase-rest-v2` cacheaba la API REST por URL, sin usuario; `supabase-storage-v1` guardaba
 * URLs firmadas). Se borran al arrancar y al cerrar sesión.
 */
const AUTHENTICATED_CACHE_RE = /supabase-(rest|functions)|supabase-storage-v1|supabase-api/i;

function getArea(area: StorageArea): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Clave con ámbito: `kreoon:u:<userId>:o:<orgId|->:<base>`. Devuelve null sin usuario. */
export function scopeKey(base: string, scope: StorageScope): string | null {
  if (!scope.userId) return null;
  return `${SCOPED_PREFIX}${scope.userId}:o:${scope.orgId || "-"}:${base}`;
}

export function scopedGet<T = unknown>(base: string, scope: StorageScope, area: StorageArea = "local"): T | null {
  const key = scopeKey(base, scope);
  const store = getArea(area);
  if (!key || !store) return null;
  try {
    const raw = store.getItem(key);
    return raw == null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function scopedSet(base: string, scope: StorageScope, value: unknown, area: StorageArea = "local"): boolean {
  const key = scopeKey(base, scope);
  const store = getArea(area);
  if (!key || !store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function scopedRemove(base: string, scope: StorageScope, area: StorageArea = "local"): void {
  const key = scopeKey(base, scope);
  const store = getArea(area);
  if (!key || !store) return;
  try {
    store.removeItem(key);
  } catch {
    /* almacenamiento no disponible */
  }
}

function keysOf(store: Storage): string[] {
  const out: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k != null) out.push(k);
  }
  return out;
}

/** Borra todas las claves con ámbito de un usuario (todas sus organizaciones), en ambas áreas. */
export function clearScope(userId: string): void {
  const prefix = `${SCOPED_PREFIX}${userId}:`;
  for (const area of ["local", "session"] as const) {
    const store = getArea(area);
    if (!store) continue;
    try {
      for (const k of keysOf(store)) if (k.startsWith(prefix)) store.removeItem(k);
    } catch {
      /* almacenamiento no disponible */
    }
  }
}

/** ¿La clave de localStorage es privada de la sesión? (exportado para pruebas) */
export function isPrivateLocalKey(key: string): boolean {
  return PRIVATE_LOCAL_KEYS.includes(key) || PRIVATE_LOCAL_PREFIXES.some((p) => key.startsWith(p));
}

/**
 * Borra todo dato local privado de la sesión: claves con ámbito de cualquier usuario, claves
 * heredadas de la lista, y sessionStorage salvo `SESSION_KEEP_KEYS`. Conserva preferencias del
 * dispositivo (tema, consentimiento de cookies, UTM, identificadores anónimos).
 */
export function clearUserData(): void {
  const local = getArea("local");
  if (local) {
    try {
      for (const k of keysOf(local)) if (isPrivateLocalKey(k)) local.removeItem(k);
    } catch {
      /* almacenamiento no disponible */
    }
  }
  const session = getArea("session");
  if (session) {
    try {
      for (const k of keysOf(session)) if (!SESSION_KEEP_KEYS.includes(k)) session.removeItem(k);
    } catch {
      /* almacenamiento no disponible */
    }
  }
}

/** Borra de Cache Storage las cachés que pudieron guardar respuestas autenticadas. */
export async function purgeAuthenticatedCaches(): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    await Promise.all(names.filter((n) => AUTHENTICATED_CACHE_RE.test(n)).map((n) => caches.delete(n)));
  } catch {
    /* Cache Storage no disponible (contexto inseguro, modo privado) */
  }
}
