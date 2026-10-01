import { pickAttribution, attributionToSearchParams } from "./attribution";
import { sanitizeReturnTo } from "./returnTo";
import { registrationPath } from "./paths";

/**
 * Construye la URL canónica a la que redirigen las entradas heredadas
 * (/register, /auth?tab=register, /unete/talento, /r/:code, ...).
 *
 * Conserva SOLO atribución validada (UTM, ref) y un destino de retorno interno y seguro
 * (`next` | `redirect` | `returnTo`). Descarta todo lo demás (role, intent, org, plan, type...).
 */
export function buildCanonicalRegistrationUrl(slug: string, legacySearch: string | URLSearchParams): string {
  const sp = typeof legacySearch === "string" ? new URLSearchParams(legacySearch) : legacySearch;
  const out = attributionToSearchParams(pickAttribution(sp));

  const returnTo = sanitizeReturnTo(sp.get("next") ?? sp.get("redirect") ?? sp.get("returnTo"));
  if (returnTo) out.set("next", returnTo);

  return registrationPath(slug, out);
}

/** `/r/:code` → el código del referido viaja como `ref` (validado como atribución). */
export function buildReferralRegistrationUrl(slug: string, code: string, legacySearch: string | URLSearchParams = ""): string {
  const sp = new URLSearchParams(typeof legacySearch === "string" ? legacySearch : legacySearch.toString());
  sp.set("ref", code);
  return buildCanonicalRegistrationUrl(slug, sp);
}
