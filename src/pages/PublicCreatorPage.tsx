import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, User, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePageRenderer } from '@/components/profile-viewer/ProfilePageRenderer';
import { ProfileShareButton } from '@/components/marketplace/profile/ProfileShareButton';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { useAnalytics } from '@/hooks/useAnalytics';
import { FollowButton } from '@/components/social/FollowButton';
import { getPermissionGroup } from '@/lib/permissionGroups';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PortfolioItem {
  id: string;
  media_type: 'image' | 'video';
  media_url: string;
  thumbnail_url: string | null;
}

interface CreatorProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  slug: string;
  username: string | null;
  level: string | null;
  // Datos adicionales para meta tags
  primary_role: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  completed_projects: number | null;
  banner_url: string | null;
  // Primer item del portafolio para OG image
  featured_media: PortfolioItem | null;
}

const LEVEL_LABELS: Record<string, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  elite: 'Elite',
};

// ─── Helper: obtener mejor imagen para OG ──────────────────────────────────────

function getOgImage(profile: CreatorProfile): string {
  // Prioridad: thumbnail del portafolio > banner > avatar > default
  if (profile.featured_media) {
    // Si es video, usar thumbnail; si es imagen, usar URL directa
    if (profile.featured_media.media_type === 'video' && profile.featured_media.thumbnail_url) {
      return profile.featured_media.thumbnail_url;
    }
    if (profile.featured_media.media_type === 'image' && profile.featured_media.media_url) {
      return profile.featured_media.media_url;
    }
  }

  if (profile.banner_url) return profile.banner_url;
  if (profile.avatar_url) return profile.avatar_url;

  return 'https://kreoon.com/og-default.png';
}

// ─── Error Component ───────────────────────────────────────────────────────────

function ProfileNotFound({ isOwnEmptyProfile }: { isOwnEmptyProfile: boolean }) {
  const navigate = useNavigate();

  if (isOwnEmptyProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm" role="alert" aria-live="assertive">
          <div className="flex justify-center">
            <User className="h-12 w-12 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Completa tu perfil</h1>
          <p className="text-sm text-muted-foreground">
            Aun no tienes un perfil publico. Completalo para que las marcas te encuentren y puedas
            compartir tu link en tus redes.
          </p>
          <button
            onClick={() => navigate('/settings?section=profile')}
            className="inline-block text-sm font-medium text-primary hover:underline mt-2"
          >
            Completar mi perfil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-sm" role="alert" aria-live="assertive">
        <div className="flex justify-center">
          <User className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Perfil no encontrado</h1>
        <p className="text-sm text-muted-foreground">
          El usuario que buscas no existe o su perfil no esta disponible.
        </p>
        <a
          href="/marketplace"
          className="inline-block text-sm text-primary hover:underline mt-2"
        >
          Explorar marketplace
        </a>
      </div>
    </div>
  );
}

function ProfileError({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-sm" role="alert" aria-live="assertive">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Error al cargar perfil</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <a
          href="/marketplace"
          className="inline-block text-sm text-primary hover:underline mt-2"
        >
          Ir al marketplace
        </a>
      </div>
    </div>
  );
}

function ProfileLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      role="status"
      aria-label="Cargando perfil"
    >
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

// ─── Helper: generar descripcion rica para SEO ─────────────────────────────────

