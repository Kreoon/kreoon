import { Suspense, useMemo } from 'react';
import { Eye, Zap, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfileBuilderData } from '@/components/profile-builder/hooks/useProfileBuilderData';
import { usePublishedProfileBlocks } from '@/hooks/usePublishedProfileBlocks';
import { useCreatorPublicProfile } from '@/hooks/useCreatorPublicProfile';
import { CreatorThemeProvider } from './CreatorThemeProvider';
import { PublicBlockRenderer } from './PublicBlockRenderer';
import { DEFAULT_BUILDER_CONFIG } from '@/components/profile-builder/types/profile-builder';
import type { ProfileBlock, BuilderConfig } from '@/components/profile-builder/types/profile-builder';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfilePageRendererProps {
  profileId: string;
  isPreview?: boolean;
}

// ─── Skeleton de carga ────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="min-h-screen w-full bg-zinc-950 animate-pulse" aria-busy="true" aria-label="Cargando perfil">
      {/* Hero skeleton */}
      <div className="h-80 w-full bg-zinc-800/50" />
      {/* Content skeletons */}
      <div className="w-full md:max-w-3xl md:mx-auto px-0 md:px-6 py-8 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-zinc-800/40" />
        ))}
      </div>
    </div>
  );
}

// ─── Estado de error ──────────────────────────────────────────────────────────

function ProfileError({ message }: { message: string }) {
  return (
    <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Perfil no disponible</h2>
        <p className="text-sm text-zinc-400">{message}</p>
      </div>
    </div>
  );
}

// ─── Banner de vista previa ───────────────────────────────────────────────────

function PreviewBanner() {
  return (
    <div
      className={cn(
        'sticky top-0 z-50 flex items-center justify-center gap-2 py-2.5 px-4',
        'bg-amber-500/90 backdrop-blur-sm text-amber-950 text-sm font-medium',
      )}
      role="banner"
      aria-label="Modo vista previa activo"
    >
      <Eye className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>Vista previa — estos cambios aun no son publicos</span>
    </div>
  );
}

// ─── Branding Kreoon (plan free) ──────────────────────────────────────────────

function KreoonBranding() {
  return (
    <footer
      className="py-6 text-center border-t border-white/5"
      aria-label="Powered by Kreoon"
    >
      <a
        href="https://kreoon.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        aria-label="Creado con Kreoon"
      >
        <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          Creado con <strong className="font-semibold">Kreoon</strong>
        </span>
      </a>
    </footer>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProfilePageRenderer({ profileId, isPreview = false }: ProfilePageRendererProps) {
  // Para preview: usar datos del builder (incluye borradores)
  const builderData = useProfileBuilderData(isPreview ? profileId : undefined);

  // Para público: usar bloques publicados
  const publishedData = usePublishedProfileBlocks(!isPreview ? profileId : undefined);

  // Datos del creador para fallback y display_name
  const { data: creatorData, loading: creatorLoading } = useCreatorPublicProfile(profileId);

  // Estados combinados
  const isLoading = isPreview
    ? builderData.isLoading
    : publishedData.isLoading || creatorLoading;

  const isError = isPreview ? builderData.isError : false;
  const error = isPreview ? builderData.error : null;

  // Obtener configuración del builder (debe estar antes de returns condicionales)
  const config: BuilderConfig = useMemo(() => {
    if (isPreview && builderData.profile?.builder_config) {
      return builderData.profile.builder_config;
    }
    if (!isPreview && publishedData.data?.builderConfig) {
      return publishedData.data.builderConfig;
    }
    return DEFAULT_BUILDER_CONFIG;
  }, [isPreview, builderData.profile, publishedData.data]);

  // Obtener bloques según el modo
  const blocks: ProfileBlock[] = useMemo(() => {
    if (isPreview) {
      return builderData.blocks || [];
    }
    return publishedData.data?.blocks || [];
  }, [isPreview, builderData.blocks, publishedData.data]);

  // Filtrar bloques visibles
  const visibleBlocks: ProfileBlock[] = useMemo(() => {
    return [...blocks]
      .filter((b) => b.isVisible && (isPreview ? true : !b.isDraft))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [blocks, isPreview]);

  const displayName = isPreview
    ? builderData.profile?.display_name || 'Creador'
    : creatorData?.profile?.display_name || 'Creador';

  const showBranding = config.showKreoonBranding;

  // ── Render states ──

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  // En modo preview, verificar perfil del builder
  if (isPreview && (isError || !builderData.profile)) {
    const message =
      error instanceof Error
        ? error.message
        : 'No pudimos cargar este perfil. Intenta de nuevo mas tarde.';
    return <ProfileError message={message} />;
  }

  // En modo público, verificar datos del creador
  if (!isPreview && !creatorData?.profile) {
    return <ProfileError message="Perfil no encontrado" />;
  }

  return (
    <CreatorThemeProvider config={config}>
      {/* Banner de vista previa */}
      {isPreview && <PreviewBanner />}

      {/* Contenedor principal del perfil */}
      <main
        className="w-full min-h-screen"
        aria-label={`Perfil de ${displayName}`}
      >
        {visibleBlocks.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-zinc-500">Este perfil no tiene contenido publicado aun</p>
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="min-h-screen animate-pulse bg-zinc-900/50" aria-hidden="true" />
            }
          >
            {visibleBlocks.map((block) => (
              <PublicBlockRenderer
                key={block.id}
                block={block}
                creatorProfile={creatorData?.profile ? {
                  id: creatorData.profile.id,
                  user_id: creatorData.profile.user_id,
                  display_name: creatorData.profile.display_name,
                  categories: creatorData.profile.categories || [],
                } : undefined}
              />
            ))}
          </Suspense>
        )}
      </main>

      {/* Branding Kreoon — solo en plan free */}
      {showBranding && <KreoonBranding />}
    </CreatorThemeProvider>
  );
}
