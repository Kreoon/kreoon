import { Suspense } from 'react';
import { Eye, Zap, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfileBuilderData } from '@/components/profile-builder/hooks/useProfileBuilderData';
import { CreatorThemeProvider } from './CreatorThemeProvider';
import { PublicBlockRenderer } from './PublicBlockRenderer';
import { DEFAULT_BUILDER_CONFIG } from '@/components/profile-builder/types/profile-builder';
import type { ProfileBlock } from '@/components/profile-builder/types/profile-builder';

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
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
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
  const { profile, blocks, isLoading, isError, error } = useProfileBuilderData(profileId);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (isError || !profile) {
    const message =
      error instanceof Error
        ? error.message
        : 'No pudimos cargar este perfil. Intenta de nuevo mas tarde.';
    return <ProfileError message={message} />;
  }

  const config = profile.builder_config ?? DEFAULT_BUILDER_CONFIG;

  // Filtrar bloques: solo visibles y no borradores (a menos que sea preview)
  const visibleBlocks: ProfileBlock[] = [...blocks]
    .filter((b) => b.isVisible && (isPreview ? true : !b.isDraft))
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const showBranding = config.showKreoonBranding;

  return (
    <CreatorThemeProvider config={config}>
      {/* Banner de vista previa */}
      {isPreview && <PreviewBanner />}

      {/* Contenedor principal del perfil */}
      <main
        className="w-full min-h-screen"
        aria-label={`Perfil de ${profile.display_name}`}
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
              <PublicBlockRenderer key={block.id} block={block} />
            ))}
          </Suspense>
        )}
      </main>

      {/* Branding Kreoon — solo en plan free */}
      {showBranding && <KreoonBranding />}
    </CreatorThemeProvider>
  );
}