function generateDescription(profile: CreatorProfile): string {
  const parts: string[] = [];

  parts.push(profile.display_name);

  if (profile.primary_role) {
    parts[0] += ` - ${profile.primary_role}`;
  }

  if (profile.rating_avg && profile.rating_count) {
    parts.push(`${profile.rating_avg.toFixed(1)}/5 (${profile.rating_count} reviews)`);
  }

  if (profile.completed_projects && profile.completed_projects > 0) {
    parts.push(`${profile.completed_projects} proyectos`);
  }

  if (profile.bio) {
    const shortBio = profile.bio.length > 100 ? profile.bio.slice(0, 100) + '...' : profile.bio;
    parts.push(shortBio);
  }

  return parts.join(' | ') || `Conoce el perfil de ${profile.display_name} en Kreoon`;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PublicCreatorPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const { track } = useAnalytics();
  const trackedProfileIdRef = useRef<string | null>(null);
  // Perfil propio del visitante (si tiene sesion) — para distinguir "perfil no encontrado"
  // de "todavia no completaste tu perfil" cuando el visitante logueado no tiene slug propio.
  const { profile: viewerCreatorProfile, loading: viewerProfileLoading } = useCreatorProfile();

  // Limpiar @ del username si viene en la URL (/@username)
  const cleanUsername = username?.startsWith('@') ? username.slice(1) : username;

  // Query to resolve username (slug) to creator profile
  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['public-creator-profile', cleanUsername],
    queryFn: async (): Promise<CreatorProfile | null> => {
      if (!cleanUsername) return null;

      const searchTerm = cleanUsername.toLowerCase();

      // Buscar por slug O username con primer item del portafolio
      const { data, error: queryError } = await supabase
        .from('creator_profiles')
        .select(`
          id,
          user_id,
          display_name,
          bio,
          avatar_url,
          banner_url,
          slug,
          username,
          level,
          primary_role,
          rating_avg,
          rating_count,
          completed_projects,
          portfolio_items!portfolio_items_creator_id_fkey (
            id,
            media_type,
            media_url,
            thumbnail_url
          )
        `)
        .or(`slug.eq.${searchTerm},username.eq.${searchTerm}`)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (queryError) {
        throw queryError;
      }

      if (!data) return null;

      // Extraer primer item del portafolio como featured_media
      const portfolioItems = (data as Record<string, unknown>).portfolio_items as PortfolioItem[] | null;
      const featured = portfolioItems?.[0] || null;

      return {
        id: data.id,
        user_id: data.user_id,
        display_name: data.display_name,
        bio: data.bio,
        avatar_url: data.avatar_url,
        banner_url: data.banner_url,
        slug: data.slug,
        username: data.username,
        level: data.level,
        primary_role: data.primary_role,
        rating_avg: data.rating_avg,
        rating_count: data.rating_count,
        completed_projects: data.completed_projects,
        featured_media: featured,
      };
    },
    enabled: !!cleanUsername,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // profile_view (KAE) — una vez por profile.id cargado, visitante puede ser anonimo
  useEffect(() => {
    if (!profile?.id || trackedProfileIdRef.current === profile.id) return;
    trackedProfileIdRef.current = profile.id;
    track({
      event_name: 'profile_view',
      event_category: 'engagement',
      properties: { creator_id: profile.id, is_own_profile: viewerCreatorProfile?.id === profile.id },
    });
  }, [profile?.id, track, viewerCreatorProfile?.id]);

  // ── Render states ──

  const isOwnEmptyProfile = !!user && !viewerProfileLoading && !viewerCreatorProfile?.slug;

  if (!cleanUsername) {
    return <ProfileNotFound isOwnEmptyProfile={isOwnEmptyProfile} />;
  }

  if (isLoading) {
    return <ProfileLoading />;
  }

  if (isError) {
    const message =
      error instanceof Error
        ? error.message
        : 'Ocurrio un error al cargar el perfil. Intenta de nuevo.';
    return <ProfileError message={message} />;
  }

  if (!profile) {
    return <ProfileNotFound isOwnEmptyProfile={isOwnEmptyProfile} />;
  }

  // ── Generar meta tags ──

  const canonicalUrl = `https://kreoon.com/@${profile.slug}`;
  const description = generateDescription(profile);
  const title = `${profile.display_name} | Kreoon`;

  // Usar primer item del portafolio, banner o avatar como imagen OG
  const ogImage = getOgImage(profile);

  // ── Success: Render profile ──

  return (
    <>
      {/* SEO Meta tags mejorados */}
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Kreoon" />
        <meta property="profile:username" content={profile.slug} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@kreoon_app" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />

        {/* Canonical */}
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      {/* Profile content */}
      <ProfilePageRenderer profileId={profile.id} isPreview={false} />

      {/* Badge de nivel UP — overlay fijo, no forma parte del builder de bloques */}
      {profile.level && LEVEL_LABELS[profile.level] && (
        <div className="fixed top-3 left-3 z-40 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-xs font-medium text-white">
          Nivel {LEVEL_LABELS[profile.level]}
        </div>
      )}

      {/* Acciones flotantes: Contratar / Seguir / Compartir — ocultas si es el propio perfil */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {viewerCreatorProfile?.id !== profile.id && (
          <>
            {(!user || getPermissionGroup(roles[0]) === 'client') && (
              <button
                onClick={() => navigate(`/marketplace/creator/${profile.id}`)}
                className="flex items-center gap-1.5 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4 py-2 text-sm font-medium"
              >
                <Briefcase className="h-4 w-4" />
                Contratar
              </button>
            )}
            {user && (
              <FollowButton profileId={profile.user_id} variant="outline" className="shadow-lg bg-background" />
            )}
          </>
        )}
        <ProfileShareButton
          profile={{
            slug: profile.slug,
            display_name: profile.display_name,
            primary_role: profile.primary_role,
          }}
          variant="default"
          className="shadow-lg bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4"
        />
      </div>
    </>
  );
}
