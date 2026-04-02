import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePageRenderer } from '@/components/profile-viewer/ProfilePageRenderer';
import { Helmet } from 'react-helmet-async';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CreatorProfile {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  slug: string;
}

// ─── Error Component ───────────────────────────────────────────────────────────

function ProfileNotFound() {
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

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PublicCreatorPage() {
  const { username } = useParams<{ username: string }>();

  // Query to resolve username (slug) to creator profile
  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['public-creator-profile', username],
    queryFn: async (): Promise<CreatorProfile | null> => {
      if (!username) return null;

      const { data, error: queryError } = await supabase
        .from('creator_profiles')
        .select('id, display_name, bio, avatar_url, slug')
        .eq('slug', username.toLowerCase())
        .eq('is_active', true)
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          // No rows found - profile doesn't exist
          return null;
        }
        throw queryError;
      }

      return data as CreatorProfile;
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // ── Render states ──

  if (!username) {
    return <ProfileNotFound />;
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
    return <ProfileNotFound />;
  }

  // ── Success: Render profile ──

  return (
    <>
      {/* SEO Meta tags */}
      <Helmet>
        <title>{profile.display_name} | Kreoon</title>
        <meta
          name="description"
          content={profile.bio || `Conoce el perfil de ${profile.display_name} en Kreoon`}
        />
        <meta property="og:title" content={`${profile.display_name} | Kreoon`} />
        <meta
          property="og:description"
          content={profile.bio || `Conoce el perfil de ${profile.display_name} en Kreoon`}
        />
        {profile.avatar_url && <meta property="og:image" content={profile.avatar_url} />}
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={`https://kreoon.com/p/${profile.slug}`} />
        <link rel="canonical" href={`https://kreoon.com/p/${profile.slug}`} />
      </Helmet>

      {/* Profile content */}
      <ProfilePageRenderer profileId={profile.id} isPreview={false} />
    </>
  );
}
