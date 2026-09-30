import { parseHostname } from "@/lib/white-label/domain-resolver";

/**
 * Qué organización gobierna el registro según el host.
 *  - `default`: dominio raíz de la plataforma (kreoon.com, localhost, previews de Vercel) →
 *    organización predeterminada configurada en el servidor (hoy UGC Colombia).
 *  - `domain`: subdominio/dominio propio de una organización → se resuelve en el servidor
 *    (resolve_org_by_domain). Si no resuelve NO hay fallback silencioso a la predeterminada.
 */
export type RegistrationHostTarget =
  | { kind: "default" }
  | { kind: "domain"; hostname: string };

const PLATFORM_PREVIEW_SUFFIXES = [".vercel.app"];

export function getRegistrationHostTarget(hostname: string): RegistrationHostTarget {
  const h = hostname.toLowerCase().replace(/:\d+$/, "");
  if (PLATFORM_PREVIEW_SUFFIXES.some((s) => h.endsWith(s))) return { kind: "default" };
  const parsed = parseHostname(h);
  return parsed.type === "main" ? { kind: "default" } : { kind: "domain", hostname: parsed.hostname };
}
