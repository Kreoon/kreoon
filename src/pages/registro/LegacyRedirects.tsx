import { Navigate, useLocation, useParams } from "react-router-dom";
import { normalizeOrgSlug, registrationContinuePath } from "@/lib/registration/paths";
import { buildCanonicalRegistrationUrl } from "@/lib/registration/legacyRedirect";
import { RegistrationEntryRedirect } from "./OrganizationRegistrationPage";

/**
 * /register/:slug, /auth/org/:slug y /org/:slug (entradas de ALTA heredadas) → /registro/:slug.
 * El slug se normaliza; la validez/alias/estado los resuelve el servidor en la página canónica
 * (slug inválido → estado "no encontrada", sin fallback a otra organización).
 * Solo se conserva atribución validada y un destino interno seguro.
 */
export function LegacySlugRegistrationRedirect() {
  const { slug } = useParams();
  const { search } = useLocation();
  const normalized = normalizeOrgSlug(slug);
  if (!normalized) return <Navigate to="/registro/organizacion-no-valida" replace />;

  // Enlaces de confirmación ya enviados apuntaban a /register/:slug?confirmed=true (con tokens en el
  // hash, que el cliente de Supabase consume al cargar). Deben aterrizar en el paso con sesión.
  if (new URLSearchParams(search).get("confirmed") === "true") {
    return <Navigate to={registrationContinuePath(normalized)} replace />;
  }
  return <Navigate to={buildCanonicalRegistrationUrl(normalized, search)} replace />;
}

/** /register, /unete, /unete/talento, /unete-talento, /registro: organización según el host. */
export function GenericRegistrationRedirect() {
  return <RegistrationEntryRedirect />;
}
