import { sanitizeReturnTo } from "./returnTo";

/** Ruta del onboarding unificado de creadores. El `next` validado se conserva para después. */
export const CREATOR_ONBOARDING_PATH = "/bienvenida";

export function creatorOnboardingPath(next?: string | null): string {
  const safe = sanitizeReturnTo(next);
  return safe ? `${CREATOR_ONBOARDING_PATH}?next=${encodeURIComponent(safe)}` : CREATOR_ONBOARDING_PATH;
}
