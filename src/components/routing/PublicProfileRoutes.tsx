/**
 * Rutas del perfil público de creador. Una sola URL canónica: `/p/:slug`.
 *
 * - `/p/:slug`                 → PublicProfileView (mismo árbol que tenía /marketplace/creator/:id).
 * - `/marketplace/creator/:id` → si `id` es un slug, redirige a /p/:slug; si es UUID (id del perfil o
 *                                del usuario), resuelve `creator_profiles.slug` y redirige; sin slug,
 *                                muestra el perfil igual (no rompe enlaces viejos).
 * - `/@slug`                   → React Router 6 no admite `/@:param` (el parámetro debe ocupar el
 *                                segmento entero), así que se atiende en la ruta comodín.
 *
 * Todas las redirecciones usan `replace` y conservan `?search` y `#hash` (p. ej. `?payment=success`).
 */
import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TalentGate } from "@/components/TalentGate";
import { ProfileLayout } from "@/components/profile-viewer/ProfileLayout";
import { getPublicProfilePath, isUuid, normalizeProfileSlug } from "@/lib/routing/publicProfile";

const CreatorProfilePage = lazy(() => import("@/components/marketplace/profile/CreatorProfilePage"));

function RouteSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Cargando perfil">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
    </div>
  );
}

/** Vista del perfil público (idéntica a la de /marketplace/creator/:id). */
export function PublicProfileView({ profileKey }: { profileKey: string }) {
  return (
    <TalentGate>
      <ProfileLayout>
        <Suspense fallback={<RouteSpinner />}>
          <CreatorProfilePage profileKey={profileKey} />
        </Suspense>
      </ProfileLayout>
    </TalentGate>
  );
}

/** Resuelve el slug de un perfil a partir del id del perfil o del usuario (ambos UUID). */
async function fetchSlugForId(id: string): Promise<string | null> {
  const byId = await supabase.from("creator_profiles").select("slug").eq("id", id).maybeSingle();
  if (byId.data?.slug) return byId.data.slug;
  if (byId.data) return null;
  const byUser = await supabase.from("creator_profiles").select("slug").eq("user_id", id).limit(1).maybeSingle();
  return byUser.data?.slug ?? null;
}

/** `/marketplace/creator/:id` → `/p/:slug` */
export function LegacyCreatorProfileRoute() {
  const { id } = useParams<{ id: string }>();
  const { search, hash } = useLocation();
  const uuid = isUuid(id);

  const { data: slug, isLoading } = useQuery({
    queryKey: ["creator-public-slug", id],
    queryFn: () => fetchSlugForId(id as string),
    enabled: uuid,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  if (!id) return <Navigate to="/marketplace" replace />;

  if (!uuid) {
    const clean = normalizeProfileSlug(id);
    if (clean) return <Navigate to={`${getPublicProfilePath(clean)}${search}${hash}`} replace />;
    return <PublicProfileView profileKey={id} />;
  }

  if (isLoading) return <RouteSpinner />;
  if (slug) return <Navigate to={`${getPublicProfilePath(slug)}${search}${hash}`} replace />;
  // Sin slug (o error al resolver): se muestra el perfil por id, sin romper el enlace.
  return <PublicProfileView profileKey={id} />;
}

/** Comodín: `/@slug` → `/p/slug`; cualquier otra ruta desconocida → `fallback` (404). */
export function CatchAllRoute({ fallback }: { fallback: ReactNode }) {
  const { pathname, search, hash } = useLocation();
  const match = /^\/@([^/]+)\/?$/.exec(pathname);
  if (match) {
    const clean = normalizeProfileSlug(match[1]);
    if (clean) return <Navigate to={`${getPublicProfilePath(clean)}${search}${hash}`} replace />;
  }
  return <>{fallback}</>;
}
