/**
 * Renderizador de perfiles para el marketplace.
 * Combina datos del creador + bloques del Profile Builder.
 *
 * - Si el creador tiene bloques personalizados: usa esos
 * - Si no tiene bloques: auto-genera desde sus datos existentes
 */

import { useMemo, Suspense, lazy } from 'react';
import { Loader2, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreatorPublicProfile } from '@/hooks/useCreatorPublicProfile';
import { useCreatorProfileBlocks } from '@/hooks/useCreatorProfileBlocks';
import { generateBlocksFromProfile } from '@/lib/profile-builder/generateBlocksFromProfile';
import { CreatorThemeProvider } from './CreatorThemeProvider';
import { PublicBlockRenderer } from './PublicBlockRenderer';
import { MarketplaceProfileWrapper } from '@/components/marketplace/profile/MarketplaceProfileWrapper';
import { DEFAULT_BUILDER_CONFIG } from '@/components/profile-builder/types/profile-builder';
import type { ProfileBlock, BuilderConfig } from '@/components/profile-builder/types/profile-builder';

// Lazy load de SimilarCreators para code splitting
const SimilarCreators = lazy(() =>
  import('@/components/marketplace/profile/SimilarCreators').then((m) => ({
    default: m.SimilarCreators,
  }))
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface MarketplaceProfileRendererProps {
  /** ID del creator_profile */
  creatorProfileId: string;
  /** Mostrar botón de volver */
  showBackButton?: boolean;
  /** Mostrar creadores similares al final */
  showSimilarCreators?: boolean;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="min-h-screen w-full bg-zinc-950 animate-pulse" aria-busy="true">
      {/* Hero skeleton */}
      <div className="h-80 w-full bg-zinc-800/50" />
      {/* Content skeletons */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-zinc-800/40" />
        ))}
      </div>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ProfileError({ message }: { message: string }) {
  return (
    <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Perfil no disponible</h2>
        <p className="text-sm text-zinc-400">{message}</p>
      </div>
    </div>
  );
}

// ─── Branding Footer ──────────────────────────────────────────────────────────

function KreoonBranding() {
  return (
    <footer className="py-6 text-center border-t border-white/5" aria-label="Powered by Kreoon">
      <a
        href="https://kreoon.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Zap className="h-3.5 w-3.5" />
        <span>
          Creado con <strong className="font-semibold">Kreoon</strong>
        </span>
      </a>
    </footer>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function MarketplaceProfileRenderer({
  creatorProfileId,
  showBackButton = true,
  showSimilarCreators = true,
}: MarketplaceProfileRendererProps) {
  // 1. Cargar datos del creador (perfil, portfolio, servicios, reseñas, stats)
  const {
    data: creatorData,
    loading: dataLoading,
    error: dataError,
  } = useCreatorPublicProfile(creatorProfileId);

  // 2. Cargar bloques personalizados (si existen)
  const {
    blocks: customBlocks,
    isLoading: blocksLoading,
    hasCustomBlocks,
  } = useCreatorProfileBlocks(creatorProfileId);

  // 3. Generar bloques si no tiene personalizados
  const effectiveBlocks = useMemo<ProfileBlock[]>(() => {
    // Si tiene bloques personalizados, usarlos
    if (hasCustomBlocks && customBlocks.length > 0) {
      return customBlocks;
    }

    // Si no tiene datos del creador, retornar vacío
    if (!creatorData) {
      return [];
    }

    // Auto-generar bloques desde datos existentes
    return generateBlocksFromProfile({
      profile: creatorData.profile,
      portfolioItems: creatorData.portfolioItems,
      services: creatorData.services,
      reviews: creatorData.reviews,
      trustStats: creatorData.trustStats,
    });
  }, [hasCustomBlocks, customBlocks, creatorData]);

  // 4. Estados de carga y error
  const isLoading = dataLoading || blocksLoading;

  if (isLoading) {
    return (
      <MarketplaceProfileWrapper showBackButton={showBackButton}>
        <ProfileSkeleton />
      </MarketplaceProfileWrapper>
    );
  }

  if (dataError || !creatorData) {
    return (
      <MarketplaceProfileWrapper showBackButton={showBackButton}>
        <ProfileError
          message={dataError || 'No pudimos cargar este perfil. Intenta de nuevo mas tarde.'}
        />
      </MarketplaceProfileWrapper>
    );
  }

  // 5. Configuración del tema
  const builderConfig: BuilderConfig =
    (creatorData.profile as any).builder_config ?? DEFAULT_BUILDER_CONFIG;

  // 6. Filtrar bloques visibles y ordenar
  const visibleBlocks = effectiveBlocks
    .filter((b) => b.isVisible && !b.isDraft)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const showBranding = builderConfig.showKreoonBranding !== false;

  return (
    <MarketplaceProfileWrapper showBackButton={showBackButton}>
      <CreatorThemeProvider config={builderConfig}>
        {/* Bloques del perfil */}
        <main className="w-full min-h-screen" aria-label={`Perfil de ${creatorData.profile.display_name}`}>
          {visibleBlocks.length === 0 ? (
            <div className="flex items-center justify-center min-h-[60vh] px-4">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">Este perfil no tiene contenido publicado aun</p>
              </div>
            </div>
          ) : (
            <Suspense
              fallback={<div className="min-h-screen animate-pulse bg-zinc-900/50" />}
            >
              {visibleBlocks.map((block) => (
                <PublicBlockRenderer
                  key={block.id}
                  block={block}
                  creatorProfile={creatorData.profile}
                />
              ))}
            </Suspense>
          )}
        </main>

        {/* Creadores similares */}
        {showSimilarCreators && creatorData.profile.categories?.length > 0 && (
          <Suspense fallback={null}>
            <section className="py-8 px-4 border-t border-white/5">
              <div className="max-w-5xl mx-auto">
                <SimilarCreators
                  creatorIds={[]}
                  currentCreatorId={creatorProfileId}
                  categories={creatorData.profile.categories}
                />
              </div>
            </section>
          </Suspense>
        )}

        {/* Branding Kreoon */}
        {showBranding && <KreoonBranding />}
      </CreatorThemeProvider>
    </MarketplaceProfileWrapper>
  );
}

export default MarketplaceProfileRenderer;
