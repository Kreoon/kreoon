/**
 * Persistencia de la caché de React Query con ámbito de usuario + organización.
 *
 * Antes (`kreoon-rq-v1`) se guardaba TODA la caché en una clave global de localStorage y se
 * rehidrataba al arrancar sin comprobar de quién era: la siguiente persona en el mismo equipo
 * veía datos de la anterior. Ahora:
 *  - Solo se persisten consultas de catálogo NO sensibles (lista blanca por primer segmento de
 *    `queryKey`): países, monedas, tasas de cambio, planes, plantillas públicas, documentos legales.
 *  - La clave es `kreoon-rq-v2:<userId>:<orgId>` y el contenido guarda su propio ámbito; solo se
 *    rehidrata si coincide con la sesión actual (nunca datos de otra sesión).
 *  - La clave legada `kreoon-rq-v1` se borra al cargar el módulo.
 *
 * API de TanStack Query v5 usada: `dehydrate(client, { shouldDehydrateQuery })` y
 * `hydrate(client, state)` (sin el plugin de persistencia, que no hace falta para esto).
 */
import { dehydrate, hydrate, type DehydratedState, type QueryClient, type QueryKey } from "@tanstack/react-query";

export const RQ_CACHE_PREFIX = "kreoon-rq-v2:";
const LEGACY_KEYS = ["kreoon-rq-v1"];
const MAX_AGE_MS = 60 * 60 * 1000; // 1 h (= gcTime)
const MAX_BYTES = 512 * 1024;
const PERSIST_DEBOUNCE_MS = 3000;

/** Primer segmento de `queryKey` de las consultas de catálogo que se pueden guardar en el equipo. */
export const PERSISTABLE_QUERY_ROOTS: ReadonlySet<string> = new Set([
  "countries",
  "supported-currencies",
  "exchange-rate",
  "exchange-rates",
  "currency-conversions",
  "subscription-plans",
  "plan-features",
  "public-templates",
  "legal-documents",
  "legal-document",
]);

export function isPersistableQueryKey(queryKey: QueryKey): boolean {
  const root = queryKey[0];
  return typeof root === "string" && PERSISTABLE_QUERY_ROOTS.has(root);
}

export function persistedCacheKey(userId: string, orgId: string | null | undefined): string {
  return `${RQ_CACHE_PREFIX}${userId}:${orgId || "-"}`;
}

interface PersistedPayload {
  ts: number;
  userId: string;
  orgId: string | null;
  state: DehydratedState;
}

function safeLocal(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Borra la caché persistida heredada (sin ámbito). */
export function removeLegacyQueryCache(): void {
  const ls = safeLocal();
  if (!ls) return;
  for (const k of LEGACY_KEYS) {
    try {
      ls.removeItem(k);
    } catch {
      /* almacenamiento no disponible */
    }
  }
}

/**
 * Rehidrata (si existe y coincide la sesión) y empieza a persistir la caché del ámbito dado.
 * Devuelve la función que detiene la persistencia (llamarla al cambiar de usuario/organización).
 */
export function attachScopedQueryPersistence(
  queryClient: QueryClient,
  userId: string,
  orgId: string | null | undefined,
): () => void {
  const ls = safeLocal();
  if (!ls) return () => {};
  const key = persistedCacheKey(userId, orgId);
  const scopeOrg = orgId || null;

  try {
    const raw = ls.getItem(key);
    if (raw) {
      const payload = JSON.parse(raw) as Partial<PersistedPayload>;
      const sameScope = payload.userId === userId && (payload.orgId ?? null) === scopeOrg;
      const fresh = typeof payload.ts === "number" && Date.now() - payload.ts < MAX_AGE_MS;
      if (sameScope && fresh && payload.state) {
        hydrate(queryClient, {
          ...payload.state,
          // Doble filtro: aunque alguien manipule el almacenamiento, solo entran consultas de catálogo.
          queries: (payload.state.queries ?? []).filter((q) => isPersistableQueryKey(q.queryKey)),
          mutations: [],
        });
      } else {
        ls.removeItem(key);
      }
    }
  } catch {
    try {
      ls.removeItem(key);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const state = dehydrate(queryClient, {
          shouldDehydrateQuery: (q) => q.state.status === "success" && isPersistableQueryKey(q.queryKey),
          shouldDehydrateMutation: () => false,
        });
        if (state.queries.length === 0) {
          ls.removeItem(key);
          return;
        }
        const payload: PersistedPayload = { ts: Date.now(), userId, orgId: scopeOrg, state };
        const json = JSON.stringify(payload);
        if (json.length < MAX_BYTES) ls.setItem(key, json);
      } catch {
        /* cuota llena o almacenamiento no disponible */
      }
    }, PERSIST_DEBOUNCE_MS);
  });

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}
