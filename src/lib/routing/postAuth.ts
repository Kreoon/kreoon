import { getDashboardForRole } from "@/lib/permissionGroups";
import { sanitizeReturnTo } from "@/lib/registration/returnTo";

/**
 * Destino post-login / post-confirmación: ÚNICA fuente de verdad.
 * Antes Auth.tsx y ProtectedRoute tenían prioridades de rol distintas (origen de rebotes entre
 * marketplace, welcome, settings y dashboards). Ambos usan ahora este módulo.
 */
const ROLE_PRIORITY = [
  "admin",
  "team_leader",
  "digital_strategist",
  "creative_strategist",
  "strategist",
  "content_creator",
  "creator",
  "editor",
  "community_manager",
  "client",
] as const;

export function getDashboardPathForRoles(roles: readonly string[], activeRole?: string | null): string {
  if (roles.length === 0) return "/marketplace";
  if (activeRole && roles.includes(activeRole)) return getDashboardForRole(activeRole);
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return getDashboardForRole(r);
  }
  return "/marketplace";
}

/**
 * Aterrizaje explícito al iniciar sesión (conserva el comportamiento histórico de Auth.tsx para
 * los roles que ya tenían página propia). Cualquier otro rol cae al mapa canónico de grupos.
 */
const LOGIN_LANDING: ReadonlyArray<readonly [roles: readonly string[], path: string]> = [
  [["admin"], "/dashboard"],
  [["strategist"], "/strategist-dashboard"],
  [["creator", "content_creator", "ambassador"], "/creator-dashboard"],
  [["editor"], "/editor-dashboard"],
  [["client"], "/client-dashboard"],
  [["student"], "/academia"],
];

export interface PostAuthInput {
  roles: readonly string[];
  activeRole?: string | null;
  /** `next` ya recibido por la URL (se valida aquí: solo rutas internas y no de auth/registro). */
  next?: string | null;
  /** Solo relevante sin roles. */
  hasCreatorProfile?: boolean;
  isBrandMember?: boolean;
}

export function getPostAuthDestination(i: PostAuthInput): string {
  const safeNext = sanitizeReturnTo(i.next);
  if (safeNext) return safeNext;

  if (i.roles.length > 0) {
    for (const [group, path] of LOGIN_LANDING) {
      if (group.some((r) => i.roles.includes(r))) return path;
    }
    return getDashboardPathForRoles(i.roles, i.activeRole);
  }

  // Sin roles: marcas independientes y talento con perfil conservan su acceso al marketplace.
  if (i.isBrandMember || i.hasCreatorProfile) return "/marketplace";

  // Identidad sin membresía: se la lleva a confirmar su alta como creador (nunca a elegir marca).
  return "/registro";
}
