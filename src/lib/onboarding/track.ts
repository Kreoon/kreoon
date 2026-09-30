/**
 * ¿Qué asistente de onboarding corresponde a cada cuenta?
 *
 *  - creator:          creador (rol de creador, no cliente) → asistente corto de creadores.
 *  - needs_membership: sesión válida pero SIN ninguna membresía/rol → no se le ofrece elegir marca
 *                      ni organización: se le lleva al registro de creadores de la organización del
 *                      host, donde confirma explícitamente.
 *  - legacy:           clientes/marcas existentes y demás roles (editor, estrategas, estudiantes...)
 *                      conservan su flujo actual (Nova). No se convierten a creadores.
 */
export type OnboardingTrack = "creator" | "needs_membership" | "legacy";

const CREATOR_ROLES = new Set(["creator", "content_creator", "ugc_creator"]);

export interface TrackInput {
  roles: readonly string[];
  userType: string | null | undefined;
}

export function getOnboardingTrack({ roles, userType }: TrackInput): OnboardingTrack {
  const hasClientSide = userType === "client" || roles.includes("client");
  if (hasClientSide) return "legacy";
  if (roles.some((r) => CREATOR_ROLES.has(r))) return "creator";
  if (roles.length === 0) return "needs_membership";
  return "legacy";
}

/** Primer paso sin datos: el asistente es reanudable y arranca donde la persona se quedó. */
export type CreatorStep = "name" | "photo" | "content" | "done";

export function getCreatorStartStep(p: {
  hasCustomName: boolean;
  hasAvatar: boolean;
  contentTypesCount: number;
}): CreatorStep {
  if (!p.hasCustomName) return "name";
  if (!p.hasAvatar) return "photo";
  if (p.contentTypesCount === 0) return "content";
  return "done";
}
